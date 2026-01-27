import pool from '../config/database.js';

// ============================================
// GET ALL - Lister tous les exercices d'un immeuble
// ============================================
export async function getAllExercices(req, res) {
  const { immeubleId } = req.params;

  try {
    // Vérifier que l'immeuble appartient à l'utilisateur
    const immeubleCheck = await pool.query(
      'SELECT id FROM immeubles WHERE id = $1 AND user_id = $2 AND archived_at IS NULL',
      [immeubleId, req.user.id]
    );

    if (immeubleCheck.rows.length === 0) {
      return res.status(404).json({ 
        error: 'Not found',
        message: 'Immeuble not found or you do not have access' 
      });
    }

    // Récupérer les exercices avec statistiques
    const result = await pool.query(`
      SELECT 
        e.*,
        COUNT(DISTINCT se.proprietaire_id) as nb_proprietaires,
        COALESCE(SUM(se.total_provisions), 0) as total_provisions,
        COALESCE(SUM(se.total_charges), 0) as total_charges,
        COALESCE(SUM(se.solde_fin), 0) as solde_global
      FROM exercices e
      LEFT JOIN soldes_exercices se ON e.id = se.exercice_id
      WHERE e.immeuble_id = $1
      GROUP BY e.id
      ORDER BY e.annee DESC
    `, [immeubleId]);

    res.json({
      success: true,
      exercices: result.rows,
      count: result.rows.length
    });
  } catch (error) {
    console.error('Error fetching exercices:', error);
    res.status(500).json({ 
      error: 'Failed to fetch exercices',
      message: error.message 
    });
  }
}

// ============================================
// GET ONE - Récupérer un exercice avec détails complets
// ============================================
export async function getExercice(req, res) {
  const { immeubleId, id } = req.params;

  try {
    // Vérifier accès
    const immeubleCheck = await pool.query(
      'SELECT id FROM immeubles WHERE id = $1 AND user_id = $2 AND archived_at IS NULL',
      [immeubleId, req.user.id]
    );

    if (immeubleCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Not found', message: 'Immeuble not found' });
    }

    // Récupérer l'exercice
    const exerciceResult = await pool.query(
      'SELECT * FROM exercices WHERE id = $1 AND immeuble_id = $2',
      [id, immeubleId]
    );

    if (exerciceResult.rows.length === 0) {
      return res.status(404).json({ error: 'Not found', message: 'Exercice not found' });
    }

    const exercice = exerciceResult.rows[0];

    // Récupérer les soldes par propriétaire
    const soldesResult = await pool.query(`
      SELECT 
        se.*,
        p.nom as proprietaire_nom,
        p.prenom as proprietaire_prenom,
        p.numero_appartement,
        p.milliemes
      FROM soldes_exercices se
      JOIN proprietaires p ON se.proprietaire_id = p.id
      WHERE se.exercice_id = $1
      ORDER BY p.nom ASC
    `, [id]);

    // Récupérer les appels de fonds
    const appelsResult = await pool.query(`
      SELECT 
        af.*,
        COUNT(ap.id) as nb_proprietaires,
        SUM(CASE WHEN ap.statut = 'paye' THEN 1 ELSE 0 END) as nb_payes,
        COALESCE(SUM(ap.montant_paye), 0) as total_paye
      FROM appels_fonds af
      LEFT JOIN appels_proprietaires ap ON af.id = ap.appel_id
      WHERE af.exercice_id = $1
      GROUP BY af.id
      ORDER BY af.date_appel ASC
    `, [id]);

    // Statistiques globales
    const statsResult = await pool.query(`
      SELECT 
        COALESCE(SUM(se.solde_debut), 0) as total_ran,
        COALESCE(SUM(se.total_provisions), 0) as total_provisions,
        COALESCE(SUM(se.total_charges), 0) as total_charges,
        COALESCE(SUM(se.solde_fin), 0) as solde_global,
        COUNT(CASE WHEN se.solde_fin < 0 THEN 1 END) as nb_debiteurs,
        COUNT(CASE WHEN se.solde_fin >= 0 THEN 1 END) as nb_crediteurs
      FROM soldes_exercices se
      WHERE se.exercice_id = $1
    `, [id]);

    res.json({
      success: true,
      exercice: {
        ...exercice,
        soldes: soldesResult.rows,
        appels: appelsResult.rows,
        stats: statsResult.rows[0]
      }
    });
  } catch (error) {
    console.error('Error fetching exercice:', error);
    res.status(500).json({ error: 'Failed to fetch exercice', message: error.message });
  }
}

