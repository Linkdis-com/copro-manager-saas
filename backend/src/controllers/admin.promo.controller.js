import pool from '../config/database.js';

// ═══════════════════════════════════════════════════════════
// ADMIN - CRÉER UN CODE PROMO
// ═══════════════════════════════════════════════════════════

export async function createPromoCode(req, res) {
  const {
    code,
    description,
    discount_type,
    discount_value,
    is_dual_benefit,
    reward_referrer,
    reward_referee,
    max_uses,
    usage_limit_per_user,
    requires_minimum_units,
    valid_from,
    valid_until,
    applicable_plans
  } = req.body;

  try {
    // Vérifier que le code n'existe pas déjà
    const existing = await pool.query(
      'SELECT code FROM promo_codes WHERE UPPER(code) = UPPER($1)',
      [code]
    );

    if (existing.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Ce code promo existe déjà'
      });
    }

    const result = await pool.query(`
      INSERT INTO promo_codes (
        code,
        description,
        discount_type,
        discount_value,
        is_dual_benefit,
        max_uses,
        current_uses,
        usage_limit_per_user,
        requires_minimum_units,
        valid_from,
        valid_until,
        applicable_plans,
        is_active,
        created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, 0, $7, $8, $9, $10, $11, true, $12)
      RETURNING *
    `, [
      code.toUpperCase(),
      description,
      discount_type,
      is_dual_benefit ? reward_referee : discount_value,
      is_dual_benefit || false,
      max_uses || null,
      usage_limit_per_user || 1,
      requires_minimum_units || null,
      valid_from || null,
      valid_until || null,
      applicable_plans ? JSON.stringify(applicable_plans) : null,
      req.user.id
    ]);

    res.json({
      success: true,
      message: 'Code promo créé avec succès',
      promo_code: result.rows[0]
    });

  } catch (error) {
    console.error('Error creating promo code:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la création du code promo'
    });
  }
}

// ═══════════════════════════════════════════════════════════
// ADMIN - LISTE DES CODES PROMO
// ═══════════════════════════════════════════════════════════

export async function listPromoCodes(req, res) {
  try {
    const result = await pool.query(`
      SELECT 
        pc.*,
        u.email as creator_email,
        COUNT(d.id) as total_uses
      FROM promo_codes pc
      LEFT JOIN users u ON pc.created_by = u.id
      LEFT JOIN discounts d ON d.reason ILIKE '%' || pc.code || '%'
      GROUP BY pc.id, u.email
      ORDER BY pc.created_at DESC
    `);

    res.json({
      success: true,
      promo_codes: result.rows
    });

  } catch (error) {
    console.error('Error listing promo codes:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des codes promo'
    });
  }
}

// ═══════════════════════════════════════════════════════════
// ADMIN - DÉTAIL D'UN CODE PROMO
// ═══════════════════════════════════════════════════════════

export async function getPromoCodeDetails(req, res) {
  const { id } = req.params;

  try {
    const result = await pool.query(
      'SELECT * FROM promo_codes WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Code promo non trouvé'
      });
    }

    res.json({
      success: true,
      promo_code: result.rows[0]
    });

  } catch (error) {
    console.error('Error getting promo code details:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération du code promo'
    });
  }
}

// ═══════════════════════════════════════════════════════════
// ADMIN - MODIFIER UN CODE PROMO
// ═══════════════════════════════════════════════════════════

export async function updatePromoCode(req, res) {
  const { id } = req.params;
  const {
    description,
    discount_value,
    max_uses,
    valid_from,
    valid_until,
    is_active
  } = req.body;

  try {
    const result = await pool.query(`
      UPDATE promo_codes 
      SET 
        description = COALESCE($1, description),
        discount_value = COALESCE($2, discount_value),
        max_uses = COALESCE($3, max_uses),
        valid_from = COALESCE($4, valid_from),
        valid_until = COALESCE($5, valid_until),
        is_active = COALESCE($6, is_active),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $7
      RETURNING *
    `, [
      description,
      discount_value,
      max_uses,
      valid_from,
      valid_until,
      is_active,
      id
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Code promo non trouvé'
      });
    }

    res.json({
      success: true,
      message: 'Code promo mis à jour',
      promo_code: result.rows[0]
    });

  } catch (error) {
    console.error('Error updating promo code:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la mise à jour'
    });
  }
}

// ═══════════════════════════════════════════════════════════
// ADMIN - SUPPRIMER UN CODE PROMO
// ═══════════════════════════════════════════════════════════

export async function deletePromoCode(req, res) {
  const { id } = req.params;

  try {
    // Vérifier s'il y a des utilisations
    const usageCheck = await pool.query(`
      SELECT COUNT(*) as count 
      FROM discounts 
      WHERE reason ILIKE '%' || (SELECT code FROM promo_codes WHERE id = $1) || '%'
    `, [id]);

    if (parseInt(usageCheck.rows[0].count) > 0) {
      return res.status(400).json({
        success: false,
        message: 'Impossible de supprimer un code déjà utilisé. Désactivez-le plutôt.'
      });
    }

    const result = await pool.query(
      'DELETE FROM promo_codes WHERE id = $1 RETURNING code',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Code promo non trouvé'
      });
    }

    res.json({
      success: true,
      message: `Code ${result.rows[0].code} supprimé`
    });

  } catch (error) {
    console.error('Error deleting promo code:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la suppression'
    });
  }
}

// ═══════════════════════════════════════════════════════════
// ADMIN - STATISTIQUES D'UN CODE
// ═══════════════════════════════════════════════════════════

export async function getPromoCodeStats(req, res) {
  const { id } = req.params;

  try {
    // Infos du code
    const codeResult = await pool.query(
      'SELECT * FROM promo_codes WHERE id = $1',
      [id]
    );

    if (codeResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Code promo non trouvé'
      });
    }

    const code = codeResult.rows[0];

    // Utilisateurs qui ont utilisé ce code
    const usersResult = await pool.query(`
      SELECT 
        u.email,
        u.first_name,
        u.last_name,
        d.created_at as used_at
      FROM discounts d
      JOIN users u ON d.user_id = u.id
      WHERE d.reason ILIKE '%' || $1 || '%'
      ORDER BY d.created_at DESC
    `, [code.code]);

    // Stats globales
    const stats = {
      total_uses: usersResult.rows.length,
      usage_rate: code.max_uses ? (usersResult.rows.length / code.max_uses * 100).toFixed(1) : null,
      users: usersResult.rows
    };

    res.json({
      success: true,
      code: code,
      stats: stats
    });

  } catch (error) {
    console.error('Error getting promo stats:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des stats'
    });
  }
}

// ═══════════════════════════════════════════════════════════
// ADMIN - STATISTIQUES GLOBALES
// ═══════════════════════════════════════════════════════════

export async function getGlobalStats(req, res) {
  try {
    const result = await pool.query(`
      SELECT 
        COUNT(*) FILTER (WHERE is_active = true) as active_codes,
        COUNT(*) as total_codes,
        SUM(current_uses) as total_uses,
        (
          SELECT code 
          FROM promo_codes 
          ORDER BY current_uses DESC 
          LIMIT 1
        ) as top_code,
        (
          SELECT current_uses 
          FROM promo_codes 
          ORDER BY current_uses DESC 
          LIMIT 1
        ) as top_code_uses
      FROM promo_codes
    `);

    res.json({
      success: true,
      stats: result.rows[0]
    });

  } catch (error) {
    console.error('Error getting global stats:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des stats globales'
    });
  }
}
