import express from 'express';
import {
  getAllFactures,
  getFacture,
  createFacture,
  updateFacture,
  deleteFacture
} from '../controllers/factures.controller.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router({ mergeParams: true });

// Toutes les routes sont protégées
router.use(authenticate);

// Routes CRUD
router.get('/', getAllFactures);
router.get('/:id', getFacture);
router.post('/', createFacture);
router.patch('/:id', updateFacture);
router.delete('/:id', deleteFacture);

export default router;