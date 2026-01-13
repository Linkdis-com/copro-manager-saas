import express from 'express';
import {
  getAllFournisseurs,
  getFournisseur,
  createFournisseur,
  updateFournisseur,
  deleteFournisseur
} from '../controllers/fournisseurs.controller.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router({ mergeParams: true });

// Toutes les routes sont protégées
router.use(authenticate);

// Routes CRUD
router.get('/', getAllFournisseurs);
router.get('/:id', getFournisseur);
router.post('/', createFournisseur);
router.patch('/:id', updateFournisseur);
router.delete('/:id', deleteFournisseur);

export default router;