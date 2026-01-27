// ============================================
// MIGRATION FIX: Recréer les tables d'abonnement
// POST /api/v1/migrations/fix-subscription-tables
// ============================================

import express from 'express';
import pool from '../config/database.js';

const router = express.Router();

// Supprimer et recréer les tables d'abonnement
router.post('/fix-subscription-tables', async (req, res) => {
  try {
    console.log('🔄 Running migration: fix-subscription-tables...');
    
    // 1. Supprimer les anciennes tables (dans le bon ordre à cause des foreign keys)
    console.log('🗑️ Dropping old tables...');
    await pool.query('DROP TABLE IF EXISTS invoices CASCADE');
    await pool.query('DROP TABLE IF EXISTS subscriptions CASCADE');
    await pool.query('DROP TABLE IF EXISTS plans CASCADE');
    console.log('✅ Old tables dropped');

    // 2. Créer la table des plans
    await pool.query(`
      CREATE TABLE plans (
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

    // 3. Créer la table des abonnements
    await pool.query(`
      CREATE TABLE subscriptions (
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

    // 4. Créer la table des factures
    await pool.query(`
      CREATE TABLE invoices (
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

    // 5. Insérer les plans par défaut
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
    `);
    console.log('✅ Default plans inserted');

    // 6. Récupérer l'ID du plan gratuit
    const freePlan = await pool.query("SELECT id FROM plans WHERE code = 'free'");
    const freePlanId = freePlan.rows[0].id;
    console.log('📋 Free plan ID:', freePlanId);

    // 7. Créer un abonnement gratuit pour tous les utilisateurs existants
    const usersResult = await pool.query('SELECT id FROM users');
    console.log(`👥 Found ${usersResult.rows.length} users`);
    
    for (const user of usersResult.rows) {
      await pool.query(`
        INSERT INTO subscriptions (user_id, plan_id, status, trial_end)
        VALUES ($1, $2, 'trialing', CURRENT_TIMESTAMP + INTERVAL '30 days')
        ON CONFLICT (user_id) DO NOTHING
      `, [user.id, freePlanId]);
    }
    console.log('✅ Free subscriptions created for all users');

    // 8. Ajouter colonnes manquantes à users
    await pool.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS telephone VARCHAR(50)
    `);
    await pool.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    `);
    console.log('✅ User columns updated');

    // Vérification finale
    const plansCheck = await pool.query('SELECT code, name, price_monthly, max_immeubles FROM plans ORDER BY sort_order');
    const subsCheck = await pool.query('SELECT COUNT(*) as count FROM subscriptions');

    res.json({
      success: true,
      message: 'Migration completed successfully!',
      plans: plansCheck.rows,
      subscriptionsCreated: parseInt(subsCheck.rows[0].count)
    });
    
  } catch (error) {
    console.error('❌ Migration error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      detail: error.detail,
      hint: error.hint
    });
  }
});

export default router;
