import pool from '../config/database.js';

// ============================================
// GET ALL - Lister tous les exercices d'un immeuble
// ============================================
export async function getAllExercices(req, res) {
  const { immeubleId } = req.params;

  try {
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
    const immeubleCheck = await pool.query(
      'SELECT id FROM immeubles WHERE id = $1 AND user_id = $2 AND archived_at IS NULL',
      [immeubleId, req.user.id]
    );

    if (immeubleCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Not found', message: 'Immeuble not found' });
    }

    const exerciceResult = await pool.query(
      'SELECT * FROM exercices WHERE id = $1 AND immeuble_id = $2',
      [id, immeubleId]
    );

    if (exerciceResult.rows.length === 0) {
      return res.status(404).json({ error: 'Not found', message: 'Exercice not found' });
    }

    const exercice = exerciceResult.rows[0];

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

    // ✅ NOUVEAU: Récupérer le résumé des appels de charges récurrentes
    let appelsChargesStats = { total_appele: 0, total_paye: 0, nb_appels: 0 };
    try {
      const acStats = await pool.query(`
        SELECT 
          COALESCE(SUM(montant_appele), 0) as total_appele,
          COALESCE(SUM(montant_paye), 0) as total_paye,
          COUNT(*) as nb_appels
        FROM appels_charges
        WHERE exercice_id = $1
      `, [id]);
      appelsChargesStats = acStats.rows[0];
    } catch (e) {
      // Table might not exist yet
    }

    res.json({
      success: true,
      exercice: {
        ...exercice,
        soldes: soldesResult.rows,
        appels: appelsResult.rows,
        stats: statsResult.rows[0],
        appelsChargesStats
      }
    });
  } catch (error) {
    console.error('Error fetching exercice:', error);
    res.status(500).json({ error: 'Failed to fetch exercice', message: error.message });
  }
}

