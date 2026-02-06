import pool from '../config/database.js';

// ===== CHARGES RÉCURRENTES CRUD =====

// GET /api/v1/immeubles/:immeubleId/charges-recurrentes
export const getChargesRecurrentes = async (req, res) => {
  try {
    const { immeubleId } = req.params;
    const userId = req.user.id;

    // Vérifier accès à l'immeuble
    const immCheck = await pool.query(
      'SELECT id FROM immeubles WHERE id = $1 AND user_id = $2',
      [immeubleId, userId]
    );
    if (immCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Immeuble non trouvé' });
    }

    const result = await pool.query(`
      SELECT cr.*,
        COALESCE(
          json_agg(
            DISTINCT jsonb_build_object(
              'proprietaire_id', cre.proprietaire_id,
              'motif', cre.motif
            )
          ) FILTER (WHERE cre.id IS NOT NULL), '[]'
        ) as exclusions,
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
      GROUP BY cr.id
      ORDER BY 
        CASE cr.type 
          WHEN 'fonds_roulement' THEN 1
          WHEN 'fonds_reserve' THEN 2
          WHEN 'charges_speciales' THEN 3
          WHEN 'charges_generales' THEN 4
          WHEN 'frais_administration' THEN 5
        END,
        cr.created_at DESC
    `, [immeubleId]);

    res.json(result.rows);
  } catch (error) {
    console.error('Erreur getChargesRecurrentes:', error);
    res.status(500).json({ error: error.message });
  }
};

