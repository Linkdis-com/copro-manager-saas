import express from 'express';
import pool from '../config/database.js';
import jwt from 'jsonwebtoken';
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

// ✅ COPIEZ le middleware verifyAdmin depuis admin.routes.js
const verifyAdmin = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: 'Non autorisé' });
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const result = await pool.query(
      'SELECT * FROM users WHERE id = $1 AND role = $2',
      [decoded.userId, 'admin']
    );
    
    if (result.rows.length === 0) {
      return res.status(403).json({ error: 'Accès refusé - Admin requis' });
    }
    
    req.admin = result.rows[0];
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Token invalide' });
  }
};

// ═══════════════════════════════════════════════════════════
// ROUTES ADMIN - Utilisez verifyAdmin au lieu de authenticate
// ═══════════════════════════════════════════════════════════

router.get('/stats', verifyAdmin, getGlobalStats);
router.post('/', verifyAdmin, createPromoCode);
router.get('/', verifyAdmin, listPromoCodes);
router.get('/:id', verifyAdmin, getPromoCodeDetails);
router.put('/:id', verifyAdmin, updatePromoCode);
router.delete('/:id', verifyAdmin, deletePromoCode);
router.get('/:id/stats', verifyAdmin, getPromoCodeStats);

export default router;