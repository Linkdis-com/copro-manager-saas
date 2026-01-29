// =====================================================
// 🔧 ROUTE CORRECTION CONTRAINTE + DONNÉES
// backend/src/routes/fix-constraint-with-data-fix.route.js
// =====================================================
import { Router } from 'express';
import pool from '../config/database.js';

const router = Router();

// Route POST pour corriger la contrainte ET les données
router.post('/fix-constraint-compteurs-eau', async (req, res) => {
  const client = await pool.connect();
  
  try {
    console.log('🔧 Correction contrainte + données compteurs_eau...\n');
    
    // ÉTAPE 1 : Identifier les lignes problématiques
    console.log('📊 Étape 1/4 : Analyse des données...');
    const problematicRows = await client.query(`
      SELECT 
        id,
        immeuble_id,
        type_compteur,
        numero_compteur,
        proprietaire_id,
        CASE 
          WHEN type_compteur = 'principal' AND proprietaire_id IS NOT NULL 
            THEN 'Principal avec proprietaire_id (devrait être NULL)'
          WHEN type_compteur IN ('divisionnaire', 'individuel') AND proprietaire_id IS NULL 
            THEN 'Divisionnaire/Individuel sans proprietaire_id (devrait être NOT NULL)'
          ELSE 'OK'
        END as probleme
      FROM compteurs_eau
      WHERE 
        (type_compteur = 'principal' AND proprietaire_id IS NOT NULL) OR
        (type_compteur IN ('divisionnaire', 'individuel') AND proprietaire_id IS NULL)
    `);
    
    console.log(`   Trouvé ${problematicRows.rows.length} ligne(s) problématique(s)`);
    
    const issues = [];
    
    if (problematicRows.rows.length > 0) {
      // ÉTAPE 2 : Corriger les données
      console.log('\n🔧 Étape 2/4 : Correction des données...');
      
      for (const row of problematicRows.rows) {
        if (row.type_compteur === 'principal' && row.proprietaire_id !== null) {
          // Principal avec proprietaire_id → Mettre à NULL
          await client.query(
            'UPDATE compteurs_eau SET proprietaire_id = NULL WHERE id = $1',
            [row.id]
          );
          console.log(`   ✅ Compteur ${row.numero_compteur} (principal) : proprietaire_id mis à NULL`);
          issues.push({
            compteur: row.numero_compteur,
            type: row.type_compteur,
            action: 'proprietaire_id mis à NULL'
          });
        } else if (row.type_compteur === 'divisionnaire' && row.proprietaire_id === null) {
          // Divisionnaire sans proprietaire_id → SUPPRIMER (car on ne peut pas deviner le propriétaire)
          await client.query('DELETE FROM compteurs_eau WHERE id = $1', [row.id]);
          console.log(`   ⚠️ Compteur ${row.numero_compteur} (divisionnaire sans propriétaire) : SUPPRIMÉ`);
          issues.push({
            compteur: row.numero_compteur,
            type: row.type_compteur,
            action: 'SUPPRIMÉ (pas de proprietaire_id)'
          });
        }
      }
    } else {
      console.log('   ✅ Aucune donnée problématique');
    }
    
    // ÉTAPE 3 : Supprimer ancienne contrainte
    console.log('\n🗑️ Étape 3/4 : Suppression ancienne contrainte...');
    await client.query(`
      ALTER TABLE compteurs_eau 
      DROP CONSTRAINT IF EXISTS chk_divisionnaire_principal
    `);
    console.log('   ✅ Ancienne contrainte supprimée');
    
    // ÉTAPE 4 : Ajouter nouvelle contrainte
    console.log('\n➕ Étape 4/4 : Ajout nouvelle contrainte...');
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
      message: 'Contrainte compteurs_eau corrigée avec succès',
      dataIssuesFixed: issues,
      issuesCount: issues.length,
      constraint: result.rows[0] || null,
      steps: [
        `📊 ${problematicRows.rows.length} ligne(s) problématique(s) identifiée(s)`,
        `🔧 ${issues.length} correction(s) appliquée(s)`,
        '🗑️ Ancienne contrainte supprimée',
        '➕ Nouvelle contrainte ajoutée',
        '✅ Vérification effectuée'
      ]
    });
    
  } catch (error) {
    console.error('\n❌ Erreur correction contrainte:', error);
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
