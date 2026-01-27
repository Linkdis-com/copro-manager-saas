import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import pg from 'pg';
import authRoutes from './routes/auth.routes.js';
import immeublesRoutes from './routes/immeubles.routes.js';
import devRoutes from './routes/dev.routes.js';
import decomptesRoutes from './routes/decomptes.routes.js';
import tarifsEauRoutes from './routes/tarifs-eau.routes.js';
import compteursEauRoutes from './routes/compteurs-eau.routes.js';
import relevesRoutes from './routes/releves.routes.js';
import exercicesRoutes from './routes/exercices.routes.js';
import migrationsRoutes from './routes/migrations.routes.js';
import subscriptionMigrationRoutes from './routes/subscription-migration-fix.routes.js';
import subscriptionsRoutes from './routes/subscriptions.routes.js';
import passwordResetMigrationRoutes from './routes/password-reset-migration.routes.js';
import pricingReferralMigration from './routes/pricing-referral-migration.routes.js';
import referralRoutes from './routes/referral.routes.js';
import adminRoutes from './routes/admin.routes.js';
import invoicesRoutes from './routes/invoices.routes.js';
import adminSetupMigration from './routes/admin-setup-migration.routes.js';
import adminTablesSetup from './routes/admin-tables-setup.routes.js';
import dbMigrationsRoutes from './routes/db-migrations.routes.js';


const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Request logging (simplifié)
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
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

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString()
  });
});

// API Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/decomptes/:decompteId/releves', relevesRoutes);
app.use('/api/v1/immeubles/:immeubleId/exercices', exercicesRoutes);
app.use('/api/v1/immeubles', immeublesRoutes);
app.use('/api/v1/dev', devRoutes);
app.use('/api/v1/decomptes', decomptesRoutes);
app.use('/api/v1/tarifs-eau', tarifsEauRoutes);
app.use('/api/v1/migrations', migrationsRoutes);
app.use('/api/v1/migrations', subscriptionMigrationRoutes);
app.use('/api/v1/subscriptions', subscriptionsRoutes);
app.use('/api/v1/migrations', passwordResetMigrationRoutes);
app.use('/api/v1/migrations', pricingReferralMigration);
app.use('/api/v1/referral', referralRoutes);
app.use('/api/v1/admin', adminRoutes);
app.use('/api/v1/invoices', invoicesRoutes);
app.use('/api/v1/migrations', adminSetupMigration);
app.use('/api/v1/admin-setup', adminTablesSetup); 
app.use('/api/v1/immeubles', compteursEauRoutes);
app.use('/api/v1/db-migrations', dbMigrationsRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.method} ${req.path} not found`
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
  console.log(`💳 Subscriptions: /api/v1/subscriptions/*`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
});