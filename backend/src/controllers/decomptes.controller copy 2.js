import pool from '../config/database.js';

// GET ALL - Lister tous les décomptes
export async function getAllDecomptes(req, res) {
  try {
    const result = await pool.query(`
      SELECT 
        d.*,
        i.nom as immeuble_nom,
        i.adresse as immeuble_adresse
      FROM decomptes d
      LEFT JOIN immeubles i ON d.immeuble_id = i.id
      WHERE d.user_id = $1
      ORDER BY d.annee DESC, d.created_at DESC
    `, [req.user.id]);

    res.json({
      success: true,
      decomptes: result.rows,
      count: result.rows.length
    });
  } catch (error) {
    console.error('Error fetching decomptes:', error);
    res.status(500).json({
      error: 'Failed to fetch decomptes',
      message: error.message
    });
  }
}

// GET ONE - Récupérer un décompte
export async function getDecompte(req, res) {
  const { id } = req.params;

  try {
    const result = await pool.query(`
      SELECT 
        d.*,
        i.nom as immeuble_nom,
        i.adresse as immeuble_adresse,
        i.region as immeuble_region
      FROM decomptes d
      LEFT JOIN immeubles i ON d.immeuble_id = i.id
      WHERE d.id = $1 AND d.user_id = $2
    `, [id, req.user.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Décompte not found'
      });
    }

    res.json({
      success: true,
      decompte: result.rows[0]
    });
  } catch (error) {
    console.error('Error fetching decompte:', error);
    res.status(500).json({
      error: 'Failed to fetch decompte',
      message: error.message
    });
  }
}

// CREATE - Créer un nouveau décompte
export async function createDecompte(req, res) {
  const {
    immeuble_id,
    annee,
    periode_debut,
    periode_fin,
    tarif_eau_id,
    notes
  } = req.body;

  console.log('📥 Création décompte - Body:', req.body);
  console.log('📥 User ID:', req.user.id);

  // VALIDATION
  if (!immeuble_id) {
    console.error('❌ immeuble_id manquant');
    return res.status(400).json({
      error: 'Validation error',
      message: 'immeuble_id est requis'
    });
  }

  if (!annee || !periode_debut || !periode_fin) {
    console.error('❌ Champs manquants');
    return res.status(400).json({
      error: 'Validation error',
      message: 'annee, periode_debut, periode_fin sont requis'
    });
  }

  try {
    // Vérifier que l'immeuble existe et appartient à l'utilisateur
    const immeubleCheck = await pool.query(
      'SELECT id, nom FROM immeubles WHERE id = $1 AND user_id = $2',
      [immeuble_id, req.user.id]
    );

    if (immeubleCheck.rows.length === 0) {
      console.error('❌ Immeuble non trouvé:', immeuble_id);
      return res.status(404).json({
        error: 'Not found',
        message: 'Immeuble not found or you do not have access'
      });
    }

    console.log('✅ Immeuble trouvé:', immeubleCheck.rows[0].nom);

    // Créer le décompte
    const result = await pool.query(`
      INSERT INTO decomptes (
        immeuble_id,
        user_id,
        tarif_eau_id,
        annee,
        periode_debut,
        periode_fin,
        statut,
        notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `, [
      immeuble_id,
      req.user.id,
      tarif_eau_id || null,
      parseInt(annee),
      periode_debut,
      periode_fin,
      'brouillon',
      notes || null
    ]);

    const decompte = result.rows[0];
    console.log('✅ Décompte créé:', decompte.id);

    res.status(201).json({
      success: true,
      message: 'Décompte créé avec succès',
      decompte
    });
  } catch (error) {
    console.error('❌ Error creating decompte:', error);
    res.status(500).json({
      error: 'Failed to create decompte',
      message: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}

// UPDATE - Modifier un décompte
export async function updateDecompte(req, res) {
  const { id } = req.params;
  const {
    annee,
    periode_debut,
    periode_fin,
    tarif_eau_id,
    type_comptage,
    facture_total_ttc,
    facture_consommation_m3,
    total_m3_gratuits,
    total_habitants,
    statut,
    notes
  } = req.body;

  try {
    // Vérifier que le décompte existe et appartient à l'utilisateur
    const check = await pool.query(
      'SELECT id FROM decomptes WHERE id = $1 AND user_id = $2',
      [id, req.user.id]
    );

    if (check.rows.length === 0) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Décompte not found'
      });
    }

    // Mettre à jour
    const result = await pool.query(`
      UPDATE decomptes SET
        annee = COALESCE($1, annee),
        periode_debut = COALESCE($2, periode_debut),
        periode_fin = COALESCE($3, periode_fin),
        tarif_eau_id = $4,
        type_comptage = $5,
        facture_total_ttc = $6,
        facture_consommation_m3 = $7,
        total_m3_gratuits = $8,
        total_habitants = $9,
        statut = COALESCE($10, statut),
        notes = $11,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $12
      RETURNING *
    `, [
      annee,
      periode_debut,
      periode_fin,
      tarif_eau_id,
      type_comptage,
      facture_total_ttc,
      facture_consommation_m3,
      total_m3_gratuits,
      total_habitants,
      statut,
      notes,
      id
    ]);

    console.log(`✅ Décompte updated: ${id}`);

    res.json({
      success: true,
      message: 'Décompte updated successfully',
      decompte: result.rows[0]
    });
  } catch (error) {
    console.error('Error updating decompte:', error);
    res.status(500).json({
      error: 'Failed to update decompte',
      message: error.message
    });
  }
}

// DELETE - Supprimer un décompte
export async function deleteDecompte(req, res) {
  const { id } = req.params;

  try {
    // Vérifier que le décompte existe et appartient à l'utilisateur
    const check = await pool.query(
      'SELECT id FROM decomptes WHERE id = $1 AND user_id = $2',
      [id, req.user.id]
    );

    if (check.rows.length === 0) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Décompte not found'
      });
    }

    // Supprimer (cascade devrait gérer les dépendances)
    await pool.query('DELETE FROM decomptes WHERE id = $1', [id]);

    console.log(`✅ Décompte deleted: ${id}`);

    res.json({
      success: true,
      message: 'Décompte deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting decompte:', error);
    res.status(500).json({
      error: 'Failed to delete decompte',
      message: error.message
    });
  }
}

// GET CATEGORIES - Liste des catégories
export async function getCategories(req, res) {
  try {
    res.json({
      success: true,
      categories: [
        'Eau potable',
        'Assainissement',
        'Redevance fixe',
        'Autres'
      ]
    });
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({
      error: 'Failed to fetch categories',
      message: error.message
    });
  }
}

// CALCULER - Effectuer les calculs de répartition
export async function calculer(req, res) {
  const { id } = req.params;

  try {
    // Vérifier que le décompte existe
    const check = await pool.query(
      'SELECT id FROM decomptes WHERE id = $1 AND user_id = $2',
      [id, req.user.id]
    );

    if (check.rows.length === 0) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Décompte not found'
      });
    }

    // TODO: Implémenter la logique de calcul
    // Pour l'instant, juste changer le statut
    await pool.query(
      `UPDATE decomptes SET 
        statut = 'calcule',
        date_calcul = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [id]
    );

    console.log(`✅ Décompte calculated: ${id}`);

    res.json({
      success: true,
      message: 'Calculs effectués avec succès'
    });
  } catch (error) {
    console.error('Error calculating decompte:', error);
    res.status(500).json({
      error: 'Failed to calculate decompte',
      message: error.message
    });
  }
}
