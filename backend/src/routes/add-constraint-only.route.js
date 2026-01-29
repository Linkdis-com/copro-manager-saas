// =====================================================
// 🔧 ROUTE - Ajouter UNIQUEMENT la contrainte (après correction données)
// backend/src/routes/add-constraint-only.route.js
// =====================================================
import { Router } from 'express';
import pool from '../config/database.js';

const router = Router();

// Route POST pour ajouter SEULEMENT la contrainte
router.post('/add-constraint-compteurs-eau', async (req, res) => {
  const client = await pool.connect();
  
  try {
    console.log('🔧 Ajout contrainte compteurs_eau (données déjà corrigées)...\n');
    
    // ÉTAPE 1 : Vérifier qu'il n'y a plus de données problématiques
    console.log('✅ Vérification données...');
    const check = await client.query(`
      SELECT 
        id,
        type_compteur,
        numero_compteur,
        proprietaire_id
      FROM compteurs_eau
      WHERE 
        (type_compteur = 'principal' AND proprietaire_id IS NOT NULL) OR
        (type_compteur IN ('divisionnaire', 'individuel') AND proprietaire_id IS NULL)
    `);
    
    if (check.rows.length > 0) {
      console.log('❌ Il reste des données problématiques !');
      check.rows.forEach(row => {
        console.log(`   - ${row.numero_compteur} (${row.type_compteur}): proprietaire_id = ${row.proprietaire_id || 'NULL'}`);
      });
      
      return res.status(400).json({
        success: false,
        error: 'Il reste des données problématiques',
        problematicRows: check.rows,
        suggestion: 'Exécute d\'abord /fix-data-compteurs-eau'
      });
    }
    
    console.log('   ✅ Aucune donnée problématique\n');
    
    // ÉTAPE 2 : Supprimer ancienne contrainte
    console.log('🗑️ Suppression ancienne contrainte...');
    await client.query(`
      ALTER TABLE compteurs_eau 
      DROP CONSTRAINT IF EXISTS chk_divisionnaire_principal
    `);
    console.log('   ✅ Ancienne contrainte supprimée\n');
    
    // ÉTAPE 3 : Ajouter nouvelle contrainte
    console.log('➕ Ajout nouvelle contrainte...');
    await client.query(`
      ALTER TABLE compteurs_eau 
      ADD CONSTRAINT chk_divisionnaire_principal CHECK (
        (type_compteur = 'principal' AND proprietaire_id IS NULL) OR
        (type_compteur IN ('divisionnaire', 'individuel') AND proprietaire_id IS NOT NULL) OR
        (type_compteur = 'collectif')
      )
    `);
    console.log('   ✅ Nouvelle contrainte ajoutée\n');
    
    // Vérification
    const result = await client.query(`
      SELECT 
        conname as nom_contrainte,
        pg_get_constraintdef(oid) as definition
      FROM pg_constraint 
      WHERE conname = 'chk_divisionnaire_principal'
    `);
    
    res.json({
      success: true,
      message: 'Contrainte ajoutée avec succès',
      constraint: result.rows[0] || null,
      steps: [
        '✅ Données vérifiées (aucun problème)',
        '🗑️ Ancienne contrainte supprimée',
        '➕ Nouvelle contrainte ajoutée'
      ]
    });
    
  } catch (error) {
    console.error('\n❌ Erreur:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      details: error.detail || error.hint || 'Aucun détail disponible'
    });
  } finally {
    client.release();
  }
});

export default router;
