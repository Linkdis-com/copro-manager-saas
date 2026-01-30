// =====================================================
// 📱 ROUTES USER - Abonnements (côté client)
// backend/src/routes/subscription-user.routes.js
// ADAPTÉ POUR TON MIDDLEWARE authenticate
// =====================================================
import { Router } from 'express';
import pool from '../config/database.js';

const router = Router();

// ===================================
// GET - Récupérer l'abonnement actif de l'utilisateur connecté
// ===================================
router.get('/current', async (req, res) => {
  try {
    // req.user.id est défini par ton middleware authenticate
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Non authentifié'
      });
    }
    
    // Récupérer l'abonnement actif
    const result = await pool.query(`
      SELECT 
        s.*,
        p.name as plan_name,
        p.price_monthly,
        p.price_yearly
      FROM subscriptions s
      LEFT JOIN plans p ON s.plan_id = p.id
      WHERE s.user_id = $1
        AND s.status = 'active'
      ORDER BY s.created_at DESC
      LIMIT 1
    `, [userId]);
    
    if (result.rows.length === 0) {
      return res.json({
        success: true,
        subscription: null,
        hasActiveSubscription: false
      });
    }
    
    const subscription = result.rows[0];
    
    // Vérifier si l'abonnement est valide (pas expiré)
    const isValid = new Date(subscription.current_period_end) > new Date();
    
    res.json({
      success: true,
      subscription: subscription,
      hasActiveSubscription: isValid,
      expiresAt: subscription.current_period_end,
      isTrial: subscription.trial_end && new Date(subscription.trial_end) > new Date()
    });
    
  } catch (error) {
    console.error('Error fetching current subscription:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ===================================
// GET - Liste des plans disponibles
// ===================================
router.get('/plans', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        id,
        name,
        description,
        price_monthly,
        price_yearly,
        max_immeubles,
        max_users,
        features,
        is_active
      FROM plans
      WHERE is_active = true
      ORDER BY price_monthly ASC
    `);
    
    res.json({
      success: true,
      plans: result.rows
    });
    
  } catch (error) {
    console.error('Error fetching plans:', error);
    
    // Si la table plans n'existe pas, retourner des plans par défaut
    if (error.code === '42P01') { // Table doesn't exist
      return res.json({
        success: true,
        plans: [
          {
            id: 'particulier',
            name: 'Particulier',
            description: '1 immeuble',
            price_monthly: 2.00,
            price_yearly: 24.00,
            max_immeubles: 1,
            max_units: 1,
            features: ['Décomptes eau illimités', 'Export PDF', 'Support email'],
            is_active: true
          },
          {
            id: 'professionnel',
            name: 'Professionnel',
            description: 'Multi-immeubles',
            price_monthly: 4.00,
            price_yearly: 48.00,
            max_immeubles: 999,
            max_units: 10,
            features: ['Tout plan Particulier', 'TVA récupérable', 'Support prioritaire'],
            is_active: true
          }
        ]
      });
    }
    
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;
