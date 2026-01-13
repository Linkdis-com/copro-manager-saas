import pool from '../config/database.js';

// GET ALL - Lister tous les locataires d'un immeuble
export async function getAllLocataires(req, res) {
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

    // Récupérer les locataires avec infos propriétaire
    const result = await pool.query(
      `SELECT 
        l.*,
        p.nom as proprietaire_nom,
        p.prenom as proprietaire_prenom,
        p.numero_appartement
      FROM locataires l
      JOIN proprietaires p ON l.proprietaire_id = p.id
      WHERE l.immeuble_id = $1
      ORDER BY l.actif DESC, l.nom ASC`,
      [immeubleId]
    );

    res.json({
      success: true,
      locataires: result.rows,
      count: result.rows.length,
      actifs: result.rows.filter(l => l.actif).length
    });
  } catch (error) {
    console.error('Error fetching locataires:', error);
    res.status(500).json({ 
      error: 'Failed to fetch locataires',
      message: error.message 
    });
  }
}

// GET ONE - Récupérer un locataire spécifique
export async function getLocataire(req, res) {
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

    // Récupérer le locataire
    const result = await pool.query(
      `SELECT 
        l.*,
        p.nom as proprietaire_nom,
        p.prenom as proprietaire_prenom,
        p.numero_appartement,
        p.email as proprietaire_email
      FROM locataires l
      JOIN proprietaires p ON l.proprietaire_id = p.id
      WHERE l.id = $1 AND l.immeuble_id = $2`,
      [id, immeubleId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ 
        error: 'Not found',
        message: 'Locataire not found' 
      });
    }

    res.json({
      success: true,
      locataire: result.rows[0]
    });
  } catch (error) {
    console.error('Error fetching locataire:', error);
    res.status(500).json({ 
      error: 'Failed to fetch locataire',
      message: error.message 
    });
  }
}

// CREATE - Créer un nouveau locataire
export async function createLocataire(req, res) {
  const { immeubleId } = req.params;
  const {
    proprietaireId,
    nom,
    prenom,
    email,
    telephone,
    dateDebutBail,
    dateFinBail,
    loyerMensuel,
    chargesMensuelles,
    depotGarantie,
    actif = true
  } = req.body;

  // Validation
  if (!proprietaireId || !nom || !dateDebutBail) {
    return res.status(400).json({ 
      error: 'Validation error',
      message: 'proprietaireId, nom, and dateDebutBail are required' 
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

    // Vérifier que le propriétaire existe et appartient à cet immeuble
    const proprietaireCheck = await pool.query(
      'SELECT id, nom, prenom FROM proprietaires WHERE id = $1 AND immeuble_id = $2',
      [proprietaireId, immeubleId]
    );

    if (proprietaireCheck.rows.length === 0) {
      return res.status(404).json({ 
        error: 'Not found',
        message: 'Propriétaire not found or does not belong to this immeuble' 
      });
    }

    // Créer le locataire
    const result = await pool.query(
      `INSERT INTO locataires (
        immeuble_id, proprietaire_id, nom, prenom, email, telephone,
        date_debut_bail, date_fin_bail, loyer_mensuel, charges_mensuelles,
        depot_garantie, actif
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *`,
      [
        immeubleId, proprietaireId, nom, prenom, email, telephone,
        dateDebutBail, dateFinBail, loyerMensuel, chargesMensuelles,
        depotGarantie, actif
      ]
    );

    const locataire = result.rows[0];

    console.log(`✅ Locataire created: ${nom} ${prenom || ''} by user ${req.user.email}`);

    res.status(201).json({
      success: true,
      message: 'Locataire created successfully',
      locataire
    });
  } catch (error) {
    console.error('Error creating locataire:', error);
    res.status(500).json({ 
      error: 'Failed to create locataire',
      message: error.message 
    });
  }
}

// UPDATE - Modifier un locataire
export async function updateLocataire(req, res) {
  const { immeubleId, id } = req.params;
  const {
    nom,
    prenom,
    email,
    telephone,
    dateDebutBail,
    dateFinBail,
    loyerMensuel,
    chargesMensuelles,
    depotGarantie,
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

    // Vérifier que le locataire existe
    const locataireCheck = await pool.query(
      'SELECT id FROM locataires WHERE id = $1 AND immeuble_id = $2',
      [id, immeubleId]
    );

    if (locataireCheck.rows.length === 0) {
      return res.status(404).json({ 
        error: 'Not found',
        message: 'Locataire not found' 
      });
    }

    // Mettre à jour
    const result = await pool.query(
      `UPDATE locataires SET
        nom = COALESCE($1, nom),
        prenom = COALESCE($2, prenom),
        email = COALESCE($3, email),
        telephone = COALESCE($4, telephone),
        date_debut_bail = COALESCE($5, date_debut_bail),
        date_fin_bail = COALESCE($6, date_fin_bail),
        loyer_mensuel = COALESCE($7, loyer_mensuel),
        charges_mensuelles = COALESCE($8, charges_mensuelles),
        depot_garantie = COALESCE($9, depot_garantie),
        actif = COALESCE($10, actif),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $11 AND immeuble_id = $12
      RETURNING *`,
      [
        nom, prenom, email, telephone, dateDebutBail, dateFinBail,
        loyerMensuel, chargesMensuelles, depotGarantie, actif,
        id, immeubleId
      ]
    );

    console.log(`✅ Locataire updated: ${id} by user ${req.user.email}`);

    res.json({
      success: true,
      message: 'Locataire updated successfully',
      locataire: result.rows[0]
    });
  } catch (error) {
    console.error('Error updating locataire:', error);
    res.status(500).json({ 
      error: 'Failed to update locataire',
      message: error.message 
    });
  }
}

// DELETE - Désactiver un locataire (fin de bail)
export async function deleteLocataire(req, res) {
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

    // Vérifier que le locataire existe
    const locataireCheck = await pool.query(
      'SELECT id FROM locataires WHERE id = $1 AND immeuble_id = $2',
      [id, immeubleId]
    );

    if (locataireCheck.rows.length === 0) {
      return res.status(404).json({ 
        error: 'Not found',
        message: 'Locataire not found' 
      });
    }

    // Désactiver le locataire (soft delete)
    await pool.query(
      'UPDATE locataires SET actif = false, date_fin_bail = COALESCE(date_fin_bail, CURRENT_DATE), updated_at = CURRENT_TIMESTAMP WHERE id = $1',
      [id]
    );

    console.log(`✅ Locataire deactivated: ${id} by user ${req.user.email}`);

    res.json({
      success: true,
      message: 'Locataire deactivated successfully'
    });
  } catch (error) {
    console.error('Error deleting locataire:', error);
    res.status(500).json({ 
      error: 'Failed to delete locataire',
      message: error.message 
    });
  }
}