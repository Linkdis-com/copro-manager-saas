import pool from '../config/database.js';

// GET ALL - Lister toutes les factures d'un immeuble
export async function getAllFactures(req, res) {
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

    // Récupérer les factures avec infos fournisseur
    const result = await pool.query(
      `SELECT 
        f.*,
        fo.nom as fournisseur_nom,
        fo.type as fournisseur_type
      FROM factures f
      LEFT JOIN fournisseurs fo ON f.fournisseur_id = fo.id
      WHERE f.immeuble_id = $1
      ORDER BY f.date_facture DESC, f.created_at DESC`,
      [immeubleId]
    );

    res.json({
      success: true,
      factures: result.rows,
      count: result.rows.length
    });
  } catch (error) {
    console.error('Error fetching factures:', error);
    res.status(500).json({ 
      error: 'Failed to fetch factures',
      message: error.message 
    });
  }
}

// GET ONE - Récupérer une facture avec sa répartition
export async function getFacture(req, res) {
  const { immeubleId, id } = req.params;

  try {
    // Vérifier que l'immeuble appartient à l'utilisateur
    const immeubleCheck = await pool.query(
      'SELECT id FROM immeubles WHERE id = $1 AND user_id = $2 AND archived_at IS NULL',
      [immeubleId, req.user.id]
    );

    if (immeubleCheck.rows.length === 0) {
      return res.status(404).json({ 
        error: 'Not found',
        message: 'Immeuble not found' 
      });
    }

    // Récupérer la facture
    const factureResult = await pool.query(
      `SELECT 
        f.*,
        fo.nom as fournisseur_nom,
        fo.type as fournisseur_type
      FROM factures f
      LEFT JOIN fournisseurs fo ON f.fournisseur_id = fo.id
      WHERE f.id = $1 AND f.immeuble_id = $2`,
      [id, immeubleId]
    );

    if (factureResult.rows.length === 0) {
      return res.status(404).json({ 
        error: 'Not found',
        message: 'Facture not found' 
      });
    }

    const facture = factureResult.rows[0];

    // Récupérer la répartition
    const repartitionResult = await pool.query(
      `SELECT 
        fr.*,
        p.nom as proprietaire_nom,
        p.prenom as proprietaire_prenom,
        p.numero_appartement
      FROM factures_repartition fr
      JOIN proprietaires p ON fr.proprietaire_id = p.id
      WHERE fr.facture_id = $1
      ORDER BY p.nom ASC`,
      [id]
    );

    res.json({
      success: true,
      facture: {
        ...facture,
        repartition: repartitionResult.rows
      }
    });
  } catch (error) {
    console.error('Error fetching facture:', error);
    res.status(500).json({ 
      error: 'Failed to fetch facture',
      message: error.message 
    });
  }
}

// CREATE - Créer une nouvelle facture avec répartition automatique
export async function createFacture(req, res) {
  const { immeubleId } = req.params;
  const {
    fournisseurId,
    numeroFacture,
    dateFacture,
    dateEcheance,
    montantTotal,
    description,
    modeRepartition = 'auto' // auto, manuel, unique
  } = req.body;

  // Validation
  if (!dateFacture || !montantTotal) {
    return res.status(400).json({ 
      error: 'Validation error',
      message: 'dateFacture and montantTotal are required' 
    });
  }

  if (montantTotal <= 0) {
    return res.status(400).json({ 
      error: 'Validation error',
      message: 'montantTotal must be greater than 0' 
    });
  }

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

    // Si fournisseur spécifié, vérifier qu'il existe
    if (fournisseurId) {
      const fournisseurCheck = await pool.query(
        'SELECT id FROM fournisseurs WHERE id = $1 AND immeuble_id = $2',
        [fournisseurId, immeubleId]
      );

      if (fournisseurCheck.rows.length === 0) {
        return res.status(404).json({ 
          error: 'Not found',
          message: 'Fournisseur not found' 
        });
      }
    }

    // Commencer une transaction
    await pool.query('BEGIN');

    // Créer la facture
    const factureResult = await pool.query(
      `INSERT INTO factures (
        immeuble_id, fournisseur_id, numero_facture, date_facture,
        date_echeance, montant_total, mode_repartition, description
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *`,
      [
        immeubleId, fournisseurId, numeroFacture, dateFacture,
        dateEcheance, montantTotal, modeRepartition, description
      ]
    );

    const facture = factureResult.rows[0];

    // RÉPARTITION AUTOMATIQUE selon les millièmes
    if (modeRepartition === 'auto') {
      // Récupérer les propriétaires actifs avec leurs millièmes
      const proprietairesResult = await pool.query(
        'SELECT id, nom, prenom, milliemes FROM proprietaires WHERE immeuble_id = $1 AND actif = true',
        [immeubleId]
      );

      const proprietaires = proprietairesResult.rows;

      if (proprietaires.length === 0) {
        await pool.query('ROLLBACK');
        return res.status(400).json({ 
          error: 'No active proprietaires',
          message: 'Cannot create facture: no active propriétaires found for this immeuble' 
        });
      }

      // Calculer la répartition
      const repartitions = [];
      for (const proprio of proprietaires) {
        const pourcentage = (proprio.milliemes / 1000) * 100;
        const montant = (montantTotal * proprio.milliemes) / 1000;

        // Insérer dans factures_repartition
        const repartitionResult = await pool.query(
          `INSERT INTO factures_repartition (
            facture_id, proprietaire_id, montant, pourcentage
          ) VALUES ($1, $2, $3, $4)
          RETURNING *`,
          [facture.id, proprio.id, montant.toFixed(2), pourcentage.toFixed(2)]
        );

        repartitions.push({
          ...repartitionResult.rows[0],
          proprietaire_nom: proprio.nom,
          proprietaire_prenom: proprio.prenom
        });
      }

      // Valider la transaction
      await pool.query('COMMIT');

      console.log(`✅ Facture created with auto repartition: ${facture.id} (${montantTotal}€) by user ${req.user.email}`);

      res.status(201).json({
        success: true,
        message: 'Facture created successfully with automatic repartition',
        facture: {
          ...facture,
          repartition: repartitions
        }
      });
    } else {
      // Mode manuel ou unique : pas de répartition automatique
      await pool.query('COMMIT');

      console.log(`✅ Facture created (${modeRepartition}): ${facture.id} by user ${req.user.email}`);

      res.status(201).json({
        success: true,
        message: 'Facture created successfully',
        facture
      });
    }
  } catch (error) {
    await pool.query('ROLLBACK');
    console.error('Error creating facture:', error);
    res.status(500).json({ 
      error: 'Failed to create facture',
      message: error.message 
    });
  }
}