// ============================================
// CREATE - Créer un nouvel exercice avec report automatique
// ============================================
export async function createExercice(req, res) {
  const { immeubleId } = req.params;
  const {
    annee,
    dateDebut,
    dateFin,
    budgetPrevisionnel = 0,
    budgetFondsReserve = 0
  } = req.body;

  // Validation
  if (!annee || !dateDebut || !dateFin) {
    return res.status(400).json({ 
      error: 'Validation error',
      message: 'annee, dateDebut, and dateFin are required' 
    });
  }

  try {
    // Vérifier accès
    const immeubleCheck = await pool.query(
      'SELECT id FROM immeubles WHERE id = $1 AND user_id = $2 AND archived_at IS NULL',
      [immeubleId, req.user.id]
    );

    if (immeubleCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Not found', message: 'Immeuble not found' });
    }

    // Vérifier qu'un exercice n'existe pas déjà pour cette année
    const existingCheck = await pool.query(
      'SELECT id FROM exercices WHERE immeuble_id = $1 AND annee = $2',
      [immeubleId, annee]
    );

    if (existingCheck.rows.length > 0) {
      return res.status(400).json({ 
        error: 'Already exists',
        message: `Un exercice existe déjà pour l'année ${annee}` 
      });
    }

    await pool.query('BEGIN');

    // Créer l'exercice
    const exerciceResult = await pool.query(`
      INSERT INTO exercices (
        immeuble_id, annee, date_debut, date_fin,
        budget_previsionnel, budget_fonds_reserve, statut
      ) VALUES ($1, $2, $3, $4, $5, $6, 'ouvert')
      RETURNING *
    `, [immeubleId, annee, dateDebut, dateFin, budgetPrevisionnel, budgetFondsReserve]);

    const exercice = exerciceResult.rows[0];

    // ✅ AMÉLIORÉ: Récupérer l'exercice précédent CLÔTURÉ pour le RAN
    const exercicePrecedent = await pool.query(`
      SELECT e.id, e.statut, se.proprietaire_id, se.solde_fin
      FROM exercices e
      JOIN soldes_exercices se ON e.id = se.exercice_id
      WHERE e.immeuble_id = $1 AND e.annee = $2 - 1 AND e.statut = 'cloture'
    `, [immeubleId, annee]);

    // Récupérer tous les propriétaires actifs
    const proprietairesResult = await pool.query(
      'SELECT id, milliemes FROM proprietaires WHERE immeuble_id = $1 AND actif = true',
      [immeubleId]
    );

    let ranReporte = 0;

    // Créer les soldes pour chaque propriétaire avec RAN
    for (const proprietaire of proprietairesResult.rows) {
      // Chercher le solde de l'exercice précédent (clôturé uniquement)
      const soldeAnterior = exercicePrecedent.rows.find(
        s => s.proprietaire_id === proprietaire.id
      );
      
      const ran = soldeAnterior ? parseFloat(soldeAnterior.solde_fin) : 0;
      if (ran !== 0) ranReporte++;

      await pool.query(`
        INSERT INTO soldes_exercices (
          exercice_id, proprietaire_id, solde_debut, total_provisions, total_charges, total_ajustements, solde_fin
        ) VALUES ($1, $2, $3, 0, 0, 0, $3)
      `, [exercice.id, proprietaire.id, ran]);
    }

    await pool.query('COMMIT');

    console.log(`✅ Exercice ${annee} created for immeuble ${immeubleId} with ${ranReporte} RAN reports`);

    res.status(201).json({
      success: true,
      message: `Exercice ${annee} créé avec report des soldes`,
      exercice,
      proprietairesInitialises: proprietairesResult.rows.length,
      ranReporte: ranReporte > 0
    });

  } catch (error) {
    await pool.query('ROLLBACK');
    console.error('Error creating exercice:', error);
    res.status(500).json({ error: 'Failed to create exercice', message: error.message });
  }
}

