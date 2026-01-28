// =====================================================
// 🔧 ROUTES SETUP EAU - À appeler via REQBIN
// backend/src/routes/setup.routes.js
// =====================================================
import express from 'express';
import pool from '../config/database.js';

const router = express.Router();

// =====================================================
// POST /api/setup/create-eau-tables
// Crée toutes les tables eau
// =====================================================
router.post('/create-eau-tables', async (req, res) => {
  const client = await pool.connect();
  
  try {
    console.log('🚀 Début création tables eau...');
    
    // 1. TABLE CONFIGURATION EAU
    await client.query(`
      CREATE TABLE IF NOT EXISTS configuration_eau (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        immeuble_id UUID REFERENCES immeubles(id) ON DELETE CASCADE,
        
        region VARCHAR(20) NOT NULL CHECK (region IN ('wallonie', 'bruxelles', 'flandre')),
        distributeur VARCHAR(100) NOT NULL,
        type_comptage VARCHAR(20) NOT NULL CHECK (type_comptage IN ('collectif', 'divisionnaire', 'individuel')),
        
        tarif_distribution DECIMAL(10,4),
        tarif_assainissement DECIMAL(10,4),
        redevance_fixe DECIMAL(10,2) DEFAULT 0,
        tva_pourcent DECIMAL(5,2) DEFAULT 6.0,
        
        tarif_base DECIMAL(10,4),
        tarif_confort DECIMAL(10,4),
        m3_base_par_habitant INTEGER DEFAULT 30,
        
        m3_gratuits_par_habitant INTEGER DEFAULT 15,
        max_habitants_gratuits INTEGER DEFAULT 5,
        
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        
        UNIQUE(immeuble_id)
      )
    `);
    console.log('✅ Table configuration_eau créée');
    
    // 2. TABLE RELEVÉS EAU
    await client.query(`
      CREATE TABLE IF NOT EXISTS releves_eau (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        immeuble_id UUID REFERENCES immeubles(id) ON DELETE CASCADE,
        compteur_id UUID REFERENCES compteurs_eau(id) ON DELETE CASCADE,
        
        periode_debut DATE NOT NULL,
        periode_fin DATE NOT NULL,
        
        index_debut DECIMAL(10,4) NOT NULL,
        index_fin DECIMAL(10,4) NOT NULL,
        consommation DECIMAL(10,4) NOT NULL,
        
        notes TEXT,
        
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        
        CHECK (index_fin >= index_debut),
        CHECK (periode_fin > periode_debut)
      )
    `);
    console.log('✅ Table releves_eau créée');
    
    // 3. TABLE DÉCOMPTES EAU
    await client.query(`
      CREATE TABLE IF NOT EXISTS decomptes_eau (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        immeuble_id UUID REFERENCES immeubles(id) ON DELETE CASCADE,
        
        periode_debut DATE NOT NULL,
        periode_fin DATE NOT NULL,
        
        compteur_principal_id UUID REFERENCES compteurs_eau(id),
        consommation_principale DECIMAL(10,4),
        
        pertes_totales DECIMAL(10,4) DEFAULT 0,
        pertes_pourcent DECIMAL(5,2) DEFAULT 0,
        
        montant_total DECIMAL(10,2) NOT NULL,
        
        statut VARCHAR(20) DEFAULT 'brouillon' CHECK (statut IN ('brouillon', 'valide', 'archive')),
        
        notes TEXT,
        
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        
        CHECK (periode_fin > periode_debut)
      )
    `);
    console.log('✅ Table decomptes_eau créée');
    
    // 4. TABLE LIGNES DÉCOMPTE
    await client.query(`
      CREATE TABLE IF NOT EXISTS decomptes_eau_lignes (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        decompte_id UUID REFERENCES decomptes_eau(id) ON DELETE CASCADE,
        compteur_id UUID REFERENCES compteurs_eau(id),
        proprietaire_id UUID REFERENCES proprietaires(id),
        
        consommation_compteur DECIMAL(10,4) NOT NULL,
        m3_gratuits DECIMAL(10,4) DEFAULT 0,
        part_pertes DECIMAL(10,4) DEFAULT 0,
        consommation_facturee DECIMAL(10,4) NOT NULL,
        
        detail_calcul JSONB,
        
        montant DECIMAL(10,2) NOT NULL,
        
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Table decomptes_eau_lignes créée');
    
    // 5. INDEX POUR PERFORMANCES
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_config_eau_immeuble 
      ON configuration_eau(immeuble_id)
    `);
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_releves_eau_compteur 
      ON releves_eau(compteur_id)
    `);
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_releves_eau_periode 
      ON releves_eau(periode_debut, periode_fin)
    `);
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_decomptes_eau_immeuble 
      ON decomptes_eau(immeuble_id)
    `);
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_decomptes_lignes_decompte 
      ON decomptes_eau_lignes(decompte_id)
    `);
    
    console.log('✅ Index créés');
    
    res.json({
      success: true,
      message: '🎉 Toutes les tables eau sont créées !',
      tables: [
        'configuration_eau',
        'releves_eau',
        'decomptes_eau',
        'decomptes_eau_lignes'
      ],
      indexes: 5
    });
    
  } catch (error) {
    console.error('❌ Erreur:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  } finally {
    client.release();
  }
});

