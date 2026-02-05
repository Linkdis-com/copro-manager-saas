import express from 'express';
import { migratePromoCodesSchema, verifyPromoMigration, createTestPromoCode } from '../controllers/migration.controller.js';

const router = express.Router();

// ═══════════════════════════════════════════════════════════
// ⚠️ ROUTES TEMPORAIRES - À SUPPRIMER APRÈS MIGRATION
// ═══════════════════════════════════════════════════════════

// Exécuter la migration
router.post('/run-promo-migration', migratePromoCodesSchema);

// Vérifier que la migration a fonctionné
router.get('/verify-promo-migration', verifyPromoMigration);

// Créer un code promo de test
router.post('/create-test-code', createTestPromoCode);

export default router;
