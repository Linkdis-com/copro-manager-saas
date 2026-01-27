// ============================================
// MIGRATION TEMPORAIRE - À SUPPRIMER APRÈS USAGE
// Ajouter dans routes/index.js ou créer un fichier séparé
// ============================================

import express from 'express';
import pool from '../config/database.js';

const router = express.Router();

// Endpoint de migration - À APPELER UNE SEULE FOIS via reqbin.com
// POST /api/v1/migrations/add-user-fields
router.post('/add-user-fields', async (req, res) => {
  try {
    console.log('🔄 Running migration: add-user-fields...');
    
    // Ajouter la colonne telephone si elle n'existe pas
    await pool.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS telephone VARCHAR(50)
    `);
    console.log('✅ Column telephone added (or already exists)');
    
    // Ajouter la colonne updated_at si elle n'existe pas
    await pool.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    `);
    console.log('✅ Column updated_at added (or already exists)');
    
    // Vérifier les colonnes
    const result = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'users'
      ORDER BY ordinal_position
    `);
    
    console.log('📋 Users table columns:', result.rows.map(r => r.column_name));
    
    res.json({
      success: true,
      message: 'Migration completed successfully',
      columns: result.rows
    });
    
  } catch (error) {
    console.error('❌ Migration error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;
