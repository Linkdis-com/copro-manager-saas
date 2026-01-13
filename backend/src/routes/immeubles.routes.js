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

export default router;