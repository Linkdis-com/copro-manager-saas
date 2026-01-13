import express from 'express';
import {
  getAllTransactions,
  getTransaction,
  createTransaction,
  updateTransaction,
  deleteTransaction,
  getStats
} from '../controllers/transactions.controller.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router({ mergeParams: true });

// Toutes les routes sont protégées
router.use(authenticate);

// Routes CRUD
router.get('/', getAllTransactions);
router.get('/stats', getStats);  // AVANT /:id pour éviter conflit
router.get('/:id', getTransaction);
router.post('/', createTransaction);
router.patch('/:id', updateTransaction);
router.delete('/:id', deleteTransaction);

export default router;