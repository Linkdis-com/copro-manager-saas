import pool from '../config/database.js';

// GET ALL - Lister tous les immeubles de l'utilisateur
export async function getAllImmeubles(req, res) {
  try {
    const result = await pool.query(
      `SELECT 
        i.*,
        COUNT(p.id) as nombre_proprietaires_actifs,
        COALESCE(SUM(CASE WHEN p.actif = true THEN 1 ELSE 0 END), 0) as unites_utilisees
      FROM immeubles i
      LEFT JOIN proprietaires p ON i.id = p.immeuble_id AND p.actif = true
      WHERE i.user_id = $1 AND i.archived_at IS NULL
      GROUP BY i.id
      ORDER BY i.created_at DESC`,
      [req.user.id]
    );

    res.json({
      success: true,
      immeubles: result.rows,
      count: result.rows.length
    });
  } catch (error) {
    console.error('Error fetching immeubles:', error);
    res.status(500).json({ 
      error: 'Failed to fetch immeubles',
      message: error.message 
    });
  }
}

// GET ONE - Récupérer un immeuble spécifique
export async function getImmeuble(req, res) {
  const { id } = req.params;

  try {
    const result = await pool.query(
      `SELECT 
        i.*,
        COUNT(p.id) as nombre_proprietaires_actifs,
        COALESCE(SUM(CASE WHEN p.actif = true THEN 1 ELSE 0 END), 0) as unites_utilisees
      FROM immeubles i
      LEFT JOIN proprietaires p ON i.id = p.immeuble_id AND p.actif = true
      WHERE i.id = $1 AND i.user_id = $2 AND i.archived_at IS NULL
      GROUP BY i.id`,
      [id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ 
        error: 'Not found',
        message: 'Immeuble not found or you do not have access' 
      });
    }

    res.json({
      success: true,
      immeuble: result.rows[0]
    });
  } catch (error) {
    console.error('Error fetching immeuble:', error);
    res.status(500).json({ 
      error: 'Failed to fetch immeuble',
      message: error.message 
    });
  }
}

// CREATE - Créer un nouvel immeuble
export async function createImmeuble(req, res) {
  const {
    nom,
    adresse,
    codePostal,
    ville,
    pays = 'BE',
    nombreAppartements,
    chargesMensuelles = 0,
    datePrelevementCharges = 5,
    seuilTresorerieMin = 1000
  } = req.body;

  // Validation
  if (!nom || !nombreAppartements) {
    return res.status(400).json({ 
      error: 'Validation error',
      message: 'nom and nombreAppartements are required' 
    });
  }

  if (nombreAppartements < 1) {
    return res.status(400).json({ 
      error: 'Validation error',
      message: 'nombreAppartements must be at least 1' 
    });
  }

  try {
    // Vérifier la subscription de l'utilisateur
    const subscription = await pool.query(
      'SELECT * FROM subscriptions WHERE user_id = $1 AND status = $2',
      [req.user.id, 'active']
    );

    if (subscription.rows.length === 0) {
      return res.status(403).json({ 
        error: 'No active subscription',
        message: 'You need an active subscription to create an immeuble' 
      });
    }

    const sub = subscription.rows[0];

    // Vérifier le nombre d'immeubles (pour l'instant, 1 seul pour FREE/PRO)
    const existingImmeubles = await pool.query(
      'SELECT COUNT(*) as count FROM immeubles WHERE user_id = $1 AND archived_at IS NULL',
      [req.user.id]
    );

    const immeublesCount = parseInt(existingImmeubles.rows[0].count);

    // FREE et PRO = 1 immeuble max, PREMIUM = illimité
    if (sub.plan !== 'premium' && immeublesCount >= 1) {
      return res.status(403).json({ 
        error: 'Limit reached',
        message: `Your ${sub.plan} plan allows only 1 immeuble. Upgrade to Premium for unlimited immeubles.` 
      });
    }

    // Vérifier les unités disponibles
    if (sub.max_units && (sub.current_units + nombreAppartements) > sub.max_units) {
      return res.status(403).json({ 
        error: 'Unit limit reached',
        message: `This would exceed your plan limit of ${sub.max_units} units. You have ${sub.current_units} units used.`,
        current: sub.current_units,
        requested: nombreAppartements,
        max: sub.max_units
      });
    }

    // Créer l'immeuble
    const result = await pool.query(
      `INSERT INTO immeubles (
        user_id, nom, adresse, code_postal, ville, pays,
        nombre_appartements, charges_mensuelles, 
        date_prelevement_charges, seuil_tresorerie_min
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *`,
      [
        req.user.id, nom, adresse, codePostal, ville, pays,
        nombreAppartements, chargesMensuelles,
        datePrelevementCharges, seuilTresorerieMin
      ]
    );

    const immeuble = result.rows[0];

    // Mettre à jour le compteur d'unités dans la subscription
    await pool.query(
      'UPDATE subscriptions SET current_units = current_units + $1, updated_at = CURRENT_TIMESTAMP WHERE user_id = $2',
      [nombreAppartements, req.user.id]
    );

    console.log(`✅ Immeuble created: ${nom} (${nombreAppartements} units) by user ${req.user.email}`);

    res.status(201).json({
      success: true,
      message: 'Immeuble created successfully',
      immeuble
    });
  } catch (error) {
    console.error('Error creating immeuble:', error);
    res.status(500).json({ 
      error: 'Failed to create immeuble',
      message: error.message 
    });
  }
}

