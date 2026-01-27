import pool from '../config/database.js';

// GET ALL - Lister tous les fournisseurs d'un immeuble
export async function getAllFournisseurs(req, res) {
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

    // Récupérer les fournisseurs avec stats
    const result = await pool.query(
      `SELECT 
        f.*,
        COUNT(DISTINCT fa.id) as nombre_factures,
        COALESCE(SUM(fa.montant_total), 0) as total_factures
      FROM fournisseurs f
      LEFT JOIN factures fa ON f.id = fa.fournisseur_id
      WHERE f.immeuble_id = $1
      GROUP BY f.id
      ORDER BY f.nom ASC`,
      [immeubleId]
    );

    res.json({
      success: true,
      fournisseurs: result.rows,
      count: result.rows.length
    });
  } catch (error) {
    console.error('Error fetching fournisseurs:', error);
    res.status(500).json({ 
      error: 'Failed to fetch fournisseurs',
      message: error.message 
    });
  }
}

// GET ONE - Récupérer un fournisseur spécifique
export async function getFournisseur(req, res) {
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

    // Récupérer le fournisseur
    const result = await pool.query(
      `SELECT 
        f.*,
        COUNT(DISTINCT fa.id) as nombre_factures,
        COALESCE(SUM(fa.montant_total), 0) as total_factures
      FROM fournisseurs f
      LEFT JOIN factures fa ON f.id = fa.fournisseur_id
      WHERE f.id = $1 AND f.immeuble_id = $2
      GROUP BY f.id`,
      [id, immeubleId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ 
        error: 'Not found',
        message: 'Fournisseur not found' 
      });
    }

    res.json({
      success: true,
      fournisseur: result.rows[0]
    });
  } catch (error) {
    console.error('Error fetching fournisseur:', error);
    res.status(500).json({ 
      error: 'Failed to fetch fournisseur',
      message: error.message 
    });
  }
}

