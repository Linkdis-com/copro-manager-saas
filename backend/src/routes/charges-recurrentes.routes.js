import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import {
  getChargesRecurrentes,
  createChargeRecurrente,
  updateChargeRecurrente,
  deleteChargeRecurrente,
  getRepartitionCharges,
  genererAppelsCharges,
  getAppelsCharges
} from '../controllers/charges-recurrentes.controller.js';

const router = Router();

// ⚠️ Routes spécifiques AVANT les routes avec :chargeId
// Calcul répartition
router.get('/immeubles/:immeubleId/charges-recurrentes/repartition', authenticate, getRepartitionCharges);

// Génération appels de charges
router.post('/immeubles/:immeubleId/charges-recurrentes/generer-appels', authenticate, genererAppelsCharges);
router.get('/immeubles/:immeubleId/appels-charges', authenticate, getAppelsCharges);

// CRUD charges récurrentes
router.get('/immeubles/:immeubleId/charges-recurrentes', authenticate, getChargesRecurrentes);
router.post('/immeubles/:immeubleId/charges-recurrentes', authenticate, createChargeRecurrente);
router.put('/immeubles/:immeubleId/charges-recurrentes/:chargeId', authenticate, updateChargeRecurrente);
router.delete('/immeubles/:immeubleId/charges-recurrentes/:chargeId', authenticate, deleteChargeRecurrente);

export default router;