// UPDATE - Modifier le statut d'une facture
export async function updateFacture(req, res) {
  const { immeubleId, id } = req.params;
  const { statut, dateEcheance, description } = req.body;

  // Statuts valides
  const validStatuts = ['pending', 'paid', 'partial', 'overdue'];
  
  if (statut && !validStatuts.includes(statut)) {
    return res.status(400).json({ 
      error: 'Validation error',
      message: `statut must be one of: ${validStatuts.join(', ')}` 
    });
  }

  try {
    // Vérifier que l'immeuble appartient à l'utilisateur
    const immeubleCheck = await pool.query(
      'SELECT id FROM immeubles WHERE id = $1 AND user_id = $2 AND archived_at IS NULL',
      [immeubleId, req.user.id]
    );

    if (immeubleCheck.rows.length === 0) {
      return res.status(404).json({ 
        error: 'Not found',
        message: 'Immeuble not found' 
      });
    }

    // Vérifier que la facture existe
    const factureCheck = await pool.query(
      'SELECT id FROM factures WHERE id = $1 AND immeuble_id = $2',
      [id, immeubleId]
    );

    if (factureCheck.rows.length === 0) {
      return res.status(404).json({ 
        error: 'Not found',
        message: 'Facture not found' 
      });
    }

    // Mettre à jour
    const result = await pool.query(
      `UPDATE factures SET
        statut = COALESCE($1, statut),
        date_echeance = COALESCE($2, date_echeance),
        description = COALESCE($3, description),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $4 AND immeuble_id = $5
      RETURNING *`,
      [statut, dateEcheance, description, id, immeubleId]
    );

    console.log(`✅ Facture updated: ${id} (statut: ${statut}) by user ${req.user.email}`);

    res.json({
      success: true,
      message: 'Facture updated successfully',
      facture: result.rows[0]
    });
  } catch (error) {
    console.error('Error updating facture:', error);
    res.status(500).json({ 
      error: 'Failed to update facture',
      message: error.message 
    });
  }
}

// DELETE - Supprimer une facture
export async function deleteFacture(req, res) {
  const { immeubleId, id } = req.params;

  try {
    // Vérifier que l'immeuble appartient à l'utilisateur
    const immeubleCheck = await pool.query(
      'SELECT id FROM immeubles WHERE id = $1 AND user_id = $2 AND archived_at IS NULL',
      [immeubleId, req.user.id]
    );

    if (immeubleCheck.rows.length === 0) {
      return res.status(404).json({ 
        error: 'Not found',
        message: 'Immeuble not found' 
      });
    }

    // Commencer une transaction
    await pool.query('BEGIN');

    // Supprimer la répartition d'abord (CASCADE devrait le faire, mais on le fait explicitement)
    await pool.query(
      'DELETE FROM factures_repartition WHERE facture_id = $1',
      [id]
    );

    // Supprimer la facture
    const result = await pool.query(
      'DELETE FROM factures WHERE id = $1 AND immeuble_id = $2 RETURNING id',
      [id, immeubleId]
    );

    if (result.rows.length === 0) {
      await pool.query('ROLLBACK');
      return res.status(404).json({ 
        error: 'Not found',
        message: 'Facture not found' 
      });
    }

    await pool.query('COMMIT');

    console.log(`✅ Facture deleted: ${id} by user ${req.user.email}`);

    res.json({
      success: true,
      message: 'Facture deleted successfully'
    });
  } catch (error) {
    await pool.query('ROLLBACK');
    console.error('Error deleting facture:', error);
    res.status(500).json({ 
      error: 'Failed to delete facture',
      message: error.message 
    });
  }
}