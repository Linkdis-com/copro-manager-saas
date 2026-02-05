import pool from '../config/database.js';

// ═══════════════════════════════════════════════════════════
// VALIDATION D'UN CODE PROMO
// ═══════════════════════════════════════════════════════════

export async function validatePromoCode(req, res) {
  const { code } = req.body;
  const userId = req.user.id;

  try {
    if (!code || !code.trim()) {
      return res.status(400).json({
        valid: false,
        message: 'Veuillez fournir un code promo'
      });
    }

    // 1. Vérifier que le code existe et est actif
    const promoResult = await pool.query(`
      SELECT * FROM promo_codes 
      WHERE UPPER(code) = UPPER($1) 
        AND is_active = true
        AND (valid_from IS NULL OR valid_from <= CURRENT_DATE)
        AND (valid_until IS NULL OR valid_until >= CURRENT_DATE)
    `, [code.trim()]);

    if (promoResult.rows.length === 0) {
      return res.status(400).json({
        valid: false,
        message: 'Code promo invalide ou expiré'
      });
    }

    const promo = promoResult.rows[0];

    // 2. ✅ VÉRIFIER QUE L'USER N'A PAS DÉJÀ UTILISÉ CE CODE
    const usageCheck = await pool.query(`
      SELECT COUNT(*) as count 
      FROM discounts 
      WHERE user_id = $1 
        AND type = 'promo_code'
        AND reason ILIKE $2
    `, [userId, `%${code.trim()}%`]);

    if (parseInt(usageCheck.rows[0].count) > 0) {
      return res.status(400).json({
        valid: false,
        message: 'Vous avez déjà utilisé ce code promo'
      });
    }

    // 3. Vérifier les utilisations globales
    if (promo.max_uses && promo.current_uses >= promo.max_uses) {
      return res.status(400).json({
        valid: false,
        message: 'Ce code promo a atteint sa limite d\'utilisation'
      });
    }

    // 4. Vérifier les conditions (plan, unités min, etc.)
    const userSub = await pool.query(`
      SELECT s.total_units, p.code as plan_code
      FROM subscriptions s
      JOIN plans p ON s.plan_id = p.id
      WHERE s.user_id = $1
    `, [userId]);

    if (userSub.rows.length === 0) {
      return res.status(400).json({
        valid: false,
        message: 'Aucun abonnement actif trouvé'
      });
    }

    const sub = userSub.rows[0];

    // Vérifier plan applicable
    if (promo.applicable_plans && promo.applicable_plans.length > 0) {
      const applicablePlans = Array.isArray(promo.applicable_plans) 
        ? promo.applicable_plans 
        : JSON.parse(promo.applicable_plans);
      
      if (!applicablePlans.includes(sub.plan_code)) {
        return res.status(400).json({
          valid: false,
          message: 'Ce code promo n\'est pas applicable à votre plan actuel'
        });
      }
    }

    // Vérifier minimum d'unités
    if (promo.min_purchase_amount && sub.total_units < promo.min_purchase_amount) {
      return res.status(400).json({
        valid: false,
        message: `Ce code nécessite un minimum de ${promo.min_purchase_amount} unités`
      });
    }

    // ✅ CODE VALIDE
    res.json({
      valid: true,
      promo: {
        code: promo.code,
        description: promo.description,
        discount_type: promo.discount_type,
        discount_value: promo.discount_value,
        is_dual_benefit: promo.is_dual_benefit || false
      },
      message: getRewardMessage(promo)
    });

  } catch (error) {
    console.error('Error validating promo code:', error);
    res.status(500).json({ 
      valid: false,
      message: 'Erreur serveur lors de la validation' 
    });
  }
}

// ═══════════════════════════════════════════════════════════
// APPLIQUER UN CODE PROMO
// ═══════════════════════════════════════════════════════════

