import express from 'express';
import { authenticate } from '../middleware/auth.js';
import {
  validatePromoCode,
  applyPromoCode,
  getMyActivePromos
} from '../controllers/promo.controller.js';

const router = express.Router();

// ═══════════════════════════════════════════════════════════
// ROUTES UTILISATEUR (PROTÉGÉES)
// ═══════════════════════════════════════════════════════════

// Valider un code promo
router.post('/validate', authenticate, validatePromoCode);

// Appliquer un code promo
router.post('/apply', authenticate, applyPromoCode);

// Récupérer mes promos actives
router.get('/my-discounts', authenticate, getMyActivePromos);

export default router;
