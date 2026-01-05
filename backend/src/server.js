import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import pg from 'pg';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Database connection
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

// Test database connection
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('❌ Database connection error:', err);
  } else {
    console.log('✅ Database connected:', res.rows[0].now);
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

// API routes
app.get('/api/v1', (req, res) => {
  res.json({
    message: 'Copro Manager API v1',
    version: '1.0.0'
  });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
```

**Créer .env.example :**

Dans `backend`, crée un fichier `.env.example` :
```
# Database
DATABASE_URL=postgresql://user:password@host:5432/database

# JWT
JWT_SECRET=your-super-secret-key-change-this

# Environment
NODE_ENV=production
PORT=3000

# Frontend URL (for CORS)
FRONTEND_URL=https://your-domain.com