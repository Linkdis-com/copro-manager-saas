import express from 'express';
import {
  getMyReferralCode,
  checkReferralCode,
  getReferralStats,
  registerReferral,
  declareSocialShare,
  getSocialShareStatus,
  approveShareAdmin,
  rejectShareAdmin,
  getPendingSharesAdmin,
  getMyDiscounts
} from '../controllers/referral.controller.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// ============================================
// Routes publiques
// ============================================

// Vérifier si un code de parrainage est valide (pour la page d'inscription)
router.get('/check/:code', checkReferralCode);

// ============================================
// Routes protégées (utilisateur connecté)
// ============================================

// Mon code de parrainage
router.get('/my-code', authenticate, getMyReferralCode);

// Mes statistiques de parrainage
router.get('/stats', authenticate, getReferralStats);

// Mes réductions actives
router.get('/my-discounts', authenticate, getMyDiscounts);

// Enregistrer un parrainage (appelé après inscription)
router.post('/register', registerReferral);

// Partage social
router.post('/social-share', authenticate, declareSocialShare);
router.get('/social-share/status', authenticate, getSocialShareStatus);

// ============================================
// Routes admin (TODO: ajouter middleware isAdmin)
// ============================================

router.get('/admin/pending-shares', authenticate, getPendingSharesAdmin);
router.post('/admin/approve-share/:shareId', authenticate, approveShareAdmin);
router.post('/admin/reject-share/:shareId', authenticate, rejectShareAdmin);

export default router;
