import pool from '../config/database.js';

// GET ALL DECOMPTES
export const getAllDecomptes = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT d.*, i.nom as immeuble_nom
       FROM decomptes d
       LEFT JOIN immeubles i ON d.immeuble_id = i.id
       WHERE d.user_id = $1
       ORDER BY d.created_at DESC`,
      [req.user.id]
    );

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
};

// GET ONE DECOMPTE (alias pour compatibilité)
export const getDecompte = async (req, res) => {
  return getDecompteById(req, res);
};

// GET DECOMPTE BY ID
export const getDecompteById = async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query(
      `SELECT d.*, i.nom as immeuble_nom
       FROM decomptes d
       LEFT JOIN immeubles i ON d.immeuble_id = i.id
       WHERE d.id = $1 AND d.user_id = $2`,
      [id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ 
        error: 'Not found',
        message: 'Décompte not found or you do not have access' 
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
};

// CREATE DECOMPTE
export const createDecompte = async (req, res) => {
  const {
    immeuble_id,
    nom,
    annee,
    periode_debut,
    periode_fin,
    mode_comptage_eau,
    numero_compteur_principal,
    tarif_distribution,
    tarif_assainissement,
    redevance_fixe_annuelle,
    tva_pourcent
  } = req.body;

  // Validation
  if (!immeuble_id || !annee || !periode_debut || !periode_fin) {
    return res.status(400).json({ 
      error: 'Validation error',
      message: 'immeuble_id, annee, periode_debut and periode_fin are required' 
    });
  }

  try {
    // Vérifier que l'immeuble appartient à l'utilisateur
    const immeubleCheck = await pool.query(
      'SELECT id FROM immeubles WHERE id = $1 AND user_id = $2',
      [immeuble_id, req.user.id]
    );

    if (immeubleCheck.rows.length === 0) {
      return res.status(404).json({ 
        error: 'Not found',
        message: 'Immeuble not found or you do not have access' 
      });
    }

    // Créer le décompte
    const result = await pool.query(
      `INSERT INTO decomptes (
        user_id, immeuble_id, nom, annee, 
        periode_debut, periode_fin, 
        mode_comptage_eau, numero_compteur_principal,
        tarif_distribution, tarif_assainissement, 
        redevance_fixe_annuelle, tva_pourcent,
        statut
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *`,
      [
        req.user.id, immeuble_id, nom, annee,
        periode_debut, periode_fin,
        mode_comptage_eau, numero_compteur_principal,
        tarif_distribution, tarif_assainissement,
        redevance_fixe_annuelle, tva_pourcent || 6.0,
        'brouillon'
      ]
    );

    console.log(`✅ Décompte created: ${nom} (${annee}) by user ${req.user.email}`);

    res.status(201).json({
      success: true,
      message: 'Décompte created successfully',
      decompte: result.rows[0]
    });
  } catch (error) {
    console.error('Error creating decompte:', error);
    res.status(500).json({ 
      error: 'Failed to create decompte',
      message: error.message 
    });
  }
};

// UPDATE DECOMPTE
export const updateDecompte = async (req, res) => {
  const { id } = req.params;
  const {
    nom,
    annee,
    periode_debut,
    periode_fin,
    mode_comptage_eau,
    numero_compteur_principal,
    tarif_distribution,
    tarif_assainissement,
    redevance_fixe_annuelle,
    tva_pourcent,
    statut
  } = req.body;

  try {
    // Vérifier ownership
    const existing = await pool.query(
      'SELECT * FROM decomptes WHERE id = $1 AND user_id = $2',
      [id, req.user.id]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({ 
        error: 'Not found',
        message: 'Décompte not found or you do not have access' 
      });
    }

    const oldDecompte = existing.rows[0];

    // Ne pas permettre la modification si validé ou clôturé
    if (oldDecompte.statut === 'valide' || oldDecompte.statut === 'cloture') {
      return res.status(403).json({ 
        error: 'Forbidden',
        message: 'Cannot modify a validated or closed décompte' 
      });
    }

    // Mettre à jour
    const result = await pool.query(
      `UPDATE decomptes SET
        nom = COALESCE($1, nom),
        annee = COALESCE($2, annee),
        periode_debut = COALESCE($3, periode_debut),
        periode_fin = COALESCE($4, periode_fin),
        mode_comptage_eau = COALESCE($5, mode_comptage_eau),
        numero_compteur_principal = COALESCE($6, numero_compteur_principal),
        tarif_distribution = COALESCE($7, tarif_distribution),
        tarif_assainissement = COALESCE($8, tarif_assainissement),
        redevance_fixe_annuelle = COALESCE($9, redevance_fixe_annuelle),
        tva_pourcent = COALESCE($10, tva_pourcent),
        statut = COALESCE($11, statut),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $12 AND user_id = $13
      RETURNING *`,
      [
        nom, annee, periode_debut, periode_fin,
        mode_comptage_eau, numero_compteur_principal,
        tarif_distribution, tarif_assainissement,
        redevance_fixe_annuelle, tva_pourcent, statut,
        id, req.user.id
      ]
    );

    console.log(`✅ Décompte updated: ${id} by user ${req.user.email}`);

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
};

// DELETE DECOMPTE
export const deleteDecompte = async (req, res) => {
  const { id } = req.params;

  try {
    // Vérifier ownership
    const existing = await pool.query(
      'SELECT * FROM decomptes WHERE id = $1 AND user_id = $2',
      [id, req.user.id]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({ 
        error: 'Not found',
        message: 'Décompte not found or you do not have access' 
      });
    }

    // Supprimer
    await pool.query('DELETE FROM decomptes WHERE id = $1', [id]);

    console.log(`✅ Décompte deleted: ${id} by user ${req.user.email}`);

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
};

// GET CATEGORIES (si nécessaire)
export const getCategories = async (req, res) => {
  try {
    // Retourner des catégories statiques pour l'instant
    const categories = [
      { id: 'eau', nom: 'Eau', description: 'Décomptes de consommation d\'eau' }
    ];

    res.json({
      success: true,
      categories
    });
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ 
      error: 'Failed to fetch categories',
      message: error.message 
    });
  }
};

// VALIDATE DECOMPTE
export const validate = async (req, res) => {
  const { id } = req.params;

  try {
    // Vérifier ownership
    const check = await pool.query(
      'SELECT * FROM decomptes WHERE id = $1 AND user_id = $2',
      [id, req.user.id]
    );

    if (check.rows.length === 0) {
      return res.status(404).json({ 
        error: 'Not found',
        message: 'Décompte not found or you do not have access' 
      });
    }

    const decompte = check.rows[0];

    // Vérifier que le décompte n'est pas déjà validé
    if (decompte.statut === 'valide' || decompte.statut === 'cloture') {
      return res.status(400).json({ 
        error: 'Already validated',
        message: 'Décompte is already validated or closed' 
      });
    }

    // Valider
    const result = await pool.query(
      `UPDATE decomptes SET 
        statut = 'valide',
        date_validation = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING *`,
      [id]
    );

    console.log(`✅ Décompte validated: ${id} by user ${req.user.email}`);

    res.json({
      success: true,
      message: 'Décompte validé avec succès',
      decompte: result.rows[0]
    });
  } catch (error) {
    console.error('Error validating decompte:', error);
    res.status(500).json({ 
      error: 'Failed to validate decompte',
      message: error.message 
    });
  }
};

// CALCULER DECOMPTE (stub pour futur développement)
export const calculer = async (req, res) => {
  const { id } = req.params;
  
  try {
    // Vérifier ownership
    const check = await pool.query(
      'SELECT * FROM decomptes WHERE id = $1 AND user_id = $2',
      [id, req.user.id]
    );

    if (check.rows.length === 0) {
      return res.status(404).json({ 
        error: 'Not found',
        message: 'Décompte not found' 
      });
    }

    // TODO: Implémenter la logique de calcul réelle
    console.log('Calcul du décompte:', id);
    
    res.json({
      success: true,
      message: 'Calcul effectué (fonctionnalité en développement)',
      decompte_id: id
    });
  } catch (error) {
    console.error('Error calculating decompte:', error);
    res.status(500).json({
      error: 'Failed to calculate decompte',
      message: error.message
    });
  }
};
