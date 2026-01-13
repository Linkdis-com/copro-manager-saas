import express from 'express';
import {
  getAllLocataires,
  getLocataire,
  createLocataire,
  updateLocataire,
  deleteLocataire
} from '../controllers/locataires.controller.js';
import { authenticate } from '../middleware/auth.js';
import decomptesRoutes from './decomptes.routes.js';
import { getCategories } from '../controllers/decomptes.controller.js';

const router = express.Router({ mergeParams: true });

// Toutes les routes sont protégées
router.use(authenticate);

// Route spéciale pour les catégories (accessible sans locataireId)
router.get('/decomptes-categories', getCategories);

// Routes CRUD Locataires
router.get('/', getAllLocataires);
router.get('/:id', getLocataire);
router.post('/', createLocataire);
router.patch('/:id', updateLocataire);
router.delete('/:id', deleteLocataire);

// Routes nested: Décomptes d'un locataire
router.use('/:locataireId/decomptes', decomptesRoutes);

export default router;