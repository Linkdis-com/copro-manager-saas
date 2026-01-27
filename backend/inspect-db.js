import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function inspectDB() {
  try {
    // Liste des tables
    const tables = await pool.query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
    
    console.log('=== LISTE DES TABLES ===\n');
    tables.rows.forEach(row => console.log(row.table_name));
    
    // Structure de chaque table
    for (let row of tables.rows) {
      const columns = await pool.query(`
        SELECT 
          column_name, 
          data_type, 
          character_maximum_length,
          is_nullable,
          column_default
        FROM information_schema.columns 
        WHERE table_name = $1
        ORDER BY ordinal_position
      `, [row.table_name]);
      
      console.log(`\n\n=== TABLE: ${row.table_name} ===`);
      console.table(columns.rows);
    }
    
  } catch (error) {
    console.error('Erreur:', error);
  } finally {
    await pool.end();
    process.exit(0);
  }
}

inspectDB();