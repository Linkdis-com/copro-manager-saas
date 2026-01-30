// =====================================================
// 🔧 ROUTES ADMIN - Gestion abonnements
// backend/src/routes/admin-subscriptions.route.js
// =====================================================
import { Router } from 'express';
import pool from '../config/database.js';

const router = Router();

// GET - Liste tous les utilisateurs avec leurs abonnements
router.get('/users-subscriptions', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        u.id,
        u.email,
        u.prenom,
        u.nom,
        u.type_compte,
        u.created_at as user_created_at,
        s.id as subscription_id,
        s.plan_type,
        s.status,
        s.start_date,
        s.end_date,
        s.is_trial,
        COUNT(i.id) as immeubles_count
      FROM users u
      LEFT JOIN subscriptions s ON u.id = s.user_id AND s.status = 'active'
      LEFT JOIN immeubles i ON u.id = i.user_id
      GROUP BY u.id, s.id
      ORDER BY u.created_at DESC
    `);
    
    res.json({
      success: true,
      users: result.rows
    });
  } catch (error) {
    console.error('Error fetching users subscriptions:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST - Créer/Activer abonnement pour un utilisateur
router.post('/users/:userId/subscription', async (req, res) => {
  const { userId } = req.params;
  const { plan_type, duration_months, is_trial } = req.body;
  
  try {
    // Désactiver les anciens abonnements
    await pool.query(`
      UPDATE subscriptions 
      SET status = 'cancelled', updated_at = NOW()
      WHERE user_id = $1 AND status = 'active'
    `, [userId]);
    
    // Créer le nouvel abonnement
    const startDate = new Date();
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + (duration_months || 12));
    
    const result = await pool.query(`
      INSERT INTO subscriptions (
        user_id,
        plan_type,
        status,
        start_date,
        end_date,
        is_trial,
        created_at
      ) VALUES ($1, $2, 'active', $3, $4, $5, NOW())
      RETURNING *
    `, [userId, plan_type, startDate, endDate, is_trial || false]);
    
    res.json({
      success: true,
      subscription: result.rows[0],
      message: `Abonnement ${plan_type} activé jusqu'au ${endDate.toLocaleDateString()}`
    });
  } catch (error) {
    console.error('Error creating subscription:', error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE - Désactiver abonnement
router.delete('/users/:userId/subscription', async (req, res) => {
  const { userId } = req.params;
  
  try {
    await pool.query(`
      UPDATE subscriptions 
      SET status = 'cancelled', updated_at = NOW()
      WHERE user_id = $1 AND status = 'active'
    `, [userId]);
    
    res.json({
      success: true,
      message: 'Abonnement désactivé'
    });
  } catch (error) {
    console.error('Error cancelling subscription:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST - Activer abonnement test rapide (DEV)
router.post('/users/:userId/subscription/test', async (req, res) => {
  const { userId } = req.params;
  
  try {
    // Désactiver anciens abonnements
    await pool.query(`
      UPDATE subscriptions 
      SET status = 'cancelled'
      WHERE user_id = $1 AND status = 'active'
    `, [userId]);
    
    // Créer abonnement test 1 an
    const startDate = new Date();
    const endDate = new Date();
    endDate.setFullYear(endDate.getFullYear() + 1); // 1 an
    
    const result = await pool.query(`
      INSERT INTO subscriptions (
        user_id,
        plan_type,
        status,
        start_date,
        end_date,
        is_trial,
        created_at
      ) VALUES ($1, 'particulier', 'active', $2, $3, true, NOW())
      RETURNING *
    `, [userId, startDate, endDate]);
    
    res.json({
      success: true,
      subscription: result.rows[0],
      message: '🧪 Abonnement TEST activé pour 1 an !'
    });
  } catch (error) {
    console.error('Error creating test subscription:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
