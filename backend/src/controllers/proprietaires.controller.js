import pool from '../config/database.js';

// GET ALL - Lister tous les propriétaires d'un immeuble
export async function getAllProprietaires(req, res) {
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

    // Récupérer les propriétaires
    const result = await pool.query(
      `SELECT 
        p.*,
        ROUND((p.milliemes::numeric / 1000) * 100, 2) as pourcentage
      FROM proprietaires p
      WHERE p.immeuble_id = $1
      ORDER BY p.actif DESC, p.nom ASC`,
      [immeubleId]
    );

    // Calculer le total des millièmes
    const totalMilliemes = result.rows
      .filter(p => p.actif)
      .reduce((sum, p) => sum + parseInt(p.milliemes), 0);

    res.json({
      success: true,
      proprietaires: result.rows,
      count: result.rows.length,
      totalMilliemes: totalMilliemes,
      milliemesValid: totalMilliemes === 1000
    });
  } catch (error) {
    console.error('Error fetching proprietaires:', error);
    res.status(500).json({ 
      error: 'Failed to fetch proprietaires',
      message: error.message 
    });
  }
}

// GET ONE - Récupérer un propriétaire spécifique
export async function getProprietaire(req, res) {
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

    // Récupérer le propriétaire
    const result = await pool.query(
      `SELECT 
        p.*,
        ROUND((p.milliemes::numeric / 1000) * 100, 2) as pourcentage
      FROM proprietaires p
      WHERE p.id = $1 AND p.immeuble_id = $2`,
      [id, immeubleId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ 
        error: 'Not found',
        message: 'Propriétaire not found' 
      });
    }

    res.json({
      success: true,
      proprietaire: result.rows[0]
    });
  } catch (error) {
    console.error('Error fetching proprietaire:', error);
    res.status(500).json({ 
      error: 'Failed to fetch proprietaire',
      message: error.message 
    });
  }
}

// CREATE - Créer un nouveau propriétaire
export async function createProprietaire(req, res) {
  const { immeubleId } = req.params;
  const {
    nom,
    prenom,
    email,
    telephone,
    milliemes,
    numeroAppartement,
    dateDebut,
    dateFin,
    actif = true
  } = req.body;

  // Validation
  if (!nom || !milliemes) {
    return res.status(400).json({ 
      error: 'Validation error',
      message: 'nom and milliemes are required' 
    });
  }

  if (milliemes < 1 || milliemes > 1000) {
    return res.status(400).json({ 
      error: 'Validation error',
      message: 'milliemes must be between 1 and 1000' 
    });
  }

  try {
    // Vérifier que l'immeuble appartient à l'utilisateur
    const immeubleCheck = await pool.query(
      'SELECT * FROM immeubles WHERE id = $1 AND user_id = $2 AND archived_at IS NULL',
      [immeubleId, req.user.id]
    );

    if (immeubleCheck.rows.length === 0) {
      return res.status(404).json({ 
        error: 'Not found',
        message: 'Immeuble not found or you do not have access' 
      });
    }

    const immeuble = immeubleCheck.rows[0];

    // Vérifier le nombre de propriétaires actifs (= nombre d'unités)
    const countResult = await pool.query(
      'SELECT COUNT(*) as count FROM proprietaires WHERE immeuble_id = $1 AND actif = true',
      [immeubleId]
    );

    const currentCount = parseInt(countResult.rows[0].count);

    if (actif && currentCount >= immeuble.nombre_appartements) {
      return res.status(400).json({ 
        error: 'Limit reached',
        message: `This immeuble has ${immeuble.nombre_appartements} apartments. You already have ${currentCount} active propriétaires.` 
      });
    }

    // Vérifier que le total des millièmes ne dépasse pas 1000
    if (actif) {
      const totalResult = await pool.query(
        'SELECT COALESCE(SUM(milliemes), 0) as total FROM proprietaires WHERE immeuble_id = $1 AND actif = true',
        [immeubleId]
      );

      const currentTotal = parseInt(totalResult.rows[0].total);
      const newTotal = currentTotal + parseInt(milliemes);

      if (newTotal > 1000) {
        return res.status(400).json({ 
          error: 'Millièmes exceeded',
          message: `Adding ${milliemes} millièmes would exceed 1000. Current total: ${currentTotal}. Available: ${1000 - currentTotal}` 
        });
      }
    }

    // Créer le propriétaire
    const result = await pool.query(
      `INSERT INTO proprietaires (
        immeuble_id, nom, prenom, email, telephone,
        milliemes, numero_appartement, date_debut, date_fin, actif
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *`,
      [
        immeubleId, nom, prenom, email, telephone,
        milliemes, numeroAppartement, dateDebut, dateFin, actif
      ]
    );

    const proprietaire = result.rows[0];

    // Calculer le pourcentage
    const pourcentage = ((milliemes / 1000) * 100).toFixed(2);

    console.log(`✅ Propriétaire created: ${nom} (${milliemes} millièmes = ${pourcentage}%) by user ${req.user.email}`);

    res.status(201).json({
      success: true,
      message: 'Propriétaire created successfully',
      proprietaire: {
        ...proprietaire,
        pourcentage: parseFloat(pourcentage)
      }
    });
  } catch (error) {
    console.error('Error creating proprietaire:', error);
    res.status(500).json({ 
      error: 'Failed to create proprietaire',
      message: error.message 
    });
  }
}

