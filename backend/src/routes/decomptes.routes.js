import express from 'express';
import {
  getAllDecomptes,
  getDecompte,
  createDecompte,
  updateDecompte,
  deleteDecompte,
  getCategories
} from '../controllers/decomptes.controller.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router({ mergeParams: true });

// Toutes les routes sont protégées
router.use(authenticate);

// Route spéciale pour catégories
router.get('/categories', getCategories);

// Routes CRUD
router.get('/', getAllDecomptes);
router.get('/:id', getDecompte);
router.post('/', createDecompte);
router.patch('/:id', updateDecompte);
router.delete('/:id', deleteDecompte);

export default router;