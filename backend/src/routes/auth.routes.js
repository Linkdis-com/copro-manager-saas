import express from 'express';
import { register, login, getProfile } from '../controllers/auth.controller.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// Routes publiques (pas besoin de token)
router.post('/register', register);
router.post('/login', login);

// Routes protégées (nécessite un token valide)
router.get('/me', authenticate, getProfile);

export default router;