import express from 'express';
import {
  getAllImmeubles,
  getImmeuble,
  createImmeuble,
  updateImmeuble,
  deleteImmeuble
} from '../controllers/immeubles.controller.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticate);

router.get('/', getAllImmeubles);
router.get('/:id', getImmeuble);
router.post('/', createImmeuble);
router.patch('/:id', updateImmeuble);
router.delete('/:id', deleteImmeuble);

export default router;