import pool from '../config/database.js';

// ============================================
// DASHBOARD ADMIN
// ============================================

/**
 * GET /api/v1/admin/dashboard
 * Statistiques générales pour le dashboard admin
 */
export async function getAdminDashboard(req, res) {
  try {
    // Statistiques utilisateurs
    const usersStats = await pool.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '30 days') as new_this_month,
        COUNT(*) FILTER (WHERE role = 'admin') as admins
      FROM users
    `);

    // Statistiques abonnements
    const subsStats = await pool.query(`
      SELECT 
        COUNT(*) FILTER (WHERE status = 'active') as active,
        COUNT(*) FILTER (WHERE status = 'trialing') as trialing,
        COUNT(*) FILTER (WHERE status = 'expired' OR status = 'cancelled') as expired
      FROM subscriptions
    `);

    // Statistiques par plan
    const plansStats = await pool.query(`
      SELECT p.code, p.name, COUNT(s.id) as subscribers
      FROM plans p
      LEFT JOIN subscriptions s ON s.plan_id = p.id AND s.status IN ('active', 'trialing')
      WHERE p.is_active = true
      GROUP BY p.id, p.code, p.name
      ORDER BY p.sort_order
    `);

    // Statistiques parrainages (si la table existe)
    let referralStats = { total: 0, completed: 0 };
    try {
      const refResult = await pool.query(`
        SELECT 
          COUNT(*) as total_referrals,
          COUNT(*) FILTER (WHERE status = 'completed') as completed_referrals
        FROM referrals
      `);
      referralStats = {
        total: parseInt(refResult.rows[0].total_referrals) || 0,
        completed: parseInt(refResult.rows[0].completed_referrals) || 0
      };
    } catch (e) {
      // Table n'existe pas encore
    }

    // Partages sociaux en attente (si la table existe)
    let pendingShares = 0;
    try {
      const sharesResult = await pool.query(`
        SELECT COUNT(*) as count FROM social_shares WHERE status = 'pending'
      `);
      pendingShares = parseInt(sharesResult.rows[0].count) || 0;
    } catch (e) {
      // Table n'existe pas encore
    }

    // Revenus (si la table invoices existe)
    let revenueStats = { total: 0, thisMonth: 0 };
    try {
      const revResult = await pool.query(`
        SELECT 
          COALESCE(SUM(total), 0) as total_revenue,
          COALESCE(SUM(total) FILTER (WHERE paid_at >= DATE_TRUNC('month', CURRENT_DATE)), 0) as revenue_this_month
        FROM invoices
        WHERE status = 'paid'
      `);
      revenueStats = {
        total: parseFloat(revResult.rows[0].total_revenue) || 0,
        thisMonth: parseFloat(revResult.rows[0].revenue_this_month) || 0
      };
    } catch (e) {
      // Table n'existe pas encore
    }

    res.json({
      success: true,
      dashboard: {
        users: {
          total: parseInt(usersStats.rows[0].total) || 0,
          newThisMonth: parseInt(usersStats.rows[0].new_this_month) || 0,
          admins: parseInt(usersStats.rows[0].admins) || 0
        },
        subscriptions: {
          active: parseInt(subsStats.rows[0].active) || 0,
          trialing: parseInt(subsStats.rows[0].trialing) || 0,
          expired: parseInt(subsStats.rows[0].expired) || 0
        },
        plans: plansStats.rows,
        referrals: referralStats,
        pendingSocialShares: pendingShares,
        revenue: revenueStats
      }
    });

  } catch (error) {
    console.error('Error getting admin dashboard:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
}

// ============================================
// GESTION UTILISATEURS
// ============================================

/**
 * GET /api/v1/admin/users
 * Liste tous les utilisateurs
 */
export async function getAllUsers(req, res) {
  const { page = 1, limit = 20, search = '', role = '' } = req.query;
  const offset = (page - 1) * limit;

  try {
    let query = `
      SELECT u.id, u.email, u.first_name, u.last_name, u.role, u.is_verified,
             u.company_name, u.vat_number, u.created_at,
             s.status as subscription_status, p.name as plan_name
      FROM users u
      LEFT JOIN subscriptions s ON s.user_id = u.id
      LEFT JOIN plans p ON s.plan_id = p.id
      WHERE 1=1
    `;
    const params = [];
    let paramIndex = 1;

    if (search) {
      query += ` AND (u.email ILIKE $${paramIndex} OR u.first_name ILIKE $${paramIndex} OR u.last_name ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    if (role) {
      query += ` AND u.role = $${paramIndex}`;
      params.push(role);
      paramIndex++;
    }

    query += ` ORDER BY u.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(parseInt(limit), offset);

    const result = await pool.query(query, params);

    // Compter le total
    let countQuery = 'SELECT COUNT(*) FROM users WHERE 1=1';
    const countParams = [];
    let countIndex = 1;

    if (search) {
      countQuery += ` AND (email ILIKE $${countIndex} OR first_name ILIKE $${countIndex} OR last_name ILIKE $${countIndex})`;
      countParams.push(`%${search}%`);
      countIndex++;
    }
    if (role) {
      countQuery += ` AND role = $${countIndex}`;
      countParams.push(role);
    }

    const countResult = await pool.query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].count);

    res.json({
      success: true,
      users: result.rows,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Error getting users:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
}

/**
 * PUT /api/v1/admin/users/:id/role
 * Changer le rôle d'un utilisateur
 */
export async function updateUserRole(req, res) {
  const { id } = req.params;
  const { role } = req.body;

  if (!['user', 'admin'].includes(role)) {
    return res.status(400).json({ error: 'Rôle invalide. Valeurs acceptées: user, admin' });
  }

  // Ne pas permettre de se retirer ses propres droits admin
  if (id === req.user.id && role !== 'admin') {
    return res.status(400).json({ error: 'Vous ne pouvez pas retirer vos propres droits admin' });
  }

  try {
    const result = await pool.query(
      'UPDATE users SET role = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING id, email, first_name, last_name, role',
      [role, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }

    console.log(`✅ User ${result.rows[0].email} role changed to ${role} by admin ${req.user.email}`);

    res.json({
      success: true,
      message: `Rôle mis à jour : ${role}`,
      user: result.rows[0]
    });

  } catch (error) {
    console.error('Error updating user role:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
}

// ============================================
// GESTION PARRAINAGES
// ============================================

/**
 * GET /api/v1/admin/referrals
 * Liste tous les parrainages
 */
export async function getAllReferrals(req, res) {
  const { page = 1, limit = 20 } = req.query;
  const offset = (page - 1) * limit;

  try {
    const result = await pool.query(`
      SELECT r.id, r.referral_code, r.status, r.created_at, r.completed_at,
             parrain.email as referrer_email, parrain.first_name as referrer_name,
             filleul.email as referred_email, filleul.first_name as referred_name
      FROM referrals r
      JOIN users parrain ON r.referrer_id = parrain.id
      JOIN users filleul ON r.referred_id = filleul.id
      ORDER BY r.created_at DESC
      LIMIT $1 OFFSET $2
    `, [limit, offset]);

    const countResult = await pool.query('SELECT COUNT(*) FROM referrals');

    res.json({
      success: true,
      referrals: result.rows,
      pagination: {
        total: parseInt(countResult.rows[0].count),
        page: parseInt(page),
        limit: parseInt(limit)
      }
    });

  } catch (error) {
    console.error('Error getting referrals:', error);
    // Table n'existe peut-être pas encore
    res.json({
      success: true,
      referrals: [],
      pagination: { total: 0, page: 1, limit: 20 }
    });
  }
}

// ============================================
// GESTION PARTAGES SOCIAUX
// ============================================

/**
 * GET /api/v1/admin/social-shares
 * Liste les partages sociaux (filtrable par statut)
 */
export async function getSocialShares(req, res) {
  const { status = 'pending', page = 1, limit = 20 } = req.query;
  const offset = (page - 1) * limit;

  try {
    const result = await pool.query(`
      SELECT ss.id, ss.platform, ss.status, ss.screenshot_url, 
             ss.admin_notes, ss.created_at, ss.verified_at,
             u.id as user_id, u.email, u.first_name, u.last_name
      FROM social_shares ss
      JOIN users u ON ss.user_id = u.id
      WHERE ss.status = $1
      ORDER BY ss.created_at ASC
      LIMIT $2 OFFSET $3
    `, [status, limit, offset]);

    const countResult = await pool.query(
      'SELECT COUNT(*) FROM social_shares WHERE status = $1',
      [status]
    );

    res.json({
      success: true,
      shares: result.rows,
      pagination: {
        total: parseInt(countResult.rows[0].count),
        page: parseInt(page),
        limit: parseInt(limit)
      }
    });

  } catch (error) {
    console.error('Error getting social shares:', error);
    // Table n'existe peut-être pas encore
    res.json({
      success: true,
      shares: [],
      pagination: { total: 0, page: 1, limit: 20 }
    });
  }
}

/**
 * POST /api/v1/admin/social-shares/:id/approve
 * Approuver un partage social → créer réduction 20%
 */
export async function approveSocialShare(req, res) {
  const { id } = req.params;
  const { notes } = req.body;

  try {
    // Récupérer le partage
    const shareResult = await pool.query(
      'SELECT * FROM social_shares WHERE id = $1',
      [id]
    );

    if (shareResult.rows.length === 0) {
      return res.status(404).json({ error: 'Partage non trouvé' });
    }

    const share = shareResult.rows[0];

    if (share.status !== 'pending') {
      return res.status(400).json({ error: 'Ce partage a déjà été traité' });
    }

    // Approuver le partage
    await pool.query(`
      UPDATE social_shares 
      SET status = 'approved', 
          admin_notes = $1, 
          verified_by = $2, 
          verified_at = CURRENT_TIMESTAMP
      WHERE id = $3
    `, [notes || 'Approuvé', req.user.id, id]);

    // Créer la réduction de 20% pour l'utilisateur
    await pool.query(`
      INSERT INTO discounts (user_id, type, percentage, reason, expires_at)
      VALUES ($1, 'social_share', 20, $2, CURRENT_TIMESTAMP + INTERVAL '1 year')
    `, [share.user_id, `Partage sur ${share.platform}`]);

    console.log(`✅ Social share ${id} approved, 20% discount created for user ${share.user_id}`);

    res.json({
      success: true,
      message: 'Partage approuvé ! Réduction de 20% accordée à l\'utilisateur.'
    });

  } catch (error) {
    console.error('Error approving social share:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
}

/**
 * POST /api/v1/admin/social-shares/:id/reject
 * Rejeter un partage social
 */
export async function rejectSocialShare(req, res) {
  const { id } = req.params;
  const { notes } = req.body;

  try {
    const result = await pool.query(`
      UPDATE social_shares 
      SET status = 'rejected', 
          admin_notes = $1, 
          verified_by = $2, 
          verified_at = CURRENT_TIMESTAMP
      WHERE id = $3 AND status = 'pending'
      RETURNING *
    `, [notes || 'Partage non conforme', req.user.id, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Partage non trouvé ou déjà traité' });
    }

    res.json({
      success: true,
      message: 'Partage rejeté'
    });

  } catch (error) {
    console.error('Error rejecting social share:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
}

// ============================================
// GESTION FACTURES
// ============================================

/**
 * GET /api/v1/admin/invoices
 * Liste toutes les factures
 */
export async function getAllInvoices(req, res) {
  const { status, page = 1, limit = 20 } = req.query;
  const offset = (page - 1) * limit;

  try {
    let query = `
      SELECT i.*, u.email, u.first_name, u.last_name, u.company_name
      FROM invoices i
      JOIN users u ON i.user_id = u.id
    `;
    const params = [];
    let paramIndex = 1;

    if (status) {
      query += ` WHERE i.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    query += ` ORDER BY i.invoice_date DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(parseInt(limit), offset);

    const result = await pool.query(query, params);

    // Total
    let countQuery = 'SELECT COUNT(*) FROM invoices';
    if (status) countQuery += ' WHERE status = $1';
    const countResult = await pool.query(countQuery, status ? [status] : []);

    res.json({
      success: true,
      invoices: result.rows,
      pagination: {
        total: parseInt(countResult.rows[0].count),
        page: parseInt(page),
        limit: parseInt(limit)
      }
    });

  } catch (error) {
    console.error('Error getting invoices:', error);
    res.json({
      success: true,
      invoices: [],
      pagination: { total: 0, page: 1, limit: 20 }
    });
  }
}

/**
 * GET /api/v1/admin/invoices/stats
 * Statistiques des factures
 */
export async function getInvoiceStats(req, res) {
  try {
    const result = await pool.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'pending') as pending,
        COUNT(*) FILTER (WHERE status = 'paid') as paid,
        COALESCE(SUM(total), 0) FILTER (WHERE status = 'paid') as total_revenue,
        COALESCE(SUM(total), 0) FILTER (WHERE status = 'pending') as pending_revenue
      FROM invoices
    `);

    res.json({
      success: true,
      stats: {
        total: parseInt(result.rows[0].total) || 0,
        pending: parseInt(result.rows[0].pending) || 0,
        paid: parseInt(result.rows[0].paid) || 0,
        totalRevenue: parseFloat(result.rows[0].total_revenue) || 0,
        pendingRevenue: parseFloat(result.rows[0].pending_revenue) || 0
      }
    });

  } catch (error) {
    console.error('Error getting invoice stats:', error);
    res.json({
      success: true,
      stats: { total: 0, pending: 0, paid: 0, totalRevenue: 0, pendingRevenue: 0 }
    });
  }
}
