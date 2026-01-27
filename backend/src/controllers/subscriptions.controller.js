import pool from '../config/database.js';

// ============================================
// PLANS
// ============================================

// Récupérer tous les plans disponibles
export async function getAllPlans(req, res) {
  try {
    const result = await pool.query(`
      SELECT id, code, name, description, 
             price_monthly, price_yearly, price_per_unit, currency,
             max_immeubles, max_proprietaires, max_locataires, max_users, 
             is_professional, vat_rate, trial_days,
             features, sort_order
      FROM plans 
      WHERE is_active = true
      ORDER BY sort_order ASC
    `);

    res.json({
      success: true,
      plans: result.rows.map(plan => ({
        id: plan.id,
        code: plan.code,
        name: plan.name,
        description: plan.description,
        priceMonthly: parseFloat(plan.price_monthly) || 0,
        priceYearly: plan.price_yearly ? parseFloat(plan.price_yearly) : null,
        pricePerUnit: parseFloat(plan.price_per_unit) || 0,
        currency: plan.currency || 'EUR',
        isProfessional: plan.is_professional || false,
        vatRate: parseFloat(plan.vat_rate) || 0,
        trialDays: plan.trial_days || 15,
        limits: {
          maxImmeubles: plan.max_immeubles,
          maxProprietaires: plan.max_proprietaires,
          maxLocataires: plan.max_locataires,
          maxUsers: plan.max_users
        },
        features: plan.features || []
      }))
    });
  } catch (error) {
    console.error('Error fetching plans:', error);
    res.status(500).json({ error: 'Failed to fetch plans' });
  }
}

// ============================================
// SUBSCRIPTIONS
// ============================================

// Récupérer l'abonnement de l'utilisateur connecté
export async function getMySubscription(req, res) {
  try {
    const result = await pool.query(`
      SELECT 
        s.id, s.status, s.billing_cycle, s.current_period_start, s.current_period_end,
        s.trial_end, s.cancel_at_period_end, s.canceled_at, s.created_at,
        s.discount_percentage, s.discount_expires_at,
        p.id as plan_id, p.code as plan_code, p.name as plan_name, 
        p.price_monthly, p.price_yearly, p.price_per_unit,
        p.max_immeubles, p.max_proprietaires, p.max_locataires, p.max_users,
        p.is_professional, p.vat_rate,
        p.features
      FROM subscriptions s
      JOIN plans p ON s.plan_id = p.id
      WHERE s.user_id = $1
    `, [req.user.id]);

    if (result.rows.length === 0) {
      // Créer un abonnement avec le plan particulier par défaut
      const defaultPlan = await pool.query("SELECT id FROM plans WHERE code = 'particulier'");
      if (defaultPlan.rows.length > 0) {
        await pool.query(`
          INSERT INTO subscriptions (user_id, plan_id, status, trial_end)
          VALUES ($1, $2, 'trialing', CURRENT_TIMESTAMP + INTERVAL '15 days')
        `, [req.user.id, defaultPlan.rows[0].id]);

        // Récupérer le nouvel abonnement
        return getMySubscription(req, res);
      }
      return res.status(404).json({ error: 'No subscription found' });
    }

    const sub = result.rows[0];
    
    // Calculer les jours restants du trial
    let trialDaysRemaining = null;
    if (sub.trial_end) {
      const now = new Date();
      const trialEnd = new Date(sub.trial_end);
      trialDaysRemaining = Math.max(0, Math.ceil((trialEnd - now) / (1000 * 60 * 60 * 24)));
    }

    // Récupérer l'utilisation actuelle
    const usage = await getUserUsage(req.user.id);

    // Récupérer les réductions actives
    const discounts = await getActiveDiscounts(req.user.id);

    // Calculer le prix
    const pricing = calculatePricing(sub, usage.unites || usage.proprietaires, discounts);

    res.json({
      success: true,
      subscription: {
        id: sub.id,
        status: sub.status,
        billingCycle: sub.billing_cycle || 'yearly',
        currentPeriodStart: sub.current_period_start,
        currentPeriodEnd: sub.current_period_end,
        trialEnd: sub.trial_end,
        trialDaysRemaining,
        cancelAtPeriodEnd: sub.cancel_at_period_end,
        canceledAt: sub.canceled_at,
        createdAt: sub.created_at,
        plan: {
          id: sub.plan_id,
          code: sub.plan_code,
          name: sub.plan_name,
          priceMonthly: parseFloat(sub.price_monthly) || 0,
          priceYearly: sub.price_yearly ? parseFloat(sub.price_yearly) : null,
          pricePerUnit: parseFloat(sub.price_per_unit) || 0,
          isProfessional: sub.is_professional || false,
          vatRate: parseFloat(sub.vat_rate) || 0,
          limits: {
            maxImmeubles: sub.max_immeubles,
            maxProprietaires: sub.max_proprietaires,
            maxLocataires: sub.max_locataires,
            maxUsers: sub.max_users
          },
          features: sub.features || []
        },
        usage,
        pricing,
        discounts
      }
    });
  } catch (error) {
    console.error('Error fetching subscription:', error);
    res.status(500).json({ error: 'Failed to fetch subscription' });
  }
}

