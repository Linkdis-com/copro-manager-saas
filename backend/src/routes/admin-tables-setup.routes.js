import express from 'express';
const router = express.Router();
import { pool } from '../server.js';

// Route temporaire pour créer les tables admin
router.post('/create-admin-tables', async (req, res) => {
  try {
    console.log('🚀 Création des tables admin...');
    
    // 1. Table admin_logs
    await pool.query(`
      CREATE TABLE IF NOT EXISTS admin_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        admin_id UUID NOT NULL REFERENCES users(id),
        action VARCHAR(100) NOT NULL,
        entity_type VARCHAR(50),
        entity_id UUID,
        details JSONB,
        ip_address VARCHAR(50),
        user_agent TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE INDEX IF NOT EXISTS idx_admin_logs_admin ON admin_logs(admin_id);
      CREATE INDEX IF NOT EXISTS idx_admin_logs_created ON admin_logs(created_at DESC);
    `);
    console.log('✅ Table admin_logs créée');

    // 2. Table campaigns
    await pool.query(`
      CREATE TABLE IF NOT EXISTS campaigns (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        description TEXT,
        type VARCHAR(50) NOT NULL,
        status VARCHAR(20) DEFAULT 'draft',
        budget NUMERIC(10,2),
        spent NUMERIC(10,2) DEFAULT 0,
        target_audience JSONB,
        metrics JSONB,
        start_date TIMESTAMP WITH TIME ZONE,
        end_date TIMESTAMP WITH TIME ZONE,
        created_by UUID REFERENCES users(id),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ Table campaigns créée');

    // 3. Table promo_codes
    await pool.query(`
      CREATE TABLE IF NOT EXISTS promo_codes (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        code VARCHAR(50) UNIQUE NOT NULL,
        description TEXT,
        discount_type VARCHAR(20) NOT NULL,
        discount_value NUMERIC(10,2) NOT NULL,
        max_uses INTEGER,
        current_uses INTEGER DEFAULT 0,
        valid_from TIMESTAMP WITH TIME ZONE,
        valid_until TIMESTAMP WITH TIME ZONE,
        min_purchase_amount NUMERIC(10,2),
        applicable_plans JSONB,
        is_active BOOLEAN DEFAULT true,
        created_by UUID REFERENCES users(id),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE INDEX IF NOT EXISTS idx_promo_codes_code ON promo_codes(code);
      CREATE INDEX IF NOT EXISTS idx_promo_codes_active ON promo_codes(is_active);
    `);
    console.log('✅ Table promo_codes créée');

    res.json({ 
      success: true, 
      message: 'Tables admin créées avec succès ✅',
      tables: ['admin_logs', 'campaigns', 'promo_codes']
    });

  } catch (error) {
    console.error('❌ Erreur création tables:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

export default router;