import express from 'express';
import { authenticate } from '../middleware/auth.js';
import pool from '../config/database.js';
import { createDecompteTables } from '../migrations/create-decomptes-tables.js';
import { seedTarifsDefaut } from '../migrations/seed-tarifs-defaut.js';

const router = express.Router();


router.post('/migration-appels-charges', async (req, res) => {
  try {
    // 1. Vérifier le type de exercices.id
    const typeCheck = await pool.query(`
      SELECT data_type FROM information_schema.columns 
      WHERE table_name = 'exercices' AND column_name = 'id'
    `);
    const exerciceIdType = typeCheck.rows[0]?.data_type || 'unknown';

    // 2. Drop si existe (table potentiellement corrompue)
    await pool.query('DROP TABLE IF EXISTS appels_charges CASCADE');

    // 3. Recréer avec le bon type
    const exerciceColType = exerciceIdType === 'uuid' ? 'UUID' : 'INTEGER';
    
    await pool.query(`
      CREATE TABLE appels_charges (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        charge_recurrente_id UUID NOT NULL REFERENCES charges_recurrentes(id) ON DELETE CASCADE,
        proprietaire_id UUID NOT NULL REFERENCES proprietaires(id) ON DELETE CASCADE,
        exercice_id ${exerciceColType} REFERENCES exercices(id) ON DELETE SET NULL,
        periode_debut DATE NOT NULL,
        periode_fin DATE NOT NULL,
        montant_appele DECIMAL(12,2) NOT NULL DEFAULT 0,
        montant_paye DECIMAL(12,2) NOT NULL DEFAULT 0,
        date_echeance DATE,
        statut VARCHAR(20) NOT NULL DEFAULT 'en_attente',
        date_paiement TIMESTAMP WITH TIME ZONE,
        notes TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX idx_appels_charges_charge ON appels_charges(charge_recurrente_id);
      CREATE INDEX idx_appels_charges_proprio ON appels_charges(proprietaire_id);
      CREATE INDEX idx_appels_charges_exercice ON appels_charges(exercice_id);
      CREATE INDEX idx_appels_charges_periode ON appels_charges(periode_debut, periode_fin);
      CREATE INDEX idx_appels_charges_statut ON appels_charges(statut);
    `);

    res.json({ 
      success: true, 
      message: 'Table appels_charges créée',
      exerciceIdType: exerciceColType
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});



// Toutes les routes nécessitent authentification
router.use(authenticate);

// Activer la subscription (existant)
router.post('/activate-subscription', async (req, res) => {
  try {
    const result = await pool.query(`
      UPDATE users 
      SET subscription_active = true,
          subscription_expires_at = NOW() + INTERVAL '1 year'
      WHERE id = $1
      RETURNING id, email, subscription_active, subscription_expires_at
    `, [req.user.id]);

    res.json({
      success: true,
      message: 'Subscription activated',
      user: result.rows[0]
    });
  } catch (error) {
    console.error('Error activating subscription:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Ajouter colonne systeme_repartition (existant)
router.post('/add-systeme-repartition', async (req, res) => {
  try {
    await pool.query(`
      ALTER TABLE immeubles 
      ADD COLUMN IF NOT EXISTS systeme_repartition VARCHAR(20) DEFAULT 'milliemes' 
      CHECK (systeme_repartition IN ('milliemes', 'parts'))
    `);

    await pool.query(`
      UPDATE immeubles 
      SET systeme_repartition = 'milliemes' 
      WHERE systeme_repartition IS NULL
    `);

    res.json({
      success: true,
      message: 'Colonne systeme_repartition ajoutée avec succès'
    });
  } catch (error) {
    console.error('Error adding systeme_repartition:', error);
    res.status(500).json({ error: 'Internal server error', message: error.message });
  }
});

// Créer propriétaires par défaut (existant)
router.post('/create-default-proprietaires', async (req, res) => {
  try {
    const { immeubleId } = req.body;

    if (!immeubleId) {
      return res.status(400).json({ error: 'immeubleId is required' });
    }

    const immeuble = await pool.query(
      'SELECT id, user_id FROM immeubles WHERE id = $1',
      [immeubleId]
    );

    if (immeuble.rows.length === 0) {
      return res.status(404).json({ error: 'Immeuble not found' });
    }

    const proprietaires = [
      {
        nom: 'Van Hecke',
        prenom: 'Alain',
        email: 'alain@linkdis.com',
        telephone: '023498794',
        type: 'personne_physique',
        milliemes: 200
      }
    ];

    const created = [];
    for (const prop of proprietaires) {
      const result = await pool.query(`
        INSERT INTO proprietaires (
          immeuble_id, nom, prenom, email, telephone,
          type_proprietaire, milliemes
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
      `, [
        immeubleId,
        prop.nom,
        prop.prenom,
        prop.email,
        prop.telephone,
        prop.type,
        prop.milliemes
      ]);
      created.push(result.rows[0]);
    }

    res.json({
      success: true,
      message: `${created.length} propriétaires créés`,
      proprietaires: created
    });
  } catch (error) {
    console.error('Error creating proprietaires:', error);
    res.status(500).json({ error: 'Internal server error', message: error.message });
  }
});

// NOUVEAU : Créer les tables décomptes
router.post('/create-decomptes-tables', async (req, res) => {
  try {
    console.log('🚀 Creating decomptes tables...');
    const result = await createDecompteTables();
    
    res.json({
      success: true,
      message: 'Tables décomptes créées avec succès'
    });
  } catch (error) {
    console.error('Error creating tables:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create tables',
      message: error.message
    });
  }
});

// NOUVEAU : Insérer les tarifs par défaut
router.post('/seed-tarifs-defaut', async (req, res) => {
  try {
    console.log('🚀 Seeding default tarifs...');
    const result = await seedTarifsDefaut();
    
    res.json({
      success: true,
      message: 'Tarifs par défaut insérés'
    });
  } catch (error) {
    console.error('Error seeding tarifs:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to seed tarifs',
      message: error.message
    });
  }
});
// Route pour exécuter la migration des colonnes transactions
router.post('/migrate-transactions', async (req, res) => {
  try {
    const results = [];
    
    // Vérifier/ajouter colonne proprietaire_id
    const propIdCheck = await pool.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'transactions' AND column_name = 'proprietaire_id'
    `);
    
    if (propIdCheck.rows.length === 0) {
      await pool.query(`
        ALTER TABLE transactions 
        ADD COLUMN proprietaire_id INTEGER REFERENCES proprietaires(id) ON DELETE SET NULL
      `);
      results.push('✅ Added: proprietaire_id');
    } else {
      results.push('⏭️ Exists: proprietaire_id');
    }
    
    // Vérifier/ajouter colonne tags
    const tagsCheck = await pool.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'transactions' AND column_name = 'tags'
    `);
    
    if (tagsCheck.rows.length === 0) {
      await pool.query(`ALTER TABLE transactions ADD COLUMN tags JSONB DEFAULT '[]'::jsonb`);
      results.push('✅ Added: tags');
    } else {
      results.push('⏭️ Exists: tags');
    }
    
    // Index
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_transactions_proprietaire_id 
      ON transactions(proprietaire_id) WHERE proprietaire_id IS NOT NULL
    `);
    results.push('✅ Index created');
    
    res.json({ success: true, results });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});
// Route pour forcer le report RAN manuellement
router.post('/force-ran-report/:immeubleId/:fromYear/:toYear', async (req, res) => {
  const { immeubleId, fromYear, toYear } = req.params;
  
  try {
    // Récupérer les exercices
    const fromEx = await pool.query(
      'SELECT id FROM exercices WHERE immeuble_id = $1 AND annee = $2',
      [immeubleId, parseInt(fromYear)]
    );
    const toEx = await pool.query(
      'SELECT id FROM exercices WHERE immeuble_id = $1 AND annee = $2',
      [immeubleId, parseInt(toYear)]
    );
    
    if (fromEx.rows.length === 0 || toEx.rows.length === 0) {
      return res.status(404).json({ error: 'Exercice not found' });
    }
    
    // Récupérer les soldes finaux
    const soldes = await pool.query(
      'SELECT proprietaire_id, solde_fin FROM soldes_exercices WHERE exercice_id = $1',
      [fromEx.rows[0].id]
    );
    
    const results = [];
    for (const s of soldes.rows) {
      const soldeFin = parseFloat(s.solde_fin) || 0;
      
      await pool.query(`
        UPDATE soldes_exercices 
        SET solde_debut = $1, solde_fin = $1 + total_provisions - total_charges + total_ajustements
        WHERE exercice_id = $2 AND proprietaire_id = $3
      `, [soldeFin, toEx.rows[0].id, s.proprietaire_id]);
      
      results.push({ proprietaire_id: s.proprietaire_id, ran: soldeFin });
    }
    
    res.json({ success: true, results });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Route pour recalculer les soldes et reporter le RAN selon les règles belges
router.post('/recalculate-soldes-be/:immeubleId/:year', async (req, res) => {
  const { immeubleId, year } = req.params;
  const yearInt = parseInt(year);
  
  try {
    // 1. Récupérer l'exercice de l'année
    const exerciceResult = await pool.query(
      'SELECT id FROM exercices WHERE immeuble_id = $1 AND annee = $2',
      [immeubleId, yearInt]
    );
    
    if (exerciceResult.rows.length === 0) {
      return res.status(404).json({ error: `Exercice ${yearInt} not found` });
    }
    const exerciceId = exerciceResult.rows[0].id;
    
    // 2. Récupérer l'exercice suivant (pour le report)
    const nextExerciceResult = await pool.query(
      'SELECT id FROM exercices WHERE immeuble_id = $1 AND annee = $2',
      [immeubleId, yearInt + 1]
    );
    
    // 3. Récupérer tous les propriétaires actifs avec leurs millièmes
    const proprietaires = await pool.query(
      'SELECT id, nom, prenom, milliemes FROM proprietaires WHERE immeuble_id = $1 AND actif = true',
      [immeubleId]
    );
    
    // 4. Calculer le total des millièmes
    const totalMilliemes = proprietaires.rows.reduce((sum, p) => 
      sum + (parseInt(p.milliemes) || 0), 0
    );
    
    if (totalMilliemes === 0) {
      return res.status(400).json({ error: 'Total millièmes = 0' });
    }
    
    // 5. Récupérer toutes les transactions de l'année
    const transactions = await pool.query(`
      SELECT * FROM transactions
      WHERE immeuble_id = $1 
        AND EXTRACT(YEAR FROM COALESCE(date_transaction, created_at)) = $2
    `, [immeubleId, yearInt]);
    
    // 6. Séparer les charges (type = 'charge') des dépôts (autres types)
    const charges = transactions.rows.filter(t => t.type === 'charge');
    const depots = transactions.rows.filter(t => t.type !== 'charge');
    
    // 7. Calculer le total des charges
    const totalCharges = charges.reduce((sum, t) => 
      sum + Math.abs(parseFloat(t.montant || 0)), 0
    );
    
    // 8. Récupérer les RAN de début d'année (solde_debut dans soldes_exercices)
    const soldesDebut = await pool.query(
      'SELECT proprietaire_id, solde_debut FROM soldes_exercices WHERE exercice_id = $1',
      [exerciceId]
    );
    const ranMap = {};
    soldesDebut.rows.forEach(s => {
      ranMap[s.proprietaire_id] = parseFloat(s.solde_debut) || 0;
    });
    
    const results = [];
    
    // 9. Calculer pour chaque propriétaire
    for (const prop of proprietaires.rows) {
      const milliemes = parseInt(prop.milliemes) || 0;
      const pourcentage = milliemes / totalMilliemes;
      
      // A. RAN (Report À Nouveau) = solde début d'année
      const ran = ranMap[prop.id] || 0;
      
      // B. Quote-part des charges au prorata des millièmes
      const chargesProp = totalCharges * pourcentage;
      
      // C. Dépôts attribués à ce propriétaire
      const depotsProp = depots
        .filter(d => d.proprietaire_id === prop.id)
        .reduce((sum, d) => sum + Math.abs(parseFloat(d.montant || 0)), 0);
      
      // D. FORMULE BELGE: Solde Final = RAN + Dépôts - Charges
      const soldeFin = ran + depotsProp - chargesProp;
      
      // 10. Mettre à jour soldes_exercices pour cette année
      await pool.query(`
        UPDATE soldes_exercices SET
          total_provisions = $1,
          total_charges = $2,
          solde_fin = $3,
          updated_at = CURRENT_TIMESTAMP
        WHERE exercice_id = $4 AND proprietaire_id = $5
      `, [depotsProp, chargesProp, soldeFin, exerciceId, prop.id]);
      
      // 11. Reporter vers l'exercice suivant si existe
      if (nextExerciceResult.rows.length > 0) {
        const nextExerciceId = nextExerciceResult.rows[0].id;
        
        // Le solde final devient le RAN de l'année suivante
        const updateResult = await pool.query(`
          UPDATE soldes_exercices SET
            solde_debut = $1,
            solde_fin = $1 + total_provisions - total_charges + total_ajustements,
            updated_at = CURRENT_TIMESTAMP
          WHERE exercice_id = $2 AND proprietaire_id = $3
          RETURNING id
        `, [soldeFin, nextExerciceId, prop.id]);
        
        // Si n'existe pas, créer
        if (updateResult.rows.length === 0) {
          await pool.query(`
            INSERT INTO soldes_exercices (exercice_id, proprietaire_id, solde_debut, total_provisions, total_charges, total_ajustements, solde_fin)
            VALUES ($1, $2, $3, 0, 0, 0, $3)
          `, [nextExerciceId, prop.id, soldeFin]);
        }
      }
      
      results.push({
        proprietaire: `${prop.prenom || ''} ${prop.nom}`.trim(),
        milliemes,
        pourcentage: (pourcentage * 100).toFixed(2) + '%',
        ran: ran.toFixed(2),
        depots: depotsProp.toFixed(2),
        charges: chargesProp.toFixed(2),
        soldeFin: soldeFin.toFixed(2)
      });
    }
    
    res.json({ 
      success: true,
      formule: 'Solde Final = RAN + Dépôts versés - Quote-part charges',
      year: yearInt,
      nextYear: yearInt + 1,
      totalCharges: totalCharges.toFixed(2),
      totalMilliemes,
      ranReporte: nextExerciceResult.rows.length > 0,
      results 
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;