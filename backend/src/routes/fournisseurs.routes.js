import express from 'express';
import {
  getAllFournisseurs,
  getFournisseur,
  createFournisseur,
  updateFournisseur,
  deleteFournisseur,
  getCategories  // ← AJOUTER
} from '../controllers/fournisseurs.controller.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router({ mergeParams: true });

router.use(authenticate);

// Route catégories (AVANT les routes avec :id)
router.get('/categories', getCategories);  // ← AJOUTER

// Routes CRUD
router.get('/', getAllFournisseurs);
router.get('/:id', getFournisseur);
router.post('/', createFournisseur);
router.patch('/:id', updateFournisseur);
router.delete('/:id', deleteFournisseur);

export default router;