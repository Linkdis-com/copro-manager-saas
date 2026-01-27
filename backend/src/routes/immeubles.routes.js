import express from 'express';
import {
  getAllImmeubles,
  getImmeuble,
  createImmeuble,
  updateImmeuble,
  deleteImmeuble
} from '../controllers/immeubles.controller.js';
import { authenticate } from '../middleware/auth.js';
import pool from '../config/database.js'; 
import { checkSubscriptionLimit } from '../middleware/subscription.middleware.js';
import proprietairesRoutes from './proprietaires.routes.js';
import fournisseursRoutes from './fournisseurs.routes.js';
import facturesRoutes from './factures.routes.js';
import transactionsRoutes from './transactions.routes.js';
import locatairesRoutes from './locataires.routes.js';
import { checkImmeubleLimit } from '../middleware/subscription-limits.middleware.js';


const router = express.Router();

// Toutes les routes sont protégées
router.use(authenticate);
// ⚠️ ROUTE TEMPORAIRE - Migration colonne
router.post('/migration-add-column', async (req, res) => {
  try {
    await pool.query(`
      ALTER TABLE immeubles 
      ADD COLUMN IF NOT EXISTS numero_compteur_principal VARCHAR(20)
    `);
    
    const check = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'immeubles' 
        AND column_name IN ('mode_comptage_eau', 'numero_compteur_principal')
    `);
    
    res.json({
      success: true,
      message: '✅ Colonne ajoutée !',
      columns: check.rows
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});





// Routes CRUD Immeubles
router.get('/', getAllImmeubles);
router.get('/:id', getImmeuble);

// POST avec vérification de la limite d'abonnement
// Si l'utilisateur a atteint sa limite d'immeubles, il recevra une erreur 403
router.post('/', checkSubscriptionLimit('immeubles'), createImmeuble);

router.patch('/:id', updateImmeuble);
router.delete('/:id', deleteImmeuble);
// POST /api/v1/immeubles - Créer un immeuble
router.post('/', authenticate, checkImmeubleLimit, createImmeuble);
// Routes nested
router.use('/:immeubleId/proprietaires', proprietairesRoutes);
router.use('/:immeubleId/fournisseurs', fournisseursRoutes);
router.use('/:immeubleId/factures', facturesRoutes);
router.use('/:immeubleId/transactions', transactionsRoutes);
router.use('/:immeubleId/locataires', locatairesRoutes);

export default router;
