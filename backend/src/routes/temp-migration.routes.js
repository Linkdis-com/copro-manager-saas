// ========================================
// FICHIER TEMPORAIRE : backend/src/routes/temp-migration.routes.js
// ========================================
// À supprimer après utilisation !

import express from 'express';
import pool from '../config/database.js';

const router = express.Router();

// Route pour ajouter la colonne numero_compteur_principal
router.post('/add-numero-compteur-principal', async (req, res) => {
  try {
    // Ajouter la colonne si elle n'existe pas
    await pool.query(`
      ALTER TABLE immeubles 
      ADD COLUMN IF NOT EXISTS numero_compteur_principal VARCHAR(20)
    `);
    
    // Vérifier que la colonne existe
    const check = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'immeubles' 
        AND column_name IN ('mode_comptage_eau', 'numero_compteur_principal')
    `);
    
    res.json({
      success: true,
      message: 'Colonne ajoutée avec succès',
      columns: check.rows
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

export default router;
