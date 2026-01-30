import pool from '../config/database.js';

/**
 * Middleware pour vérifier les limites d'abonnement
 * Usage: checkSubscriptionLimit('immeubles')
 */
export function checkSubscriptionLimit(resource) {
  return async (req, res, next) => {
    try {
      // Récupérer l'abonnement et les limites
      const subResult = await pool.query(`
        SELECT 
          s.status,
          p.max_immeubles, 
          p.max_proprietaires, 
          p.max_locataires,
          p.name as plan_name
        FROM subscriptions s
        JOIN plans p ON s.plan_id = p.id
        WHERE s.user_id = $1
      `, [req.user.id]);

      // Si pas d'abonnement, créer un abonnement gratuit
      if (subResult.rows.length === 0) {
        const freePlan = await pool.query("SELECT id FROM plans WHERE code = 'free'");
        if (freePlan.rows.length > 0) {
          await pool.query(`
            INSERT INTO subscriptions (user_id, plan_id, status, trial_end)
            VALUES ($1, $2, 'trialing', CURRENT_TIMESTAMP + INTERVAL '30 days')
          `, [req.user.id, freePlan.rows[0].id]);
          
          // Réessayer
          return checkSubscriptionLimit(resource)(req, res, next);
        }
        return res.status(403).json({
          error: 'subscription_required',
          message: 'Un abonnement est requis pour cette action'
        });
      }

      const sub = subResult.rows[0];

      // Vérifier si l'abonnement est actif
      if (!['active', 'trialing'].includes(sub.status)) {
        return res.status(403).json({
          error: 'subscription_inactive',
          message: 'Votre abonnement n\'est plus actif. Veuillez renouveler.'
        });
      }

      // Récupérer l'utilisation actuelle
      let currentUsage = 0;
      let maxLimit = 0;
      let resourceLabel = '';

      // ✅ CORRIGÉ : Récupérer seulement les immeubles NON archivés
      const userImmeubles = await pool.query(
        'SELECT id FROM immeubles WHERE user_id = $1 AND archived_at IS NULL',
        [req.user.id]
      );
      const immeubleIds = userImmeubles.rows.map(i => i.id);

      switch (resource) {
        case 'immeubles':
          currentUsage = immeubleIds.length;
          maxLimit = sub.max_immeubles;
          resourceLabel = 'immeubles';
          break;

        case 'proprietaires':
          if (immeubleIds.length > 0) {
            const propCount = await pool.query(
              'SELECT COUNT(*) as count FROM proprietaires WHERE immeuble_id = ANY($1)',
              [immeubleIds]
            );
            currentUsage = parseInt(propCount.rows[0].count) || 0;
          }
          maxLimit = sub.max_proprietaires;
          resourceLabel = 'propriétaires';
          break;

        case 'locataires':
          if (immeubleIds.length > 0) {
            const locCount = await pool.query(
              'SELECT COUNT(*) as count FROM locataires WHERE immeuble_id = ANY($1)',
              [immeubleIds]
            );
            currentUsage = parseInt(locCount.rows[0].count) || 0;
          }
          maxLimit = sub.max_locataires;
          resourceLabel = 'locataires';
          break;

        default:
          return next(); // Ressource non limitée
      }

      // -1 signifie illimité
      if (maxLimit !== -1 && currentUsage >= maxLimit) {
        return res.status(403).json({
          error: 'limit_reached',
          message: `Vous avez atteint la limite de ${maxLimit} ${resourceLabel} pour votre plan ${sub.plan_name}. Passez à un plan supérieur pour en ajouter plus.`,
          current: currentUsage,
          limit: maxLimit,
          planName: sub.plan_name
        });
      }

      // Ajouter les infos de limite à la requête pour usage ultérieur
      req.subscriptionLimits = {
        resource,
        current: currentUsage,
        limit: maxLimit,
        remaining: maxLimit === -1 ? Infinity : maxLimit - currentUsage
      };

      next();
    } catch (error) {
      console.error('Subscription check error:', error);
      // En cas d'erreur, on laisse passer pour ne pas bloquer (fail-open)
      // On pourrait changer en fail-close pour plus de sécurité
      next();
    }
  };
}

/**
 * Middleware pour vérifier si l'utilisateur a un abonnement actif
 */
export async function requireActiveSubscription(req, res, next) {
  try {
    const result = await pool.query(`
      SELECT s.status, s.trial_end
      FROM subscriptions s
      WHERE s.user_id = $1
    `, [req.user.id]);

    if (result.rows.length === 0) {
      return res.status(403).json({
        error: 'subscription_required',
        message: 'Un abonnement est requis'
      });
    }

    const sub = result.rows[0];

    // Vérifier si le trial est expiré
    if (sub.status === 'trialing' && sub.trial_end) {
      const now = new Date();
      const trialEnd = new Date(sub.trial_end);
      if (now > trialEnd) {
        // Mettre à jour le statut
        await pool.query(`
          UPDATE subscriptions 
          SET status = 'expired', updated_at = CURRENT_TIMESTAMP
          WHERE user_id = $1
        `, [req.user.id]);

        return res.status(403).json({
          error: 'trial_expired',
          message: 'Votre période d\'essai est terminée. Veuillez choisir un plan pour continuer.'
        });
      }
    }

    if (!['active', 'trialing'].includes(sub.status)) {
      return res.status(403).json({
        error: 'subscription_inactive',
        message: 'Votre abonnement n\'est plus actif'
      });
    }

    next();
  } catch (error) {
    console.error('Subscription check error:', error);
    next();
  }
}