// CREATE - Créer un nouveau fournisseur
export async function createFournisseur(req, res) {
  const { immeubleId } = req.params;
  const {
    nom,
    type,
    email,
    telephone,
    iban,
    numeroTva,
    tags = []
  } = req.body;

  // Validation
  if (!nom) {
    return res.status(400).json({ 
      error: 'Validation error',
      message: 'nom is required' 
    });
  }

  // Types valides
  const validTypes = [
    'eau', 'chauffage', 'electricite', 'gaz', 'ascenseur', 
    'nettoyage', 'entretien', 'syndic', 'assurance', 'autre'
  ];

  if (type && !validTypes.includes(type)) {
    return res.status(400).json({ 
      error: 'Validation error',
      message: `type must be one of: ${validTypes.join(', ')}` 
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

    // Vérifier si un fournisseur avec le même nom existe déjà
    const existingCheck = await pool.query(
      'SELECT id FROM fournisseurs WHERE immeuble_id = $1 AND LOWER(nom) = LOWER($2)',
      [immeubleId, nom]
    );

    if (existingCheck.rows.length > 0) {
      return res.status(400).json({ 
        error: 'Duplicate',
        message: 'A fournisseur with this name already exists for this immeuble' 
      });
    }

    // Créer le fournisseur
    const result = await pool.query(
      `INSERT INTO fournisseurs (
        immeuble_id, nom, type, email, telephone, iban, numero_tva, tags
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *`,
      [immeubleId, nom, type, email, telephone, iban, numeroTva, tags]
    );

    const fournisseur = result.rows[0];

    console.log(`✅ Fournisseur created: ${nom} (${type}) by user ${req.user.email}`);

    res.status(201).json({
      success: true,
      message: 'Fournisseur created successfully',
      fournisseur
    });
  } catch (error) {
    console.error('Error creating fournisseur:', error);
    res.status(500).json({ 
      error: 'Failed to create fournisseur',
      message: error.message 
    });
  }
}

// UPDATE - Modifier un fournisseur
export async function updateFournisseur(req, res) {
  const { immeubleId, id } = req.params;
  const {
    nom,
    type,
    email,
    telephone,
    iban,
    numeroTva,
    tags
  } = req.body;

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

    // Vérifier que le fournisseur existe
    const fournisseurCheck = await pool.query(
      'SELECT id FROM fournisseurs WHERE id = $1 AND immeuble_id = $2',
      [id, immeubleId]
    );

    if (fournisseurCheck.rows.length === 0) {
      return res.status(404).json({ 
        error: 'Not found',
        message: 'Fournisseur not found' 
      });
    }

    // Mettre à jour
    const result = await pool.query(
      `UPDATE fournisseurs SET
        nom = COALESCE($1, nom),
        type = COALESCE($2, type),
        email = COALESCE($3, email),
        telephone = COALESCE($4, telephone),
        iban = COALESCE($5, iban),
        numero_tva = COALESCE($6, numero_tva),
        tags = COALESCE($7, tags),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $8 AND immeuble_id = $9
      RETURNING *`,
      [nom, type, email, telephone, iban, numeroTva, tags, id, immeubleId]
    );

    console.log(`✅ Fournisseur updated: ${id} by user ${req.user.email}`);

    res.json({
      success: true,
      message: 'Fournisseur updated successfully',
      fournisseur: result.rows[0]
    });
  } catch (error) {
    console.error('Error updating fournisseur:', error);
    res.status(500).json({ 
      error: 'Failed to update fournisseur',
      message: error.message 
    });
  }
}

// DELETE - Supprimer un fournisseur
export async function deleteFournisseur(req, res) {
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

    // Vérifier s'il y a des factures liées
    const facturesCheck = await pool.query(
      'SELECT COUNT(*) as count FROM factures WHERE fournisseur_id = $1',
      [id]
    );

    const facturesCount = parseInt(facturesCheck.rows[0].count);

    if (facturesCount > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete',
        message: `This fournisseur has ${facturesCount} facture(s) associated. Please delete or reassign them first.` 
      });
    }

    // Supprimer le fournisseur
    const result = await pool.query(
      'DELETE FROM fournisseurs WHERE id = $1 AND immeuble_id = $2 RETURNING id',
      [id, immeubleId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ 
        error: 'Not found',
        message: 'Fournisseur not found' 
      });
    }

    console.log(`✅ Fournisseur deleted: ${id} by user ${req.user.email}`);

    res.json({
      success: true,
      message: 'Fournisseur deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting fournisseur:', error);
    res.status(500).json({ 
      error: 'Failed to delete fournisseur',
      message: error.message 
    });
  }
}
// GET CATEGORIES - Liste des catégories disponibles
export async function getCategories(req, res) {
  const categories = [
    { value: 'eau', label: 'Eau', icon: '💧', color: 'blue' },
    { value: 'electricite', label: 'Électricité', icon: '⚡', color: 'yellow' },
    { value: 'gaz', label: 'Gaz', icon: '🔥', color: 'orange' },
    { value: 'chauffage', label: 'Chauffage', icon: '🔥', color: 'red' },
    { value: 'ascenseur', label: 'Ascenseur', icon: '🛗', color: 'gray' },
    { value: 'nettoyage', label: 'Nettoyage', icon: '🧹', color: 'green' },
    { value: 'assurance', label: 'Assurance', icon: '🛡️', color: 'purple' },
    { value: 'syndic', label: 'Syndic', icon: '🏢', color: 'indigo' },
    { value: 'entretien', label: 'Entretien', icon: '🔧', color: 'teal' },
    { value: 'reparations', label: 'Réparations', icon: '🛠️', color: 'amber' },
    { value: 'frais_bancaires', label: 'Frais bancaires', icon: '🏦', color: 'slate' },
    { value: 'taxes', label: 'Taxes', icon: '📋', color: 'rose' },
    { value: 'provision', label: 'Provision charges', icon: '💰', color: 'emerald' },
    { value: 'loyer', label: 'Loyer/Revenus', icon: '🏠', color: 'cyan' },
    { value: 'autre', label: 'Autre', icon: '📦', color: 'gray' }
  ];

  res.json({ success: true, categories });
}