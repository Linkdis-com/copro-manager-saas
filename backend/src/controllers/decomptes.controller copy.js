import pool from '../config/database.js';
import { calculerDecompte } from '../services/calcul-decomptes.service.js';

export const getAllDecomptes = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        d.*,
        i.nom as immeuble_nom,
        t.nom as tarif_nom
      FROM decomptes d
      JOIN immeubles i ON d.immeuble_id = i.id
      LEFT JOIN tarifs_eau t ON d.tarif_eau_id = t.id
      WHERE d.user_id = $1
      ORDER BY d.annee DESC, d.created_at DESC
    `, [req.user.id]);

    res.json({ decomptes: result.rows });
  } catch (error) {
    console.error('Error fetching decomptes:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getDecompte = async (req, res) => {
  try {
    const { id } = req.params;

    const decompte = await pool.query(`
      SELECT 
        d.*,
        i.nom as immeuble_nom,
        i.systeme_repartition,
        i.mode_comptage_eau,
        t.nom as tarif_nom,
        t.region as tarif_region,
        t.fournisseur
      FROM decomptes d
      JOIN immeubles i ON d.immeuble_id = i.id
      LEFT JOIN tarifs_eau t ON d.tarif_eau_id = t.id
      WHERE d.id = $1 AND d.user_id = $2
    `, [id, req.user.id]);

    if (decompte.rows.length === 0) {
      return res.status(404).json({ error: 'Décompte not found' });
    }

    // Charger les répartitions
    const repartitions = await pool.query(`
  SELECT 
    r.*,
    l.nom as locataire_nom,
    l.prenom as locataire_prenom,
    l.email as locataire_email,
    p.nom as proprietaire_nom,
    p.prenom as proprietaire_prenom
  FROM repartitions_eau r
  LEFT JOIN locataires l ON r.locataire_id = l.id  -- ✅ LEFT JOIN
  LEFT JOIN proprietaires p ON r.proprietaire_id = p.id
  WHERE r.decompte_id = $1
  ORDER BY COALESCE(l.nom, p.nom, 'ZZZ')
`, [id]);

    res.json({
      decompte: decompte.rows[0],
      repartitions: repartitions.rows
    });
  } catch (error) {
    console.error('Error fetching decompte:', error);
    res.status(500).json({ error: 'Internal server error', message: error.message });
  }
};

export const createDecompte = async (req, res) => {
  try {
    const {
      immeubleId,
      annee,
      periodeDebut,
      periodeFin,
      typeComptage,
      tarifEauId
    } = req.body;

    // Validation
    if (!immeubleId || !annee || !periodeDebut || !periodeFin) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'immeubleId, annee, periodeDebut, and periodeFin are required'
      });
    }

    // Vérifier ownership immeuble
    const immeuble = await pool.query(
      'SELECT id, mode_comptage_eau FROM immeubles WHERE id = $1 AND user_id = $2',
      [immeubleId, req.user.id]
    );

    if (immeuble.rows.length === 0) {
      return res.status(404).json({ error: 'Immeuble not found' });
    }

    // Vérifier unicité année
    const existing = await pool.query(
      'SELECT id FROM decomptes WHERE immeuble_id = $1 AND annee = $2',
      [immeubleId, annee]
    );

    if (existing.rows.length > 0) {
      return res.status(400).json({
        error: 'Décompte already exists',
        message: `Un décompte existe déjà pour l'année ${annee}`
      });
    }

    // Utiliser mode_comptage_eau de l'immeuble si typeComptage non fourni
    const finalTypeComptage = typeComptage || immeuble.rows[0].mode_comptage_eau;

    const result = await pool.query(`
      INSERT INTO decomptes (
        immeuble_id, user_id, tarif_eau_id,
        annee, periode_debut, periode_fin, type_comptage
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `, [immeubleId, req.user.id, tarifEauId, annee, periodeDebut, periodeFin, finalTypeComptage]);

    res.status(201).json({ decompte: result.rows[0] });
  } catch (error) {
    console.error('Error creating decompte:', error);
    res.status(500).json({ error: 'Internal server error', message: error.message });
  }
};