// ============================================
// CREATE - Créer un nouvel exercice avec report automatique
// + ✅ GÉNÉRATION AUTOMATIQUE DES APPELS DE CHARGES
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

  if (!annee || !dateDebut || !dateFin) {
    return res.status(400).json({ 
      error: 'Validation error',
      message: 'annee, dateDebut, and dateFin are required' 
    });
  }

  try {
    const immeubleCheck = await pool.query(
      'SELECT id, nombre_total_parts FROM immeubles WHERE id = $1 AND user_id = $2 AND archived_at IS NULL',
      [immeubleId, req.user.id]
    );

    if (immeubleCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Not found', message: 'Immeuble not found' });
    }

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

    // Récupérer l'exercice précédent CLÔTURÉ pour le RAN
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

    // =====================================================
    // ✅ GÉNÉRATION AUTOMATIQUE DES APPELS DE CHARGES
    // =====================================================
    let appelsGeneres = 0;
    let chargesTraitees = 0;

    try {
      // Récupérer toutes les charges récurrentes actives de l'immeuble
      const chargesActives = await pool.query(`
        SELECT cr.*,
          COALESCE(
            array_agg(DISTINCT cre.proprietaire_id) FILTER (WHERE cre.id IS NOT NULL), '{}'
          ) as excluded_proprietaires,
          COALESCE(
            json_agg(
              DISTINCT jsonb_build_object(
                'proprietaire_id', crq.proprietaire_id,
                'quote_part', crq.quote_part
              )
            ) FILTER (WHERE crq.id IS NOT NULL), '[]'
          ) as quotes_parts
        FROM charges_recurrentes cr
        LEFT JOIN charges_recurrentes_exclusions cre ON cr.id = cre.charge_id
        LEFT JOIN charges_recurrentes_quotesparts crq ON cr.id = crq.charge_id
        WHERE cr.immeuble_id = $1 
          AND cr.actif = true
          AND (cr.date_debut IS NULL OR cr.date_debut <= $2)
          AND (cr.date_fin IS NULL OR cr.date_fin >= $3)
        GROUP BY cr.id
      `, [immeubleId, dateFin, dateDebut]);

      chargesTraitees = chargesActives.rows.length;

      for (const charge of chargesActives.rows) {
        const montantAnnuel = parseFloat(charge.montant_annuel);
        if (!montantAnnuel || montantAnnuel <= 0) continue;

        let periodes = [];
        const yr = parseInt(annee);

        // Calculer les périodes selon la fréquence
        if (charge.frequence === 'mensuel') {
          for (let m = 1; m <= 12; m++) {
            const lastDay = new Date(yr, m, 0).getDate();
            periodes.push({
              debut: `${yr}-${String(m).padStart(2, '0')}-01`,
              fin: `${yr}-${String(m).padStart(2, '0')}-${lastDay}`,
              montant: montantAnnuel / 12
            });
          }
        } else if (charge.frequence === 'trimestriel') {
          for (let t = 1; t <= 4; t++) {
            const moisDebut = (t - 1) * 3 + 1;
            const moisFin = t * 3;
            const lastDay = new Date(yr, moisFin, 0).getDate();
            periodes.push({
              debut: `${yr}-${String(moisDebut).padStart(2, '0')}-01`,
              fin: `${yr}-${String(moisFin).padStart(2, '0')}-${lastDay}`,
              montant: montantAnnuel / 4
            });
          }
        } else if (charge.frequence === 'semestriel') {
          periodes = [
            { debut: `${yr}-01-01`, fin: `${yr}-06-30`, montant: montantAnnuel / 2 },
            { debut: `${yr}-07-01`, fin: `${yr}-12-31`, montant: montantAnnuel / 2 },
          ];
        } else if (charge.frequence === 'annuel') {
          periodes = [
            { debut: `${yr}-01-01`, fin: `${yr}-12-31`, montant: montantAnnuel },
          ];
        }

        // Calculer les propriétaires concernés (hors exclus)
        const excludedIds = Array.isArray(charge.excluded_proprietaires) 
          ? charge.excluded_proprietaires 
          : [];

        const propsConcernes = proprietairesResult.rows.filter(
          p => !excludedIds.includes(p.id)
        );

        const totalMilliemesConcernes = propsConcernes.reduce(
          (sum, p) => sum + (parseFloat(p.milliemes) || 0), 0
        );

        // Parse les quotes-parts custom
        let quotesPartsMap = {};
        if (charge.cle_repartition === 'custom' && Array.isArray(charge.quotes_parts)) {
          charge.quotes_parts.forEach(qp => {
            if (qp && qp.proprietaire_id) {
              quotesPartsMap[qp.proprietaire_id] = parseFloat(qp.quote_part) || 0;
            }
          });
        }

        // Pour chaque période, créer un appel par propriétaire concerné
        for (const periode of periodes) {
          for (const prop of propsConcernes) {
            let montantProprio = 0;

            if (charge.cle_repartition === 'milliemes') {
              if (totalMilliemesConcernes > 0) {
                montantProprio = periode.montant * (parseFloat(prop.milliemes) || 0) / totalMilliemesConcernes;
              }
            } else if (charge.cle_repartition === 'egalitaire') {
              montantProprio = periode.montant / propsConcernes.length;
            } else if (charge.cle_repartition === 'custom') {
              const qp = quotesPartsMap[prop.id];
              if (qp) montantProprio = periode.montant * qp / 100;
            }

            if (montantProprio > 0.005) { // Seuil minimum 0.01€
              await pool.query(`
                INSERT INTO appels_charges 
                  (charge_recurrente_id, proprietaire_id, exercice_id,
                   periode_debut, periode_fin, montant_appele, date_echeance, statut)
                VALUES ($1, $2, $3, $4, $5, $6, $7, 'en_attente')
              `, [
                charge.id, prop.id, exercice.id,
                periode.debut, periode.fin,
                Math.round(montantProprio * 100) / 100, 
                periode.debut
              ]);
              appelsGeneres++;
            }
          }
        }
      }

      console.log(`✅ Exercice ${annee}: ${appelsGeneres} appels de charges générés à partir de ${chargesTraitees} charges`);

    } catch (chargeErr) {
      // Si la table n'existe pas encore ou erreur, on continue quand même
      console.log(`⚠️ Génération appels de charges: ${chargeErr.message}`);
    }

    await pool.query('COMMIT');

    console.log(`✅ Exercice ${annee} created for immeuble ${immeubleId} with ${ranReporte} RAN reports`);

    res.status(201).json({
      success: true,
      message: `Exercice ${annee} créé avec report des soldes`,
      exercice,
      proprietairesInitialises: proprietairesResult.rows.length,
      ranReporte: ranReporte > 0,
      appelsCharges: {
        chargesTraitees,
        appelsGeneres
      }
    });

  } catch (error) {
    await pool.query('ROLLBACK');
    console.error('Error creating exercice:', error);
    res.status(500).json({ error: 'Failed to create exercice', message: error.message });
  }
}

