import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import pg from 'pg';
import authRoutes from './routes/auth.routes.js';
import { createImmeublesTablesschema } from './migrations/create-immeubles-tables.js';
import immeublesRoutes from './routes/immeubles.routes.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Request logging middleware
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.path}`);
  next();
});

// Database connection
export const pool = new pg.Pool({
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
    message: 'Copro Manager API',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

app.get('/api/v1', (req, res) => {
  res.json({
    name: 'Copro Manager API',
    version: '1.0.0',
    description: 'API de gestion de copropriété',
    endpoints: {
      health: 'GET /health',
      auth: {
        register: 'POST /api/v1/auth/register',
        login: 'POST /api/v1/auth/login',
        profile: 'GET /api/v1/auth/me (protected)'
      },
      immeubles: {
        list: 'GET /api/v1/immeubles (protected)',
        get: 'GET /api/v1/immeubles/:id (protected)',
        create: 'POST /api/v1/immeubles (protected)',
        update: 'PATCH /api/v1/immeubles/:id (protected)',
        delete: 'DELETE /api/v1/immeubles/:id (protected)'
      }
    }
  });
});

// Temporary: Migration endpoint
app.post('/migrate-immeubles', async (req, res) => {
  console.log('🔧 Running migration: create immeubles tables...');
  const result = await createImmeublesTablesschema();
  res.json(result);
});

// API Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/immeubles', immeublesRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.method} ${req.path} not found`,
    availableEndpoints: '/api/v1'
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('❌ Error:', err);
  
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🚀 Copro Manager API');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`📡 Server running on port ${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔐 Auth endpoints: /api/v1/auth/*`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
});