// UPDATE - Modifier un immeuble
export async function updateImmeuble(req, res) {
  const { id } = req.params;
  const {
    nom,
    adresse,
    codePostal,
    ville,
    pays,
    nombreAppartements,
    chargesMensuelles,
    datePrelevementCharges,
    seuilTresorerieMin
  } = req.body;

  try {
    // Vérifier que l'immeuble appartient à l'utilisateur
    const existing = await pool.query(
      'SELECT * FROM immeubles WHERE id = $1 AND user_id = $2 AND archived_at IS NULL',
      [id, req.user.id]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({ 
        error: 'Not found',
        message: 'Immeuble not found or you do not have access' 
      });
    }

    const oldImmeuble = existing.rows[0];

    // Si on change le nombre d'appartements, vérifier les limites
    if (nombreAppartements && nombreAppartements !== oldImmeuble.nombre_appartements) {
      const subscription = await pool.query(
        'SELECT * FROM subscriptions WHERE user_id = $1 AND status = $2',
        [req.user.id, 'active']
      );

      if (subscription.rows.length > 0) {
        const sub = subscription.rows[0];
        const difference = nombreAppartements - oldImmeuble.nombre_appartements;
        const newTotal = sub.current_units + difference;

        if (sub.max_units && newTotal > sub.max_units) {
          return res.status(403).json({ 
            error: 'Unit limit reached',
            message: `This would exceed your plan limit of ${sub.max_units} units.`,
            current: sub.current_units,
            newTotal: newTotal,
            max: sub.max_units
          });
        }

        // Mettre à jour le compteur
        await pool.query(
          'UPDATE subscriptions SET current_units = current_units + $1, updated_at = CURRENT_TIMESTAMP WHERE user_id = $2',
          [difference, req.user.id]
        );
      }
    }

    // Mettre à jour l'immeuble
    const result = await pool.query(
      `UPDATE immeubles SET
        nom = COALESCE($1, nom),
        adresse = COALESCE($2, adresse),
        code_postal = COALESCE($3, code_postal),
        ville = COALESCE($4, ville),
        pays = COALESCE($5, pays),
        nombre_appartements = COALESCE($6, nombre_appartements),
        charges_mensuelles = COALESCE($7, charges_mensuelles),
        date_prelevement_charges = COALESCE($8, date_prelevement_charges),
        seuil_tresorerie_min = COALESCE($9, seuil_tresorerie_min),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $10 AND user_id = $11
      RETURNING *`,
      [
        nom, adresse, codePostal, ville, pays,
        nombreAppartements, chargesMensuelles,
        datePrelevementCharges, seuilTresorerieMin,
        id, req.user.id
      ]
    );

    console.log(`✅ Immeuble updated: ${id} by user ${req.user.email}`);

    res.json({
      success: true,
      message: 'Immeuble updated successfully',
      immeuble: result.rows[0]
    });
  } catch (error) {
    console.error('Error updating immeuble:', error);
    res.status(500).json({ 
      error: 'Failed to update immeuble',
      message: error.message 
    });
  }
}

// DELETE - Archiver un immeuble (soft delete)
export async function deleteImmeuble(req, res) {
  const { id } = req.params;

  try {
    // Vérifier que l'immeuble appartient à l'utilisateur
    const existing = await pool.query(
      'SELECT * FROM immeubles WHERE id = $1 AND user_id = $2 AND archived_at IS NULL',
      [id, req.user.id]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({ 
        error: 'Not found',
        message: 'Immeuble not found or you do not have access' 
      });
    }

    const immeuble = existing.rows[0];

    // Archiver l'immeuble (soft delete)
    await pool.query(
      'UPDATE immeubles SET archived_at = CURRENT_TIMESTAMP WHERE id = $1',
      [id]
    );

    // Mettre à jour le compteur d'unités
    await pool.query(
      'UPDATE subscriptions SET current_units = current_units - $1, updated_at = CURRENT_TIMESTAMP WHERE user_id = $2',
      [immeuble.nombre_appartements, req.user.id]
    );

    console.log(`✅ Immeuble archived: ${id} by user ${req.user.email}`);

    res.json({
      success: true,
      message: 'Immeuble archived successfully'
    });
  } catch (error) {
    console.error('Error deleting immeuble:', error);
    res.status(500).json({ 
      error: 'Failed to delete immeuble',
      message: error.message 
    });
  }
}