// ============================================
// GET SOLDE PROPRIETAIRE - Situation financière avec RAN
// ============================================
export async function getSoldeProprietaire(req, res) {
  const { immeubleId, exerciceId, proprietaireId } = req.params;

  try {
    // Vérifier accès
    const immeubleCheck = await pool.query(
      'SELECT id FROM immeubles WHERE id = $1 AND user_id = $2 AND archived_at IS NULL',
      [immeubleId, req.user.id]
    );

    if (immeubleCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Not found', message: 'Immeuble not found' });
    }

    // Récupérer le solde
    const soldeResult = await pool.query(`
      SELECT 
        se.*,
        p.nom,
        p.prenom,
        p.milliemes,
        e.annee,
        e.statut as exercice_statut
      FROM soldes_exercices se
      JOIN proprietaires p ON se.proprietaire_id = p.id
      JOIN exercices e ON se.exercice_id = e.id
      WHERE se.exercice_id = $1 AND se.proprietaire_id = $2
    `, [exerciceId, proprietaireId]);

    if (soldeResult.rows.length === 0) {
      return res.status(404).json({ error: 'Not found', message: 'Solde not found' });
    }

    const solde = soldeResult.rows[0];

    res.json({
      success: true,
      solde: {
        ...solde,
        calculDetail: {
          reportANouveau: parseFloat(solde.solde_debut),
          totalProvisions: parseFloat(solde.total_provisions),
          totalCharges: parseFloat(solde.total_charges),
          ajustements: parseFloat(solde.total_ajustements),
          soldeFinal: parseFloat(solde.solde_fin)
        }
      }
    });
  } catch (error) {
    console.error('Error fetching solde:', error);
    res.status(500).json({ error: 'Failed to fetch solde', message: error.message });
  }
}

