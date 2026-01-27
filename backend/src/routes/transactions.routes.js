import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { 
  getAllTransactions,
  getTransaction,
  createTransaction,
  updateTransaction,
  deleteTransaction,
  getStats,
  importBulk,
  migrateColumns
} from '../controllers/transactions.controller.js';

const router = express.Router({ mergeParams: true });

router.use(authenticate);

// ⚠️ ROUTES FIXES EN PREMIER (avant les routes avec :id)
router.post('/migrate-columns', migrateColumns); 
router.post('/import', importBulk);
router.get('/stats', getStats);

// Routes avec paramètres APRÈS
router.get('/', getAllTransactions);
router.post('/', createTransaction);
router.get('/:id', getTransaction);
router.put('/:id', updateTransaction);
router.patch('/:id', updateTransaction);
router.delete('/:id', deleteTransaction);

export default router;