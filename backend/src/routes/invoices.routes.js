import express from 'express';
import { getMyInvoices, getInvoice } from '../controllers/invoice.controller.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// GET /api/v1/invoices - Récupérer mes factures
router.get('/', authenticate, getMyInvoices);

// GET /api/v1/invoices/:id - Récupérer une facture spécifique
router.get('/:id', authenticate, getInvoice);

export default router;
