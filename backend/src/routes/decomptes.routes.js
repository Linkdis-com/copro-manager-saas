import express from 'express';
import { authenticate } from '../middleware/auth.js';
import pool from '../config/database.js';

const router = express.Router();

// Toutes les routes nécessitent l'authentification
router.use(authenticate);

// GET ALL - Liste des décomptes
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM decomptes WHERE user_id = $1 ORDER BY created_at DESC',
      [req.user.id]
    );
    
    res.json({
      success: true,
      decomptes: result.rows
    });
  } catch (error) {
    console.error('Error fetching decomptes:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET ONE - Un décompte
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'SELECT * FROM decomptes WHERE id = $1 AND user_id = $2',
      [id, req.user.id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Décompte non trouvé' });
    }
    
    res.json({
      success: true,
      decompte: result.rows[0]
    });
  } catch (error) {
    console.error('Error fetching decompte:', error);
    res.status(500).json({ error: error.message });
  }
});

// CREATE - Nouveau décompte
router.post('/', async (req, res) => {
  try {
    const { nom, annee, periode_debut, periode_fin, immeuble_id, mode_comptage_eau } = req.body;
    
    const result = await pool.query(
      `INSERT INTO decomptes (
        user_id, nom, annee, periode_debut, periode_fin, 
        immeuble_id, mode_comptage_eau, statut
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'brouillon')
      RETURNING *`,
      [req.user.id, nom, annee, periode_debut, periode_fin, immeuble_id, mode_comptage_eau]
    );
    
    res.status(201).json({
      success: true,
      decompte: result.rows[0]
    });
  } catch (error) {
    console.error('Error creating decompte:', error);
    res.status(500).json({ error: error.message });
  }
});

// UPDATE - Modifier un décompte
router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      nom, annee, periode_debut, periode_fin, 
      tarif_distribution, tarif_assainissement, 
      redevance_fixe_annuelle, tva_pourcent 
    } = req.body;
    
    // Vérifier ownership
    const check = await pool.query(
      'SELECT id FROM decomptes WHERE id = $1 AND user_id = $2',
      [id, req.user.id]
    );
    
    if (check.rows.length === 0) {
      return res.status(404).json({ error: 'Décompte non trouvé' });
    }
    
    const result = await pool.query(
      `UPDATE decomptes SET
        nom = COALESCE($1, nom),
        annee = COALESCE($2, annee),
        periode_debut = COALESCE($3, periode_debut),
        periode_fin = COALESCE($4, periode_fin),
        tarif_distribution = COALESCE($5, tarif_distribution),
        tarif_assainissement = COALESCE($6, tarif_assainissement),
        redevance_fixe_annuelle = COALESCE($7, redevance_fixe_annuelle),
        tva_pourcent = COALESCE($8, tva_pourcent),
        updated_at = CURRENT_TIMESTAMP
       WHERE id = $9
       RETURNING *`,
      [nom, annee, periode_debut, periode_fin, tarif_distribution, 
       tarif_assainissement, redevance_fixe_annuelle, tva_pourcent, id]
    );
    
    res.json({
      success: true,
      decompte: result.rows[0]
    });
  } catch (error) {
    console.error('Error updating decompte:', error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE - Supprimer un décompte
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Vérifier ownership
    const check = await pool.query(
      'SELECT id FROM decomptes WHERE id = $1 AND user_id = $2',
      [id, req.user.id]
    );
    
    if (check.rows.length === 0) {
      return res.status(404).json({ error: 'Décompte non trouvé' });
    }
    
    await pool.query('DELETE FROM decomptes WHERE id = $1', [id]);
    
    res.json({
      success: true,
      message: 'Décompte supprimé'
    });
  } catch (error) {
    console.error('Error deleting decompte:', error);
    res.status(500).json({ error: error.message });
  }
});

// VALIDATE - Valider un décompte
router.post('/:id/validate', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Vérifier ownership
    const check = await pool.query(
      'SELECT id FROM decomptes WHERE id = $1 AND user_id = $2',
      [id, req.user.id]
    );
    
    if (check.rows.length === 0) {
      return res.status(404).json({ error: 'Décompte non trouvé' });
    }
    
    // Valider
    const result = await pool.query(
      `UPDATE decomptes SET 
        statut = 'valide',
        date_validation = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING *`,
      [id]
    );
    
    res.json({
      success: true,
      message: 'Décompte validé',
      decompte: result.rows[0]
    });
  } catch (error) {
    console.error('Erreur validation:', error);
    res.status(500).json({ error: error.message });
  }
});

// CATEGORIES - Liste des catégories
router.get('/categories', async (req, res) => {
  try {
    res.json({
      success: true,
      categories: [
        { id: 'eau', label: 'Eau' },
        { id: 'charges', label: 'Charges' },
        { id: 'travaux', label: 'Travaux' }
      ]
    });
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
