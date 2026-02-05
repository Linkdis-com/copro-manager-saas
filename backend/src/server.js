import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import pg from 'pg';

// =====================================================
// 🔐 MIDDLEWARE
// =====================================================
import { authenticate, requireEmailVerified } from './middleware/auth.js';

// =====================================================
// 📁 ROUTES PUBLIQUES (sans authentification)
// =====================================================
import authRoutes from './routes/auth.routes.js';

// =====================================================
// 📁 ROUTES PROTÉGÉES (avec authentification user)
// =====================================================
import immeublesRoutes from './routes/immeubles.routes.js';
import proprietairesRoutes from './routes/proprietaires.routes.js';
import decomptesRoutes from './routes/decomptes.routes.js';
import relevesRoutes from './routes/releves.routes.js';
import exercicesRoutes from './routes/exercices.routes.js';
import subscriptionsRoutes from './routes/subscriptions.routes.js';
import subscriptionUserRoutes from './routes/subscription-user.routes.js';
import referralRoutes from './routes/referral.routes.js';
import invoicesRoutes from './routes/invoices.routes.js';

// Routes EAU
import eauConfigRoutes from './routes/eau/configuration.routes.js';
import eauRelevesRoutes from './routes/eau/releves.routes.js';
import compteursEauRoutes from './routes/compteurs-eau.routes.js';

// =====================================================
// 📁 ROUTES ADMIN (avec authentification admin)
// =====================================================
import adminRoutes from './routes/admin.routes.js';
import adminSubscriptionsRoutes from './routes/admin-subscriptions-adapted.routes.js';

// =====================================================
// 📁 ROUTES DÉVELOPPEMENT / SETUP
// =====================================================
import devRoutes from './routes/dev.routes.js';
import setupRoutes from './routes/setup.routes.js';

// =====================================================
// 📁 ROUTES MIGRATIONS (temporaires)
// =====================================================
import migrationsRoutes from './routes/migrations.routes.js';
import subscriptionMigrationRoutes from './routes/subscription-migration-fix.routes.js';
import passwordResetMigrationRoutes from './routes/password-reset-migration.routes.js';
import pricingReferralMigration from './routes/pricing-referral-migration.routes.js';
import adminSetupMigration from './routes/admin-setup-migration.routes.js';
import adminTablesSetup from './routes/admin-tables-setup.routes.js';
import createSubscriptionsTableRoutes from './routes/create-subscriptions-table.route.js';
// =====================================================
// routes promo
// =====================================================
import migrationRoutes from './routes/migrations.routes.js';  // TEMPORAIRE
import promoRoutes from './routes/promo.routes.js';
import adminPromoRoutes from './routes/admin.promo.routes.js';
// =====================================================
// 🚀 APP CONFIGURATION
// =====================================================
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware globaux
app.use(cors());
app.use(express.json());

// Request logging (simplifié)
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});

// =====================================================
// 💾 DATABASE CONNECTION
// =====================================================
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

// =====================================================
// 🏥 HEALTH CHECK
// =====================================================
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString()
  });
});

// =====================================================
// 📍 ROUTES PUBLIQUES (SANS AUTHENTIFICATION)
// =====================================================
app.use('/api/v1/auth', authRoutes);
app.use('/api/setup', setupRoutes);
app.use('/api/v1/temp-migration', migrationRoutes);  // ← AJOUTÉ ICI (PUBLIQUE)

// =====================================================
// 📍 ROUTES ADMIN (PROTECTION ADMIN DANS LES ROUTES)
// =====================================================
app.use('/api/v1/admin', adminRoutes);
app.use('/api/v1/subscriptions-admin', adminSubscriptionsRoutes);

// =====================================================
// 🔐 MIDDLEWARE D'AUTHENTIFICATION
// Toutes les routes /api/v1 APRÈS cette ligne nécessitent un token
// =====================================================
app.use('/api/v1', authenticate);

// =====================================================
// 📍 ROUTES PROTÉGÉES (AVEC AUTHENTIFICATION)
// =====================================================

// --- Routes Immeubles & Gestion ---
app.use('/api/v1/immeubles/:immeubleId/exercices', exercicesRoutes);
app.use('/api/v1/immeubles', immeublesRoutes);
app.use('/api/v1/immeubles', compteursEauRoutes);
app.use('/api/v1/proprietaires', proprietairesRoutes);

// --- Routes Comptabilité ---
app.use('/api/v1/decomptes/:decompteId/releves', relevesRoutes);
app.use('/api/v1/decomptes', decomptesRoutes);

// --- Routes EAU ---
app.use('/api/v1/eau/configuration', eauConfigRoutes);
app.use('/api/v1/eau/releves', eauRelevesRoutes);

// --- Routes Abonnements & Facturation (User) ---
app.use('/api/v1/subscription', subscriptionUserRoutes);
app.use('/api/v1', subscriptionUserRoutes);
app.use('/api/v1/invoices', invoicesRoutes);

// --- Routes Parrainage ---
app.use('/api/v1/referral', referralRoutes);

// SUPPRIMÉ : app.use('/api/v1/temp-migration', migrationRoutes);  ← LIGNE SUPPRIMÉE (était en doublon)
app.use('/api/v1/promo', promoRoutes);
app.use('/api/v1/admin/promo-codes', adminPromoRoutes);

// =====================================================
// 📍 ROUTES DÉVELOPPEMENT
// =====================================================
app.use('/api/v1/dev', devRoutes);

// =====================================================
// 📍 ROUTES MIGRATIONS (TEMPORAIRES)
// =====================================================
app.use('/api/v1/migrations', migrationsRoutes);
app.use('/api/v1/migrations', subscriptionMigrationRoutes);
app.use('/api/v1/migrations', passwordResetMigrationRoutes);
app.use('/api/v1/migrations', pricingReferralMigration);
app.use('/api/v1/migrations', adminSetupMigration);
app.use('/api/v1/admin-setup', adminTablesSetup);
app.use('/api/v1', createSubscriptionsTableRoutes);

// =====================================================
// ❌ 404 HANDLER
// =====================================================
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.method} ${req.path} not found`
  });
});

// =====================================================
// 💥 GLOBAL ERROR HANDLER
// =====================================================
app.use((err, req, res, next) => {
  console.error('❌ Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});


// =====================================================
// 🚀 START SERVER
// =====================================================
app.listen(PORT, '0.0.0.0', () => {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🚀 Copro Manager API');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`📡 Server running on port ${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔐 Auth endpoints: /api/v1/auth/*`);
  console.log(`👤 User endpoints: /api/v1/*`);
  console.log(`👨‍💼 Admin endpoints: /api/v1/admin/*`);
  console.log(`💳 Subscriptions: /api/v1/subscription/*`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
});