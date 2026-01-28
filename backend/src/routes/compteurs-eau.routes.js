// =====================================================
// 🔧 ROUTES COMPTEURS EAU - MANQUANTE
// backend/src/routes/compteurs-eau.routes.js
// =====================================================
import express from 'express';
import pool from '../config/database.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// =====================================================
// GET - Liste compteurs d'un immeuble
// =====================================================
router.get('/:immeubleId/compteurs-eau', authenticate, async (req, res) => {
  const { immeubleId } = req.params;
  
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

    // Récupérer compteurs
    const result = await pool.query(`
      SELECT 
        c.*,
        p.nom as proprietaire_nom,
        p.prenom as proprietaire_prenom
      FROM compteurs_eau c
      LEFT JOIN proprietaires p ON c.proprietaire_id = p.id
      WHERE c.immeuble_id = $1
      ORDER BY 
        CASE 
          WHEN c.type_compteur = 'principal' THEN 1
          WHEN c.type_compteur = 'divisionnaire' THEN 2
          ELSE 3
        END,
        c.ordre ASC,
        c.created_at ASC
    `, [immeubleId]);

    res.json({
      success: true,
      compteurs: result.rows
    });
  } catch (error) {
    console.error('❌ Error fetching compteurs:', error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

// =====================================================
// POST - Créer un compteur
// =====================================================
router.post('/:immeubleId/compteurs-eau', authenticate, async (req, res) => {
  const { immeubleId } = req.params;
  
  const {
    type_compteur,
    numero_compteur,
    proprietaire_id,
    emplacement,
    actif = true
  } = req.body;

  console.log('📥 CREATE COMPTEUR:', req.body);

  // Validation
  if (!type_compteur || !numero_compteur) {
    return res.status(400).json({
      success: false,
      error: 'type_compteur et numero_compteur requis'
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

    // Vérifier qu'il n'y a pas déjà un compteur principal (si type = principal)
    if (type_compteur === 'principal') {
      const existingPrincipal = await pool.query(
        'SELECT id FROM compteurs_eau WHERE immeuble_id = $1 AND type_compteur = $2',
        [immeubleId, 'principal']
      );

      if (existingPrincipal.rows.length > 0) {
        return res.status(400).json({
          success: false,
          error: 'Un compteur principal existe déjà pour cet immeuble'
        });
      }
    }

    // Créer le compteur
    const result = await pool.query(`
      INSERT INTO compteurs_eau (
        immeuble_id,
        type_compteur,
        numero_compteur,
        proprietaire_id,
        emplacement,
        actif
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [
      immeubleId,
      type_compteur,
      numero_compteur,
      proprietaire_id || null,
      emplacement || null,
      actif
    ]);

    console.log('✅ Compteur created:', result.rows[0].id);

    res.status(201).json({
      success: true,
      compteur: result.rows[0]
    });
  } catch (error) {
    console.error('❌ Error creating compteur:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// =====================================================
// PATCH - Modifier un compteur
// =====================================================
router.patch('/:immeubleId/compteurs-eau/:compteurId', authenticate, async (req, res) => {
  const { immeubleId, compteurId } = req.params;
  
  const {
    type_compteur,
    numero_compteur,
    proprietaire_id,
    emplacement,
    actif
  } = req.body;

  console.log('📝 UPDATE COMPTEUR:', compteurId, req.body);

  try {
    // Vérifier ownership
    const check = await pool.query(`
      SELECT c.id 
      FROM compteurs_eau c
      JOIN immeubles i ON c.immeuble_id = i.id
      WHERE c.id = $1 AND c.immeuble_id = $2 AND i.user_id = $3
    `, [compteurId, immeubleId, req.user.id]);

    if (check.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Compteur not found'
      });
    }

    // Update
    const result = await pool.query(`
      UPDATE compteurs_eau SET
        type_compteur = COALESCE($1, type_compteur),
        numero_compteur = COALESCE($2, numero_compteur),
        proprietaire_id = COALESCE($3, proprietaire_id),
        emplacement = COALESCE($4, emplacement),
        actif = COALESCE($5, actif),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $6
      RETURNING *
    `, [
      type_compteur,
      numero_compteur,
      proprietaire_id,
      emplacement,
      actif,
      compteurId
    ]);

    console.log('✅ Compteur updated');

    res.json({
      success: true,
      compteur: result.rows[0]
    });
  } catch (error) {
    console.error('❌ Error updating compteur:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// =====================================================
// DELETE - Supprimer un compteur
// =====================================================
router.delete('/:immeubleId/compteurs-eau/:compteurId', authenticate, async (req, res) => {
  const { immeubleId, compteurId } = req.params;

  console.log('🗑️ DELETE COMPTEUR:', compteurId);

  try {
    // Vérifier ownership
    const check = await pool.query(`
      SELECT c.id 
      FROM compteurs_eau c
      JOIN immeubles i ON c.immeuble_id = i.id
      WHERE c.id = $1 AND c.immeuble_id = $2 AND i.user_id = $3
    `, [compteurId, immeubleId, req.user.id]);

    if (check.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Compteur not found'
      });
    }

    // Supprimer
    await pool.query('DELETE FROM compteurs_eau WHERE id = $1', [compteurId]);

    console.log('✅ Compteur deleted');

    res.json({ success: true });
  } catch (error) {
    console.error('❌ Error deleting compteur:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;
