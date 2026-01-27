import express from 'express';
import { register, login, getProfile } from '../controllers/auth.controller.js';
import { updateProfile, changePassword } from '../controllers/profile.controller.js';
import { forgotPassword, verifyResetToken, resetPassword } from '../controllers/password-reset.controller.js';
import { refreshToken, logout, logoutAll, getSessions, revokeSession } from '../controllers/session.controller.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// ============================================
// Routes publiques (pas besoin de token)
// ============================================
router.post('/register', register);
router.post('/login', login);

// Récupération de mot de passe
router.post('/forgot-password', forgotPassword);
router.post('/verify-reset-token', verifyResetToken);
router.post('/reset-password', resetPassword);

// Gestion des tokens (pas besoin d'access token valide)
router.post('/refresh-token', refreshToken);
router.post('/logout', logout);

// ============================================
// Routes protégées (nécessite un token valide)
// ============================================
router.get('/me', authenticate, getProfile);
router.get('/profile', authenticate, getProfile);
router.put('/profile', authenticate, updateProfile);
router.put('/change-password', authenticate, changePassword);

// Gestion des sessions (protégées)
router.post('/logout-all', authenticate, logoutAll);
router.get('/sessions', authenticate, getSessions);
router.delete('/sessions/:sessionId', authenticate, revokeSession);

export default router;