// ============================================
// CLÔTURER EXERCICE - VERSION CORRIGÉE
// Calcule les soldes de la même manière que le frontend
// ============================================
export async function cloturerExercice(req, res) {
  const { immeubleId, id } = req.params;
  const { notesCloture, dateAgApprobation, pvAgReference } = req.body;

  try {
    // Vérifier accès
    const exerciceCheck = await pool.query(`
      SELECT e.* FROM exercices e
      JOIN immeubles i ON e.immeuble_id = i.id
      WHERE e.id = $1 AND i.id = $2 AND i.user_id = $3
    `, [id, immeubleId, req.user.id]);

    if (exerciceCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Not found', message: 'Exercice not found' });
    }

    const exercice = exerciceCheck.rows[0];
    const annee = parseInt(exercice.annee);

    if (exercice.statut === 'cloture' || exercice.statut === 'archive') {
      return res.status(400).json({ 
        error: 'Already closed',
        message: 'Cet exercice est déjà clôturé' 
      });
    }

    await pool.query('BEGIN');

    // =====================================================
    // 1. Récupérer tous les propriétaires actifs de l'immeuble
    // =====================================================
    const proprietairesResult = await pool.query(`
      SELECT id, nom, prenom, COALESCE(milliemes, 0) as milliemes
      FROM proprietaires 
      WHERE immeuble_id = $1 AND actif = true
    `, [immeubleId]);
    
    const proprietaires = proprietairesResult.rows;
    const totalMilliemes = proprietaires.reduce((sum, p) => sum + parseFloat(p.milliemes || 0), 0);

    console.log(`📊 Clôture ${annee}: ${proprietaires.length} propriétaires, ${totalMilliemes} millièmes total`);

    // =====================================================
    // 2. Calculer le total des charges pour l'année
    // =====================================================
    const chargesResult = await pool.query(`
      SELECT COALESCE(SUM(ABS(montant)), 0) as total
      FROM transactions 
      WHERE immeuble_id = $1 
        AND EXTRACT(YEAR FROM date_transaction) = $2
        AND type = 'charge'
    `, [immeubleId, annee]);
    
    const totalCharges = parseFloat(chargesResult.rows[0].total || 0);
    console.log(`💰 Total charges ${annee}: ${totalCharges}€`);

    // =====================================================
    // 3. Pour chaque propriétaire, calculer son solde final
    // =====================================================
    const soldesCalcules = [];

    for (const prop of proprietaires) {
      const milliemes = parseFloat(prop.milliemes || 0);
      const pourcentage = totalMilliemes > 0 ? milliemes / totalMilliemes : 0;

      // RAN (Report À Nouveau) = solde_debut de l'exercice actuel
      const ranResult = await pool.query(`
        SELECT COALESCE(solde_debut, 0) as ran
        FROM soldes_exercices 
        WHERE exercice_id = $1 AND proprietaire_id = $2
      `, [id, prop.id]);
      
      const ran = parseFloat(ranResult.rows[0]?.ran || 0);

      // Dépôts attribués à ce propriétaire pour cette année
      const depotsResult = await pool.query(`
        SELECT COALESCE(SUM(ABS(montant)), 0) as total
        FROM transactions 
        WHERE immeuble_id = $1 
          AND EXTRACT(YEAR FROM date_transaction) = $2
          AND type != 'charge'
          AND proprietaire_id = $3
      `, [immeubleId, annee, prop.id]);
      
      const depots = parseFloat(depotsResult.rows[0].total || 0);

      // Quote-part des charges selon les millièmes
      const chargesProprietaire = totalCharges * pourcentage;

      // Solde final = RAN + Dépôts - Charges
      const soldeFin = ran + depots - chargesProprietaire;

      soldesCalcules.push({
        proprietaire_id: prop.id,
        nom: `${prop.prenom || ''} ${prop.nom}`.trim(),
        milliemes,
        pourcentage: (pourcentage * 100).toFixed(2),
        ran,
        depots,
        charges: chargesProprietaire,
        solde_fin: soldeFin
      });

      console.log(`  👤 ${prop.prenom || ''} ${prop.nom}: RAN=${ran.toFixed(2)}€ + Dépôts=${depots.toFixed(2)}€ - Charges=${chargesProprietaire.toFixed(2)}€ = ${soldeFin.toFixed(2)}€`);

      // Mettre à jour ou créer le solde dans soldes_exercices
      await pool.query(`
        INSERT INTO soldes_exercices (
          exercice_id, proprietaire_id, solde_debut, total_provisions, total_charges, total_ajustements, solde_fin
        ) VALUES ($1, $2, $3, $4, $5, 0, $6)
        ON CONFLICT (exercice_id, proprietaire_id) 
        DO UPDATE SET
          total_provisions = $4,
          total_charges = $5,
          solde_fin = $6,
          updated_at = CURRENT_TIMESTAMP
      `, [id, prop.id, ran, depots, chargesProprietaire, soldeFin]);
    }

    // =====================================================
    // 4. Clôturer l'exercice
    // =====================================================
    await pool.query(`
      UPDATE exercices SET
        statut = 'cloture',
        date_cloture = CURRENT_TIMESTAMP,
        cloture_par = $1,
        notes_cloture = $2,
        date_ag_approbation = $3,
        pv_ag_reference = $4,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $5
    `, [req.user.id, notesCloture, dateAgApprobation, pvAgReference, id]);

    // =====================================================
    // 5. Reporter les soldes vers l'exercice suivant
    // =====================================================
    const nextYear = annee + 1;
    
    // Vérifier/créer l'exercice suivant
    let exerciceSuivantResult = await pool.query(
      'SELECT id FROM exercices WHERE immeuble_id = $1 AND annee = $2',
      [immeubleId, nextYear]
    );

    let exerciceSuivantId;
    let exerciceSuivantCree = false;

    if (exerciceSuivantResult.rows.length === 0) {
      // Créer l'exercice suivant
      const createResult = await pool.query(`
        INSERT INTO exercices (immeuble_id, annee, date_debut, date_fin, statut)
        VALUES ($1, $2, $3, $4, 'actif')
        RETURNING id
      `, [immeubleId, nextYear, `${nextYear}-01-01`, `${nextYear}-12-31`]);
      
      exerciceSuivantId = createResult.rows[0].id;
      exerciceSuivantCree = true;
      console.log(`📅 Exercice ${nextYear} créé automatiquement`);
    } else {
      exerciceSuivantId = exerciceSuivantResult.rows[0].id;
    }

    // Reporter chaque solde vers l'exercice suivant
    let ranReportCount = 0;
    for (const solde of soldesCalcules) {
      await pool.query(`
        INSERT INTO soldes_exercices (
          exercice_id, proprietaire_id, solde_debut, total_provisions, total_charges, total_ajustements, solde_fin
        ) VALUES ($1, $2, $3, 0, 0, 0, $3)
        ON CONFLICT (exercice_id, proprietaire_id) 
        DO UPDATE SET
          solde_debut = $3,
          updated_at = CURRENT_TIMESTAMP
      `, [exerciceSuivantId, solde.proprietaire_id, solde.solde_fin]);
      
      ranReportCount++;
    }

    console.log(`✅ ${ranReportCount} soldes reportés vers ${nextYear}`);

    await pool.query('COMMIT');

    res.json({
      success: true,
      message: `Exercice ${annee} clôturé avec succès`,
      annee,
      nextYear,
      totalCharges,
      totalMilliemes,
      proprietairesCount: proprietaires.length,
      soldesCalcules,
      ranReporte: true,
      ranReportCount,
      exerciceSuivantCree
    });

  } catch (error) {
    await pool.query('ROLLBACK');
    console.error('Error closing exercice:', error);
    res.status(500).json({ error: 'Failed to close exercice', message: error.message });
  }
}

