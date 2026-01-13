import express from 'express';
import {
  getAllImmeubles,
  getImmeuble,
  createImmeuble,
  updateImmeuble,
  deleteImmeuble
} from '../controllers/immeubles.controller.js';
import { authenticate } from '../middleware/auth.js';
import proprietairesRoutes from './proprietaires.routes.js';
import fournisseursRoutes from './fournisseurs.routes.js';
import facturesRoutes from './factures.routes.js';
import transactionsRoutes from './transactions.routes.js';
import locatairesRoutes from './locataires.routes.js';

const router = express.Router();

// Toutes les routes sont protégées
router.use(authenticate);

// Routes CRUD Immeubles
router.get('/', getAllImmeubles);
router.get('/:id', getImmeuble);
router.post('/', createImmeuble);
router.patch('/:id', updateImmeuble);
router.delete('/:id', deleteImmeuble);

// Routes nested
router.use('/:immeubleId/proprietaires', proprietairesRoutes);
router.use('/:immeubleId/fournisseurs', fournisseursRoutes);
router.use('/:immeubleId/factures', facturesRoutes);
router.use('/:immeubleId/transactions', transactionsRoutes);
router.use('/:immeubleId/locataires', locatairesRoutes);

export default router;