export const updateDecompte = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Vérifier ownership
    const decompte = await pool.query(
      'SELECT id, statut FROM decomptes WHERE id = $1 AND user_id = $2',
      [id, req.user.id]
    );

    if (decompte.rows.length === 0) {
      return res.status(404).json({ error: 'Décompte not found' });
    }

    // Empêcher modification si clôturé
    if (decompte.rows[0].statut === 'cloture') {
      return res.status(400).json({
        error: 'Cannot update closed decompte',
        message: 'Le décompte est clôturé et ne peut plus être modifié'
      });
    }

    const allowedFields = [
      'tarif_eau_id', 'type_comptage', 'facture_total_ttc',
      'facture_consommation_m3', 'facture_url', 'notes', 'statut'
    ];

    const setClause = [];
    const values = [];
    let valueIndex = 1;

    Object.keys(updates).forEach(key => {
      const snakeKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
      if (allowedFields.includes(snakeKey)) {
        setClause.push(`${snakeKey} = $${valueIndex}`);
        values.push(updates[key]);
        valueIndex++;
      }
    });

    if (setClause.length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    setClause.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);

    const query = `
      UPDATE decomptes 
      SET ${setClause.join(', ')}
      WHERE id = $${valueIndex}
      RETURNING *
    `;

    const result = await pool.query(query, values);
    res.json({ decompte: result.rows[0] });
  } catch (error) {
    console.error('Error updating decompte:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};



export const calculer = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await calculerDecompte(id);

    res.json({
      success: true,
      message: 'Décompte calculé avec succès',
      ...result
    });
  } catch (error) {
    console.error('Error calculating decompte:', error);
    res.status(500).json({
      error: 'Calculation error',
      message: error.message
    });
  }
};


export const deleteDecompte = async (req, res) => {
  try {
    const { id } = req.params;

    // Vérifier statut avant suppression
    const decompte = await pool.query(
      'SELECT statut FROM decomptes WHERE id = $1 AND user_id = $2',
      [id, req.user.id]
    );

    if (decompte.rows.length === 0) {
      return res.status(404).json({ error: 'Décompte not found' });
    }

    if (decompte.rows[0].statut === 'cloture') {
      return res.status(400).json({
        error: 'Cannot delete closed decompte',
        message: 'Le décompte est clôturé et ne peut pas être supprimé'
      });
    }

    const result = await pool.query(
      'DELETE FROM decomptes WHERE id = $1 AND user_id = $2 RETURNING id',
      [id, req.user.id]
    );

    res.json({ message: 'Décompte deleted successfully' });
  } catch (error) {
    console.error('Error deleting decompte:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getCategories = async (req, res) => {
  try {
    // Categories pour tags (eau, chauffage, etc.)
    const categories = [
      { id: 'eau', label: 'Eau', icon: '💧', recuperable: true },
      { id: 'chauffage', label: 'Chauffage', icon: '🔥', recuperable: true },
      { id: 'electricite', label: 'Électricité', icon: '⚡', recuperable: true },
      { id: 'entretien', label: 'Entretien', icon: '🔧', recuperable: true },
      { id: 'ascenseur', label: 'Ascenseur', icon: '🛗', recuperable: true },
      { id: 'nettoyage', label: 'Nettoyage', icon: '🧹', recuperable: true },
      { id: 'assurance', label: 'Assurance', icon: '🛡️', recuperable: false },
      { id: 'syndic', label: 'Syndic', icon: '📋', recuperable: false },
      { id: 'travaux', label: 'Travaux', icon: '🔨', recuperable: false },
      { id: 'autre', label: 'Autre', icon: '📌', recuperable: false }
    ];

    res.json({ categories });
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};