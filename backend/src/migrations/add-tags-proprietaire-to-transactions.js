// Migration: add-tags-proprietaire-to-transactions.js
// Ajoute les colonnes tags (JSONB) et proprietaire_id (FK) à la table transactions
// pour supporter l'attribution des dépôts et le tagging des charges

import pool from '../config/database.js';

export async function up() {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    console.log('📦 Migration: Adding tags and proprietaire_id to transactions...');

    // 1. Vérifier si la colonne tags existe déjà
    const tagsCheck = await client.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'transactions' AND column_name = 'tags'
    `);

    if (tagsCheck.rows.length === 0) {
      await client.query(`
        ALTER TABLE transactions 
        ADD COLUMN tags JSONB DEFAULT '[]'::jsonb
      `);
      console.log('✅ Added column: tags (JSONB)');
    } else {
      console.log('⏭️ Column tags already exists');
    }

    // 2. Vérifier si la colonne proprietaire_id existe déjà
    const propIdCheck = await client.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'transactions' AND column_name = 'proprietaire_id'
    `);

    if (propIdCheck.rows.length === 0) {
      await client.query(`
        ALTER TABLE transactions 
        ADD COLUMN proprietaire_id INTEGER REFERENCES proprietaires(id) ON DELETE SET NULL
      `);
      console.log('✅ Added column: proprietaire_id (FK to proprietaires)');
    } else {
      console.log('⏭️ Column proprietaire_id already exists');
    }

    // 3. Vérifier si la colonne nom_contrepartie existe
    const contrepartieCheck = await client.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'transactions' AND column_name = 'nom_contrepartie'
    `);

    if (contrepartieCheck.rows.length === 0) {
      await client.query(`
        ALTER TABLE transactions 
        ADD COLUMN nom_contrepartie VARCHAR(255)
      `);
      console.log('✅ Added column: nom_contrepartie');
    }

    // 4. Vérifier si la colonne communication existe
    const communicationCheck = await client.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'transactions' AND column_name = 'communication'
    `);

    if (communicationCheck.rows.length === 0) {
      await client.query(`
        ALTER TABLE transactions 
        ADD COLUMN communication TEXT
      `);
      console.log('✅ Added column: communication');
    }

    // 5. Vérifier si la colonne date_comptabilisation existe
    const dateCompCheck = await client.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'transactions' AND column_name = 'date_comptabilisation'
    `);

    if (dateCompCheck.rows.length === 0) {
      await client.query(`
        ALTER TABLE transactions 
        ADD COLUMN date_comptabilisation DATE
      `);
      console.log('✅ Added column: date_comptabilisation');
    }

    // 6. Créer un index sur proprietaire_id pour les performances
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_transactions_proprietaire_id 
      ON transactions(proprietaire_id) 
      WHERE proprietaire_id IS NOT NULL
    `);
    console.log('✅ Created index: idx_transactions_proprietaire_id');

    // 7. Créer un index GIN sur tags pour les recherches
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_transactions_tags 
      ON transactions USING GIN(tags)
    `);
    console.log('✅ Created index: idx_transactions_tags (GIN)');

    await client.query('COMMIT');
    console.log('✅ Migration completed successfully!');

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Migration failed:', error.message);
    throw error;
  } finally {
    client.release();
  }
}

export async function down() {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    console.log('📦 Rollback: Removing tags and proprietaire_id from transactions...');

    // Supprimer les index
    await client.query('DROP INDEX IF EXISTS idx_transactions_proprietaire_id');
    await client.query('DROP INDEX IF EXISTS idx_transactions_tags');

    // Supprimer les colonnes
    await client.query('ALTER TABLE transactions DROP COLUMN IF EXISTS tags');
    await client.query('ALTER TABLE transactions DROP COLUMN IF EXISTS proprietaire_id');
    await client.query('ALTER TABLE transactions DROP COLUMN IF EXISTS nom_contrepartie');
    await client.query('ALTER TABLE transactions DROP COLUMN IF EXISTS communication');
    await client.query('ALTER TABLE transactions DROP COLUMN IF EXISTS date_comptabilisation');

    await client.query('COMMIT');
    console.log('✅ Rollback completed successfully!');

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Rollback failed:', error.message);
    throw error;
  } finally {
    client.release();
  }
}

// Pour exécuter directement
const args = process.argv.slice(2);
if (args.includes('--up')) {
  up().then(() => process.exit(0)).catch(() => process.exit(1));
} else if (args.includes('--down')) {
  down().then(() => process.exit(0)).catch(() => process.exit(1));
}
