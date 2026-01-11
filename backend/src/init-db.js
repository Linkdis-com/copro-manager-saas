import pg from 'pg';

export async function initDatabase(pool) {
  const sql = `
    -- Enable UUID extension
    CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

    -- Create users table
    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      email VARCHAR(255) UNIQUE NOT NULL,
      password_hash VARCHAR(255),
      first_name VARCHAR(100),
      last_name VARCHAR(100),
      locale VARCHAR(5) DEFAULT 'fr',
      email_verified BOOLEAN DEFAULT false,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      last_login TIMESTAMP
    );

    -- Insert test data
    INSERT INTO users (email, first_name, last_name) 
    VALUES ('test@copro-manager.com', 'Test', 'User')
    ON CONFLICT (email) DO NOTHING;
  `;

  try {
    await pool.query(sql);
    console.log('✅ Database initialized successfully');
    return { success: true, message: 'Database initialized' };
  } catch (error) {
    console.error('❌ Database initialization error:', error);
    return { success: false, error: error.message };
  }
}

export async function checkTables(pool) {
  try {
    const result = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    return result.rows;
  } catch (error) {
    console.error('❌ Error checking tables:', error);
    return [];
  }
}