// ============================================
// RECALCULER RAN - Endpoint pour forcer le recalcul
// ============================================
export async function recalculerRAN(req, res) {
  const { immeubleId, id } = req.params;

  try {
    // Vérifier accès
    const exerciceCheck = await pool.query(`
      SELECT e.* FROM exercices e
      JOIN immeubles i ON e.immeuble_id = i.id
      WHERE e.id = $1 AND i.id = $2 AND i.user_id = $3
    `, [id, immeubleId, req.user.id]);

    if (exerciceCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Not found', message: 'Exercice not found' });
    }

    const exercice = exerciceCheck.rows[0];

    // Récupérer l'exercice précédent clôturé
    const exercicePrecedent = await pool.query(`
      SELECT se.proprietaire_id, se.solde_fin
      FROM exercices e
      JOIN soldes_exercices se ON e.id = se.exercice_id
      WHERE e.immeuble_id = $1 AND e.annee = $2 AND e.statut = 'cloture'
    `, [immeubleId, exercice.annee - 1]);

    if (exercicePrecedent.rows.length === 0) {
      return res.status(400).json({ 
        error: 'No previous exercice',
        message: `Aucun exercice clôturé trouvé pour ${exercice.annee - 1}` 
      });
    }

    await pool.query('BEGIN');

    let updated = 0;

    for (const solde of exercicePrecedent.rows) {
      await pool.query(`
        UPDATE soldes_exercices SET
          solde_debut = $1,
          solde_fin = $1 + total_provisions - total_charges + total_ajustements,
          updated_at = CURRENT_TIMESTAMP
        WHERE exercice_id = $2 AND proprietaire_id = $3
      `, [parseFloat(solde.solde_fin), id, solde.proprietaire_id]);
      updated++;
    }

    await pool.query('COMMIT');

    console.log(`✅ RAN recalculé pour exercice ${exercice.annee}: ${updated} propriétaires mis à jour`);

    res.json({
      success: true,
      message: `RAN recalculé pour ${updated} propriétaires`,
      updated
    });

  } catch (error) {
    await pool.query('ROLLBACK');
    console.error('Error recalculating RAN:', error);
    res.status(500).json({ error: 'Failed to recalculate RAN', message: error.message });
  }
}