// ============================================
// GET SOLDE PROPRIETAIRE
// ============================================
export async function getSoldeProprietaire(req, res) {
  const { immeubleId, exerciceId, proprietaireId } = req.params;

  try {
    const immeubleCheck = await pool.query(
      'SELECT id FROM immeubles WHERE id = $1 AND user_id = $2 AND archived_at IS NULL',
      [immeubleId, req.user.id]
    );

    if (immeubleCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Not found', message: 'Immeuble not found' });
    }

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
// CLÔTURER EXERCICE
// ============================================
export async function cloturerExercice(req, res) {
  const { immeubleId, id } = req.params;
  const { notesCloture, dateAgApprobation, pvAgReference } = req.body;

  try {
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

    const proprietairesResult = await pool.query(`
      SELECT id, nom, prenom, COALESCE(milliemes, 0) as milliemes
      FROM proprietaires 
      WHERE immeuble_id = $1 AND actif = true
    `, [immeubleId]);
    
    const proprietaires = proprietairesResult.rows;
    const totalMilliemes = proprietaires.reduce((sum, p) => sum + parseFloat(p.milliemes || 0), 0);

    console.log(`📊 Clôture ${annee}: ${proprietaires.length} propriétaires, ${totalMilliemes} millièmes total`);

    const chargesResult = await pool.query(`
      SELECT COALESCE(SUM(ABS(montant)), 0) as total
      FROM transactions 
      WHERE immeuble_id = $1 
        AND EXTRACT(YEAR FROM date_transaction) = $2
        AND type = 'charge'
    `, [immeubleId, annee]);
    
    const totalCharges = parseFloat(chargesResult.rows[0].total || 0);

    const soldesCalcules = [];

    for (const prop of proprietaires) {
      const milliemes = parseFloat(prop.milliemes || 0);
      const pourcentage = totalMilliemes > 0 ? milliemes / totalMilliemes : 0;

      const ranResult = await pool.query(`
        SELECT COALESCE(solde_debut, 0) as ran
        FROM soldes_exercices 
        WHERE exercice_id = $1 AND proprietaire_id = $2
      `, [id, prop.id]);
      
      const ran = parseFloat(ranResult.rows[0]?.ran || 0);

      const depotsResult = await pool.query(`
        SELECT COALESCE(SUM(ABS(montant)), 0) as total
        FROM transactions 
        WHERE immeuble_id = $1 
          AND EXTRACT(YEAR FROM date_transaction) = $2
          AND type != 'charge'
          AND proprietaire_id = $3
      `, [immeubleId, annee, prop.id]);
      
      const depots = parseFloat(depotsResult.rows[0].total || 0);
      const chargesProprietaire = totalCharges * pourcentage;

      // ✅ Inclure aussi les appels de charges récurrentes
      let totalAppeleCharges = 0;
      let totalPayeCharges = 0;
      try {
        const acResult = await pool.query(`
          SELECT 
            COALESCE(SUM(montant_appele), 0) as total_appele,
            COALESCE(SUM(montant_paye), 0) as total_paye
          FROM appels_charges
          WHERE proprietaire_id = $1 AND exercice_id = $2
        `, [prop.id, id]);
        totalAppeleCharges = parseFloat(acResult.rows[0].total_appele || 0);
        totalPayeCharges = parseFloat(acResult.rows[0].total_paye || 0);
      } catch (e) { /* table might not exist */ }

      const soldeFin = ran + depots + totalPayeCharges - chargesProprietaire - totalAppeleCharges;

      soldesCalcules.push({
        proprietaire_id: prop.id,
        nom: `${prop.prenom || ''} ${prop.nom}`.trim(),
        milliemes,
        ran,
        depots,
        charges: chargesProprietaire,
        appelsChargesAppele: totalAppeleCharges,
        appelsChargesPaye: totalPayeCharges,
        solde_fin: soldeFin
      });

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
      `, [id, prop.id, ran, depots + totalPayeCharges, chargesProprietaire + totalAppeleCharges, soldeFin]);
    }

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

    // Reporter les soldes vers l'exercice suivant
    const nextYear = annee + 1;
    
    let exerciceSuivantResult = await pool.query(
      'SELECT id FROM exercices WHERE immeuble_id = $1 AND annee = $2',
      [immeubleId, nextYear]
    );

    let exerciceSuivantId;
    let exerciceSuivantCree = false;

    if (exerciceSuivantResult.rows.length === 0) {
      const createResult = await pool.query(`
        INSERT INTO exercices (immeuble_id, annee, date_debut, date_fin, statut)
        VALUES ($1, $2, $3, $4, 'ouvert')
        RETURNING id
      `, [immeubleId, nextYear, `${nextYear}-01-01`, `${nextYear}-12-31`]);
      
      exerciceSuivantId = createResult.rows[0].id;
      exerciceSuivantCree = true;
    } else {
      exerciceSuivantId = exerciceSuivantResult.rows[0].id;
    }

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
// RECALCULER RAN
// ============================================
export async function recalculerRAN(req, res) {
  const { immeubleId, id } = req.params;

  try {
    const exerciceCheck = await pool.query(`
      SELECT e.* FROM exercices e
      JOIN immeubles i ON e.immeuble_id = i.id
      WHERE e.id = $1 AND i.id = $2 AND i.user_id = $3
    `, [id, immeubleId, req.user.id]);

    if (exerciceCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Not found', message: 'Exercice not found' });
    }

    const exercice = exerciceCheck.rows[0];

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

  if (!libelle || !dateAppel || !dateEcheance || !montantTotal) {
    return res.status(400).json({ 
      error: 'Validation error',
      message: 'libelle, dateAppel, dateEcheance, and montantTotal are required' 
    });
  }

  try {
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

    let appelNumero = numero;
    if (!appelNumero) {
      const countResult = await pool.query(
        'SELECT COUNT(*) as count FROM appels_fonds WHERE exercice_id = $1 AND type = $2',
        [exerciceId, type]
      );
      appelNumero = parseInt(countResult.rows[0].count) + 1;
    }

    const appelResult = await pool.query(`
      INSERT INTO appels_fonds (
        exercice_id, type, numero, libelle,
        date_appel, date_echeance, montant_total
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `, [exerciceId, type, appelNumero, libelle, dateAppel, dateEcheance, montantTotal]);

    const appel = appelResult.rows[0];

    const proprietairesResult = await pool.query(
      'SELECT id, milliemes FROM proprietaires WHERE immeuble_id = $1 AND actif = true',
      [immeubleId]
    );

    const totalMilliemes = proprietairesResult.rows.reduce(
      (sum, p) => sum + parseInt(p.milliemes), 0
    );

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
    
    let nouveauStatut = 'partiel';
    if (nouveauMontantPaye >= parseFloat(appelProp.montant_du)) {
      nouveauStatut = 'paye';
    }

    await pool.query(`
      UPDATE appels_proprietaires SET
        montant_paye = $1,
        statut = $2,
        date_paiement = $3,
        transaction_id = $4,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $5
    `, [nouveauMontantPaye, nouveauStatut, datePaiement, transactionId, appelProp.id]);

    await pool.query(`
      UPDATE soldes_exercices SET
        total_provisions = total_provisions + $1
      WHERE exercice_id = $2 AND proprietaire_id = $3
    `, [montant, appelProp.exercice_id, proprietaireId]);

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
// DÉCOMPTE ANNUEL - ✅ ENRICHI avec 3 sections de fonds
// ============================================
export async function getDecompteAnnuel(req, res) {
  const { immeubleId, exerciceId, proprietaireId } = req.params;

  try {
    const check = await pool.query(`
      SELECT e.*, i.nom as immeuble_nom, i.adresse as immeuble_adresse, 
             i.nombre_total_parts
      FROM exercices e
      JOIN immeubles i ON e.immeuble_id = i.id
      WHERE e.id = $1 AND i.id = $2 AND i.user_id = $3
    `, [exerciceId, immeubleId, req.user.id]);

    if (check.rows.length === 0) {
      return res.status(404).json({ error: 'Not found' });
    }

    const exercice = check.rows[0];

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
    const totalMilliemes = parseInt(exercice.nombre_total_parts) || 1000;

    // =====================================================
    // ✅ NOUVEAU: Récupérer appels de charges par type de fonds
    // =====================================================
    let fondsRoulement = { appels: [], chargesGroupees: [], totalAppele: 0, totalPaye: 0, solde: 0 };
    let fondsReserve = { appels: [], chargesGroupees: [], totalAppele: 0, totalPaye: 0, solde: 0 };
    let chargesSpeciales = { appels: [], chargesGroupees: [], totalAppele: 0, totalPaye: 0, solde: 0 };

    try {
      const appelsResult = await pool.query(`
        SELECT 
          cr.type as charge_type,
          cr.libelle as charge_libelle,
          cr.montant_annuel as charge_montant_annuel,
          cr.frequence,
          ac.periode_debut,
          ac.periode_fin,
          ac.montant_appele,
          ac.montant_paye,
          ac.statut,
          ac.date_echeance
        FROM appels_charges ac
        JOIN charges_recurrentes cr ON ac.charge_recurrente_id = cr.id
        WHERE ac.proprietaire_id = $1
          AND ac.exercice_id = $2
        ORDER BY cr.type, ac.periode_debut
      `, [proprietaireId, exerciceId]);

      // Structurer par type
      const fondsMap = {
        fonds_roulement: fondsRoulement,
        fonds_reserve: fondsReserve,
        charges_speciales: chargesSpeciales,
      };

      for (const appel of appelsResult.rows) {
        const fonds = fondsMap[appel.charge_type];
        if (!fonds) continue;

        const item = {
          libelle: appel.charge_libelle,
          periodeDebut: appel.periode_debut,
          periodeFin: appel.periode_fin,
          montantAppele: parseFloat(appel.montant_appele),
          montantPaye: parseFloat(appel.montant_paye),
          statut: appel.statut,
          frequence: appel.frequence,
          montantAnnuelCharge: parseFloat(appel.charge_montant_annuel),
        };

        fonds.appels.push(item);
        fonds.totalAppele += item.montantAppele;
        fonds.totalPaye += item.montantPaye;
      }

      // Grouper par charge (libellé) pour affichage condensé
      const groupByCharge = (fonds) => {
        const grouped = {};
        fonds.appels.forEach(a => {
          if (!grouped[a.libelle]) {
            grouped[a.libelle] = {
              libelle: a.libelle,
              montantAnnuelCharge: a.montantAnnuelCharge,
              frequence: a.frequence,
              periodes: [],
              totalAppele: 0,
              totalPaye: 0,
            };
          }
          grouped[a.libelle].periodes.push(a);
          grouped[a.libelle].totalAppele += a.montantAppele;
          grouped[a.libelle].totalPaye += a.montantPaye;
        });
        return Object.values(grouped);
      };

      fondsRoulement.chargesGroupees = groupByCharge(fondsRoulement);
      fondsRoulement.solde = fondsRoulement.totalPaye - fondsRoulement.totalAppele;
      fondsReserve.chargesGroupees = groupByCharge(fondsReserve);
      fondsReserve.solde = fondsReserve.totalPaye - fondsReserve.totalAppele;
      chargesSpeciales.chargesGroupees = groupByCharge(chargesSpeciales);
      chargesSpeciales.solde = chargesSpeciales.totalPaye - chargesSpeciales.totalAppele;

    } catch (e) {
      console.log('⚠️ appels_charges query failed:', e.message);
    }

    // =====================================================
    // Charges comptables classiques (hors appels récurrents)
    // =====================================================
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

    // Versements classiques (appels de fonds manuels)
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

    // Totaux immeuble pour comparaison
    const totauxImmeuble = await pool.query(`
      SELECT 
        SUM(se.total_provisions) as total_provisions,
        SUM(se.total_charges) as total_charges
      FROM soldes_exercices se
      WHERE se.exercice_id = $1
    `, [exerciceId]);

    // Calcul du solde final
    const ran = parseFloat(solde.solde_debut) || 0;
    const totalAppeleGlobal = fondsRoulement.totalAppele + fondsReserve.totalAppele + chargesSpeciales.totalAppele;
    const totalPayeGlobal = fondsRoulement.totalPaye + fondsReserve.totalPaye + chargesSpeciales.totalPaye;
    const chargesComptables = parseFloat(solde.total_charges) || 0;
    const versementsTotal = parseFloat(solde.total_provisions) || 0;
    const ajustements = parseFloat(solde.total_ajustements) || 0;

    const soldeFinal = parseFloat(solde.solde_fin) || 0;

    res.json({
      success: true,
      decompte: {
        // En-tête
        immeuble: {
          nom: exercice.immeuble_nom,
          adresse: exercice.immeuble_adresse,
          totalMilliemes,
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
          pourcentage: ((solde.milliemes / totalMilliemes) * 100).toFixed(2)
        },

        // Section A: Report À Nouveau
        reportANouveau: {
          solde: ran,
          type: ran >= 0 ? 'créditeur' : 'débiteur'
        },

        // ✅ NOUVEAU: Sections B1/B2/B3 par type de fonds
        fondsRoulement,
        fondsReserve,
        chargesSpeciales,

        // Section C: Charges comptables classiques
        charges: {
          detail: chargesResult.rows,
          total: chargesComptables
        },

        // Section D: Versements classiques
        versements: {
          detail: versementsResult.rows,
          total: versementsTotal
        },

        // Section E: Ajustements
        ajustements,

        // Section F: Solde final
        soldeFinal: {
          montant: soldeFinal,
          type: soldeFinal >= 0 ? 'créditeur' : 'débiteur',
          message: soldeFinal >= 0 
            ? 'Ce solde sera reporté sur le prochain exercice'
            : 'Montant à régulariser'
        },

        // Récapitulatif global
        recapitulatif: {
          ran,
          totalAppeleChargesRecurrentes: Math.round(totalAppeleGlobal * 100) / 100,
          totalPayeChargesRecurrentes: Math.round(totalPayeGlobal * 100) / 100,
          chargesComptables: Math.round(chargesComptables * 100) / 100,
          versementsClassiques: Math.round(versementsTotal * 100) / 100,
          ajustements: Math.round(ajustements * 100) / 100,
          soldeFinal: Math.round(soldeFinal * 100) / 100,
        },

        // Comparaison
        comparaison: {
          totalChargesImmeuble: parseFloat(totauxImmeuble.rows[0]?.total_charges || 0),
          partProprietaire: solde.total_charges > 0 
            ? ((parseFloat(solde.total_charges) / parseFloat(totauxImmeuble.rows[0]?.total_charges || 1)) * 100).toFixed(2)
            : 0
        }
      }
    });

  } catch (error) {
    console.error('Error generating decompte annuel:', error);
    res.status(500).json({ error: 'Failed to generate decompte', message: error.message });
  }
}

// ============================================
// ✅ NOUVEAU: BILAN CHARGES RÉCURRENTES PAR ANNÉE
// GET /api/v1/immeubles/:immeubleId/exercices/:exerciceId/bilan-charges
// ============================================
export async function getBilanCharges(req, res) {
  const { immeubleId, exerciceId } = req.params;

  try {
    const immCheck = await pool.query(
      'SELECT id, nombre_total_parts FROM immeubles WHERE id = $1 AND user_id = $2',
      [immeubleId, req.user.id]
    );
    if (immCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Immeuble non trouvé' });
    }

    const exerciceCheck = await pool.query(
      'SELECT * FROM exercices WHERE id = $1 AND immeuble_id = $2',
      [exerciceId, immeubleId]
    );
    if (exerciceCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Exercice non trouvé' });
    }

    const annee = exerciceCheck.rows[0].annee;

    const appelsResult = await pool.query(`
      SELECT 
        cr.type as charge_type,
        cr.libelle as charge_libelle,
        cr.montant_annuel,
        cr.frequence,
        cr.cle_repartition,
        ac.proprietaire_id,
        p.nom as proprietaire_nom,
        p.prenom as proprietaire_prenom,
        p.milliemes,
        SUM(ac.montant_appele) as total_appele,
        SUM(ac.montant_paye) as total_paye,
        COUNT(ac.id) as nb_periodes,
        COUNT(CASE WHEN ac.statut = 'paye' THEN 1 END) as nb_payees,
        COUNT(CASE WHEN ac.statut = 'en_retard' THEN 1 END) as nb_retard
      FROM appels_charges ac
      JOIN charges_recurrentes cr ON ac.charge_recurrente_id = cr.id
      JOIN proprietaires p ON ac.proprietaire_id = p.id
      WHERE ac.exercice_id = $1
      GROUP BY cr.id, cr.type, cr.libelle, cr.montant_annuel, cr.frequence, cr.cle_repartition,
               ac.proprietaire_id, p.nom, p.prenom, p.milliemes
      ORDER BY 
        CASE cr.type 
          WHEN 'fonds_roulement' THEN 1
          WHEN 'fonds_reserve' THEN 2
          WHEN 'charges_speciales' THEN 3
        END,
        p.nom
    `, [exerciceId]);

    // Structurer par type de fonds
    const bilanParType = {
      fonds_roulement: { label: 'Fonds de roulement', charges: [], totalAppele: 0, totalPaye: 0 },
      fonds_reserve: { label: 'Fonds de réserve', charges: [], totalAppele: 0, totalPaye: 0 },
      charges_speciales: { label: 'Charges spéciales', charges: [], totalAppele: 0, totalPaye: 0 },
    };

    const bilanParProprietaire = {};

    for (const row of appelsResult.rows) {
      const type = row.charge_type;
      const appele = parseFloat(row.total_appele) || 0;
      const paye = parseFloat(row.total_paye) || 0;

      if (bilanParType[type]) {
        bilanParType[type].charges.push({
          libelle: row.charge_libelle,
          proprietaireId: row.proprietaire_id,
          proprietaireNom: `${row.proprietaire_prenom || ''} ${row.proprietaire_nom}`.trim(),
          milliemes: row.milliemes,
          totalAppele: appele,
          totalPaye: paye,
          solde: paye - appele,
          nbPeriodes: parseInt(row.nb_periodes),
          nbPayees: parseInt(row.nb_payees),
          nbRetard: parseInt(row.nb_retard),
        });
        bilanParType[type].totalAppele += appele;
        bilanParType[type].totalPaye += paye;
      }

      if (!bilanParProprietaire[row.proprietaire_id]) {
        bilanParProprietaire[row.proprietaire_id] = {
          proprietaireId: row.proprietaire_id,
          nom: row.proprietaire_nom,
          prenom: row.proprietaire_prenom,
          milliemes: row.milliemes,
          fondsRoulement: { appele: 0, paye: 0 },
          fondsReserve: { appele: 0, paye: 0 },
          chargesSpeciales: { appele: 0, paye: 0 },
          totalAppele: 0,
          totalPaye: 0,
        };
      }

      const bp = bilanParProprietaire[row.proprietaire_id];
      if (type === 'fonds_roulement') { bp.fondsRoulement.appele += appele; bp.fondsRoulement.paye += paye; }
      else if (type === 'fonds_reserve') { bp.fondsReserve.appele += appele; bp.fondsReserve.paye += paye; }
      else if (type === 'charges_speciales') { bp.chargesSpeciales.appele += appele; bp.chargesSpeciales.paye += paye; }
      bp.totalAppele += appele;
      bp.totalPaye += paye;
    }

    const totalGlobal = {
      appele: Object.values(bilanParType).reduce((s, t) => s + t.totalAppele, 0),
      paye: Object.values(bilanParType).reduce((s, t) => s + t.totalPaye, 0),
    };
    totalGlobal.solde = totalGlobal.paye - totalGlobal.appele;

    res.json({
      annee: parseInt(annee),
      bilanParType,
      bilanParProprietaire: Object.values(bilanParProprietaire),
      totalGlobal,
    });
  } catch (error) {
    console.error('Erreur getBilanCharges:', error);
    res.status(500).json({ error: error.message });
  }
}
