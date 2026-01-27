import pool from '../config/database.js';

/**
 * Middleware pour vérifier si l'utilisateur peut créer un nouvel immeuble
 * Particulier = 1 immeuble max
 * Professionnel = illimité
 */
export async function checkImmeubleLimit(req, res, next) {
  try {
    // Récupérer le plan de l'utilisateur
    const subResult = await pool.query(`
      SELECT p.code, p.name, p.max_immeubles, p.is_professional
      FROM subscriptions s
      JOIN plans p ON s.plan_id = p.id
      WHERE s.user_id = $1
    `, [req.user.id]);

    if (subResult.rows.length === 0) {
      return res.status(403).json({
        error: 'no_subscription',
        message: 'Vous n\'avez pas d\'abonnement actif.'
      });
    }

    const plan = subResult.rows[0];

    // Si max_immeubles = -1, c'est illimité
    if (plan.max_immeubles === -1) {
      return next();
    }

    // Compter les immeubles actuels
    const countResult = await pool.query(
      'SELECT COUNT(*) as count FROM immeubles WHERE user_id = $1',
      [req.user.id]
    );
    const currentCount = parseInt(countResult.rows[0].count) || 0;

    // Vérifier la limite
    if (currentCount >= plan.max_immeubles) {
      return res.status(403).json({
        error: 'immeuble_limit_reached',
        message: `Votre plan ${plan.name} est limité à ${plan.max_immeubles} immeuble${plan.max_immeubles > 1 ? 's' : ''}. Passez au plan Professionnel pour gérer plusieurs immeubles.`,
        currentCount,
        limit: plan.max_immeubles,
        planCode: plan.code,
        planName: plan.name,
        upgradeRequired: true,
        upgradeTo: 'professionnel'
      });
    }

    next();
  } catch (error) {
    console.error('Error checking immeuble limit:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
}

/**
 * Middleware pour vérifier si l'utilisateur peut passer au plan Particulier
 * (doit avoir max 1 immeuble)
 */
export async function checkCanDowngradeToParticulier(req, res, next) {
  try {
    const countResult = await pool.query(
      'SELECT COUNT(*) as count FROM immeubles WHERE user_id = $1',
      [req.user.id]
    );
    const currentCount = parseInt(countResult.rows[0].count) || 0;

    if (currentCount > 1) {
      return res.status(400).json({
        error: 'too_many_immeubles',
        message: `Vous avez actuellement ${currentCount} immeubles. Le plan Particulier est limité à 1 immeuble. Supprimez d'abord ${currentCount - 1} immeuble${currentCount - 1 > 1 ? 's' : ''} pour pouvoir changer de plan.`,
        currentCount,
        requiredMax: 1
      });
    }

    next();
  } catch (error) {
    console.error('Error checking downgrade eligibility:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
}

/**
 * Middleware pour vérifier que le numéro TVA est renseigné pour le plan Pro
 */
export async function requireVatForProfessional(req, res, next) {
  const { planCode } = req.body;

  if (planCode !== 'professionnel') {
    return next();
  }

  try {
    const userResult = await pool.query(
      'SELECT vat_number, company_name FROM users WHERE id = $1',
      [req.user.id]
    );

    const user = userResult.rows[0];

    if (!user.vat_number || !user.company_name) {
      return res.status(400).json({
        error: 'missing_professional_info',
        message: 'Pour passer au plan Professionnel, vous devez renseigner votre numéro de TVA et le nom de votre société.',
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

    next();
  } catch (error) {
    console.error('Error validating professional info:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
}

/**
 * Middleware pour vérifier que l'abonnement est actif
 */
export async function requireActiveSubscription(req, res, next) {
  try {
    const result = await pool.query(`
      SELECT s.status, s.trial_end, p.name as plan_name
      FROM subscriptions s
      JOIN plans p ON s.plan_id = p.id
      WHERE s.user_id = $1
    `, [req.user.id]);

    if (result.rows.length === 0) {
      return res.status(403).json({
        error: 'no_subscription',
        message: 'Vous n\'avez pas d\'abonnement.'
      });
    }

    const sub = result.rows[0];

    // Vérifier le statut
    if (sub.status === 'expired' || sub.status === 'cancelled') {
      return res.status(403).json({
        error: 'subscription_inactive',
        message: 'Votre abonnement a expiré. Veuillez le renouveler pour continuer.',
        status: sub.status
      });
    }

    // Vérifier si la période d'essai est terminée sans paiement
    if (sub.status === 'trialing' && sub.trial_end && new Date(sub.trial_end) < new Date()) {
      return res.status(403).json({
        error: 'trial_expired',
        message: 'Votre période d\'essai est terminée. Veuillez vous abonner pour continuer.',
        trialEnd: sub.trial_end
      });
    }

    next();
  } catch (error) {
    console.error('Error checking subscription:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
}
