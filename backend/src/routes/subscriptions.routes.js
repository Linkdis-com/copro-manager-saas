import express from 'express';
import { authenticate } from '../middleware/auth.js';
import {
  getAllPlans,
  getMySubscription,
  checkLimit,
  changePlan,
  getInvoices,
  calculatePrice
} from '../controllers/subscriptions.controller.js';

const router = express.Router();

// Routes publiques
router.get('/plans', getAllPlans);
router.get('/calculate-price', calculatePrice); // Peut être appelé sans auth

// Routes protégées
router.get('/me', authenticate, getMySubscription);
router.get('/check/:resource', authenticate, checkLimit);
router.post('/change-plan', authenticate, changePlan);
router.get('/invoices', authenticate, getInvoices);

export default router;
