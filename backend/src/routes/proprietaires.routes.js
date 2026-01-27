import express from 'express';
import {
  getAllProprietaires,
  getProprietaire,
  createProprietaire,
  updateProprietaire,
  deleteProprietaire
} from '../controllers/proprietaires.controller.js';
import { authenticate } from '../middleware/auth.js';
import { checkSubscriptionLimit } from '../middleware/subscription.middleware.js';

const router = express.Router({ mergeParams: true }); // mergeParams pour accéder à immeubleId

// Toutes les routes sont protégées
router.use(authenticate);

// Routes CRUD
router.get('/', getAllProprietaires);           // GET /api/v1/immeubles/:immeubleId/proprietaires
router.get('/:id', getProprietaire);            // GET /api/v1/immeubles/:immeubleId/proprietaires/:id

// POST avec vérification de la limite d'abonnement
router.post('/', checkSubscriptionLimit('proprietaires'), createProprietaire);

router.patch('/:id', updateProprietaire);       // PATCH /api/v1/immeubles/:immeubleId/proprietaires/:id
router.delete('/:id', deleteProprietaire);      // DELETE /api/v1/immeubles/:immeubleId/proprietaires/:id

export default router;
