// =====================================================
// 🔍 ROUTE DEBUG - Voir compteurs problématiques
// backend/src/routes/debug-compteurs.route.js
// =====================================================
import { Router } from 'express';
import pool from '../config/database.js';

const router = Router();

// Route GET pour voir les données
router.get('/debug-compteurs-eau', async (req, res) => {
  const client = await pool.connect();
  
  try {
    console.log('🔍 Analyse des compteurs_eau...\n');
    
    // TOUS les compteurs
    const allCompteurs = await client.query(`
      SELECT 
        id,
        immeuble_id,
        type_compteur,
        numero_compteur,
        proprietaire_id,
        actif,
        created_at
      FROM compteurs_eau
      ORDER BY created_at DESC
    `);
    
    console.log(`📊 Total compteurs: ${allCompteurs.rows.length}\n`);
    
    // Compteurs problématiques
    const problematic = await client.query(`
      SELECT 
        id,
        type_compteur,
        numero_compteur,
        proprietaire_id,
        CASE 
          WHEN type_compteur = 'principal' AND proprietaire_id IS NOT NULL 
            THEN 'Principal avec proprietaire (ERREUR)'
          WHEN type_compteur IN ('divisionnaire', 'individuel') AND proprietaire_id IS NULL 
            THEN 'Divisionnaire/Individuel SANS proprietaire (ERREUR)'
          ELSE 'OK'
        END as probleme
      FROM compteurs_eau
      WHERE 
        (type_compteur = 'principal' AND proprietaire_id IS NOT NULL) OR
        (type_compteur IN ('divisionnaire', 'individuel') AND proprietaire_id IS NULL)
    `);
    
    console.log('❌ Compteurs problématiques:');
    problematic.rows.forEach(row => {
      console.log(`   - ${row.numero_compteur} (${row.type_compteur}): ${row.probleme}`);
      console.log(`     proprietaire_id: ${row.proprietaire_id || 'NULL'}`);
      console.log(`     id: ${row.id}\n`);
    });
    
    // Stats par type
    const stats = await client.query(`
      SELECT 
        type_compteur,
        COUNT(*) as count,
        COUNT(proprietaire_id) as with_proprietaire,
        COUNT(*) - COUNT(proprietaire_id) as without_proprietaire
      FROM compteurs_eau
      GROUP BY type_compteur
    `);
    
    res.json({
      success: true,
      totalCompteurs: allCompteurs.rows.length,
      problematicCount: problematic.rows.length,
      problematicCompteurs: problematic.rows,
      allCompteurs: allCompteurs.rows,
      stats: stats.rows
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
