import express from 'express';
import { authenticate } from '../middleware/auth.js';
import {
  getAllExercices,
  getExercice,
  createExercice,
  getSoldeProprietaire,
  createAppelFonds,
  enregistrerPaiementAppel,
  cloturerExercice,
  getDecompteAnnuel
} from '../controllers/exercices.controller.js';

const router = express.Router({ mergeParams: true });

// Toutes les routes nécessitent une authentification
router.use(authenticate);

// ============================================
// ROUTES EXERCICES
// ============================================

// GET /api/v1/immeubles/:immeubleId/exercices
// Liste tous les exercices d'un immeuble
router.get('/', getAllExercices);

// POST /api/v1/immeubles/:immeubleId/exercices
// Créer un nouvel exercice (avec report automatique du RAN)
router.post('/', createExercice);

// GET /api/v1/immeubles/:immeubleId/exercices/:id
// Détails d'un exercice avec soldes et appels
router.get('/:id', getExercice);

// POST /api/v1/immeubles/:immeubleId/exercices/:id/cloturer
// Clôturer un exercice
router.post('/:id/cloturer', cloturerExercice);

// ============================================
// ROUTES SOLDES PROPRIÉTAIRES
// ============================================

// GET /api/v1/immeubles/:immeubleId/exercices/:exerciceId/proprietaires/:proprietaireId/solde
// Situation financière d'un propriétaire pour un exercice
router.get('/:exerciceId/proprietaires/:proprietaireId/solde', getSoldeProprietaire);

// GET /api/v1/immeubles/:immeubleId/exercices/:exerciceId/proprietaires/:proprietaireId/decompte
// Décompte annuel complet avec RAN
router.get('/:exerciceId/proprietaires/:proprietaireId/decompte', getDecompteAnnuel);

// ============================================
// ROUTES APPELS DE FONDS
// ============================================

// POST /api/v1/immeubles/:immeubleId/exercices/:exerciceId/appels
// Créer un appel de fonds
router.post('/:exerciceId/appels', createAppelFonds);

// POST /api/v1/immeubles/:immeubleId/exercices/appels/:appelId/proprietaires/:proprietaireId/paiement
// Enregistrer un paiement sur un appel
router.post('/appels/:appelId/proprietaires/:proprietaireId/paiement', enregistrerPaiementAppel);

export default router;
