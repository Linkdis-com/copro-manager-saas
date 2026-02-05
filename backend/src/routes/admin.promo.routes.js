import express from 'express';
import { authenticate, isAdmin } from '../middleware/auth.js';
import {
  createPromoCode,
  listPromoCodes,
  getPromoCodeDetails,
  updatePromoCode,
  deletePromoCode,
  getPromoCodeStats,
  getGlobalStats
} from '../controllers/admin.promo.controller.js';

const router = express.Router();

// ═══════════════════════════════════════════════════════════
// ROUTES ADMIN (PROTÉGÉES)
// ═══════════════════════════════════════════════════════════

// Stats globales
router.get('/stats', authenticate, isAdmin, getGlobalStats);

// CRUD codes promo
router.post('/', authenticate, isAdmin, createPromoCode);
router.get('/', authenticate, isAdmin, listPromoCodes);
router.get('/:id', authenticate, isAdmin, getPromoCodeDetails);
router.put('/:id', authenticate, isAdmin, updatePromoCode);
router.delete('/:id', authenticate, isAdmin, deletePromoCode);

// Stats d'un code spécifique
router.get('/:id/stats', authenticate, isAdmin, getPromoCodeStats);

export default router;