// Récupérer l'utilisation actuelle de l'utilisateur
async function getUserUsage(userId) {
  try {
    // Compter les immeubles de l'utilisateur
    const immeubles = await pool.query(
      'SELECT COUNT(*) as count FROM immeubles WHERE user_id = $1',
      [userId]
    );

    // Récupérer les IDs des immeubles de l'utilisateur
    const userImmeubles = await pool.query(
      'SELECT id FROM immeubles WHERE user_id = $1',
      [userId]
    );
    const immeubleIds = userImmeubles.rows.map(i => i.id);

    let proprietairesCount = 0;
    let locatairesCount = 0;

    if (immeubleIds.length > 0) {
      // Compter les propriétaires (= unités) liés aux immeubles de l'utilisateur
      const proprietaires = await pool.query(
        'SELECT COUNT(*) as count FROM proprietaires WHERE immeuble_id = ANY($1)',
        [immeubleIds]
      );
      proprietairesCount = parseInt(proprietaires.rows[0].count) || 0;

      // Compter les locataires liés aux immeubles de l'utilisateur
      const locataires = await pool.query(
        'SELECT COUNT(*) as count FROM locataires WHERE immeuble_id = ANY($1)',
        [immeubleIds]
      );
      locatairesCount = parseInt(locataires.rows[0].count) || 0;
    }

    return {
      immeubles: parseInt(immeubles.rows[0].count) || 0,
      proprietaires: proprietairesCount,
      locataires: locatairesCount,
      unites: proprietairesCount // Alias pour le calcul du prix
    };
  } catch (error) {
    console.error('Error getting usage:', error);
    return { immeubles: 0, proprietaires: 0, locataires: 0, unites: 0 };
  }
}

// Récupérer les réductions actives
async function getActiveDiscounts(userId) {
  try {
    const result = await pool.query(`
      SELECT type, percentage, reason, expires_at
      FROM discounts
      WHERE user_id = $1 AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)
      ORDER BY percentage DESC
    `, [userId]);

    return result.rows;
  } catch (error) {
    console.error('Error getting discounts:', error);
    return [];
  }
}

// Calculer le prix
function calculatePricing(subscription, units, discounts) {
  const pricePerUnit = parseFloat(subscription.price_per_unit) || 0;
  const isProfessional = subscription.is_professional || false;
  const vatRate = isProfessional ? (parseFloat(subscription.vat_rate) || 21) : 0;

  // Réduction max
  const discountPercent = discounts.length > 0 
    ? Math.max(...discounts.map(d => d.percentage))
    : 0;

  const baseMonthly = units * pricePerUnit;
  const baseYearly = baseMonthly * 12;
  const discountAmount = baseYearly * (discountPercent / 100);
  const subtotal = baseYearly - discountAmount;
  const vatAmount = subtotal * (vatRate / 100);
  const total = subtotal + vatAmount;

  return {
    units,
    pricePerUnit,
    baseMonthly,
    baseYearly,
    discountPercent,
    discountAmount,
    subtotal,
    vatRate,
    vatAmount,
    total,
    isProfessional
  };
}

