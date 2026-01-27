// ============================================
// MIGRATION: Table password_reset_tokens
// POST /api/v1/migrations/create-password-reset-table
// ============================================

import express from 'express';
import pool from '../config/database.js';

const router = express.Router();

router.post('/create-password-reset-table', async (req, res) => {
  try {
    console.log('🔄 Running migration: create-password-reset-table...');
    
    // Créer la table des tokens de réinitialisation
    await pool.query(`
      CREATE TABLE IF NOT EXISTS password_reset_tokens (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token_hash VARCHAR(255) NOT NULL,
        expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
        used_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Table password_reset_tokens created');

    // Index pour recherche rapide par token
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_password_reset_token_hash 
      ON password_reset_tokens(token_hash)
    `);
    console.log('✅ Index on token_hash created');

    // Index pour nettoyage des tokens expirés
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_password_reset_expires 
      ON password_reset_tokens(expires_at)
    `);
    console.log('✅ Index on expires_at created');

    // Vérifier la table
    const tables = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'password_reset_tokens'
      ORDER BY ordinal_position
    `);

    res.json({
      success: true,
      message: 'Migration completed successfully',
      table: 'password_reset_tokens',
      columns: tables.rows
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