// =====================================================
// GET /api/setup/verify-eau-tables
// Vérifie que les tables existent
// =====================================================
router.get('/verify-eau-tables', async (req, res) => {
  try {
    const tables = [
      'configuration_eau',
      'releves_eau',
      'decomptes_eau',
      'decomptes_eau_lignes'
    ];
    
    const results = {};
    
    for (const tableName of tables) {
      const result = await pool.query(`
        SELECT 
          column_name,
          data_type,
          is_nullable
        FROM information_schema.columns
        WHERE table_name = $1
        ORDER BY ordinal_position
      `, [tableName]);
      
      results[tableName] = {
        exists: result.rows.length > 0,
        columns: result.rows.length,
        details: result.rows
      };
    }
    
    // Vérifier les index
    const indexes = await pool.query(`
      SELECT 
        indexname,
        tablename
      FROM pg_indexes
      WHERE tablename LIKE '%eau%'
      AND schemaname = 'public'
    `);
    
    const allTablesExist = Object.values(results).every(t => t.exists);
    
    res.json({
      success: true,
      allTablesExist,
      tables: results,
      indexes: indexes.rows
    });
    
  } catch (error) {
    console.error('❌ Erreur:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// =====================================================
// DELETE /api/setup/clean-eau-tables
// ⚠️ Supprime toutes les tables eau
// =====================================================
router.delete('/clean-eau-tables', async (req, res) => {
  const client = await pool.connect();
  
  try {
    console.log('⚠️  SUPPRESSION DES TABLES EAU...');
    
    // Ordre inverse des dépendances
    await client.query('DROP TABLE IF EXISTS decomptes_eau_lignes CASCADE');
    console.log('✅ decomptes_eau_lignes supprimée');
    
    await client.query('DROP TABLE IF EXISTS decomptes_eau CASCADE');
    console.log('✅ decomptes_eau supprimée');
    
    await client.query('DROP TABLE IF EXISTS releves_eau CASCADE');
    console.log('✅ releves_eau supprimée');
    
    await client.query('DROP TABLE IF EXISTS configuration_eau CASCADE');
    console.log('✅ configuration_eau supprimée');
    
    res.json({
      success: true,
      message: '🎉 Toutes les tables eau sont supprimées !',
      deletedTables: [
        'decomptes_eau_lignes',
        'decomptes_eau',
        'releves_eau',
        'configuration_eau'
      ]
    });
    
  } catch (error) {
    console.error('❌ Erreur:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  } finally {
    client.release();
  }
});

export default router;
