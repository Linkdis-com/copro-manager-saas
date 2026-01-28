// =====================================================
// 🌊 ROUTES RELEVÉS EAU
// backend/src/routes/eau/releves.routes.js
// =====================================================
import express from 'express';
import pool from '../../config/database.js';
import { authenticate } from '../../middleware/auth.js';

const router = express.Router();

// =====================================================
// GET - Liste des relevés d'un immeuble
// =====================================================
router.get('/:immeubleId', authenticate, async (req, res) => {
  const { immeubleId } = req.params;
  const { periode_debut, periode_fin } = req.query;
  
  try {
    // Vérifier ownership
    const immeubleCheck = await pool.query(
      'SELECT id FROM immeubles WHERE id = $1 AND user_id = $2',
      [immeubleId, req.user.id]
    );

    if (immeubleCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Immeuble not found'
      });
    }

    let query = `
      SELECT 
        r.*,
        c.numero_compteur,
        c.type_compteur,
        p.nom as proprietaire_nom,
        p.prenom as proprietaire_prenom
      FROM releves_eau r
      JOIN compteurs_eau c ON r.compteur_id = c.id
      LEFT JOIN proprietaires p ON c.proprietaire_id = p.id
      WHERE r.immeuble_id = $1
    `;
    
    const params = [immeubleId];

    // Filtrer par période si demandé
    if (periode_debut) {
      params.push(periode_debut);
      query += ` AND r.periode_debut >= $${params.length}`;
    }
    if (periode_fin) {
      params.push(periode_fin);
      query += ` AND r.periode_fin <= $${params.length}`;
    }

    query += ' ORDER BY r.periode_debut DESC, c.type_compteur ASC';

    const result = await pool.query(query, params);

    res.json({
      success: true,
      releves: result.rows
    });
  } catch (error) {
    console.error('❌ Error fetching relevés:', error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

// =====================================================
// POST - Créer un relevé
// =====================================================
router.post('/:immeubleId', authenticate, async (req, res) => {
  const { immeubleId } = req.params;
  
  const {
    compteur_id,
    periode_debut,
    periode_fin,
    index_debut,
    index_fin,
    notes
  } = req.body;

  console.log('📥 CREATE RELEVÉ:', req.body);

  // Validation
  if (!compteur_id || !periode_debut || !periode_fin || index_debut === undefined || index_fin === undefined) {
    return res.status(400).json({
      success: false,
      error: 'Tous les champs sont requis'
    });
  }

  if (parseFloat(index_fin) < parseFloat(index_debut)) {
    return res.status(400).json({
      success: false,
      error: 'Index fin doit être >= index début'
    });
  }

  try {
    // Vérifier ownership
    const immeubleCheck = await pool.query(
      'SELECT id FROM immeubles WHERE id = $1 AND user_id = $2',
      [immeubleId, req.user.id]
    );

    if (immeubleCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Immeuble not found'
      });
    }

    // Vérifier que le compteur appartient à l'immeuble
    const compteurCheck = await pool.query(
      'SELECT id FROM compteurs_eau WHERE id = $1 AND immeuble_id = $2',
      [compteur_id, immeubleId]
    );

    if (compteurCheck.rows.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Compteur not found or does not belong to this immeuble'
      });
    }

    // Calculer consommation
    const consommation = parseFloat(index_fin) - parseFloat(index_debut);

    // Créer relevé
    const result = await pool.query(`
      INSERT INTO releves_eau (
        immeuble_id,
        compteur_id,
        periode_debut,
        periode_fin,
        index_debut,
        index_fin,
        consommation,
        notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `, [
      immeubleId,
      compteur_id,
      periode_debut,
      periode_fin,
      index_debut,
      index_fin,
      consommation,
      notes || null
    ]);

    console.log('✅ Relevé created:', result.rows[0].id);

    res.status(201).json({
      success: true,
      releve: result.rows[0]
    });
  } catch (error) {
    console.error('❌ Error creating relevé:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// =====================================================
// PATCH - Modifier un relevé
// =====================================================
router.patch('/:immeubleId/:releveId', authenticate, async (req, res) => {
  const { immeubleId, releveId } = req.params;
  
  const {
    periode_debut,
    periode_fin,
    index_debut,
    index_fin,
    notes
  } = req.body;

  console.log('📝 UPDATE RELEVÉ:', releveId, req.body);

  try {
    // Vérifier ownership
    const check = await pool.query(`
      SELECT r.id 
      FROM releves_eau r
      JOIN immeubles i ON r.immeuble_id = i.id
      WHERE r.id = $1 AND r.immeuble_id = $2 AND i.user_id = $3
    `, [releveId, immeubleId, req.user.id]);

    if (check.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Relevé not found'
      });
    }

    // Recalculer consommation si index changés
    let consommation = null;
    if (index_debut !== undefined && index_fin !== undefined) {
      consommation = parseFloat(index_fin) - parseFloat(index_debut);
      
      if (consommation < 0) {
        return res.status(400).json({
          success: false,
          error: 'Index fin doit être >= index début'
        });
      }
    }

    // Update
    const result = await pool.query(`
      UPDATE releves_eau SET
        periode_debut = COALESCE($1, periode_debut),
        periode_fin = COALESCE($2, periode_fin),
        index_debut = COALESCE($3, index_debut),
        index_fin = COALESCE($4, index_fin),
        consommation = COALESCE($5, consommation),
        notes = COALESCE($6, notes),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $7
      RETURNING *
    `, [
      periode_debut,
      periode_fin,
      index_debut,
      index_fin,
      consommation,
      notes,
      releveId
    ]);

    console.log('✅ Relevé updated');

    res.json({
      success: true,
      releve: result.rows[0]
    });
  } catch (error) {
    console.error('❌ Error updating relevé:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// =====================================================
// DELETE - Supprimer un relevé
// =====================================================
router.delete('/:immeubleId/:releveId', authenticate, async (req, res) => {
  const { immeubleId, releveId } = req.params;

  console.log('🗑️ DELETE RELEVÉ:', releveId);

  try {
    // Vérifier ownership
    const check = await pool.query(`
      SELECT r.id 
      FROM releves_eau r
      JOIN immeubles i ON r.immeuble_id = i.id
      WHERE r.id = $1 AND r.immeuble_id = $2 AND i.user_id = $3
    `, [releveId, immeubleId, req.user.id]);

    if (check.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Relevé not found'
      });
    }

    // Supprimer
    await pool.query('DELETE FROM releves_eau WHERE id = $1', [releveId]);

    console.log('✅ Relevé deleted');

    res.json({ success: true });
  } catch (error) {
    console.error('❌ Error deleting relevé:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;
