/**
 * BACKEND - db-migrations.routes.js (ES MODULES)
 * 
 * À placer dans: backend/src/routes/db-migrations.routes.js
 */

import express from 'express';
import pool from '../config/database.js';

const router = express.Router();

// Endpoint pour ajouter les colonnes manquantes
router.post('/add-columns', async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    console.log('🔧 Migration 1: Adding columns to immeubles...');
    await client.query(`
      ALTER TABLE immeubles 
      ADD COLUMN IF NOT EXISTS mode_comptage_eau VARCHAR(50) DEFAULT 'divisionnaire',
      ADD COLUMN IF NOT EXISTS numero_compteur_principal VARCHAR(50)
    `);
    
    console.log('🔧 Migration 2: Adding columns to compteurs_eau...');
    await client.query(`
      ALTER TABLE compteurs_eau
      ADD COLUMN IF NOT EXISTS proprietaire_id UUID,
      ADD COLUMN IF NOT EXISTS index_precedent DECIMAL(10,4) DEFAULT 0,
      ADD COLUMN IF NOT EXISTS date_index_precedent DATE
    `);
    
    // Ajouter la foreign key séparément
    await client.query(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints 
          WHERE constraint_name = 'fk_compteurs_proprietaire'
        ) THEN
          ALTER TABLE compteurs_eau 
          ADD CONSTRAINT fk_compteurs_proprietaire 
          FOREIGN KEY (proprietaire_id) REFERENCES proprietaires(id) ON DELETE SET NULL;
        END IF;
      END $$;
    `);
    
    console.log('🔧 Migration 3: Adding columns to decomptes...');
    await client.query(`
      ALTER TABLE decomptes
      ADD COLUMN IF NOT EXISTS tarif_distribution DECIMAL(10,2),
      ADD COLUMN IF NOT EXISTS tarif_assainissement DECIMAL(10,2),
      ADD COLUMN IF NOT EXISTS redevance_fixe_annuelle DECIMAL(10,2),
      ADD COLUMN IF NOT EXISTS tva_pourcent DECIMAL(5,2) DEFAULT 6.0
    `);
    
    await client.query('COMMIT');
    
    console.log('✅ All migrations completed successfully!');
    
    res.json({
      success: true,
      message: 'All columns added successfully',
      migrations: [
        'immeubles: mode_comptage_eau, numero_compteur_principal',
        'compteurs_eau: proprietaire_id, index_precedent, date_index_precedent',
        'decomptes: tarif_distribution, tarif_assainissement, redevance_fixe_annuelle, tva_pourcent'
      ]
    });
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Migration failed:', error);
    
    res.status(500).json({
      success: false,
      message: error.message,
      error: error.stack
    });
  } finally {
    client.release();
  }
});

// Endpoint pour vérifier les colonnes
router.get('/check-columns', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        table_name,
        column_name,
        data_type,
        is_nullable
      FROM information_schema.columns
      WHERE table_name IN ('immeubles', 'compteurs_eau', 'decomptes')
        AND column_name IN (
          'mode_comptage_eau',
          'numero_compteur_principal',
          'proprietaire_id',
          'index_precedent',
          'date_index_precedent',
          'tarif_distribution',
          'tarif_assainissement',
          'redevance_fixe_annuelle',
          'tva_pourcent'
        )
      ORDER BY table_name, column_name
    `);
    
    res.json({
      success: true,
      columns: result.rows,
      count: result.rows.length
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

export default router;
