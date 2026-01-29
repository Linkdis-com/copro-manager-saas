// =====================================================
// 🔧 ROUTE TEMPORAIRE - Ajouter colonne updated_at
// backend/src/routes/add-updated-at.route.js
// =====================================================
import { Router } from 'express';
import pool from '../config/database.js';

const router = Router();

// Route POST pour ajouter updated_at
router.post('/add-updated-at-compteurs-eau', async (req, res) => {
  const client = await pool.connect();
  
  try {
    console.log('🔧 Ajout colonne updated_at à compteurs_eau...\n');
    
    // Vérifier si la colonne existe déjà
    const checkColumn = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'compteurs_eau' 
      AND column_name = 'updated_at'
    `);
    
    if (checkColumn.rows.length > 0) {
      console.log('⚠️ La colonne updated_at existe déjà');
      return res.json({
        success: true,
        message: 'La colonne updated_at existe déjà',
        alreadyExists: true
      });
    }
    
    // Ajouter la colonne
    await client.query(`
      ALTER TABLE compteurs_eau 
      ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    `);
    console.log('✅ Colonne updated_at ajoutée');
    
    // Initialiser avec created_at pour les lignes existantes
    await client.query(`
      UPDATE compteurs_eau 
      SET updated_at = created_at 
      WHERE updated_at IS NULL
    `);
    console.log('✅ Valeurs initialisées pour lignes existantes\n');
    
    res.json({
      success: true,
      message: 'Colonne updated_at ajoutée avec succès',
      steps: [
        '✅ Colonne updated_at ajoutée',
        '✅ Valeurs initialisées pour lignes existantes'
      ]
    });
    
  } catch (error) {
    console.error('❌ Erreur:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  } finally {
    client.release();
  }
});

export default router;