// ============================================
// CRÉER APPEL DE FONDS
// ============================================
export async function createAppelFonds(req, res) {
  const { immeubleId, exerciceId } = req.params;
  const {
    type = 'provision',
    numero,
    libelle,
    dateAppel,
    dateEcheance,
    montantTotal
  } = req.body;

  // Validation
  if (!libelle || !dateAppel || !dateEcheance || !montantTotal) {
    return res.status(400).json({ 
      error: 'Validation error',
      message: 'libelle, dateAppel, dateEcheance, and montantTotal are required' 
    });
  }

  try {
    // Vérifier accès
    const exerciceCheck = await pool.query(`
      SELECT e.* FROM exercices e
      JOIN immeubles i ON e.immeuble_id = i.id
      WHERE e.id = $1 AND i.id = $2 AND i.user_id = $3
    `, [exerciceId, immeubleId, req.user.id]);

    if (exerciceCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Not found', message: 'Exercice not found' });
    }

    const exercice = exerciceCheck.rows[0];

    if (exercice.statut === 'cloture' || exercice.statut === 'archive') {
      return res.status(400).json({ 
        error: 'Exercice closed',
        message: 'Impossible de créer un appel sur un exercice clôturé' 
      });
    }

    await pool.query('BEGIN');

    // Déterminer le numéro d'appel si non fourni
    let appelNumero = numero;
    if (!appelNumero) {
      const countResult = await pool.query(
        'SELECT COUNT(*) as count FROM appels_fonds WHERE exercice_id = $1 AND type = $2',
        [exerciceId, type]
      );
      appelNumero = parseInt(countResult.rows[0].count) + 1;
    }

    // Créer l'appel de fonds
    const appelResult = await pool.query(`
      INSERT INTO appels_fonds (
        exercice_id, type, numero, libelle,
        date_appel, date_echeance, montant_total
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `, [exerciceId, type, appelNumero, libelle, dateAppel, dateEcheance, montantTotal]);

    const appel = appelResult.rows[0];

    // Récupérer les propriétaires actifs avec leurs millièmes
    const proprietairesResult = await pool.query(
      'SELECT id, milliemes FROM proprietaires WHERE immeuble_id = $1 AND actif = true',
      [immeubleId]
    );

    // Calculer le total des millièmes
    const totalMilliemes = proprietairesResult.rows.reduce(
      (sum, p) => sum + parseInt(p.milliemes), 0
    );

    // Créer un appel pour chaque propriétaire au prorata des millièmes
    const appelsProprietaires = [];
    for (const proprietaire of proprietairesResult.rows) {
      const montantDu = (parseFloat(montantTotal) * parseInt(proprietaire.milliemes)) / totalMilliemes;
      
      const apResult = await pool.query(`
        INSERT INTO appels_proprietaires (
          appel_id, proprietaire_id, montant_du
        ) VALUES ($1, $2, $3)
        RETURNING *
      `, [appel.id, proprietaire.id, montantDu.toFixed(2)]);

      appelsProprietaires.push(apResult.rows[0]);
    }

    await pool.query('COMMIT');

    console.log(`✅ Appel de fonds créé: ${libelle} (${montantTotal}€) pour ${proprietairesResult.rows.length} propriétaires`);

    res.status(201).json({
      success: true,
      message: 'Appel de fonds créé',
      appel: {
        ...appel,
        details: appelsProprietaires
      }
    });

  } catch (error) {
    await pool.query('ROLLBACK');
    console.error('Error creating appel de fonds:', error);
    res.status(500).json({ error: 'Failed to create appel', message: error.message });
  }
}

