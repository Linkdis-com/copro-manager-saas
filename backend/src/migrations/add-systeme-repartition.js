import pool from '../config/database.js';

export async function addSystemeRepartitionToImmeubles() {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    console.log('🔍 Checking if systeme_repartition column exists...');
    
    // Vérifier si la colonne existe déjà
    const columnCheck = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'immeubles' 
      AND column_name = 'systeme_repartition';
    `);

    if (columnCheck.rows.length > 0) {
      console.log('✅ Column systeme_repartition already exists');
      await client.query('COMMIT');
      return { alreadyExists: true };
    }

    console.log('📋 Adding systeme_repartition column...');
    
    // Ajouter la colonne systeme_repartition
    await client.query(`
      ALTER TABLE immeubles 
      ADD COLUMN systeme_repartition VARCHAR(20) DEFAULT 'milliemes' 
      CHECK (systeme_repartition IN ('milliemes', 'parts'));
    `);

    // Mettre à jour les immeubles existants
    await client.query(`
      UPDATE immeubles 
      SET systeme_repartition = 'milliemes' 
      WHERE systeme_repartition IS NULL;
    `);

    await client.query('COMMIT');
    
    console.log('✅ Column systeme_repartition added successfully');
    return { success: true };

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error adding systeme_repartition:', error);
    throw error;
  } finally {
    client.release();
  }
}