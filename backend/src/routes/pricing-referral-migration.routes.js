// ============================================
// MIGRATION: Système Pricing + Parrainage + Partage Social
// POST /api/v1/migrations/setup-pricing-referral
// ============================================

import express from 'express';
import pool from '../config/database.js';

const router = express.Router();

router.post('/setup-pricing-referral', async (req, res) => {
  try {
    console.log('🔄 Running migration: setup-pricing-referral...');
    
    // ============================================
    // 1. MISE À JOUR TABLE PLANS
    // ============================================
    
    // Ajouter les nouvelles colonnes si nécessaires
    await pool.query(`
      ALTER TABLE plans 
      ADD COLUMN IF NOT EXISTS price_per_unit DECIMAL(10,2) DEFAULT 0,
      ADD COLUMN IF NOT EXISTS is_professional BOOLEAN DEFAULT false,
      ADD COLUMN IF NOT EXISTS vat_rate DECIMAL(5,2) DEFAULT 0,
      ADD COLUMN IF NOT EXISTS trial_days INTEGER DEFAULT 15
    `);
    console.log('✅ Plans table columns added');

    // Sauvegarder les user_id des subscriptions existantes
    const existingSubscriptions = await pool.query('SELECT user_id FROM subscriptions');
    const userIds = existingSubscriptions.rows.map(s => s.user_id);
    console.log(`📋 Found ${userIds.length} existing subscriptions to migrate`);

    // Supprimer les subscriptions existantes (on les recréera après)
    await pool.query('DELETE FROM subscriptions');
    console.log('✅ Old subscriptions deleted');

    // Supprimer les anciens plans
    await pool.query('DELETE FROM plans');
    console.log('✅ Old plans deleted');

    // Insérer les nouveaux plans
    await pool.query(`
      INSERT INTO plans (
        code, name, description, 
        price_monthly, price_yearly, price_per_unit,
        is_professional, vat_rate, trial_days,
        max_immeubles, max_proprietaires, max_locataires, max_users,
        features, sort_order, is_active
      ) VALUES 
      -- PARTICULIER : 2€ TTC/unité/mois - 1 SEUL IMMEUBLE
      (
        'particulier', 
        'Particulier', 
        'Pour les syndics bénévoles et copropriétaires',
        0, 0, 2.00,
        false, 0, 15,
        1, -1, -1, 3,
        '["2€/unité/mois TTC", "1 immeuble", "Décomptes eau", "Export PDF", "Support email"]'::jsonb,
        1, true
      ),
      -- PROFESSIONNEL : 4€ HTVA/unité/mois + 21% TVA - MULTI-IMMEUBLES
      (
        'professionnel', 
        'Professionnel', 
        'Pour les syndics professionnels assujettis TVA',
        0, 0, 4.00,
        true, 21.00, 15,
        -1, -1, -1, 10,
        '["4€/unité/mois HTVA", "TVA 21% récupérable", "Multi-immeubles", "Support prioritaire"]'::jsonb,
        2, true
      )
    `);
    console.log('✅ New plans inserted');

    // Récupérer l'ID du plan particulier (par défaut)
    const defaultPlan = await pool.query("SELECT id FROM plans WHERE code = 'particulier'");
    const defaultPlanId = defaultPlan.rows[0].id;

    // Recréer les subscriptions pour les utilisateurs existants
    for (const userId of userIds) {
      await pool.query(`
        INSERT INTO subscriptions (user_id, plan_id, status, trial_end, created_at)
        VALUES ($1, $2, 'trialing', CURRENT_TIMESTAMP + INTERVAL '15 days', CURRENT_TIMESTAMP)
        ON CONFLICT (user_id) DO NOTHING
      `, [userId, defaultPlanId]);
    }
    console.log(`✅ ${userIds.length} subscriptions recreated with 'particulier' plan`);

    // ============================================
    // 2. TABLE CODES DE PARRAINAGE
    // ============================================
    
    await pool.query(`
      CREATE TABLE IF NOT EXISTS referral_codes (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        code VARCHAR(20) NOT NULL UNIQUE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_referral_code ON referral_codes(code)
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_referral_user ON referral_codes(user_id)
    `);
    console.log('✅ Table referral_codes created');

    // ============================================
    // 3. TABLE PARRAINAGES
    // ============================================
    
    await pool.query(`
      CREATE TABLE IF NOT EXISTS referrals (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        referrer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        referred_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        referral_code VARCHAR(20) NOT NULL,
        status VARCHAR(20) DEFAULT 'pending',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        completed_at TIMESTAMP WITH TIME ZONE,
        UNIQUE(referred_id)
      )
    `);
    
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON referrals(referrer_id)
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_referrals_status ON referrals(status)
    `);
    console.log('✅ Table referrals created');

    // ============================================
    // 4. TABLE RÉDUCTIONS
    // ============================================
    
    await pool.query(`
      CREATE TABLE IF NOT EXISTS discounts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        type VARCHAR(30) NOT NULL,
        percentage INTEGER NOT NULL,
        reason VARCHAR(255),
        valid_months INTEGER DEFAULT 12,
        applied_at TIMESTAMP WITH TIME ZONE,
        expires_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_discounts_user ON discounts(user_id)
    `);
    console.log('✅ Table discounts created');

    // ============================================
    // 5. TABLE DEMANDES PARTAGE SOCIAL
    // ============================================
    
    await pool.query(`
      CREATE TABLE IF NOT EXISTS social_shares (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        platform VARCHAR(30) NOT NULL,
        status VARCHAR(20) DEFAULT 'pending',
        screenshot_filename VARCHAR(255),
        admin_notes TEXT,
        verified_by UUID REFERENCES users(id),
        verified_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_social_shares_user ON social_shares(user_id)
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_social_shares_status ON social_shares(status)
    `);
    console.log('✅ Table social_shares created');

    // ============================================
    // 6. PALIERS DE PARRAINAGE
    // ============================================
    
    await pool.query(`
      CREATE TABLE IF NOT EXISTS referral_tiers (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        min_referrals INTEGER NOT NULL UNIQUE,
        discount_percentage INTEGER NOT NULL,
        description VARCHAR(255),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Supprimer et recréer les paliers
    await pool.query('DELETE FROM referral_tiers');
    await pool.query(`
      INSERT INTO referral_tiers (min_referrals, discount_percentage, description) VALUES
      (1, 30, '30% de réduction la 1ère année'),
      (3, 50, '50% de réduction la 1ère année'),
      (5, 100, '1 an gratuit')
    `);
    console.log('✅ Referral tiers configured');

    // ============================================
    // 7. COLONNES UTILISATEUR
    // ============================================
    
    await pool.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS referred_by_code VARCHAR(20),
      ADD COLUMN IF NOT EXISTS is_professional BOOLEAN DEFAULT false,
      ADD COLUMN IF NOT EXISTS company_name VARCHAR(255),
      ADD COLUMN IF NOT EXISTS vat_number VARCHAR(50)
    `);
    console.log('✅ Users table updated');

    // ============================================
    // 8. COLONNES ABONNEMENT
    // ============================================
    
    await pool.query(`
      ALTER TABLE subscriptions 
      ADD COLUMN IF NOT EXISTS total_units INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS discount_percentage INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS discount_expires_at TIMESTAMP WITH TIME ZONE,
      ADD COLUMN IF NOT EXISTS base_price_yearly DECIMAL(10,2) DEFAULT 0,
      ADD COLUMN IF NOT EXISTS discount_amount DECIMAL(10,2) DEFAULT 0,
      ADD COLUMN IF NOT EXISTS vat_amount DECIMAL(10,2) DEFAULT 0,
      ADD COLUMN IF NOT EXISTS final_price_yearly DECIMAL(10,2) DEFAULT 0
    `);
    
    // Ajouter contrainte unique sur user_id si elle n'existe pas
    await pool.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'subscriptions_user_id_key'
        ) THEN
          ALTER TABLE subscriptions ADD CONSTRAINT subscriptions_user_id_key UNIQUE (user_id);
        END IF;
      EXCEPTION WHEN duplicate_table THEN
        -- La contrainte existe déjà, ignorer
      END $$;
    `);
    console.log('✅ Subscriptions table updated');

    // ============================================
    // 8b. TABLE BILLING_SETTINGS (Admin - Émetteur factures)
    // ============================================
    
    await pool.query(`
      CREATE TABLE IF NOT EXISTS billing_settings (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        company_name VARCHAR(255) NOT NULL DEFAULT 'Ma Société',
        vat_number VARCHAR(50),
        bce_number VARCHAR(50),
        address_street VARCHAR(255),
        address_postal_code VARCHAR(20),
        address_city VARCHAR(100),
        address_country VARCHAR(100) DEFAULT 'Belgique',
        email VARCHAR(255),
        phone VARCHAR(50),
        website VARCHAR(255),
        iban VARCHAR(50),
        bic VARCHAR(20),
        bank_name VARCHAR(100),
        invoice_prefix VARCHAR(10) DEFAULT 'F',
        invoice_next_number INTEGER DEFAULT 1,
        vat_applicable BOOLEAN DEFAULT true,
        vat_rate DECIMAL(5,2) DEFAULT 21.00,
        legal_mentions TEXT,
        logo_url VARCHAR(500),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Créer une entrée par défaut si elle n'existe pas
    await pool.query(`
      INSERT INTO billing_settings (id, company_name)
      SELECT gen_random_uuid(), 'Ma Société'
      WHERE NOT EXISTS (SELECT 1 FROM billing_settings)
    `);
    console.log('✅ Table billing_settings created');

    // ============================================
    // 8c. TABLE INVOICES (Factures clients)
    // ============================================
    
    await pool.query(`
      CREATE TABLE IF NOT EXISTS invoices (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        invoice_number VARCHAR(50) NOT NULL UNIQUE,
        invoice_date DATE NOT NULL DEFAULT CURRENT_DATE,
        due_date DATE NOT NULL DEFAULT (CURRENT_DATE + INTERVAL '30 days'),
        
        -- Client
        client_name VARCHAR(255),
        client_address TEXT,
        client_vat_number VARCHAR(50),
        client_is_professional BOOLEAN DEFAULT false,
        
        -- Montants
        subtotal DECIMAL(10,2) NOT NULL DEFAULT 0,
        discount_percentage INTEGER DEFAULT 0,
        discount_amount DECIMAL(10,2) DEFAULT 0,
        vat_rate DECIMAL(5,2) DEFAULT 0,
        vat_amount DECIMAL(10,2) DEFAULT 0,
        total DECIMAL(10,2) NOT NULL DEFAULT 0,
        
        -- Détails abonnement
        period_start DATE,
        period_end DATE,
        plan_code VARCHAR(50),
        plan_name VARCHAR(100),
        units_count INTEGER,
        price_per_unit DECIMAL(10,2),
        
        -- Statut
        status VARCHAR(20) DEFAULT 'pending',
        paid_at TIMESTAMP WITH TIME ZONE,
        payment_method VARCHAR(50),
        stripe_payment_id VARCHAR(255),
        
        -- PDF
        pdf_url VARCHAR(500),
        
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_invoices_user ON invoices(user_id)
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status)
    `);
    console.log('✅ Table invoices created');

    // ============================================
    // 8d. COLONNES ADRESSE FACTURATION USERS
    // ============================================
    
    await pool.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS billing_address_street VARCHAR(255),
      ADD COLUMN IF NOT EXISTS billing_address_postal_code VARCHAR(20),
      ADD COLUMN IF NOT EXISTS billing_address_city VARCHAR(100),
      ADD COLUMN IF NOT EXISTS billing_address_country VARCHAR(100) DEFAULT 'Belgique'
    `);
    console.log('✅ Users billing address columns added');

    // ============================================
    // 9. GÉNÉRER CODES POUR USERS EXISTANTS
    // ============================================
    
    const existingUsers = await pool.query('SELECT id, first_name FROM users');
    let codesGenerated = 0;
    
    for (const user of existingUsers.rows) {
      const existing = await pool.query(
        'SELECT id FROM referral_codes WHERE user_id = $1',
        [user.id]
      );
      
      if (existing.rows.length === 0) {
        const code = generateReferralCode(user.first_name);
        try {
          await pool.query(
            'INSERT INTO referral_codes (user_id, code) VALUES ($1, $2)',
            [user.id, code]
          );
          codesGenerated++;
        } catch (e) {
          // Code déjà existant, générer un autre
          const newCode = generateReferralCode(user.first_name);
          await pool.query(
            'INSERT INTO referral_codes (user_id, code) VALUES ($1, $2)',
            [user.id, newCode]
          );
          codesGenerated++;
        }
      }
    }
    console.log(`✅ ${codesGenerated} referral codes generated`);

    // ============================================
    // RÉSULTAT
    // ============================================
    
    const plans = await pool.query('SELECT code, name, price_per_unit, is_professional, vat_rate, max_immeubles FROM plans ORDER BY sort_order');
    const tiers = await pool.query('SELECT min_referrals, discount_percentage, description FROM referral_tiers ORDER BY min_referrals');
    const codes = await pool.query('SELECT COUNT(*) as count FROM referral_codes');
    const subs = await pool.query('SELECT COUNT(*) as count FROM subscriptions');
    const billing = await pool.query('SELECT company_name FROM billing_settings LIMIT 1');

    res.json({
      success: true,
      message: 'Migration completed successfully!',
      data: {
        plans: plans.rows.map(p => ({
          ...p,
          max_immeubles: p.max_immeubles === -1 ? 'Illimité' : p.max_immeubles
        })),
        referralTiers: tiers.rows,
        totalReferralCodes: parseInt(codes.rows[0].count),
        subscriptionsMigrated: parseInt(subs.rows[0].count),
        billingCompany: billing.rows[0]?.company_name || 'Non configuré',
        tablesCreated: [
          'referral_codes',
          'referrals', 
          'discounts',
          'social_shares',
          'referral_tiers',
          'billing_settings',
          'invoices'
        ],
        features: [
          'Plan Particulier: 2€ TTC/unité, 1 immeuble max',
          'Plan Professionnel: 4€ HTVA + 21% TVA, immeubles illimités',
          'Parrainage: Lien unique + Paliers 30%/50%/100%',
          'Partage social: 20% réduction avec vérification manuelle',
          'Filleul: 20% réduction automatique',
          'Facturation: Tables billing_settings + invoices créées'
        ]
      }
    });
    
  } catch (error) {
    console.error('❌ Migration error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

/**
 * Générer un code de parrainage unique
 */
function generateReferralCode(firstName) {
  const name = (firstName || 'USER')
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Supprimer accents
    .replace(/[^A-Z]/g, '')
    .substring(0, 5);
  const year = new Date().getFullYear();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${name}${year}${random}`;
}

export default router;
