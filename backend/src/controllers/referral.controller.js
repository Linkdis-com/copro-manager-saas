import pool from '../config/database.js';

// ============================================
// CODES DE PARRAINAGE
// ============================================

/**
 * Récupérer le code de parrainage de l'utilisateur connecté
 * GET /api/v1/referral/my-code
 */
export async function getMyReferralCode(req, res) {
  try {
    let result = await pool.query(
      'SELECT code FROM referral_codes WHERE user_id = $1',
      [req.user.id]
    );

    // Si pas de code, en générer un
    if (result.rows.length === 0) {
      const code = generateReferralCode(req.user.first_name);
      await pool.query(
        'INSERT INTO referral_codes (user_id, code) VALUES ($1, $2)',
        [req.user.id, code]
      );
      result = { rows: [{ code }] };
    }

    const baseUrl = process.env.FRONTEND_URL || 'https://copromanager.be';
    const referralLink = `${baseUrl}/inscription?ref=${result.rows[0].code}`;

    res.json({
      success: true,
      code: result.rows[0].code,
      link: referralLink,
      shareText: `🏢 Je viens de découvrir Copro Manager, l'outil idéal pour gérer ma copropriété simplement ! Essayez gratuitement pendant 15 jours 👉 ${referralLink}`
    });
  } catch (error) {
    console.error('Error getting referral code:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
}

/**
 * Vérifier si un code de parrainage est valide
 * GET /api/v1/referral/check/:code
 */
export async function checkReferralCode(req, res) {
  const { code } = req.params;

  try {
    const result = await pool.query(`
      SELECT rc.code, u.first_name 
      FROM referral_codes rc
      JOIN users u ON rc.user_id = u.id
      WHERE UPPER(rc.code) = UPPER($1)
    `, [code]);

    if (result.rows.length === 0) {
      return res.json({
        valid: false,
        message: 'Code de parrainage invalide'
      });
    }

    res.json({
      valid: true,
      referrerName: result.rows[0].first_name,
      discount: 20,
      message: `Vous bénéficiez de 20% de réduction grâce à ${result.rows[0].first_name} !`
    });
  } catch (error) {
    console.error('Error checking referral code:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
}

/**
 * Récupérer les statistiques de parrainage de l'utilisateur
 * GET /api/v1/referral/stats
 */
export async function getReferralStats(req, res) {
  try {
    // Compter les parrainages réussis
    const referralsResult = await pool.query(`
      SELECT COUNT(*) as count 
      FROM referrals 
      WHERE referrer_id = $1 AND status = 'completed'
    `, [req.user.id]);
    
    const referralCount = parseInt(referralsResult.rows[0].count) || 0;

    // Récupérer le palier actuel
    const tierResult = await pool.query(`
      SELECT discount_percentage, description 
      FROM referral_tiers 
      WHERE min_referrals <= $1 
      ORDER BY min_referrals DESC 
      LIMIT 1
    `, [referralCount]);

    const currentTier = tierResult.rows[0] || { discount_percentage: 0, description: 'Pas encore de réduction' };

    // Récupérer le prochain palier
    const nextTierResult = await pool.query(`
      SELECT min_referrals, discount_percentage, description 
      FROM referral_tiers 
      WHERE min_referrals > $1 
      ORDER BY min_referrals ASC 
      LIMIT 1
    `, [referralCount]);

    const nextTier = nextTierResult.rows[0] || null;

    // Liste des filleuls
    const referredResult = await pool.query(`
      SELECT u.first_name, r.created_at, r.status
      FROM referrals r
      JOIN users u ON r.referred_id = u.id
      WHERE r.referrer_id = $1
      ORDER BY r.created_at DESC
      LIMIT 10
    `, [req.user.id]);

    // Récupérer le code
    const codeResult = await pool.query(
      'SELECT code FROM referral_codes WHERE user_id = $1',
      [req.user.id]
    );

    const baseUrl = process.env.FRONTEND_URL || 'https://copromanager.be';

    res.json({
      success: true,
      code: codeResult.rows[0]?.code,
      link: `${baseUrl}/inscription?ref=${codeResult.rows[0]?.code}`,
      stats: {
        totalReferrals: referralCount,
        currentDiscount: currentTier.discount_percentage,
        currentTierDescription: currentTier.description,
        nextTier: nextTier ? {
          referralsNeeded: nextTier.min_referrals - referralCount,
          discount: nextTier.discount_percentage,
          description: nextTier.description
        } : null
      },
      referrals: referredResult.rows.map(r => ({
        name: r.first_name,
        date: r.created_at,
        status: r.status
      }))
    });
  } catch (error) {
    console.error('Error getting referral stats:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
}

/**
 * Enregistrer un parrainage (appelé à l'inscription)
 * POST /api/v1/referral/register
 */
export async function registerReferral(req, res) {
  const { referralCode, referredUserId } = req.body;

  if (!referralCode || !referredUserId) {
    return res.status(400).json({ error: 'Code et utilisateur requis' });
  }

  try {
    // Trouver le parrain
    const referrerResult = await pool.query(`
      SELECT rc.user_id, u.email, u.first_name
      FROM referral_codes rc
      JOIN users u ON rc.user_id = u.id
      WHERE UPPER(rc.code) = UPPER($1)
    `, [referralCode]);

    if (referrerResult.rows.length === 0) {
      return res.status(404).json({ error: 'Code de parrainage invalide' });
    }

    const referrer = referrerResult.rows[0];

    // Vérifier que le filleul n'est pas déjà parrainé
    const existingResult = await pool.query(
      'SELECT id FROM referrals WHERE referred_id = $1',
      [referredUserId]
    );

    if (existingResult.rows.length > 0) {
      return res.status(400).json({ error: 'Cet utilisateur est déjà parrainé' });
    }

    // Vérifier que le parrain ne se parraine pas lui-même
    if (referrer.user_id === referredUserId) {
      return res.status(400).json({ error: 'Vous ne pouvez pas vous parrainer vous-même' });
    }

    // Créer le parrainage
    await pool.query(`
      INSERT INTO referrals (referrer_id, referred_id, referral_code, status, completed_at)
      VALUES ($1, $2, $3, 'completed', CURRENT_TIMESTAMP)
    `, [referrer.user_id, referredUserId, referralCode.toUpperCase()]);

    // Appliquer la réduction au filleul (20%)
    await pool.query(`
      INSERT INTO discounts (user_id, type, percentage, reason, valid_months, applied_at, expires_at)
      VALUES ($1, 'referral_bonus', 20, 'Bonus filleul', 12, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP + INTERVAL '1 year')
    `, [referredUserId]);

    // Mettre à jour le code utilisé dans users
    await pool.query(
      'UPDATE users SET referred_by_code = $1 WHERE id = $2',
      [referralCode.toUpperCase(), referredUserId]
    );

    // Calculer la nouvelle réduction du parrain
    const newCountResult = await pool.query(`
      SELECT COUNT(*) as count FROM referrals 
      WHERE referrer_id = $1 AND status = 'completed'
    `, [referrer.user_id]);
    
    const newCount = parseInt(newCountResult.rows[0].count);

    // Trouver le nouveau palier
    const newTierResult = await pool.query(`
      SELECT discount_percentage FROM referral_tiers 
      WHERE min_referrals <= $1 
      ORDER BY min_referrals DESC LIMIT 1
    `, [newCount]);

    const newDiscount = newTierResult.rows[0]?.discount_percentage || 0;

    // Mettre à jour ou créer la réduction du parrain
    const existingDiscount = await pool.query(
      "SELECT id FROM discounts WHERE user_id = $1 AND type = 'referral_earned'",
      [referrer.user_id]
    );

    if (existingDiscount.rows.length > 0) {
      await pool.query(`
        UPDATE discounts 
        SET percentage = $1, applied_at = CURRENT_TIMESTAMP, expires_at = CURRENT_TIMESTAMP + INTERVAL '1 year'
        WHERE user_id = $2 AND type = 'referral_earned'
      `, [newDiscount, referrer.user_id]);
    } else if (newDiscount > 0) {
      await pool.query(`
        INSERT INTO discounts (user_id, type, percentage, reason, valid_months, applied_at, expires_at)
        VALUES ($1, 'referral_earned', $2, 'Récompense parrainage', 12, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP + INTERVAL '1 year')
      `, [referrer.user_id, newDiscount]);
    }

    console.log(`✅ Referral registered: ${referrer.first_name} -> new user (${newCount} total, ${newDiscount}% discount)`);

    res.json({
      success: true,
      message: 'Parrainage enregistré',
      referrerDiscount: newDiscount,
      referredDiscount: 20
    });

  } catch (error) {
    console.error('Error registering referral:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
}

// ============================================
// PARTAGE SOCIAL
// ============================================

/**
 * Déclarer un partage social
 * POST /api/v1/referral/social-share
 */
export async function declareSocialShare(req, res) {
  const { platform } = req.body;

  const validPlatforms = ['facebook', 'linkedin', 'twitter', 'instagram'];
  if (!platform || !validPlatforms.includes(platform.toLowerCase())) {
    return res.status(400).json({ 
      error: 'Plateforme invalide',
      validPlatforms 
    });
  }

  try {
    // Vérifier s'il n'y a pas déjà un partage validé
    const existingResult = await pool.query(`
      SELECT id, status FROM social_shares 
      WHERE user_id = $1 AND status = 'approved'
    `, [req.user.id]);

    if (existingResult.rows.length > 0) {
      return res.status(400).json({ 
        error: 'Vous avez déjà bénéficié de cette offre',
        message: 'Votre réduction de 20% est déjà active'
      });
    }

    // Vérifier s'il y a un partage en attente
    const pendingResult = await pool.query(`
      SELECT id, platform, created_at FROM social_shares 
      WHERE user_id = $1 AND status = 'pending'
    `, [req.user.id]);

    if (pendingResult.rows.length > 0) {
      return res.json({
        success: true,
        status: 'pending',
        message: 'Votre demande est en cours de vérification. Envoyez votre capture d\'écran à promo@copromanager.be',
        existingRequest: pendingResult.rows[0]
      });
    }

    // Créer la demande de partage
    await pool.query(`
      INSERT INTO social_shares (user_id, platform, status)
      VALUES ($1, $2, 'pending')
    `, [req.user.id, platform.toLowerCase()]);

    res.json({
      success: true,
      status: 'pending',
      message: 'Demande enregistrée !',
      nextSteps: [
        `1. Partagez notre publication sur ${platform}`,
        '2. Faites une capture d\'écran de votre publication',
        '3. Envoyez-la à promo@copromanager.be avec votre email de compte',
        '4. Votre réduction de 20% sera activée sous 24-48h'
      ],
      email: 'promo@copromanager.be'
    });

  } catch (error) {
    console.error('Error declaring social share:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
}

/**
 * Récupérer le statut du partage social
 * GET /api/v1/referral/social-share/status
 */
export async function getSocialShareStatus(req, res) {
  try {
    const result = await pool.query(`
      SELECT platform, status, created_at, verified_at
      FROM social_shares
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT 1
    `, [req.user.id]);

    if (result.rows.length === 0) {
      return res.json({
        success: true,
        hasRequested: false,
        message: 'Partagez Copro Manager sur les réseaux sociaux et obtenez 20% de réduction !'
      });
    }

    const share = result.rows[0];

    res.json({
      success: true,
      hasRequested: true,
      status: share.status,
      platform: share.platform,
      createdAt: share.created_at,
      verifiedAt: share.verified_at,
      message: share.status === 'approved' 
        ? 'Votre réduction de 20% est active !' 
        : share.status === 'pending'
          ? 'En attente de vérification. N\'oubliez pas d\'envoyer votre capture d\'écran à promo@copromanager.be'
          : 'Demande rejetée. Contactez le support pour plus d\'informations.'
    });

  } catch (error) {
    console.error('Error getting social share status:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
}

/**
 * [ADMIN] Valider un partage social
 * POST /api/v1/referral/admin/approve-share/:shareId
 */
export async function approveShareAdmin(req, res) {
  const { shareId } = req.params;
  const { notes } = req.body;

  try {
    // Récupérer le partage
    const shareResult = await pool.query(
      'SELECT user_id, status FROM social_shares WHERE id = $1',
      [shareId]
    );

    if (shareResult.rows.length === 0) {
      return res.status(404).json({ error: 'Partage non trouvé' });
    }

    if (shareResult.rows[0].status === 'approved') {
      return res.status(400).json({ error: 'Ce partage est déjà validé' });
    }

    const userId = shareResult.rows[0].user_id;

    // Mettre à jour le statut
    await pool.query(`
      UPDATE social_shares 
      SET status = 'approved', verified_by = $1, verified_at = CURRENT_TIMESTAMP, admin_notes = $2
      WHERE id = $3
    `, [req.user.id, notes || null, shareId]);

    // Ajouter la réduction
    await pool.query(`
      INSERT INTO discounts (user_id, type, percentage, reason, valid_months, applied_at, expires_at)
      VALUES ($1, 'social_share', 20, 'Partage réseaux sociaux', 12, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP + INTERVAL '1 year')
    `, [userId]);

    console.log(`✅ Social share approved for user ${userId}`);

    res.json({
      success: true,
      message: 'Partage validé et réduction appliquée'
    });

  } catch (error) {
    console.error('Error approving share:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
}

/**
 * [ADMIN] Rejeter un partage social
 * POST /api/v1/referral/admin/reject-share/:shareId
 */
export async function rejectShareAdmin(req, res) {
  const { shareId } = req.params;
  const { notes } = req.body;

  try {
    await pool.query(`
      UPDATE social_shares 
      SET status = 'rejected', verified_by = $1, verified_at = CURRENT_TIMESTAMP, admin_notes = $2
      WHERE id = $3
    `, [req.user.id, notes || 'Capture d\'écran non conforme', shareId]);

    res.json({
      success: true,
      message: 'Partage rejeté'
    });

  } catch (error) {
    console.error('Error rejecting share:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
}

/**
 * [ADMIN] Liste des partages en attente
 * GET /api/v1/referral/admin/pending-shares
 */
export async function getPendingSharesAdmin(req, res) {
  try {
    const result = await pool.query(`
      SELECT ss.id, ss.platform, ss.created_at, u.email, u.first_name, u.last_name
      FROM social_shares ss
      JOIN users u ON ss.user_id = u.id
      WHERE ss.status = 'pending'
      ORDER BY ss.created_at ASC
    `);

    res.json({
      success: true,
      pendingCount: result.rows.length,
      shares: result.rows
    });

  } catch (error) {
    console.error('Error getting pending shares:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
}

// ============================================
// RÉDUCTIONS
// ============================================

/**
 * Récupérer les réductions actives de l'utilisateur
 * GET /api/v1/referral/my-discounts
 */
export async function getMyDiscounts(req, res) {
  try {
    const result = await pool.query(`
      SELECT type, percentage, reason, expires_at, created_at
      FROM discounts
      WHERE user_id = $1 AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)
      ORDER BY percentage DESC
    `, [req.user.id]);

    // Calculer la réduction totale (max, pas cumul)
    const maxDiscount = result.rows.length > 0 
      ? Math.max(...result.rows.map(d => d.percentage))
      : 0;

    res.json({
      success: true,
      discounts: result.rows,
      totalDiscount: Math.min(maxDiscount, 100), // Max 100%
      message: maxDiscount > 0 
        ? `Vous bénéficiez de ${maxDiscount}% de réduction sur votre abonnement !`
        : 'Aucune réduction active. Parrainez des amis pour en obtenir !'
    });

  } catch (error) {
    console.error('Error getting discounts:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
}

// ============================================
// HELPER
// ============================================

function generateReferralCode(firstName) {
  const name = (firstName || 'USER')
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Z]/g, '')
    .substring(0, 5);
  const year = new Date().getFullYear();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${name}${year}${random}`;
}
