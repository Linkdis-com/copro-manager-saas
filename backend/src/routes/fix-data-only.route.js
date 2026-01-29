// =====================================================
// 🔧 ROUTE - Corriger UNIQUEMENT les données (sans contrainte)
// backend/src/routes/fix-data-only.route.js
// =====================================================
import { Router } from 'express';
import pool from '../config/database.js';

const router = Router();

// Route POST pour corriger SEULEMENT les données
router.post('/fix-data-compteurs-eau', async (req, res) => {
  const client = await pool.connect();
  
  try {
    console.log('🔧 Correction des données compteurs_eau (SANS contrainte)...\n');
    
    const actions = [];
    
    // ÉTAPE 1 : Supprimer TOUS les divisionnaires/individuels SANS proprietaire
    console.log('🗑️ Suppression divisionnaires/individuels sans proprietaire...');
    const deleteResult = await client.query(`
      DELETE FROM compteurs_eau 
      WHERE type_compteur IN ('divisionnaire', 'individuel') 
      AND proprietaire_id IS NULL
      RETURNING id, numero_compteur, type_compteur
    `);
    
    if (deleteResult.rows.length > 0) {
      console.log(`   ✅ ${deleteResult.rows.length} compteur(s) supprimé(s):`);
      deleteResult.rows.forEach(row => {
        console.log(`      - ${row.numero_compteur} (${row.type_compteur})`);
        actions.push({
          action: 'SUPPRIMÉ',
          compteur: row.numero_compteur,
          type: row.type_compteur,
          raison: 'Divisionnaire/Individuel sans proprietaire_id'
        });
      });
    } else {
      console.log('   ℹ️ Aucun divisionnaire/individuel sans proprietaire');
    }
    
    // ÉTAPE 2 : Mettre proprietaire_id à NULL pour TOUS les principaux
    console.log('\n🔧 Correction principaux avec proprietaire...');
    const updateResult = await client.query(`
      UPDATE compteurs_eau 
      SET proprietaire_id = NULL 
      WHERE type_compteur = 'principal' 
      AND proprietaire_id IS NOT NULL
      RETURNING id, numero_compteur, type_compteur
    `);
    
    if (updateResult.rows.length > 0) {
      console.log(`   ✅ ${updateResult.rows.length} compteur(s) corrigé(s):`);
      updateResult.rows.forEach(row => {
        console.log(`      - ${row.numero_compteur} (${row.type_compteur})`);
        actions.push({
          action: 'CORRIGÉ',
          compteur: row.numero_compteur,
          type: row.type_compteur,
          raison: 'Principal: proprietaire_id mis à NULL'
        });
      });
    } else {
      console.log('   ℹ️ Aucun principal avec proprietaire');
    }
    
    // ÉTAPE 3 : Vérification finale
    console.log('\n✅ Vérification finale...');
    const verification = await client.query(`
      SELECT 
        type_compteur,
        COUNT(*) as count,
        COUNT(proprietaire_id) as with_proprietaire
      FROM compteurs_eau
      GROUP BY type_compteur
    `);
    
    console.log('   État actuel:');
    verification.rows.forEach(row => {
      console.log(`      - ${row.type_compteur}: ${row.count} total, ${row.with_proprietaire} avec proprietaire`);
    });
    
    res.json({
      success: true,
      message: 'Données corrigées (contrainte pas encore ajoutée)',
      actionsCount: actions.length,
      actions: actions,
      currentState: verification.rows,
      nextStep: 'Maintenant tu peux ajouter la contrainte avec /fix-constraint-compteurs-eau'
    });
    
  } catch (error) {
    console.error('\n❌ Erreur:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  } finally {
    client.release();
  }
});

export default router;
