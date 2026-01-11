import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import pg from 'pg';
import { initDatabase, checkTables } from './init-db.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Database connection
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? {
    rejectUnauthorized: false
  } : false
});

// Test database connection
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('❌ Database connection error:', err);
  } else {
    console.log('✅ Database connected at:', res.rows[0].now);
  }
});

// Health check route
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Copro Manager API is running',
    timestamp: new Date().toISOString()
  });
});

// API version route
app.get('/api/v1', (req, res) => {
  res.json({
    message: 'Copro Manager API v1',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      api: '/api/v1',
      initDb: '/init-db',
      checkTables: '/check-tables'
    }
  });
});

// Initialize database route (TEMPORARY - for setup only)
app.post('/init-db', async (req, res) => {
  console.log('🔧 Initializing database...');
  const result = await initDatabase(pool);
  res.json(result);
});

// Check tables route
app.get('/check-tables', async (req, res) => {
  const tables = await checkTables(pool);
  res.json({
    tables: tables,
    count: tables.length
  });
});

// Get all users (test route)
app.get('/users', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM users');
    res.json({
      users: result.rows,
      count: result.rows.length
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📡 Environment: ${process.env.NODE_ENV}`);
});
