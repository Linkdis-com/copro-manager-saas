// compteurs-eau.routes.js - AVEC VALIDATION

import express from 'express';
import pool from '../config/database.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// GET /api/v1/immeubles/:immeubleId/compteurs-eau
router.get('/:immeubleId/compteurs-eau', authenticate, async (req, res) => {
   console.log('🔥 Route compteurs-eau HIT !');  // ← Ajouter ce log
  const { immeubleId } = req.params;
  console.log('📍 immeubleId:', immeubleId);

  // ✅ VALIDATION - Éviter les erreurs UUID
  if (!immeubleId || immeubleId === 'null' || immeubleId === 'undefined') {
    return res.status(400).json({
      error: 'Invalid request',
      message: 'immeubleId is required and must be a valid UUID'
    });
  }

  // ✅ VALIDATION - Format UUID
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(immeubleId)) {
    return res.status(400).json({
      error: 'Invalid UUID format',
      message: 'immeubleId must be a valid UUID'
    });
  }

  try {
    // Vérifier que l'immeuble existe et appartient à l'utilisateur
    const immeubleCheck = await pool.query(
      'SELECT id FROM immeubles WHERE id = $1 AND user_id = $2',
      [immeubleId, req.user.id]
    );

    if (immeubleCheck.rows.length === 0) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Immeuble not found or you do not have access'
      });
    }

    // Récupérer les compteurs
    const result = await pool.query(`
      SELECT 
        c.*,
        l.prenom as locataire_prenom,
        l.nom as locataire_nom,
        p.prenom as proprietaire_prenom,
        p.nom as proprietaire_nom
      FROM compteurs_eau c
      LEFT JOIN locataires l ON c.locataire_id = l.id
      LEFT JOIN proprietaires p ON c.proprietaire_id = p.id
      WHERE c.immeuble_id = $1
      ORDER BY 
        CASE 
          WHEN c.type_compteur = 'principal' THEN 1
          WHEN c.type_compteur = 'divisionnaire' THEN 2
          ELSE 3
        END,
        c.ordre,
        c.created_at
    `, [immeubleId]);

    res.json({
      success: true,
      compteurs: result.rows,
      count: result.rows.length
    });

  } catch (error) {
    console.error('Error fetching compteurs:', error);
    res.status(500).json({
      error: 'Failed to fetch compteurs',
      message: error.message
    });
  }
});

// POST /api/v1/immeubles/:immeubleId/compteurs-eau
router.post('/:immeubleId/compteurs-eau', authenticate, async (req, res) => {
  const { immeubleId } = req.params;
  const {
    numeroCompteur,
    locataireId,
    proprietaireId,
    typeCompteur,
    compteurPrincipalId,
    emplacement,
    actif = true
  } = req.body;

  // ✅ VALIDATION - immeubleId
  if (!immeubleId || immeubleId === 'null' || immeubleId === 'undefined') {
    return res.status(400).json({
      error: 'Invalid request',
      message: 'immeubleId is required'
    });
  }

  // ✅ VALIDATION - Champs requis
  if (!numeroCompteur || !typeCompteur) {
    return res.status(400).json({
      error: 'Validation error',
      message: 'numeroCompteur and typeCompteur are required'
    });
  }

  // ✅ VALIDATION - Type compteur
  const validTypes = ['principal', 'divisionnaire', 'collectif', 'individuel'];
  if (!validTypes.includes(typeCompteur)) {
    return res.status(400).json({
      error: 'Validation error',
      message: `typeCompteur must be one of: ${validTypes.join(', ')}`
    });
  }

  try {
    // Vérifier ownership de l'immeuble
    const immeubleCheck = await pool.query(
      'SELECT id FROM immeubles WHERE id = $1 AND user_id = $2',
      [immeubleId, req.user.id]
    );

    if (immeubleCheck.rows.length === 0) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Immeuble not found or you do not have access'
      });
    }

    // Créer le compteur
    const result = await pool.query(`
      INSERT INTO compteurs_eau (
        immeuble_id, numero_compteur, locataire_id, proprietaire_id,
        type_compteur, compteur_principal_id, emplacement, actif
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `, [
      immeubleId, numeroCompteur, locataireId || null, proprietaireId || null,
      typeCompteur, compteurPrincipalId || null, emplacement || null, actif
    ]);

    res.status(201).json({
      success: true,
      message: 'Compteur created successfully',
      compteur: result.rows[0]
    });

  } catch (error) {
    console.error('Error creating compteur:', error);
    res.status(500).json({
      error: 'Failed to create compteur',
      message: error.message
    });
  }
});

// PUT /api/v1/immeubles/:immeubleId/compteurs-eau/:id
router.put('/:immeubleId/compteurs-eau/:id', authenticate, async (req, res) => {
  const { immeubleId, id } = req.params;
  const {
    numeroCompteur,
    locataireId,
    proprietaireId,
    typeCompteur,
    compteurPrincipalId,
    emplacement,
    actif
  } = req.body;

  // ✅ VALIDATION
  if (!immeubleId || immeubleId === 'null') {
    return res.status(400).json({
      error: 'Invalid immeubleId'
    });
  }

  try {
    // Vérifier ownership
    const check = await pool.query(`
      SELECT c.id 
      FROM compteurs_eau c
      JOIN immeubles i ON c.immeuble_id = i.id
      WHERE c.id = $1 AND c.immeuble_id = $2 AND i.user_id = $3
    `, [id, immeubleId, req.user.id]);

    if (check.rows.length === 0) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Compteur not found or you do not have access'
      });
    }

    // Update
    const result = await pool.query(`
      UPDATE compteurs_eau SET
        numero_compteur = COALESCE($1, numero_compteur),
        locataire_id = $2,
        proprietaire_id = $3,
        type_compteur = COALESCE($4, type_compteur),
        compteur_principal_id = $5,
        emplacement = $6,
        actif = COALESCE($7, actif),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $8
      RETURNING *
    `, [
      numeroCompteur, locataireId, proprietaireId,
      typeCompteur, compteurPrincipalId, emplacement,
      actif, id
    ]);

    res.json({
      success: true,
      message: 'Compteur updated successfully',
      compteur: result.rows[0]
    });

  } catch (error) {
    console.error('Error updating compteur:', error);
    res.status(500).json({
      error: 'Failed to update compteur',
      message: error.message
    });
  }
});

// DELETE /api/v1/immeubles/:immeubleId/compteurs-eau/:id
router.delete('/:immeubleId/compteurs-eau/:id', authenticate, async (req, res) => {
  const { immeubleId, id } = req.params;

  // ✅ VALIDATION
  if (!immeubleId || immeubleId === 'null') {
    return res.status(400).json({
      error: 'Invalid immeubleId'
    });
  }

  try {
    // Vérifier ownership
    const check = await pool.query(`
      SELECT c.id 
      FROM compteurs_eau c
      JOIN immeubles i ON c.immeuble_id = i.id
      WHERE c.id = $1 AND c.immeuble_id = $2 AND i.user_id = $3
    `, [id, immeubleId, req.user.id]);

    if (check.rows.length === 0) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Compteur not found or you do not have access'
      });
    }

    // Delete
    await pool.query('DELETE FROM compteurs_eau WHERE id = $1', [id]);

    res.json({
      success: true,
      message: 'Compteur deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting compteur:', error);
    res.status(500).json({
      error: 'Failed to delete compteur',
      message: error.message
    });
  }
});

export default router;