// Vérifier si l'utilisateur peut créer une ressource
export async function checkLimit(req, res) {
  const { resource } = req.params; // 'immeubles', 'proprietaires', 'locataires'

  try {
    // Récupérer l'abonnement et les limites
    const result = await pool.query(`
      SELECT p.code, p.name, p.max_immeubles, p.max_proprietaires, p.max_locataires
      FROM subscriptions s
      JOIN plans p ON s.plan_id = p.id
      WHERE s.user_id = $1 AND s.status IN ('active', 'trialing')
    `, [req.user.id]);

    if (result.rows.length === 0) {
      return res.status(403).json({ 
        allowed: false, 
        error: 'No active subscription' 
      });
    }

    const limits = result.rows[0];
    const usage = await getUserUsage(req.user.id);

    let maxLimit, currentUsage;
    switch (resource) {
      case 'immeubles':
        maxLimit = limits.max_immeubles;
        currentUsage = usage.immeubles;
        break;
      case 'proprietaires':
        maxLimit = limits.max_proprietaires;
        currentUsage = usage.proprietaires;
        break;
      case 'locataires':
        maxLimit = limits.max_locataires;
        currentUsage = usage.locataires;
        break;
      default:
        return res.status(400).json({ error: 'Invalid resource type' });
    }

    // -1 signifie illimité
    const allowed = maxLimit === -1 || currentUsage < maxLimit;

    // Message spécifique si limite immeuble atteinte pour Particulier
    let upgradeMessage = null;
    if (!allowed && resource === 'immeubles' && limits.code === 'particulier') {
      upgradeMessage = 'Votre plan Particulier est limité à 1 immeuble. Passez au plan Professionnel pour gérer plusieurs immeubles.';
    }

    res.json({
      success: true,
      allowed,
      resource,
      current: currentUsage,
      limit: maxLimit === -1 ? 'unlimited' : maxLimit,
      remaining: maxLimit === -1 ? 'unlimited' : Math.max(0, maxLimit - currentUsage),
      planCode: limits.code,
      planName: limits.name,
      upgradeMessage
    });
  } catch (error) {
    console.error('Error checking limit:', error);
    res.status(500).json({ error: 'Failed to check limit' });
  }
}

// Changer de plan
export async function changePlan(req, res) {
  const { planCode, billingCycle = 'yearly' } = req.body;

  try {
    // Récupérer le nouveau plan
    const planResult = await pool.query(
      'SELECT * FROM plans WHERE code = $1 AND is_active = true',
      [planCode]
    );

    if (planResult.rows.length === 0) {
      return res.status(404).json({ error: 'Plan non trouvé' });
    }

    const newPlan = planResult.rows[0];

    // ============================================
    // VALIDATION POUR PASSAGE EN PARTICULIER
    // ============================================
    if (planCode === 'particulier') {
      const usage = await getUserUsage(req.user.id);
      
      if (usage.immeubles > 1) {
        return res.status(400).json({
          error: 'too_many_immeubles',
          message: `Vous avez actuellement ${usage.immeubles} immeubles. Le plan Particulier est limité à 1 immeuble. Supprimez d'abord ${usage.immeubles - 1} immeuble${usage.immeubles - 1 > 1 ? 's' : ''} pour changer de plan.`,
          currentImmeubles: usage.immeubles,
          requiredMax: 1
        });
      }
    }

    // ============================================
    // VALIDATION POUR PASSAGE EN PROFESSIONNEL
    // ============================================
    if (planCode === 'professionnel') {
      const userResult = await pool.query(
        'SELECT vat_number, company_name FROM users WHERE id = $1',
        [req.user.id]
      );
      const user = userResult.rows[0];

      if (!user.vat_number || !user.company_name) {
        return res.status(400).json({
          error: 'missing_professional_info',
          message: 'Pour passer au plan Professionnel, vous devez renseigner votre numéro de TVA et le nom de votre société dans votre profil.',
          required: {
            vat_number: !user.vat_number,
            company_name: !user.company_name
          }
        });
      }

      // Valider le format du numéro TVA européen
      const vatRegex = /^(BE|FR|LU|DE|NL|IT|ES|PT|AT|PL|CZ|SK|HU|RO|BG|HR|SI|EE|LV|LT|CY|MT|GR|IE|DK|SE|FI)[0-9A-Z]{8,12}$/i;
      const cleanVat = user.vat_number.replace(/[\s.]/g, '').toUpperCase();

      if (!vatRegex.test(cleanVat)) {
        return res.status(400).json({
          error: 'invalid_vat_number',
          message: 'Le numéro de TVA doit être un numéro de TVA intracommunautaire valide (ex: BE0123456789).'
        });
      }
    }

    // ============================================
    // MISE À JOUR OU REDIRECTION PAIEMENT
    // ============================================
    
    // Calculer si un paiement est nécessaire
    const pricePerUnit = parseFloat(newPlan.price_per_unit) || 0;
    
    if (pricePerUnit > 0) {
      // Récupérer l'utilisation pour calculer le prix
      const usage = await getUserUsage(req.user.id);
      const discounts = await getActiveDiscounts(req.user.id);
      
      const pricing = {
        units: usage.unites || usage.proprietaires,
        pricePerUnit,
        isProfessional: newPlan.is_professional
      };
      
      // Calculer le prix
      const baseYearly = pricing.units * pricePerUnit * 12;
      const discountPercent = discounts.length > 0 ? Math.max(...discounts.map(d => d.percentage)) : 0;
      const discountAmount = baseYearly * (discountPercent / 100);
      const subtotal = baseYearly - discountAmount;
      const vatRate = newPlan.is_professional ? (parseFloat(newPlan.vat_rate) || 21) : 0;
      const vatAmount = subtotal * (vatRate / 100);
      const total = subtotal + vatAmount;

      return res.json({
        success: true,
        requiresPayment: true,
        message: 'Ce plan nécessite un paiement.',
        plan: {
          id: newPlan.id,
          code: newPlan.code,
          name: newPlan.name,
          pricePerUnit,
          isProfessional: newPlan.is_professional
        },
        pricing: {
          units: pricing.units,
          baseYearly,
          discountPercent,
          discountAmount,
          subtotal,
          vatRate,
          vatAmount,
          total
        }
        // stripeSessionUrl sera ajouté en Phase 7
      });
    }

    // Pour le plan gratuit, mise à jour directe
    await pool.query(`
      UPDATE subscriptions 
      SET plan_id = $1, 
          billing_cycle = $2, 
          updated_at = CURRENT_TIMESTAMP
      WHERE user_id = $3
    `, [newPlan.id, billingCycle, req.user.id]);

    res.json({
      success: true,
      requiresPayment: false,
      message: `Plan changé vers ${newPlan.name}`
    });
  } catch (error) {
    console.error('Error changing plan:', error);
    res.status(500).json({ error: 'Failed to change plan' });
  }
}

