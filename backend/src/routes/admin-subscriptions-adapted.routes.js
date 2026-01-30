// =====================================================
// 🔧 ROUTES ADMIN - Gestion Abonnements (VERSION FINALE)
// backend/src/routes/admin-subscriptions-adapted.routes.js
// =====================================================
import { Router } from 'express';
import pool from '../config/database.js';

const router = Router();

// ===================================
// GET - Liste tous les users avec leurs abonnements
// ===================================
router.get('/users-subscriptions', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        u.id as user_id,
        u.email,
        u.first_name as prenom,
        u.last_name as nom,
        u.created_at as user_created,
        s.id as subscription_id,
        s.status,
        s.current_period_start as start_date,
        s.current_period_end as end_date,
        s.billing_cycle,
        s.total_units,
        s.final_price_yearly,
        s.trial_end,
        CASE 
          WHEN s.status = 'active' THEN true 
          ELSE false 
        END as is_active,
        CASE 
          WHEN s.trial_end IS NOT NULL AND s.trial_end > NOW() THEN true
          ELSE false
        END as is_trial
      FROM users u
      LEFT JOIN subscriptions s ON u.id = s.user_id
      WHERE u.role = 'user'
      ORDER BY u.created_at DESC
    `);
    
    res.json({
      success: true,
      users: result.rows
    });
  } catch (error) {
    console.error('Error fetching users subscriptions:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ===================================
// POST - Créer abonnement TEST pour un user
// ===================================
router.post('/create-test-subscription', async (req, res) => {
  const { 
    user_id, 
    plan_type = 'particulier',  // 'particulier' ou 'professionnel'
    duration_months = 12
  } = req.body;
  
  try {
    // Vérifier que le user existe
    const userCheck = await pool.query(
      'SELECT id, email FROM users WHERE id = $1',
      [user_id]
    );
    
    if (userCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Utilisateur non trouvé'
      });
    }
    
    const user = userCheck.rows[0];
    
    // Prix selon le plan
    const prices = {
      particulier: 2.00,  // 2€ TTC/mois
      professionnel: 4.00 // 4€ HTVA/mois
    };
    
    const priceMonthly = prices[plan_type] || 2.00;
    const priceYearly = priceMonthly * 12;
    
    // Unités selon le plan
    const units = plan_type === 'professionnel' ? 10 : 1;
    
    // Dates
    const startDate = new Date();
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + duration_months);
    
    // Trial de 1 an pour les tests
    const trialEnd = new Date();
    trialEnd.setFullYear(trialEnd.getFullYear() + 1);
    
    // Désactiver anciens abonnements
    await pool.query(
      `UPDATE subscriptions SET status = 'canceled', canceled_at = NOW() WHERE user_id = $1`,
      [user_id]
    );
    
    // Créer l'abonnement TEST
    const result = await pool.query(`
      INSERT INTO subscriptions (
        user_id,
        status,
        billing_cycle,
        current_period_start,
        current_period_end,
        trial_end,
        total_units,
        base_price_yearly,
        final_price_yearly,
        created_at,
        updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
      RETURNING *
    `, [
      user_id,
      'active',
      'yearly',
      startDate,
      endDate,
      trialEnd,
      units,
      priceYearly,
      priceYearly
    ]);
    
    console.log(`✅ Abonnement TEST créé pour ${user.email} (${plan_type})`);
    
    res.json({
      success: true,
      message: `Abonnement TEST ${plan_type} créé avec succès`,
      subscription: result.rows[0],
      details: {
        plan: plan_type,
        duration: `${duration_months} mois`,
        price_yearly: `${priceYearly.toFixed(2)} €`,
        units: units,
        valid_until: endDate.toLocaleDateString('fr-FR'),
        trial_until: trialEnd.toLocaleDateString('fr-FR')
      }
    });
    
  } catch (error) {
    console.error('Error creating subscription:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ===================================
// PATCH - Activer/Désactiver abonnement
// ===================================
router.patch('/toggle-subscription/:subscriptionId', async (req, res) => {
  const { subscriptionId } = req.params;
  const { is_active } = req.body;
  
  try {
    const result = await pool.query(`
      UPDATE subscriptions 
      SET 
        status = $1,
        updated_at = NOW()
      WHERE id = $2
      RETURNING *
    `, [
      is_active ? 'active' : 'inactive',
      subscriptionId
    ]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Abonnement non trouvé'
      });
    }
    
    res.json({
      success: true,
      message: `Abonnement ${is_active ? 'activé' : 'désactivé'}`,
      subscription: result.rows[0]
    });
    
  } catch (error) {
    console.error('Error toggling subscription:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ===================================
// DELETE - Annuler abonnement
// ===================================
router.delete('/cancel-subscription/:subscriptionId', async (req, res) => {
  const { subscriptionId } = req.params;
  
  try {
    const result = await pool.query(`
      UPDATE subscriptions 
      SET 
        status = 'canceled',
        canceled_at = NOW(),
        updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `, [subscriptionId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Abonnement non trouvé'
      });
    }
    
    res.json({
      success: true,
      message: 'Abonnement annulé',
      subscription: result.rows[0]
    });
    
  } catch (error) {
    console.error('Error canceling subscription:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ===================================
// PATCH - Prolonger abonnement
// ===================================
router.patch('/extend-subscription/:subscriptionId', async (req, res) => {
  const { subscriptionId } = req.params;
  const { months = 1 } = req.body;
  
  try {
    const result = await pool.query(`
      UPDATE subscriptions 
      SET 
        current_period_end = current_period_end + INTERVAL '${months} months',
        updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `, [subscriptionId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Abonnement non trouvé'
      });
    }
    
    res.json({
      success: true,
      message: `Abonnement prolongé de ${months} mois`,
      subscription: result.rows[0]
    });
    
  } catch (error) {
    console.error('Error extending subscription:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;