// UPDATE - Modifier un propriétaire
export async function updateProprietaire(req, res) {
  const { immeubleId, id } = req.params;
  const {
    nom,
    prenom,
    email,
    telephone,
    milliemes,
    numeroAppartement,
    dateDebut,
    dateFin,
    actif
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

    // Récupérer le propriétaire actuel
    const currentResult = await pool.query(
      'SELECT * FROM proprietaires WHERE id = $1 AND immeuble_id = $2',
      [id, immeubleId]
    );

    if (currentResult.rows.length === 0) {
      return res.status(404).json({ 
        error: 'Not found',
        message: 'Propriétaire not found' 
      });
    }

    const currentProprietaire = currentResult.rows[0];

    // Si on change les millièmes, vérifier que le total ne dépasse pas 1000
    if (milliemes && milliemes !== currentProprietaire.milliemes && actif !== false) {
      const totalResult = await pool.query(
        'SELECT COALESCE(SUM(milliemes), 0) as total FROM proprietaires WHERE immeuble_id = $1 AND actif = true AND id != $2',
        [immeubleId, id]
      );

      const otherTotal = parseInt(totalResult.rows[0].total);
      const newTotal = otherTotal + parseInt(milliemes);

      if (newTotal > 1000) {
        return res.status(400).json({ 
          error: 'Millièmes exceeded',
          message: `This would exceed 1000 millièmes. Current total (others): ${otherTotal}. Available: ${1000 - otherTotal}` 
        });
      }
    }

    // Mettre à jour
    const result = await pool.query(
      `UPDATE proprietaires SET
        nom = COALESCE($1, nom),
        prenom = COALESCE($2, prenom),
        email = COALESCE($3, email),
        telephone = COALESCE($4, telephone),
        milliemes = COALESCE($5, milliemes),
        numero_appartement = COALESCE($6, numero_appartement),
        date_debut = COALESCE($7, date_debut),
        date_fin = COALESCE($8, date_fin),
        actif = COALESCE($9, actif),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $10 AND immeuble_id = $11
      RETURNING *`,
      [
        nom, prenom, email, telephone, milliemes,
        numeroAppartement, dateDebut, dateFin, actif,
        id, immeubleId
      ]
    );

    console.log(`✅ Propriétaire updated: ${id} by user ${req.user.email}`);

    res.json({
      success: true,
      message: 'Propriétaire updated successfully',
      proprietaire: result.rows[0]
    });
  } catch (error) {
    console.error('Error updating proprietaire:', error);
    res.status(500).json({ 
      error: 'Failed to update proprietaire',
      message: error.message 
    });
  }
}

// DELETE - Désactiver un propriétaire
export async function deleteProprietaire(req, res) {
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

    // Vérifier que le propriétaire existe
    const proprietaireCheck = await pool.query(
      'SELECT id FROM proprietaires WHERE id = $1 AND immeuble_id = $2',
      [id, immeubleId]
    );

    if (proprietaireCheck.rows.length === 0) {
      return res.status(404).json({ 
        error: 'Not found',
        message: 'Propriétaire not found' 
      });
    }

    // Désactiver le propriétaire (soft delete)
    await pool.query(
      'UPDATE proprietaires SET actif = false, date_fin = CURRENT_DATE, updated_at = CURRENT_TIMESTAMP WHERE id = $1',
      [id]
    );

    console.log(`✅ Propriétaire deactivated: ${id} by user ${req.user.email}`);

    res.json({
      success: true,
      message: 'Propriétaire deactivated successfully'
    });
  } catch (error) {
    console.error('Error deleting proprietaire:', error);
    res.status(500).json({ 
      error: 'Failed to delete proprietaire',
      message: error.message 
    });
  }
}