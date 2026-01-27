import dotenv from 'dotenv';
dotenv.config();

import pool from '../config/database.js';

async function runMigration() {
  const client = await pool.connect();
  
  try {
    console.log('🚀 Starting migration 007...');
    
    await client.query('BEGIN');

    // Ajouter colonne proprietaire_id
    console.log('Adding proprietaire_id column...');
    await client.query(`
      ALTER TABLE compteurs_eau 
      ADD COLUMN IF NOT EXISTS proprietaire_id UUID REFERENCES proprietaires(id) ON DELETE SET NULL
    `);

    // Supprimer l'ancienne contrainte si elle existe
    console.log('Dropping old constraint if exists...');
    await client.query(`
      ALTER TABLE compteurs_eau 
      DROP CONSTRAINT IF EXISTS compteur_assignation_check
    `);

    // Ajouter nouvelle contrainte
    console.log('Adding new constraint...');
    await client.query(`
      ALTER TABLE compteurs_eau 
      ADD CONSTRAINT compteur_assignation_check 
      CHECK (
        (locataire_id IS NOT NULL AND proprietaire_id IS NULL) OR
        (locataire_id IS NULL AND proprietaire_id IS NOT NULL) OR
        (locataire_id IS NULL AND proprietaire_id IS NULL)
      )
    `);

    await client.query('COMMIT');
    console.log('✅ Migration 007 completed successfully!');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Migration failed:', error.message);
    throw error;
  } finally {
    client.release();
    process.exit(0);
  }
}

runMigration();