// ============================================
// ENREGISTRER PAIEMENT APPEL
// ============================================
export async function enregistrerPaiementAppel(req, res) {
  const { immeubleId, appelId, proprietaireId } = req.params;
  const { montant, datePaiement, transactionId } = req.body;

  if (!montant || !datePaiement) {
    return res.status(400).json({ 
      error: 'Validation error',
      message: 'montant and datePaiement are required' 
    });
  }

  try {
    await pool.query('BEGIN');

    // Récupérer l'appel propriétaire
    const apResult = await pool.query(`
      SELECT ap.*, af.exercice_id
      FROM appels_proprietaires ap
      JOIN appels_fonds af ON ap.appel_id = af.id
      WHERE ap.appel_id = $1 AND ap.proprietaire_id = $2
    `, [appelId, proprietaireId]);

    if (apResult.rows.length === 0) {
      await pool.query('ROLLBACK');
      return res.status(404).json({ error: 'Not found', message: 'Appel propriétaire not found' });
    }

    const appelProp = apResult.rows[0];
    const nouveauMontantPaye = parseFloat(appelProp.montant_paye) + parseFloat(montant);
    
    // Déterminer le nouveau statut
    let nouveauStatut = 'partiel';
    if (nouveauMontantPaye >= parseFloat(appelProp.montant_du)) {
      nouveauStatut = 'paye';
    }

    // Mettre à jour l'appel propriétaire
    await pool.query(`
      UPDATE appels_proprietaires SET
        montant_paye = $1,
        statut = $2,
        date_paiement = $3,
        transaction_id = $4,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $5
    `, [nouveauMontantPaye, nouveauStatut, datePaiement, transactionId, appelProp.id]);

    // Mettre à jour le solde de l'exercice
    await pool.query(`
      UPDATE soldes_exercices SET
        total_provisions = total_provisions + $1
      WHERE exercice_id = $2 AND proprietaire_id = $3
    `, [montant, appelProp.exercice_id, proprietaireId]);

    // Vérifier si l'appel global est complet
    const statusCheck = await pool.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN statut = 'paye' THEN 1 END) as payes
      FROM appels_proprietaires
      WHERE appel_id = $1
    `, [appelId]);

    const appelStatut = statusCheck.rows[0].total === statusCheck.rows[0].payes ? 'complet' : 'partiel';
    
    await pool.query(
      'UPDATE appels_fonds SET statut = $1 WHERE id = $2',
      [appelStatut, appelId]
    );

    await pool.query('COMMIT');

    res.json({
      success: true,
      message: 'Paiement enregistré',
      nouveauSolde: nouveauMontantPaye,
      statut: nouveauStatut
    });

  } catch (error) {
    await pool.query('ROLLBACK');
    console.error('Error registering payment:', error);
    res.status(500).json({ error: 'Failed to register payment', message: error.message });
  }
}

// ============================================
// DÉCOMPTE ANNUEL - Vue complète avec RAN
// ============================================
export async function getDecompteAnnuel(req, res) {
  const { immeubleId, exerciceId, proprietaireId } = req.params;

  try {
    // Vérifier accès
    const check = await pool.query(`
      SELECT e.*, i.nom as immeuble_nom, i.adresse as immeuble_adresse
      FROM exercices e
      JOIN immeubles i ON e.immeuble_id = i.id
      WHERE e.id = $1 AND i.id = $2 AND i.user_id = $3
    `, [exerciceId, immeubleId, req.user.id]);

    if (check.rows.length === 0) {
      return res.status(404).json({ error: 'Not found' });
    }

    const exercice = check.rows[0];

    // Récupérer les infos propriétaire et solde
    const soldeResult = await pool.query(`
      SELECT 
        se.*,
        p.nom,
        p.prenom,
        p.email,
        p.numero_appartement,
        p.milliemes
      FROM soldes_exercices se
      JOIN proprietaires p ON se.proprietaire_id = p.id
      WHERE se.exercice_id = $1 AND se.proprietaire_id = $2
    `, [exerciceId, proprietaireId]);

    if (soldeResult.rows.length === 0) {
      return res.status(404).json({ error: 'Solde not found' });
    }

    const solde = soldeResult.rows[0];

    // Récupérer le détail des charges par catégorie
    const chargesResult = await pool.query(`
      SELECT 
        f.categorie,
        SUM(fp.montant) as total,
        COUNT(*) as nb_factures
      FROM factures f
      JOIN factures_proprietaires fp ON f.id = fp.facture_id
      WHERE f.exercice_id = $1 AND fp.proprietaire_id = $2
      GROUP BY f.categorie
      ORDER BY total DESC
    `, [exerciceId, proprietaireId]);

    // Récupérer les versements (provisions payées)
    const versementsResult = await pool.query(`
      SELECT 
        af.libelle,
        af.date_appel,
        ap.montant_du,
        ap.montant_paye,
        ap.date_paiement
      FROM appels_fonds af
      JOIN appels_proprietaires ap ON af.id = ap.appel_id
      WHERE af.exercice_id = $1 AND ap.proprietaire_id = $2
      ORDER BY af.date_appel ASC
    `, [exerciceId, proprietaireId]);

    // Calculer le total général immeuble pour comparaison
    const totauxImmeuble = await pool.query(`
      SELECT 
        SUM(se.total_provisions) as total_provisions,
        SUM(se.total_charges) as total_charges
      FROM soldes_exercices se
      WHERE se.exercice_id = $1
    `, [exerciceId]);

    res.json({
      success: true,
      decompte: {
        // En-tête
        immeuble: {
          nom: exercice.immeuble_nom,
          adresse: exercice.immeuble_adresse
        },
        exercice: {
          annee: exercice.annee,
          dateDebut: exercice.date_debut,
          dateFin: exercice.date_fin,
          statut: exercice.statut
        },
        proprietaire: {
          nom: solde.nom,
          prenom: solde.prenom,
          appartement: solde.numero_appartement,
          milliemes: solde.milliemes,
          pourcentage: ((solde.milliemes / 1000) * 100).toFixed(2)
        },

        // Section A: Report À Nouveau
        reportANouveau: {
          solde: parseFloat(solde.solde_debut),
          type: parseFloat(solde.solde_debut) >= 0 ? 'créditeur' : 'débiteur'
        },

        // Section B: Charges de l'exercice
        charges: {
          detail: chargesResult.rows,
          total: parseFloat(solde.total_charges)
        },

        // Section C: Versements (provisions)
        versements: {
          detail: versementsResult.rows,
          total: parseFloat(solde.total_provisions)
        },

        // Section D: Ajustements
        ajustements: parseFloat(solde.total_ajustements),

        // Section E: Solde final
        soldeFinal: {
          montant: parseFloat(solde.solde_fin),
          type: parseFloat(solde.solde_fin) >= 0 ? 'créditeur' : 'débiteur',
          message: parseFloat(solde.solde_fin) >= 0 
            ? 'Ce solde sera reporté sur le prochain exercice'
            : 'Montant à régulariser'
        },

        // Comparaison avec l'immeuble
        comparaison: {
          totalChargesImmeuble: parseFloat(totauxImmeuble.rows[0].total_charges),
          partProprietaire: solde.total_charges > 0 
            ? ((parseFloat(solde.total_charges) / parseFloat(totauxImmeuble.rows[0].total_charges)) * 100).toFixed(2)
            : 0
        }
      }
    });

  } catch (error) {
    console.error('Error generating decompte annuel:', error);
    res.status(500).json({ error: 'Failed to generate decompte', message: error.message });
  }
}