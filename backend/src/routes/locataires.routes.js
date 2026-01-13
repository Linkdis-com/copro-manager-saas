import express from 'express';
import {
  getAllLocataires,
  getLocataire,
  createLocataire,
  updateLocataire,
  deleteLocataire
} from '../controllers/locataires.controller.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router({ mergeParams: true });

// Toutes les routes sont protégées
router.use(authenticate);

// Routes CRUD
router.get('/', getAllLocataires);
router.get('/:id', getLocataire);
router.post('/', createLocataire);
router.patch('/:id', updateLocataire);
router.delete('/:id', deleteLocataire);

export default router;