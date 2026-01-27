import pool from '../config/database.js';

/**
 * Service de calcul du Report À Nouveau et gestion des soldes
 * Conforme à la comptabilité des copropriétés belges
 */

// ============================================
// CALCUL DU SOLDE FINAL D'UN PROPRIÉTAIRE
// ============================================
export async function calculerSoldeProprietaire(proprietaireId, exerciceId) {
  const result = await pool.query(`
    SELECT 
      se.solde_debut,
      se.total_provisions,
      se.total_charges,
      se.total_ajustements,
      se.cotisation_reserve
    FROM soldes_exercices se
    WHERE se.exercice_id = $1 AND se.proprietaire_id = $2
  `, [exerciceId, proprietaireId]);

  if (result.rows.length === 0) {
    return null;
  }

  const solde = result.rows[0];
  const soldeFin = 
    parseFloat(solde.solde_debut) +
    parseFloat(solde.total_provisions) -
    parseFloat(solde.total_charges) +
    parseFloat(solde.total_ajustements);

  return {
    reportANouveau: parseFloat(solde.solde_debut),
    provisions: parseFloat(solde.total_provisions),
    charges: parseFloat(solde.total_charges),
    ajustements: parseFloat(solde.total_ajustements),
    cotisationReserve: parseFloat(solde.cotisation_reserve),
    soldeFin: soldeFin
  };
}

