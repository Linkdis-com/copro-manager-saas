// =====================================================
// 🔧 ROUTE TEMPORAIRE - Créer table subscriptions
// backend/src/routes/create-subscriptions-table.route.js
// =====================================================
import { Router } from 'express';
import pool from '../config/database.js';

const router = Router();

// Route POST pour créer la table subscriptions
router.post('/create-subscriptions-table', async (req, res) => {
  const client = await pool.connect();
  
  try {
    console.log('🔧 Création table subscriptions...\n');
    
    // ÉTAPE 1 : Vérifier si la table existe
    const tableExists = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'subscriptions'
      )
    `);
    
    if (tableExists.rows[0].exists) {
      console.log('⚠️ La table subscriptions existe déjà');
      
      // Vérifier les colonnes
      const columns = await client.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'subscriptions'
        ORDER BY ordinal_position
      `);
      
      return res.json({
        success: true,
        message: 'La table subscriptions existe déjà',
        alreadyExists: true,
        columns: columns.rows
      });
    }
    
    // ÉTAPE 2 : Créer la table
    console.log('📋 Création de la table...');
    await client.query(`
      CREATE TABLE subscriptions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        plan_type VARCHAR(50) NOT NULL,
        status VARCHAR(20) DEFAULT 'active',
        start_date TIMESTAMP NOT NULL,
        end_date TIMESTAMP NOT NULL,
        price_monthly DECIMAL(10,2),
        is_active BOOLEAN DEFAULT true,
        is_test BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Table subscriptions créée');
    
    // ÉTAPE 3 : Créer index pour performance
    console.log('📊 Création des index...');
    await client.query(`
      CREATE INDEX idx_subscriptions_user_id ON subscriptions(user_id)
    `);
    await client.query(`
      CREATE INDEX idx_subscriptions_status ON subscriptions(status)
    `);
    await client.query(`
      CREATE INDEX idx_subscriptions_active ON subscriptions(is_active)
    `);
    console.log('✅ Index créés');
    
    // ÉTAPE 4 : Vérifier la création
    const verification = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'subscriptions'
      ORDER BY ordinal_position
    `);
    
    console.log('\n📋 Structure de la table:');
    verification.rows.forEach(col => {
      console.log(`   - ${col.column_name} (${col.data_type})`);
    });
    
    res.json({
      success: true,
      message: 'Table subscriptions créée avec succès',
      columns: verification.rows,
      steps: [
        '✅ Table subscriptions créée',
        '✅ Index créés',
        '✅ Vérification effectuée'
      ]
    });
    
  } catch (error) {
    console.error('\n❌ Erreur:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      detail: error.detail || 'Aucun détail disponible'
    });
  } finally {
    client.release();
  }
});

// Route GET pour vérifier la structure de la table
router.get('/check-subscriptions-table', async (req, res) => {
  const client = await pool.connect();
  
  try {
    // Vérifier existence
    const tableExists = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'subscriptions'
      )
    `);
    
    if (!tableExists.rows[0].exists) {
      return res.json({
        success: false,
        exists: false,
        message: 'La table subscriptions n\'existe pas'
      });
    }
    
    // Récupérer structure
    const columns = await client.query(`
      SELECT 
        column_name, 
        data_type, 
        is_nullable,
        column_default
      FROM information_schema.columns 
      WHERE table_name = 'subscriptions'
      ORDER BY ordinal_position
    `);
    
    // Compter les abonnements
    const count = await client.query('SELECT COUNT(*) as total FROM subscriptions');
    
    res.json({
      success: true,
      exists: true,
      columns: columns.rows,
      totalSubscriptions: parseInt(count.rows[0].total)
    });
    
  } catch (error) {
    console.error('Erreur:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  } finally {
    client.release();
  }
});

export default router;
