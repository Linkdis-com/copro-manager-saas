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

const router = express.Router();

// Toutes les routes sont protégées
router.use(authenticate);

// Routes CRUD Immeubles
router.get('/', getAllImmeubles);
router.get('/:id', getImmeuble);
router.post('/', createImmeuble);
router.patch('/:id', updateImmeuble);
router.delete('/:id', deleteImmeuble);

// Routes nested: Propriétaires d'un immeuble
router.use('/:immeubleId/proprietaires', proprietairesRoutes);
// Routes nested: Fournisseurs d'un immeuble
router.use('/:immeubleId/fournisseurs', fournisseursRoutes);
// Routes nested: Factures d'un immeuble
router.use('/:immeubleId/factures', facturesRoutes);

export default router;