export async function applyPromoCode(req, res) {
  const { code } = req.body;
  const userId = req.user.id;

  try {
    // 1. Récupérer le code promo
    const promoResult = await pool.query(`
      SELECT * FROM promo_codes 
      WHERE UPPER(code) = UPPER($1) 
        AND is_active = true
        AND (valid_from IS NULL OR valid_from <= CURRENT_DATE)
        AND (valid_until IS NULL OR valid_until >= CURRENT_DATE)
    `, [code.trim()]);

    if (promoResult.rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Code promo invalide'
      });
    }

    const promo = promoResult.rows[0];

    // 2. Vérifier à nouveau que l'user n'a pas déjà utilisé ce code
    const usageCheck = await pool.query(`
      SELECT COUNT(*) as count 
      FROM discounts 
      WHERE user_id = $1 
        AND type = 'promo_code'
        AND reason ILIKE $2
    `, [userId, `%${code.trim()}%`]);

    if (parseInt(usageCheck.rows[0].count) > 0) {
      return res.status(400).json({
        success: false,
        message: 'Code déjà utilisé'
      });
    }

    // 3. Calculer la date d'expiration
    let expiresAt = null;
    if (promo.discount_type === 'free_months') {
      // Les mois gratuits expirent après 1 an
      expiresAt = new Date();
      expiresAt.setFullYear(expiresAt.getFullYear() + 1);
    } else if (promo.valid_until) {
      expiresAt = promo.valid_until;
    }

    // 4. Créer le discount pour l'utilisateur
    const discountResult = await pool.query(`
      INSERT INTO discounts (
        user_id, 
        type, 
        percentage, 
        reason, 
        valid_months,
        expires_at
      )
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [
      userId,
      'promo_code',
      promo.discount_type === 'percentage' ? promo.discount_value : 0,
      `Code promo ${promo.code}${promo.description ? ` - ${promo.description}` : ''}`,
      promo.discount_type === 'free_months' ? promo.discount_value : 12,
      expiresAt
    ]);

    // 5. Si dual_benefit, créer aussi un discount pour le créateur
    if (promo.is_dual_benefit && promo.created_by) {
      const referrerValue = promo.discount_type === 'free_months' 
        ? Math.floor(promo.discount_value * 0.66) // 66% pour le parrain
        : promo.discount_value;

      await pool.query(`
        INSERT INTO discounts (
          user_id, 
          type, 
          percentage, 
          reason, 
          valid_months,
          expires_at
        )
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [
        promo.created_by,
        'referral_bonus',
        promo.discount_type === 'percentage' ? referrerValue : 0,
        `Bonus parrainage - Code ${promo.code}`,
        promo.discount_type === 'free_months' ? referrerValue : 12,
        expiresAt
      ]);
    }

    // 6. Incrémenter le compteur d'utilisations
    await pool.query(`
      UPDATE promo_codes 
      SET current_uses = current_uses + 1,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `, [promo.id]);

    res.json({
      success: true,
      message: getRewardMessage(promo),
      discount: discountResult.rows[0]
    });

  } catch (error) {
    console.error('Error applying promo code:', error);
    res.status(500).json({ 
      success: false,
      message: 'Erreur lors de l\'application du code' 
    });
  }
}

// ═══════════════════════════════════════════════════════════
// RÉCUPÉRER LES PROMOS ACTIVES DE L'UTILISATEUR
// ═══════════════════════════════════════════════════════════

export async function getMyActivePromos(req, res) {
  const userId = req.user.id;

  try {
    const result = await pool.query(`
      SELECT 
        d.type,
        d.percentage,
        d.reason,
        d.expires_at,
        d.valid_months,
        CASE 
          WHEN d.type = 'promo_code' THEN 
            CASE 
              WHEN d.valid_months > 0 THEN 'free_months'
              WHEN d.percentage > 0 THEN 'percentage'
              ELSE 'unknown'
            END
          ELSE 'referral'
        END as reward_type,
        CASE 
          WHEN d.type = 'promo_code' AND d.valid_months > 0 THEN d.valid_months
          WHEN d.type = 'promo_code' AND d.percentage > 0 THEN d.percentage
          ELSE d.percentage
        END as value,
        CASE 
          WHEN d.type = 'promo_code' THEN 
            SUBSTRING(d.reason FROM 'Code promo ([A-Z0-9]+)')
          ELSE NULL
        END as code,
        CASE 
          WHEN d.type = 'referral_bonus' THEN 
            SUBSTRING(d.reason FROM 'Code ([A-Z0-9]+)')
          ELSE NULL
        END as referrer_code
      FROM discounts d
      WHERE d.user_id = $1 
        AND (d.expires_at IS NULL OR d.expires_at > CURRENT_TIMESTAMP)
      ORDER BY d.created_at DESC
    `, [userId]);

    res.json({
      success: true,
      discounts: result.rows.map(row => ({
        type: row.type,
        reward_type: row.reward_type,
        value: parseFloat(row.value) || 0,
        code: row.code,
        referrer_code: row.referrer_code,
        reason: row.reason,
        expires_at: row.expires_at
      }))
    });

  } catch (error) {
    console.error('Error fetching active promos:', error);
    res.status(500).json({ 
      success: false,
      message: 'Erreur lors de la récupération des promos' 
    });
  }
}

// ═══════════════════════════════════════════════════════════
// HELPER: Message de récompense
// ═══════════════════════════════════════════════════════════

function getRewardMessage(promo) {
  const value = promo.discount_value;
  
  switch(promo.discount_type) {
    case 'free_months':
      return `🎉 Vous bénéficiez de ${value} mois gratuits !`;
    case 'percentage':
      return `🎉 Réduction de ${value}% appliquée !`;
    case 'fixed_amount':
      return `🎉 ${value}€ de réduction appliquée !`;
    default:
      return '🎉 Code promo appliqué avec succès !';
  }
}