// POST /api/v1/immeubles/:immeubleId/charges-recurrentes
export const createChargeRecurrente = async (req, res) => {
  const client = await pool.connect();
  try {
    const { immeubleId } = req.params;
    const userId = req.user.id;

    // Vérifier accès
    const immCheck = await client.query(
      'SELECT id FROM immeubles WHERE id = $1 AND user_id = $2',
      [immeubleId, userId]
    );
    if (immCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Immeuble non trouvé' });
    }

    const {
      type, libelle, description, montantAnnuel, frequence,
      cleRepartition, dateDebut, dateFin, exclusions, quotesParts
    } = req.body;

    await client.query('BEGIN');

    // Créer la charge
    const result = await client.query(`
      INSERT INTO charges_recurrentes 
        (immeuble_id, type, libelle, description, montant_annuel, frequence, cle_repartition, date_debut, date_fin)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `, [immeubleId, type, libelle, description, montantAnnuel, frequence || 'trimestriel', cleRepartition || 'milliemes', dateDebut || null, dateFin || null]);

    const charge = result.rows[0];

    // Ajouter exclusions
    if (exclusions && exclusions.length > 0) {
      for (const exc of exclusions) {
        await client.query(`
          INSERT INTO charges_recurrentes_exclusions (charge_id, proprietaire_id, motif)
          VALUES ($1, $2, $3)
        `, [charge.id, exc.proprietaireId, exc.motif || null]);
      }
    }

    // Ajouter quotes-parts custom
    if (cleRepartition === 'custom' && quotesParts && quotesParts.length > 0) {
      for (const qp of quotesParts) {
        await client.query(`
          INSERT INTO charges_recurrentes_quotesparts (charge_id, proprietaire_id, quote_part)
          VALUES ($1, $2, $3)
        `, [charge.id, qp.proprietaireId, qp.quotePart]);
      }
    }

    await client.query('COMMIT');
    res.status(201).json(charge);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Erreur createChargeRecurrente:', error);
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
};

// PUT /api/v1/immeubles/:immeubleId/charges-recurrentes/:chargeId
export const updateChargeRecurrente = async (req, res) => {
  const client = await pool.connect();
  try {
    const { immeubleId, chargeId } = req.params;
    const userId = req.user.id;

    // Vérifier accès
    const immCheck = await client.query(
      'SELECT id FROM immeubles WHERE id = $1 AND user_id = $2',
      [immeubleId, userId]
    );
    if (immCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Immeuble non trouvé' });
    }

    const {
      type, libelle, description, montantAnnuel, frequence,
      cleRepartition, actif, dateDebut, dateFin, exclusions, quotesParts
    } = req.body;

    await client.query('BEGIN');

    const result = await client.query(`
      UPDATE charges_recurrentes SET
        type = COALESCE($1, type),
        libelle = COALESCE($2, libelle),
        description = COALESCE($3, description),
        montant_annuel = COALESCE($4, montant_annuel),
        frequence = COALESCE($5, frequence),
        cle_repartition = COALESCE($6, cle_repartition),
        actif = COALESCE($7, actif),
        date_debut = $8,
        date_fin = $9,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $10 AND immeuble_id = $11
      RETURNING *
    `, [type, libelle, description, montantAnnuel, frequence, cleRepartition, actif, dateDebut || null, dateFin || null, chargeId, immeubleId]);

    if (result.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Charge non trouvée' });
    }

    // Remplacer exclusions
    if (exclusions !== undefined) {
      await client.query('DELETE FROM charges_recurrentes_exclusions WHERE charge_id = $1', [chargeId]);
      for (const exc of exclusions) {
        await client.query(`
          INSERT INTO charges_recurrentes_exclusions (charge_id, proprietaire_id, motif)
          VALUES ($1, $2, $3)
        `, [chargeId, exc.proprietaireId, exc.motif || null]);
      }
    }

    // Remplacer quotes-parts
    if (quotesParts !== undefined) {
      await client.query('DELETE FROM charges_recurrentes_quotesparts WHERE charge_id = $1', [chargeId]);
      if (cleRepartition === 'custom') {
        for (const qp of quotesParts) {
          await client.query(`
            INSERT INTO charges_recurrentes_quotesparts (charge_id, proprietaire_id, quote_part)
            VALUES ($1, $2, $3)
          `, [chargeId, qp.proprietaireId, qp.quotePart]);
        }
      }
    }

    await client.query('COMMIT');
    res.json(result.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Erreur updateChargeRecurrente:', error);
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
};

// DELETE /api/v1/immeubles/:immeubleId/charges-recurrentes/:chargeId
export const deleteChargeRecurrente = async (req, res) => {
  try {
    const { immeubleId, chargeId } = req.params;
    const userId = req.user.id;

    const immCheck = await pool.query(
      'SELECT id FROM immeubles WHERE id = $1 AND user_id = $2',
      [immeubleId, userId]
    );
    if (immCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Immeuble non trouvé' });
    }

    const result = await pool.query(
      'DELETE FROM charges_recurrentes WHERE id = $1 AND immeuble_id = $2 RETURNING id',
      [chargeId, immeubleId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Charge non trouvée' });
    }

    res.json({ success: true, message: 'Charge supprimée' });
  } catch (error) {
    console.error('Erreur deleteChargeRecurrente:', error);
    res.status(500).json({ error: error.message });
  }
};

// ===== CALCUL RÉPARTITION =====

// GET /api/v1/immeubles/:immeubleId/charges-recurrentes/repartition
// Calcule la répartition de toutes les charges actives par propriétaire
export const getRepartitionCharges = async (req, res) => {
  try {
    const { immeubleId } = req.params;
    const userId = req.user.id;

    // Vérifier accès
    const immCheck = await pool.query(
      'SELECT id, nombre_total_parts FROM immeubles WHERE id = $1 AND user_id = $2',
      [immeubleId, userId]
    );
    if (immCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Immeuble non trouvé' });
    }

    const totalMilliemes = immCheck.rows[0].nombre_total_parts || 1000;

    // Récupérer propriétaires
    const propResult = await pool.query(
      'SELECT id, nom, prenom, milliemes FROM proprietaires WHERE immeuble_id = $1 ORDER BY nom',
      [immeubleId]
    );
    const proprietaires = propResult.rows;

    // Récupérer charges actives avec exclusions et quotes-parts
    const chargesResult = await pool.query(`
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
      WHERE cr.immeuble_id = $1 AND cr.actif = true
        AND (cr.date_fin IS NULL OR cr.date_fin >= CURRENT_DATE)
      GROUP BY cr.id
    `, [immeubleId]);

    const charges = chargesResult.rows;

    // Calculer répartition par propriétaire
    const repartition = proprietaires.map(prop => {
      let totalAnnuel = 0;
      const detailCharges = [];

      for (const charge of charges) {
        // Vérifier exclusion
        if (charge.excluded_proprietaires.includes(prop.id)) {
          continue;
        }

        let montantProprio = 0;
        const montantAnnuel = parseFloat(charge.montant_annuel);

        if (charge.cle_repartition === 'milliemes') {
          // Calcul par millièmes (en excluant les millièmes des exclus)
          const propConcernes = proprietaires.filter(
            p => !charge.excluded_proprietaires.includes(p.id)
          );
          const totalMilliemesConcernes = propConcernes.reduce(
            (sum, p) => sum + (parseFloat(p.milliemes) || 0), 0
          );
          
          if (totalMilliemesConcernes > 0) {
            montantProprio = montantAnnuel * (parseFloat(prop.milliemes) || 0) / totalMilliemesConcernes;
          }
        } else if (charge.cle_repartition === 'egalitaire') {
          // Répartition égalitaire entre propriétaires non exclus
          const nbConcernes = proprietaires.filter(
            p => !charge.excluded_proprietaires.includes(p.id)
          ).length;
          
          if (nbConcernes > 0) {
            montantProprio = montantAnnuel / nbConcernes;
          }
        } else if (charge.cle_repartition === 'custom') {
          // Quote-part custom
          const qp = charge.quotes_parts.find(
            q => q.proprietaire_id === prop.id
          );
          if (qp) {
            montantProprio = montantAnnuel * parseFloat(qp.quote_part) / 100;
          }
        }

        if (montantProprio > 0) {
          totalAnnuel += montantProprio;
          
          // Calcul par fréquence
          let diviseur = 12; // mensuel
          if (charge.frequence === 'trimestriel') diviseur = 4;
          else if (charge.frequence === 'semestriel') diviseur = 2;
          else if (charge.frequence === 'annuel') diviseur = 1;

          detailCharges.push({
            chargeId: charge.id,
            type: charge.type,
            libelle: charge.libelle,
            montantAnnuel: Math.round(montantProprio * 100) / 100,
            montantPeriodique: Math.round((montantProprio / diviseur) * 100) / 100,
            frequence: charge.frequence
          });
        }
      }

      return {
        proprietaireId: prop.id,
        nom: prop.nom,
        prenom: prop.prenom,
        milliemes: prop.milliemes,
        totalAnnuel: Math.round(totalAnnuel * 100) / 100,
        totalMensuel: Math.round((totalAnnuel / 12) * 100) / 100,
        charges: detailCharges
      };
    });

    // Totaux globaux par type
    const totaux = {
      fondsRoulement: charges.filter(c => c.type === 'fonds_roulement').reduce((s, c) => s + parseFloat(c.montant_annuel), 0),
      fondsReserve: charges.filter(c => c.type === 'fonds_reserve').reduce((s, c) => s + parseFloat(c.montant_annuel), 0),
      chargesSpeciales: charges.filter(c => c.type === 'charges_speciales').reduce((s, c) => s + parseFloat(c.montant_annuel), 0),
      chargesGenerales: charges.filter(c => c.type === 'charges_generales').reduce((s, c) => s + parseFloat(c.montant_annuel), 0),
      fraisAdministration: charges.filter(c => c.type === 'frais_administration').reduce((s, c) => s + parseFloat(c.montant_annuel), 0),
    };
    totaux.total = Object.values(totaux).reduce((s, v) => s + v, 0);

    res.json({
      repartition,
      totaux,
      totalMilliemes,
      nbProprietaires: proprietaires.length,
      nbChargesActives: charges.length
    });
  } catch (error) {
    console.error('Erreur getRepartitionCharges:', error);
    res.status(500).json({ error: error.message });
  }
};

// ===== GÉNÉRATION APPELS DE CHARGES =====

// POST /api/v1/immeubles/:immeubleId/charges-recurrentes/generer-appels
export const genererAppelsCharges = async (req, res) => {
  const client = await pool.connect();
  try {
    const { immeubleId } = req.params;
    const userId = req.user.id;
    const { annee, trimestre, mois } = req.body; // On génère pour une période

    const immCheck = await client.query(
      'SELECT id, nombre_total_parts FROM immeubles WHERE id = $1 AND user_id = $2',
      [immeubleId, userId]
    );
    if (immCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Immeuble non trouvé' });
    }

    // Récupérer propriétaires et charges actives
    const propResult = await client.query(
      'SELECT id, nom, prenom, milliemes FROM proprietaires WHERE immeuble_id = $1',
      [immeubleId]
    );
    const proprietaires = propResult.rows;

    const chargesResult = await client.query(`
      SELECT cr.*,
        COALESCE(array_agg(DISTINCT cre.proprietaire_id) FILTER (WHERE cre.id IS NOT NULL), '{}') as excluded_proprietaires,
        COALESCE(
          json_agg(DISTINCT jsonb_build_object('proprietaire_id', crq.proprietaire_id, 'quote_part', crq.quote_part))
          FILTER (WHERE crq.id IS NOT NULL), '[]'
        ) as quotes_parts
      FROM charges_recurrentes cr
      LEFT JOIN charges_recurrentes_exclusions cre ON cr.id = cre.charge_id
      LEFT JOIN charges_recurrentes_quotesparts crq ON cr.id = crq.charge_id
      WHERE cr.immeuble_id = $1 AND cr.actif = true
        AND (cr.date_fin IS NULL OR cr.date_fin >= CURRENT_DATE)
      GROUP BY cr.id
    `, [immeubleId]);

    await client.query('BEGIN');
    let appelsGeneres = 0;

    for (const charge of chargesResult.rows) {
      // Déterminer période selon fréquence
      let periodeDebut, periodeFin, dateEcheance;
      const an = annee || new Date().getFullYear();

      if (charge.frequence === 'mensuel' && mois) {
        periodeDebut = `${an}-${String(mois).padStart(2, '0')}-01`;
        const lastDay = new Date(an, mois, 0).getDate();
        periodeFin = `${an}-${String(mois).padStart(2, '0')}-${lastDay}`;
        dateEcheance = periodeDebut;
      } else if (charge.frequence === 'trimestriel' && trimestre) {
        const moisDebut = (trimestre - 1) * 3 + 1;
        const moisFin = trimestre * 3;
        periodeDebut = `${an}-${String(moisDebut).padStart(2, '0')}-01`;
        const lastDay = new Date(an, moisFin, 0).getDate();
        periodeFin = `${an}-${String(moisFin).padStart(2, '0')}-${lastDay}`;
        dateEcheance = periodeDebut;
      } else if (charge.frequence === 'annuel') {
        periodeDebut = `${an}-01-01`;
        periodeFin = `${an}-12-31`;
        dateEcheance = periodeDebut;
      } else {
        continue; // Skip si période non applicable
      }

      const montantAnnuel = parseFloat(charge.montant_annuel);
      let diviseur = 12;
      if (charge.frequence === 'trimestriel') diviseur = 4;
      else if (charge.frequence === 'semestriel') diviseur = 2;
      else if (charge.frequence === 'annuel') diviseur = 1;

      const montantPeriode = montantAnnuel / diviseur;

      for (const prop of proprietaires) {
        if (charge.excluded_proprietaires.includes(prop.id)) continue;

        let montantProprio = 0;
        if (charge.cle_repartition === 'milliemes') {
          const propConcernes = proprietaires.filter(p => !charge.excluded_proprietaires.includes(p.id));
          const totalMilliemesConcernes = propConcernes.reduce((s, p) => s + (parseFloat(p.milliemes) || 0), 0);
          if (totalMilliemesConcernes > 0) {
            montantProprio = montantPeriode * (parseFloat(prop.milliemes) || 0) / totalMilliemesConcernes;
          }
        } else if (charge.cle_repartition === 'egalitaire') {
          const nbConcernes = proprietaires.filter(p => !charge.excluded_proprietaires.includes(p.id)).length;
          if (nbConcernes > 0) montantProprio = montantPeriode / nbConcernes;
        } else if (charge.cle_repartition === 'custom') {
          const qp = charge.quotes_parts.find(q => q.proprietaire_id === prop.id);
          if (qp) montantProprio = montantPeriode * parseFloat(qp.quote_part) / 100;
        }

        if (montantProprio > 0) {
          // Vérifier doublon
          const existing = await client.query(`
            SELECT id FROM appels_charges 
            WHERE charge_recurrente_id = $1 AND proprietaire_id = $2 
              AND periode_debut = $3 AND periode_fin = $4
          `, [charge.id, prop.id, periodeDebut, periodeFin]);

          if (existing.rows.length === 0) {
            await client.query(`
              INSERT INTO appels_charges 
                (charge_recurrente_id, proprietaire_id, periode_debut, periode_fin, montant_appele, date_echeance)
              VALUES ($1, $2, $3, $4, $5, $6)
            `, [charge.id, prop.id, periodeDebut, periodeFin, Math.round(montantProprio * 100) / 100, dateEcheance]);
            appelsGeneres++;
          }
        }
      }
    }

    await client.query('COMMIT');
    res.json({ success: true, appelsGeneres });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Erreur genererAppelsCharges:', error);
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
};

// GET /api/v1/immeubles/:immeubleId/appels-charges
export const getAppelsCharges = async (req, res) => {
  try {
    const { immeubleId } = req.params;
    const userId = req.user.id;
    const { annee, proprietaireId, statut } = req.query;

    const immCheck = await pool.query(
      'SELECT id FROM immeubles WHERE id = $1 AND user_id = $2',
      [immeubleId, userId]
    );
    if (immCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Immeuble non trouvé' });
    }

    let query = `
      SELECT ac.*, 
        cr.type as charge_type, cr.libelle as charge_libelle, cr.frequence,
        p.nom as proprietaire_nom, p.prenom as proprietaire_prenom
      FROM appels_charges ac
      JOIN charges_recurrentes cr ON ac.charge_recurrente_id = cr.id
      JOIN proprietaires p ON ac.proprietaire_id = p.id
      WHERE cr.immeuble_id = $1
    `;
    const params = [immeubleId];
    let paramIndex = 2;

    if (annee) {
      query += ` AND EXTRACT(YEAR FROM ac.periode_debut) = $${paramIndex}`;
      params.push(annee);
      paramIndex++;
    }
    if (proprietaireId) {
      query += ` AND ac.proprietaire_id = $${paramIndex}`;
      params.push(proprietaireId);
      paramIndex++;
    }
    if (statut) {
      query += ` AND ac.statut = $${paramIndex}`;
      params.push(statut);
      paramIndex++;
    }

    query += ' ORDER BY ac.periode_debut DESC, p.nom';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Erreur getAppelsCharges:', error);
    res.status(500).json({ error: error.message });
  }
};