// ============================================
// METTRE À JOUR LES CHARGES D'UN EXERCICE
// ============================================
export async function mettreAJourChargesExercice(exerciceId) {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Récupérer toutes les factures de l'exercice avec leur répartition
    const facturesResult = await client.query(`
      SELECT 
        f.id,
        fp.proprietaire_id,
        fp.montant
      FROM factures f
      JOIN factures_proprietaires fp ON f.id = fp.facture_id
      WHERE f.exercice_id = $1
    `, [exerciceId]);

    // Calculer le total des charges par propriétaire
    const chargesParProprietaire = {};
    for (const row of facturesResult.rows) {
      if (!chargesParProprietaire[row.proprietaire_id]) {
        chargesParProprietaire[row.proprietaire_id] = 0;
      }
      chargesParProprietaire[row.proprietaire_id] += parseFloat(row.montant);
    }

    // Mettre à jour les soldes
    for (const [proprietaireId, totalCharges] of Object.entries(chargesParProprietaire)) {
      await client.query(`
        UPDATE soldes_exercices SET
          total_charges = $1,
          updated_at = CURRENT_TIMESTAMP
        WHERE exercice_id = $2 AND proprietaire_id = $3
      `, [totalCharges, exerciceId, proprietaireId]);
    }

    await client.query('COMMIT');
    return { success: true, proprietairesMisAJour: Object.keys(chargesParProprietaire).length };

  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

// ============================================
// REPORTER LES SOLDES VERS UN NOUVEL EXERCICE
// ============================================
export async function reporterSoldesVersExercice(immeubleId, nouvelExerciceId, exercicePrecedentId) {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Récupérer les soldes de l'exercice précédent
    const soldesPrecedents = await client.query(`
      SELECT proprietaire_id, solde_fin
      FROM soldes_exercices
      WHERE exercice_id = $1
    `, [exercicePrecedentId]);

    // Créer ou mettre à jour les soldes du nouvel exercice
    for (const solde of soldesPrecedents.rows) {
      await client.query(`
        INSERT INTO soldes_exercices (exercice_id, proprietaire_id, solde_debut)
        VALUES ($1, $2, $3)
        ON CONFLICT (exercice_id, proprietaire_id)
        DO UPDATE SET solde_debut = EXCLUDED.solde_debut, updated_at = CURRENT_TIMESTAMP
      `, [nouvelExerciceId, solde.proprietaire_id, solde.solde_fin]);
    }

    await client.query('COMMIT');
    return { success: true, soldesReportes: soldesPrecedents.rows.length };

  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

// ============================================
// GÉNÉRER LES APPELS DE FONDS TRIMESTRIELS
// ============================================
export async function genererAppelsTrimestriels(exerciceId, budgetAnnuel) {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Récupérer l'exercice et l'immeuble
    const exerciceResult = await client.query(`
      SELECT e.*, i.id as immeuble_id
      FROM exercices e
      JOIN immeubles i ON e.immeuble_id = i.id
      WHERE e.id = $1
    `, [exerciceId]);

    if (exerciceResult.rows.length === 0) {
      throw new Error('Exercice not found');
    }

    const exercice = exerciceResult.rows[0];
    const montantTrimestriel = budgetAnnuel / 4;

    // Récupérer les propriétaires
    const proprietaires = await client.query(`
      SELECT id, milliemes 
      FROM proprietaires 
      WHERE immeuble_id = $1 AND actif = true
    `, [exercice.immeuble_id]);

    const totalMilliemes = proprietaires.rows.reduce(
      (sum, p) => sum + parseInt(p.milliemes), 0
    );

    const appels = [];
    const trimestres = [
      { num: 1, mois: '01', label: '1er trimestre' },
      { num: 2, mois: '04', label: '2ème trimestre' },
      { num: 3, mois: '07', label: '3ème trimestre' },
      { num: 4, mois: '10', label: '4ème trimestre' }
    ];

    for (const trimestre of trimestres) {
      const dateAppel = `${exercice.annee}-${trimestre.mois}-01`;
      const dateEcheance = `${exercice.annee}-${trimestre.mois}-15`;
      const libelle = `Appel de provisions - ${trimestre.label} ${exercice.annee}`;

      // Créer l'appel
      const appelResult = await client.query(`
        INSERT INTO appels_fonds (
          exercice_id, type, numero, libelle,
          date_appel, date_echeance, montant_total
        ) VALUES ($1, 'provision', $2, $3, $4, $5, $6)
        RETURNING *
      `, [exerciceId, trimestre.num, libelle, dateAppel, dateEcheance, montantTrimestriel]);

      const appel = appelResult.rows[0];

      // Créer les appels par propriétaire
      for (const proprietaire of proprietaires.rows) {
        const montantDu = (montantTrimestriel * parseInt(proprietaire.milliemes)) / totalMilliemes;
        
        await client.query(`
          INSERT INTO appels_proprietaires (appel_id, proprietaire_id, montant_du)
          VALUES ($1, $2, $3)
        `, [appel.id, proprietaire.id, montantDu.toFixed(2)]);
      }

      appels.push(appel);
    }

    await client.query('COMMIT');
    return { success: true, appels };

  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

// ============================================
// SITUATION GLOBALE D'UN IMMEUBLE
// ============================================
export async function getSituationGlobale(immeubleId, exerciceId = null) {
  let query;
  const params = [immeubleId];

  if (exerciceId) {
    query = `
      SELECT 
        e.annee,
        e.statut,
        SUM(se.solde_debut) as total_ran,
        SUM(se.total_provisions) as total_provisions,
        SUM(se.total_charges) as total_charges,
        SUM(se.solde_fin) as solde_global,
        COUNT(CASE WHEN se.solde_fin >= 0 THEN 1 END) as nb_crediteurs,
        COUNT(CASE WHEN se.solde_fin < 0 THEN 1 END) as nb_debiteurs
      FROM exercices e
      JOIN soldes_exercices se ON e.id = se.exercice_id
      WHERE e.immeuble_id = $1 AND e.id = $2
      GROUP BY e.id
    `;
    params.push(exerciceId);
  } else {
    // Dernier exercice ouvert
    query = `
      SELECT 
        e.annee,
        e.statut,
        SUM(se.solde_debut) as total_ran,
        SUM(se.total_provisions) as total_provisions,
        SUM(se.total_charges) as total_charges,
        SUM(se.solde_fin) as solde_global,
        COUNT(CASE WHEN se.solde_fin >= 0 THEN 1 END) as nb_crediteurs,
        COUNT(CASE WHEN se.solde_fin < 0 THEN 1 END) as nb_debiteurs
      FROM exercices e
      JOIN soldes_exercices se ON e.id = se.exercice_id
      WHERE e.immeuble_id = $1 AND e.statut = 'ouvert'
      GROUP BY e.id
      ORDER BY e.annee DESC
      LIMIT 1
    `;
  }

  const result = await pool.query(query, params);

  if (result.rows.length === 0) {
    return null;
  }

  return {
    annee: result.rows[0].annee,
    statut: result.rows[0].statut,
    reportANouveau: parseFloat(result.rows[0].total_ran),
    provisions: parseFloat(result.rows[0].total_provisions),
    charges: parseFloat(result.rows[0].total_charges),
    soldeGlobal: parseFloat(result.rows[0].solde_global),
    repartition: {
      crediteurs: parseInt(result.rows[0].nb_crediteurs),
      debiteurs: parseInt(result.rows[0].nb_debiteurs)
    }
  };
}

// ============================================
// HISTORIQUE DES SOLDES D'UN PROPRIÉTAIRE
// ============================================
export async function getHistoriqueSoldesProprietaire(proprietaireId, limit = 5) {
  const result = await pool.query(`
    SELECT 
      e.annee,
      e.statut,
      se.solde_debut as ran,
      se.total_provisions,
      se.total_charges,
      se.solde_fin
    FROM soldes_exercices se
    JOIN exercices e ON se.exercice_id = e.id
    WHERE se.proprietaire_id = $1
    ORDER BY e.annee DESC
    LIMIT $2
  `, [proprietaireId, limit]);

  return result.rows.map(row => ({
    annee: row.annee,
    statut: row.statut,
    reportANouveau: parseFloat(row.ran),
    provisions: parseFloat(row.total_provisions),
    charges: parseFloat(row.total_charges),
    soldeFin: parseFloat(row.solde_fin)
  }));
}