// Récupérer l'historique des factures
export async function getInvoices(req, res) {
  try {
    const result = await pool.query(`
      SELECT id, invoice_number, invoice_date, due_date,
             subtotal, discount_percentage, discount_amount,
             vat_rate, vat_amount, total,
             period_start, period_end, plan_name, units_count,
             status, paid_at, pdf_url, created_at
      FROM invoices
      WHERE user_id = $1
      ORDER BY invoice_date DESC
      LIMIT 20
    `, [req.user.id]);

    res.json({
      success: true,
      invoices: result.rows.map(inv => ({
        id: inv.id,
        invoiceNumber: inv.invoice_number,
        invoiceDate: inv.invoice_date,
        dueDate: inv.due_date,
        subtotal: parseFloat(inv.subtotal) || 0,
        discountPercentage: inv.discount_percentage || 0,
        discountAmount: parseFloat(inv.discount_amount) || 0,
        vatRate: parseFloat(inv.vat_rate) || 0,
        vatAmount: parseFloat(inv.vat_amount) || 0,
        total: parseFloat(inv.total) || 0,
        periodStart: inv.period_start,
        periodEnd: inv.period_end,
        planName: inv.plan_name,
        unitsCount: inv.units_count,
        status: inv.status,
        paidAt: inv.paid_at,
        pdfUrl: inv.pdf_url,
        createdAt: inv.created_at
      }))
    });
  } catch (error) {
    console.error('Error fetching invoices:', error);
    res.status(500).json({ error: 'Failed to fetch invoices' });
  }
}

// Calculer le prix pour un plan donné (endpoint public)
export async function calculatePrice(req, res) {
  const { planCode, units } = req.query;

  try {
    const planResult = await pool.query(
      'SELECT * FROM plans WHERE code = $1',
      [planCode || 'particulier']
    );

    if (planResult.rows.length === 0) {
      return res.status(404).json({ error: 'Plan non trouvé' });
    }

    const plan = planResult.rows[0];
    const unitCount = parseInt(units) || 0;
    const pricePerUnit = parseFloat(plan.price_per_unit) || 0;

    // Récupérer la réduction de l'utilisateur si connecté
    let discountPercent = 0;
    if (req.user) {
      const discounts = await getActiveDiscounts(req.user.id);
      discountPercent = discounts.length > 0 ? Math.max(...discounts.map(d => d.percentage)) : 0;
    }

    const baseMonthly = unitCount * pricePerUnit;
    const baseYearly = baseMonthly * 12;
    const discountAmount = baseYearly * (discountPercent / 100);
    const subtotal = baseYearly - discountAmount;
    const vatRate = plan.is_professional ? parseFloat(plan.vat_rate) || 21 : 0;
    const vatAmount = subtotal * (vatRate / 100);
    const total = subtotal + vatAmount;

    res.json({
      success: true,
      calculation: {
        plan: {
          code: plan.code,
          name: plan.name,
          pricePerUnit,
          isProfessional: plan.is_professional
        },
        units: unitCount,
        baseMonthly,
        baseYearly,
        discountPercent,
        discountAmount,
        subtotal,
        vatRate,
        vatAmount,
        total
      }
    });
  } catch (error) {
    console.error('Error calculating price:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
}
