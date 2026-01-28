// =====================================================
// 🌊 ROUTES CONFIGURATION EAU
// backend/src/routes/eau/configuration.routes.js
// =====================================================
import express from 'express';
import pool from '../../config/database.js';
import { authenticate } from '../../middleware/auth.js';

const router = express.Router();

// =====================================================
// GET - Récupérer config eau d'un immeuble
// =====================================================
router.get('/:immeubleId', authenticate, async (req, res) => {
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

    // Récupérer config
    const result = await pool.query(
      'SELECT * FROM configuration_eau WHERE immeuble_id = $1',
      [immeubleId]
    );

    if (result.rows.length === 0) {
      return res.json({
        success: true,
        config: null // Pas encore configuré
      });
    }

    res.json({
      success: true,
      config: result.rows[0]
    });
  } catch (error) {
    console.error('❌ Error fetching config:', error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

// =====================================================
// POST/PUT - Créer ou mettre à jour config
// =====================================================
router.post('/:immeubleId', authenticate, async (req, res) => {
  const { immeubleId } = req.params;
  
  const {
    region,
    distributeur,
    type_comptage,
    tarif_distribution,
    tarif_assainissement,
    redevance_fixe,
    tva_pourcent,
    tarif_base,
    tarif_confort,
    m3_base_par_habitant,
    m3_gratuits_par_habitant,
    max_habitants_gratuits
  } = req.body;

  console.log('📥 CONFIG EAU:', req.body);

  // Validation
  if (!region || !distributeur || !type_comptage) {
    return res.status(400).json({
      success: false,
      error: 'region, distributeur et type_comptage requis'
    });
  }

  if (!['wallonie', 'bruxelles', 'flandre'].includes(region)) {
    return res.status(400).json({
      success: false,
      error: 'region doit être: wallonie, bruxelles ou flandre'
    });
  }

  if (!['collectif', 'divisionnaire', 'individuel'].includes(type_comptage)) {
    return res.status(400).json({
      success: false,
      error: 'type_comptage doit être: collectif, divisionnaire ou individuel'
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

    // Upsert (INSERT ou UPDATE)
    const result = await pool.query(`
      INSERT INTO configuration_eau (
        immeuble_id,
        region,
        distributeur,
        type_comptage,
        tarif_distribution,
        tarif_assainissement,
        redevance_fixe,
        tva_pourcent,
        tarif_base,
        tarif_confort,
        m3_base_par_habitant,
        m3_gratuits_par_habitant,
        max_habitants_gratuits
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      ON CONFLICT (immeuble_id) 
      DO UPDATE SET
        region = EXCLUDED.region,
        distributeur = EXCLUDED.distributeur,
        type_comptage = EXCLUDED.type_comptage,
        tarif_distribution = EXCLUDED.tarif_distribution,
        tarif_assainissement = EXCLUDED.tarif_assainissement,
        redevance_fixe = EXCLUDED.redevance_fixe,
        tva_pourcent = EXCLUDED.tva_pourcent,
        tarif_base = EXCLUDED.tarif_base,
        tarif_confort = EXCLUDED.tarif_confort,
        m3_base_par_habitant = EXCLUDED.m3_base_par_habitant,
        m3_gratuits_par_habitant = EXCLUDED.m3_gratuits_par_habitant,
        max_habitants_gratuits = EXCLUDED.max_habitants_gratuits,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *
    `, [
      immeubleId,
      region,
      distributeur,
      type_comptage,
      tarif_distribution || null,
      tarif_assainissement || null,
      redevance_fixe || 0,
      tva_pourcent || 6.0,
      tarif_base || null,
      tarif_confort || null,
      m3_base_par_habitant || 30,
      m3_gratuits_par_habitant || 15,
      max_habitants_gratuits || 5
    ]);

    console.log('✅ Config eau saved');

    res.json({
      success: true,
      config: result.rows[0]
    });
  } catch (error) {
    console.error('❌ Error saving config:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;
