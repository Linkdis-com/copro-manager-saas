// ============================================
// MIGRATION: Système d'abonnement
// POST /api/v1/migrations/create-subscription-tables
// ============================================

import express from 'express';
import pool from '../config/database.js';

const router = express.Router();

// Créer les tables pour le système d'abonnement
router.post('/create-subscription-tables', async (req, res) => {
  try {
    console.log('🔄 Running migration: create-subscription-tables...');
    
    // 1. Table des plans d'abonnement
    await pool.query(`
      CREATE TABLE IF NOT EXISTS plans (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        code VARCHAR(50) UNIQUE NOT NULL,
        name VARCHAR(100) NOT NULL,
        description TEXT,
        price_monthly DECIMAL(10,2) NOT NULL DEFAULT 0,
        price_yearly DECIMAL(10,2) DEFAULT NULL,
        currency VARCHAR(3) DEFAULT 'EUR',
        max_immeubles INTEGER NOT NULL DEFAULT 1,
        max_proprietaires INTEGER NOT NULL DEFAULT 5,
        max_locataires INTEGER NOT NULL DEFAULT 10,
        max_users INTEGER NOT NULL DEFAULT 1,
        features JSONB DEFAULT '[]',
        is_active BOOLEAN DEFAULT true,
        sort_order INTEGER DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Table plans created');

    // 2. Table des abonnements utilisateurs
    await pool.query(`
      CREATE TABLE IF NOT EXISTS subscriptions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        plan_id UUID NOT NULL REFERENCES plans(id),
        status VARCHAR(20) NOT NULL DEFAULT 'active',
        billing_cycle VARCHAR(20) DEFAULT 'monthly',
        current_period_start TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        current_period_end TIMESTAMP WITH TIME ZONE,
        trial_end TIMESTAMP WITH TIME ZONE,
        cancel_at_period_end BOOLEAN DEFAULT false,
        canceled_at TIMESTAMP WITH TIME ZONE,
        stripe_subscription_id VARCHAR(255),
        stripe_customer_id VARCHAR(255),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id)
      )
    `);
    console.log('✅ Table subscriptions created');

    // 3. Table historique des factures
    await pool.query(`
      CREATE TABLE IF NOT EXISTS invoices (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        subscription_id UUID REFERENCES subscriptions(id),
        stripe_invoice_id VARCHAR(255),
        amount DECIMAL(10,2) NOT NULL,
        currency VARCHAR(3) DEFAULT 'EUR',
        status VARCHAR(20) NOT NULL DEFAULT 'pending',
        paid_at TIMESTAMP WITH TIME ZONE,
        invoice_pdf_url TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Table invoices created');

    // 4. Insérer les plans par défaut
    await pool.query(`
      INSERT INTO plans (code, name, description, price_monthly, price_yearly, max_immeubles, max_proprietaires, max_locataires, max_users, features, sort_order)
      VALUES 
        ('free', 'Gratuit', 'Essai gratuit pendant 30 jours', 0, 0, 1, 5, 10, 1, 
         '["Comptabilité de base", "1 immeuble", "5 propriétaires max", "Support email"]'::jsonb, 0),
        ('starter', 'Starter', 'Pour les petites copropriétés', 9.00, 90.00, 3, 20, 50, 1, 
         '["Comptabilité complète", "3 immeubles", "20 propriétaires", "Export PDF", "Support email prioritaire"]'::jsonb, 1),
        ('pro', 'Pro', 'Pour les syndics professionnels', 29.00, 290.00, 10, 100, 300, 3, 
         '["Toutes fonctionnalités", "10 immeubles", "100 propriétaires", "Export PDF/Excel", "Multi-utilisateurs", "Support prioritaire"]'::jsonb, 2),
        ('enterprise', 'Enterprise', 'Pour les grandes structures', 79.00, 790.00, -1, -1, -1, -1, 
         '["Immeubles illimités", "Propriétaires illimités", "Multi-utilisateurs illimités", "API access", "Support téléphone dédié", "Formation incluse"]'::jsonb, 3)
      ON CONFLICT (code) DO UPDATE SET
        name = EXCLUDED.name,
        description = EXCLUDED.description,
        price_monthly = EXCLUDED.price_monthly,
        price_yearly = EXCLUDED.price_yearly,
        max_immeubles = EXCLUDED.max_immeubles,
        max_proprietaires = EXCLUDED.max_proprietaires,
        max_locataires = EXCLUDED.max_locataires,
        max_users = EXCLUDED.max_users,
        features = EXCLUDED.features,
        sort_order = EXCLUDED.sort_order,
        updated_at = CURRENT_TIMESTAMP
    `);
    console.log('✅ Default plans inserted');

    // 5. Créer un abonnement gratuit pour tous les utilisateurs existants
    const freePlan = await pool.query("SELECT id FROM plans WHERE code = 'free'");
    if (freePlan.rows.length > 0) {
      const freePlanId = freePlan.rows[0].id;
      
      await pool.query(`
        INSERT INTO subscriptions (user_id, plan_id, status, trial_end)
        SELECT id, $1, 'trialing', CURRENT_TIMESTAMP + INTERVAL '30 days'
        FROM users
        WHERE id NOT IN (SELECT user_id FROM subscriptions)
      `, [freePlanId]);
      console.log('✅ Free subscriptions created for existing users');
    }

    // 6. Ajouter colonnes manquantes à users si nécessaire
    await pool.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS telephone VARCHAR(50),
      ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    `);
    console.log('✅ User columns updated');

    // Vérifier les tables créées
    const tables = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('plans', 'subscriptions', 'invoices')
      ORDER BY table_name
    `);

    const plans = await pool.query('SELECT code, name, price_monthly, max_immeubles FROM plans ORDER BY sort_order');

    res.json({
      success: true,
      message: 'Migration completed successfully',
      tables: tables.rows.map(t => t.table_name),
      plans: plans.rows
    });
    
  } catch (error) {
    console.error('❌ Migration error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      detail: error.detail
    });
  }
});

export default router;
