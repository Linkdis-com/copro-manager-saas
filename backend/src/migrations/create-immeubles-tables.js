import pool from '../config/database.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function createImmeublesTablesschema() {
  try {
    // Lire le fichier SQL
    const sqlPath = path.join(__dirname, '../../../database/schema-immeubles.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    // Exécuter le SQL
    await pool.query(sql);

    console.log('✅ Migration: immeubles tables created successfully');
    return { success: true, message: 'Immeubles tables created' };
  } catch (error) {
    console.error('❌ Migration error:', error);
    return { success: false, error: error.message };
  }
}