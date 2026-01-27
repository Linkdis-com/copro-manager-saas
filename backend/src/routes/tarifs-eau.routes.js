import express from 'express';
import { authenticate } from '../middleware/auth.js';
import pool from '../config/database.js';
import { cacheMiddleware, invalidateCacheByPattern } from '../services/cache.service.js';

const router = express.Router();

// Toutes les routes sont protégées
router.use(authenticate);

// ✅ GET tous les tarifs - AVEC CACHE (1 heure)
router.get('/', cacheMiddleware(3600), async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT * FROM tarifs_eau 
      WHERE actif = true 
      ORDER BY region, annee DESC
    `);

    res.json({
      tarifs: result.rows
    });
  } catch (error) {
    console.error('Error fetching tarifs:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
});

// ✅ GET tarif par ID - AVEC CACHE (1 heure)
router.get('/:id', cacheMiddleware(3600), async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'SELECT * FROM tarifs_eau WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Tarif not found' });
    }

    res.json({
      tarif: result.rows[0]
    });
  } catch (error) {
    console.error('Error fetching tarif:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
});

// ✅ POST créer un tarif - INVALIDE LE CACHE
router.post('/', async (req, res) => {
  try {
    const {
      nom,
      region,
      fournisseur,
      annee,
      tarif_cve_distribution,
      tarif_cve_assainissement,
      m3_gratuits_par_habitant,
      max_habitants_gratuits,
      tarif_base,
      tarif_confort,
      m3_base_fixe,
      m3_base_par_habitant,
      tarif_unique,
      contribution_fonds_eau,
      redevance_fixe_annuelle,
      redevance_par_logement,
      tva_pourcent,
      actif,
      tarif_distribution,
      tarif_assainissement,
      tarif_superflu
    } = req.body;

    // Validation
    if (!nom || !region || !fournisseur || !annee) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['nom', 'region', 'fournisseur', 'annee']
      });
    }

    const result = await pool.query(`
      INSERT INTO tarifs_eau (
        nom, region, fournisseur, annee,
        tarif_cve_distribution, tarif_cve_assainissement,
        m3_gratuits_par_habitant, max_habitants_gratuits,
        tarif_base, tarif_confort,
        m3_base_fixe, m3_base_par_habitant,
        tarif_unique, contribution_fonds_eau,
        redevance_fixe_annuelle, redevance_par_logement,
        tva_pourcent, actif,
        tarif_distribution, tarif_assainissement, tarif_superflu
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
        $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21
      )
      RETURNING *
    `, [
      nom, region, fournisseur, annee,
      tarif_cve_distribution, tarif_cve_assainissement,
      m3_gratuits_par_habitant, max_habitants_gratuits,
      tarif_base, tarif_confort,
      m3_base_fixe, m3_base_par_habitant,
      tarif_unique, contribution_fonds_eau,
      redevance_fixe_annuelle, redevance_par_logement || false,
      tva_pourcent || 6.00, actif !== false,
      tarif_distribution, tarif_assainissement, tarif_superflu
    ]);

    // ⚡ Invalider le cache des tarifs
    invalidateCacheByPattern('tarifs-eau');

    res.status(201).json({
      tarif: result.rows[0]
    });
  } catch (error) {
    console.error('Error creating tarif:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
});

// ✅ PATCH modifier un tarif - INVALIDE LE CACHE
router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Vérifier que le tarif existe
    const checkResult = await pool.query(
      'SELECT * FROM tarifs_eau WHERE id = $1',
      [id]
    );

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Tarif not found' });
    }

    // Construire la requête UPDATE dynamiquement
    const fields = [];
    const values = [];
    let paramIndex = 1;

    const allowedFields = [
      'nom', 'region', 'fournisseur', 'annee',
      'tarif_cve_distribution', 'tarif_cve_assainissement',
      'm3_gratuits_par_habitant', 'max_habitants_gratuits',
      'tarif_base', 'tarif_confort',
      'm3_base_fixe', 'm3_base_par_habitant',
      'tarif_unique', 'contribution_fonds_eau',
      'redevance_fixe_annuelle', 'redevance_par_logement',
      'tva_pourcent', 'actif',
      'tarif_distribution', 'tarif_assainissement', 'tarif_superflu'
    ];

    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        fields.push(`${field} = $${paramIndex}`);
        values.push(updates[field]);
        paramIndex++;
      }
    }

    if (fields.length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    values.push(id);

    const query = `
      UPDATE tarifs_eau
      SET ${fields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const result = await pool.query(query, values);

    // ⚡ Invalider le cache des tarifs
    invalidateCacheByPattern('tarifs-eau');

    res.json({
      tarif: result.rows[0]
    });
  } catch (error) {
    console.error('Error updating tarif:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
});

// ✅ DELETE supprimer un tarif (soft delete) - INVALIDE LE CACHE
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Vérifier que le tarif existe
    const checkResult = await pool.query(
      'SELECT * FROM tarifs_eau WHERE id = $1',
      [id]
    );

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Tarif not found' });
    }

    // Vérifier si le tarif est utilisé dans des décomptes
    const usageCheck = await pool.query(
      'SELECT COUNT(*) as count FROM decomptes WHERE tarif_eau_id = $1',
      [id]
    );

    if (parseInt(usageCheck.rows[0].count) > 0) {
      // Soft delete (désactiver) si utilisé
      await pool.query(
        'UPDATE tarifs_eau SET actif = false WHERE id = $1',
        [id]
      );
      
      // ⚡ Invalider le cache des tarifs
      invalidateCacheByPattern('tarifs-eau');

      return res.json({ 
        message: 'Tarif désactivé (utilisé dans des décomptes)',
        soft_delete: true 
      });
    }

    // Hard delete si non utilisé
    await pool.query('DELETE FROM tarifs_eau WHERE id = $1', [id]);

    // ⚡ Invalider le cache des tarifs
    invalidateCacheByPattern('tarifs-eau');

    res.json({ 
      message: 'Tarif supprimé définitivement',
      soft_delete: false 
    });
  } catch (error) {
    console.error('Error deleting tarif:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
});

export default router;
