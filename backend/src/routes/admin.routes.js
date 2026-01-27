import express from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { pool } from '../server.js';

const router = express.Router();

// ========================================
// ROUTES PUBLIQUES (sans auth)
// ========================================

// Route temporaire pour créer un compte admin
router.post('/create-admin', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    const existing = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );
    
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'Cet email existe déjà' });
    }
    
    const password_hash = await bcrypt.hash(password, 10);
    
    const result = await pool.query(
      `INSERT INTO users (email, password_hash, first_name, last_name, role)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, email, first_name, last_name, role`,
      [email, password_hash, 'Admin', 'System', 'admin']
    );
    
    res.json({
      success: true,
      message: 'Compte admin créé avec succès',
      admin: result.rows[0]
    });
  } catch (error) {
    console.error('Create admin error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Login admin
router.post('/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    const result = await pool.query(
      'SELECT * FROM users WHERE email = $1 AND role = $2',
      [email, 'admin']
    );
    
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Identifiants incorrects' });
    }
    
    const admin = result.rows[0];
    const validPassword = await bcrypt.compare(password, admin.password_hash);
    
    if (!validPassword) {
      return res.status(401).json({ error: 'Identifiants incorrects' });
    }
    
    const token = jwt.sign(
      { userId: admin.id, role: 'admin' },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );
    
    res.json({
      token,
      admin: {
        id: admin.id,
        email: admin.email,
        prenom: admin.first_name,
        nom: admin.last_name,
        role: admin.role
      }
    });
  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ========================================
// MIDDLEWARE ADMIN
// ========================================

const verifyAdmin = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: 'Non autorisé' });
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const result = await pool.query(
      'SELECT * FROM users WHERE id = $1 AND role = $2',
      [decoded.userId, 'admin']
    );
    
    if (result.rows.length === 0) {
      return res.status(403).json({ error: 'Accès refusé - Admin requis' });
    }
    
    req.admin = result.rows[0];
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Token invalide' });
  }
};

// ========================================
// ROUTES PROTÉGÉES (avec verifyAdmin)
// ========================================

// Vérifier token admin
router.get('/auth/verify', verifyAdmin, (req, res) => {
  res.json({
    admin: {
      id: req.admin.id,
      email: req.admin.email,
      prenom: req.admin.first_name,
      nom: req.admin.last_name,
      role: req.admin.role
    }
  });
});

// Appliquer le middleware à toutes les routes suivantes
router.use(verifyAdmin);

// Stats overview
router.get('/stats/overview', async (req, res) => {
  try {
    const stats = await pool.query(`
      SELECT 
        COUNT(DISTINCT CASE WHEN u.role = 'user' THEN u.id END) as total_users,
        COUNT(DISTINCT CASE WHEN u.role = 'user' AND u.created_at >= NOW() - INTERVAL '30 days' THEN u.id END) as new_users_this_month,
        COUNT(DISTINCT i.id) as total_immeubles,
        0 as mrr,
        0 as invoices_this_month,
        0 as unpaid_invoices
      FROM users u
      LEFT JOIN immeubles i ON i.user_id = u.id
    `);
    
    res.json({ stats: stats.rows[0] });
  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Liste des clients
router.get('/clients', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        u.id, u.email, u.first_name as prenom, u.last_name as nom, u.created_at,
        COUNT(i.id) as immeubles_count
      FROM users u
      LEFT JOIN immeubles i ON i.user_id = u.id
      WHERE u.role = 'user'
      GROUP BY u.id, u.email, u.first_name, u.last_name, u.created_at
      ORDER BY u.created_at DESC
    `);
    
    res.json({ clients: result.rows });
  } catch (error) {
    console.error('Clients error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Détails d'un client
router.get('/clients/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const user = await pool.query(
      'SELECT * FROM users WHERE id = $1 AND role = $2',
      [id, 'user']
    );
    
    if (user.rows.length === 0) {
      return res.status(404).json({ error: 'Client non trouvé' });
    }
    
    const immeubles = await pool.query(
      'SELECT * FROM immeubles WHERE user_id = $1',
      [id]
    );
    
    const subscription = await pool.query(
      'SELECT * FROM subscriptions WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1',
      [id]
    );
    
    res.json({
      client: user.rows[0],
      immeubles: immeubles.rows,
      subscription: subscription.rows[0] || null
    });
  } catch (error) {
    console.error('Client details error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Débloquer un exercice
router.post('/exercices/:id/unlock', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(
      `UPDATE exercices 
       SET statut = 'ouvert',
           date_cloture = NULL,
           cloture_par = NULL,
           notes_cloture = 'Débloqué par admin: ' || $1
       WHERE id = $2
       RETURNING *`,
      [req.admin.email, id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Exercice non trouvé' });
    }
    
    // Log l'action
    await pool.query(
      `INSERT INTO admin_logs (admin_id, action, entity_type, entity_id, details)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        req.admin.id,
        'unlock_exercice',
        'exercice',
        id,
        JSON.stringify({ exercice_id: id })
      ]
    );
    
    res.json({ 
      success: true, 
      exercice: result.rows[0] 
    });
  } catch (error) {
    console.error('Unlock exercice error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Liste des exercices clôturés
router.get('/exercices/clotures', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        e.*,
        i.nom as immeuble_nom,
        u.email as user_email
      FROM exercices e
      LEFT JOIN immeubles i ON e.immeuble_id = i.id
      LEFT JOIN users u ON i.user_id = u.id
      WHERE e.statut = 'cloture'
      ORDER BY e.date_cloture DESC
    `);
    
    res.json({ exercices: result.rows });
  } catch (error) {
    console.error('Exercices error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});
// Détails d'un client
router.get('/clients/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Récupérer les infos utilisateur
    const userResult = await pool.query(
      `SELECT 
        id, email, first_name, last_name, phone, telephone,
        created_at, last_login, 
        is_professional, company_name, vat_number,
        role
      FROM users 
      WHERE id = $1 AND role = 'user'`,
      [id]
    );
    
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'Client non trouvé' });
    }
    
    const user = userResult.rows[0];
    
    // Récupérer les immeubles
    const immeublesResult = await pool.query(
      `SELECT id, nom, adresse, ville, code_postal, nombre_appartements, created_at
       FROM immeubles 
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [id]
    );
    
    // Récupérer l'abonnement
    const subscriptionResult = await pool.query(
      `SELECT s.*, p.name as plan_name, p.price_monthly, p.price_yearly
       FROM subscriptions s
       LEFT JOIN plans p ON s.plan_id = p.id
       WHERE s.user_id = $1
       ORDER BY s.created_at DESC
       LIMIT 1`,
      [id]
    );
    
    // Récupérer les factures
    const invoicesResult = await pool.query(
      `SELECT id, amount, status, paid_at, created_at
       FROM invoices
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT 10`,
      [id]
    );
    
    res.json({
      client: {
        ...user,
        is_active: true, // À adapter selon votre logique
        immeubles_count: immeublesResult.rows.length
      },
      immeubles: immeublesResult.rows,
      subscription: subscriptionResult.rows[0] || null,
      invoices: invoicesResult.rows
    });
  } catch (error) {
    console.error('Client details error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});
// Détails d'un immeuble (admin)
router.get('/immeubles/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Immeuble
    const immeubleRes = await pool.query(
      'SELECT * FROM immeubles WHERE id = $1',
      [id]
    );
    
    if (immeubleRes.rows.length === 0) {
      return res.status(404).json({ error: 'Immeuble non trouvé' });
    }
    
    // Propriétaires - avec les VRAIES colonnes
    const proprietairesRes = await pool.query(
      `SELECT 
        id, nom, prenom, email, telephone, 
        milliemes, numero_appartement,
        date_debut, date_fin, actif
       FROM proprietaires 
       WHERE immeuble_id = $1 AND actif = true
       ORDER BY nom, prenom`,
      [id]
    );
    
    // Locataires - avec les VRAIES colonnes
    const locatairesRes = await pool.query(
      `SELECT 
        id, nom, prenom, email, telephone,
        date_debut_bail, date_fin_bail,
        loyer_mensuel, charges_mensuelles,
        nombre_habitants, actif
       FROM locataires 
       WHERE immeuble_id = $1 AND actif = true
       ORDER BY nom, prenom`,
      [id]
    );
    
    res.json({
      immeuble: immeubleRes.rows[0],
      proprietaires: proprietairesRes.rows,
      locataires: locatairesRes.rows
    });
  } catch (error) {
    console.error('Immeuble details error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Supprimer un immeuble (admin)
router.delete('/immeubles/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Log
    await pool.query(
      `INSERT INTO admin_logs (admin_id, action, entity_type, entity_id, details)
       VALUES ($1, $2, $3, $4, $5)`,
      [req.admin.id, 'delete_immeuble', 'immeuble', id, JSON.stringify({ deleted_by: req.admin.email })]
    );
    
    // Supprimer (CASCADE)
    await pool.query('DELETE FROM immeubles WHERE id = $1', [id]);
    
    res.json({ success: true, message: 'Immeuble supprimé' });
  } catch (error) {
    console.error('Delete immeuble error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});
// ========================================
// FACTURES
// ========================================

// Liste des factures
router.get('/invoices', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        i.*,
        u.email as user_email,
        CONCAT(u.first_name, ' ', u.last_name) as user_name
      FROM invoices i
      LEFT JOIN users u ON i.user_id = u.id
      ORDER BY i.created_at DESC
      LIMIT 500
    `);
    
    res.json({ invoices: result.rows });
  } catch (error) {
    console.error('Invoices error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ========================================
// EXERCICES (déjà partiellement fait)
// ========================================

// Route déjà créée précédemment - vérifier qu'elle existe
// Si elle n'existe pas, la voici :

router.get('/exercices/clotures', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        e.*,
        i.nom as immeuble_nom,
        i.ville as immeuble_ville,
        i.id as immeuble_id,
        u.email as user_email
      FROM exercices e
      LEFT JOIN immeubles i ON e.immeuble_id = i.id
      LEFT JOIN users u ON i.user_id = u.id
      WHERE e.statut = 'cloture'
      ORDER BY e.date_cloture DESC
    `);
    
    res.json({ exercices: result.rows });
  } catch (error) {
    console.error('Exercices error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Débloquer exercice (déjà créée - vérifier)
// Si elle n'existe pas :

router.post('/exercices/:id/unlock', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(
      `UPDATE exercices 
       SET statut = 'ouvert',
           date_cloture = NULL,
           cloture_par = NULL,
           notes_cloture = COALESCE(notes_cloture, '') || ' [Débloqué par admin: ' || $1 || ' le ' || NOW() || ']'
       WHERE id = $2
       RETURNING *`,
      [req.admin.email, id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Exercice non trouvé' });
    }
    
    // Log l'action
    await pool.query(
      `INSERT INTO admin_logs (admin_id, action, entity_type, entity_id, details)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        req.admin.id,
        'unlock_exercice',
        'exercice',
        id,
        JSON.stringify({ exercice_id: id, admin_email: req.admin.email })
      ]
    );
    
    res.json({ 
      success: true, 
      message: 'Exercice débloqué',
      exercice: result.rows[0] 
    });
  } catch (error) {
    console.error('Unlock exercice error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});
// Toutes les autres routes nécessitent auth admin
router.use(verifyAdmin);
// TEMPORAIRE - Debug tables (AVANT router.use(verifyAdmin))
router.get('/debug/tables', async (req, res) => {
  try {
    // Colonnes de proprietaires
    const propCols = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'proprietaires'
      ORDER BY ordinal_position
    `);
    
    // Colonnes de locataires
    const locCols = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'locataires'
      ORDER BY ordinal_position
    `);
    
    res.json({
      proprietaires: propCols.rows,
      locataires: locCols.rows
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
// Activité récente (pour le dashboard)
router.get('/activity/recent', async (req, res) => {
  try {
    // Récupérer les dernières actions des admin_logs
    const result = await pool.query(`
      SELECT 
        al.*,
        u.email as admin_email
      FROM admin_logs al
      LEFT JOIN users u ON al.admin_id = u.id
      ORDER BY al.created_at DESC
      LIMIT 10
    `);

    // Formatter pour le dashboard
    const activities = result.rows.map(log => ({
      title: getActivityTitle(log.action),
      description: getActivityDescription(log),
      created_at: log.created_at,
      admin_email: log.admin_email
    }));

    res.json({ activities });
  } catch (error) {
    console.error('Activity error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Fonctions helper pour formater l'activité
function getActivityTitle(action) {
  const titles = {
    'unlock_exercice': 'Exercice débloqué',
    'suspend_user': 'Compte suspendu',
    'activate_user': 'Compte activé',
    'delete_user': 'Compte supprimé',
    'delete_immeuble': 'Immeuble supprimé',
    'reset_password': 'Mot de passe réinitialisé'
  };
  return titles[action] || 'Action admin';
}

function getActivityDescription(log) {
  // details est déjà un objet JSONB, pas besoin de JSON.parse()
  const details = log.details || {};
  return `Par ${log.admin_email || 'Admin'} - ${log.entity_type || 'système'}`;
}
// Statistiques de revenus
router.get('/revenue/stats', async (req, res) => {
  try {
    const { period = 'year' } = req.query;
    
    // Calculer les dates selon la période
    let dateFilter = '';
    if (period === 'month') {
      dateFilter = "AND i.created_at >= DATE_TRUNC('month', CURRENT_DATE)";
    } else if (period === 'year') {
      dateFilter = "AND i.created_at >= DATE_TRUNC('year', CURRENT_DATE)";
    }
    
    // MRR actuel (revenus mensuels récurrents)
    const mrrResult = await pool.query(`
      SELECT 
        COUNT(DISTINCT s.user_id) as paying_customers,
        SUM(CASE 
          WHEN s.billing_cycle = 'monthly' THEN p.price_monthly
          WHEN s.billing_cycle = 'yearly' THEN p.price_yearly / 12
          ELSE 0
        END) as mrr
      FROM subscriptions s
      LEFT JOIN plans p ON s.plan_id = p.id
      WHERE s.status = 'active'
    `);
    
    // Total clients
    const clientsResult = await pool.query(`
      SELECT COUNT(*) as total FROM users WHERE role = 'user'
    `);
    
    // ARPU (Average Revenue Per User)
    const mrr = parseFloat(mrrResult.rows[0]?.mrr || 0);
    const paying = parseInt(mrrResult.rows[0]?.paying_customers || 0);
    const arpu = paying > 0 ? mrr / paying : 0;
    
    // Croissance MRR (comparer au mois précédent)
    const mrrGrowth = 5.2; // TODO: Calculer réellement
    
    // Revenus par mois (derniers 12 mois)
    const revenueByMonthResult = await pool.query(`
      SELECT 
        DATE_TRUNC('month', created_at) as month,
        COUNT(*) as invoices_count,
        SUM(amount) as total_revenue
      FROM invoices
      WHERE status = 'paid'
        AND created_at >= CURRENT_DATE - INTERVAL '12 months'
      GROUP BY DATE_TRUNC('month', created_at)
      ORDER BY month DESC
      LIMIT 12
    `);
    
    // Top clients
    const topClientsResult = await pool.query(`
      SELECT 
        u.id,
        u.email,
        CONCAT(u.first_name, ' ', u.last_name) as name,
        COUNT(i.id) as invoices_count,
        SUM(i.amount) as total_spent
      FROM users u
      LEFT JOIN invoices i ON i.user_id = u.id AND i.status = 'paid'
      WHERE u.role = 'user'
      GROUP BY u.id, u.email, u.first_name, u.last_name
      HAVING SUM(i.amount) > 0
      ORDER BY total_spent DESC
      LIMIT 10
    `);
    
    res.json({
      stats: {
        mrr: mrr,
        mrr_growth: mrrGrowth,
        arpu: arpu,
        paying_customers: paying,
        total_customers: parseInt(clientsResult.rows[0]?.total || 0)
      },
      revenueByMonth: revenueByMonthResult.rows.map((row, index, arr) => ({
        ...row,
        growth: index < arr.length - 1 
          ? ((parseFloat(row.total_revenue) - parseFloat(arr[index + 1].total_revenue)) / parseFloat(arr[index + 1].total_revenue) * 100).toFixed(1)
          : null
      })),
      topClients: topClientsResult.rows
    });
  } catch (error) {
    console.error('Revenue stats error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});
// ========================================
// CAMPAGNES
// ========================================

// Liste des campagnes
router.get('/campaigns', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT * FROM campaigns
      ORDER BY created_at DESC
    `);
    
    res.json({ campaigns: result.rows });
  } catch (error) {
    console.error('Campaigns error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Supprimer une campagne
router.delete('/campaigns/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    await pool.query(
      `INSERT INTO admin_logs (admin_id, action, entity_type, entity_id, details)
       VALUES ($1, $2, $3, $4, $5)`,
      [req.admin.id, 'delete_campaign', 'campaign', id, JSON.stringify({ admin_email: req.admin.email })]
    );
    
    await pool.query('DELETE FROM campaigns WHERE id = $1', [id]);
    
    res.json({ success: true, message: 'Campagne supprimée' });
  } catch (error) {
    console.error('Delete campaign error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ========================================
// CODES PROMO
// ========================================

// Liste des codes promo
router.get('/promos', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT * FROM promo_codes
      ORDER BY created_at DESC
    `);
    
    res.json({ promos: result.rows });
  } catch (error) {
    console.error('Promos error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Activer/Désactiver un code promo
router.post('/promos/:id/toggle', async (req, res) => {
  try {
    const { id } = req.params;
    const { is_active } = req.body;
    
    await pool.query(
      'UPDATE promo_codes SET is_active = $1 WHERE id = $2',
      [is_active, id]
    );
    
    await pool.query(
      `INSERT INTO admin_logs (admin_id, action, entity_type, entity_id, details)
       VALUES ($1, $2, $3, $4, $5)`,
      [req.admin.id, 'toggle_promo', 'promo_code', id, JSON.stringify({ is_active, admin_email: req.admin.email })]
    );
    
    res.json({ success: true });
  } catch (error) {
    console.error('Toggle promo error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Supprimer un code promo
router.delete('/promos/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    await pool.query(
      `INSERT INTO admin_logs (admin_id, action, entity_type, entity_id, details)
       VALUES ($1, $2, $3, $4, $5)`,
      [req.admin.id, 'delete_promo', 'promo_code', id, JSON.stringify({ admin_email: req.admin.email })]
    );
    
    await pool.query('DELETE FROM promo_codes WHERE id = $1', [id]);
    
    res.json({ success: true, message: 'Code promo supprimé' });
  } catch (error) {
    console.error('Delete promo error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});
// ========================================
// ANALYTICS
// ========================================

router.get('/analytics', async (req, res) => {
  try {
    const { range = '30d' } = req.query;
    
    // Calculer les dates
    let dateFilter = '';
    let compareDate = '';
    
    switch(range) {
      case '7d':
        dateFilter = "created_at >= CURRENT_DATE - INTERVAL '7 days'";
        compareDate = "created_at >= CURRENT_DATE - INTERVAL '14 days' AND created_at < CURRENT_DATE - INTERVAL '7 days'";
        break;
      case '30d':
        dateFilter = "created_at >= CURRENT_DATE - INTERVAL '30 days'";
        compareDate = "created_at >= CURRENT_DATE - INTERVAL '60 days' AND created_at < CURRENT_DATE - INTERVAL '30 days'";
        break;
      case '90d':
        dateFilter = "created_at >= CURRENT_DATE - INTERVAL '90 days'";
        compareDate = "created_at >= CURRENT_DATE - INTERVAL '180 days' AND created_at < CURRENT_DATE - INTERVAL '90 days'";
        break;
      case '1y':
        dateFilter = "created_at >= CURRENT_DATE - INTERVAL '1 year'";
        compareDate = "created_at >= CURRENT_DATE - INTERVAL '2 years' AND created_at < CURRENT_DATE - INTERVAL '1 year'";
        break;
      default:
        dateFilter = '1=1';
        compareDate = '1=0';
    }
    
    // Users stats
    const usersNow = await pool.query(`SELECT COUNT(*) as count FROM users WHERE role = 'user' AND ${dateFilter}`);
    const usersBefore = await pool.query(`SELECT COUNT(*) as count FROM users WHERE role = 'user' AND ${compareDate}`);
    const totalUsers = await pool.query(`SELECT COUNT(*) as count FROM users WHERE role = 'user'`);
    
    const newUsers = parseInt(usersNow.rows[0]?.count || 0);
    const previousUsers = parseInt(usersBefore.rows[0]?.count || 0);
    const usersGrowth = previousUsers > 0 ? ((newUsers - previousUsers) / previousUsers * 100) : 0;
    
    // Immeubles stats
    const immeublesNow = await pool.query(`SELECT COUNT(*) as count FROM immeubles WHERE ${dateFilter}`);
    const immeublesBefore = await pool.query(`SELECT COUNT(*) as count FROM immeubles WHERE ${compareDate}`);
    const totalImmeubles = await pool.query(`SELECT COUNT(*) as count FROM immeubles`);
    
    const newImmeubles = parseInt(immeublesNow.rows[0]?.count || 0);
    const previousImmeubles = parseInt(immeublesBefore.rows[0]?.count || 0);
    const immeublesGrowth = previousImmeubles > 0 ? ((newImmeubles - previousImmeubles) / previousImmeubles * 100) : 0;
    
    // Revenue stats
    const revenueNow = await pool.query(`
      SELECT COALESCE(SUM(amount), 0) as total 
      FROM invoices 
      WHERE status = 'paid' AND ${dateFilter}
    `);
    const revenueBefore = await pool.query(`
      SELECT COALESCE(SUM(amount), 0) as total 
      FROM invoices 
      WHERE status = 'paid' AND ${compareDate}
    `);
    
    const currentRevenue = parseFloat(revenueNow.rows[0]?.total || 0);
    const previousRevenue = parseFloat(revenueBefore.rows[0]?.total || 0);
    const revenueGrowth = previousRevenue > 0 ? ((currentRevenue - previousRevenue) / previousRevenue * 100) : 0;
    
    // MRR
    const mrrResult = await pool.query(`
      SELECT 
        COALESCE(SUM(CASE 
          WHEN s.billing_cycle = 'monthly' THEN p.price_monthly
          WHEN s.billing_cycle = 'yearly' THEN p.price_yearly / 12
          ELSE 0
        END), 0) as mrr
      FROM subscriptions s
      LEFT JOIN plans p ON s.plan_id = p.id
      WHERE s.status = 'active'
    `);
    
    // User acquisition (derniers 14 jours)
    const userAcquisition = await pool.query(`
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as count
      FROM users
      WHERE role = 'user' 
        AND created_at >= CURRENT_DATE - INTERVAL '14 days'
      GROUP BY DATE(created_at)
      ORDER BY date DESC
    `);
    
    // Revenue trend (derniers 12 mois)
    const revenueTrend = await pool.query(`
      SELECT 
        DATE_TRUNC('month', created_at) as date,
        COALESCE(SUM(amount), 0) as amount
      FROM invoices
      WHERE status = 'paid'
        AND created_at >= CURRENT_DATE - INTERVAL '12 months'
      GROUP BY DATE_TRUNC('month', created_at)
      ORDER BY date DESC
      LIMIT 12
    `);
    
    // Paid vs Free users
    const paidUsers = await pool.query(`
      SELECT COUNT(DISTINCT user_id) as count 
      FROM subscriptions 
      WHERE status = 'active'
    `);
    
    res.json({
      analytics: {
        // Growth metrics
        users_growth: usersGrowth,
        immeubles_growth: immeublesGrowth,
        revenue_growth: revenueGrowth,
        
        // Totals
        total_users: parseInt(totalUsers.rows[0]?.count || 0),
        total_immeubles: parseInt(totalImmeubles.rows[0]?.count || 0),
        total_revenue: currentRevenue,
        mrr: parseFloat(mrrResult.rows[0]?.mrr || 0),
        
        // New items
        new_users: newUsers,
        new_immeubles: newImmeubles,
        
        // Engagement
        engagement_rate: 72.5, // TODO: Calculate real engagement
        active_users: Math.floor(parseInt(totalUsers.rows[0]?.count || 0) * 0.725),
        
        // Charts data
        user_acquisition: userAcquisition.rows,
        revenue_trend: revenueTrend.rows,
        
        // Segments
        paid_users: parseInt(paidUsers.rows[0]?.count || 0),
        free_users: parseInt(totalUsers.rows[0]?.count || 0) - parseInt(paidUsers.rows[0]?.count || 0),
        
        // Usage
        daily_logins: 45, // TODO: Real data
        avg_session_time: 12, // TODO: Real data
        
        // Feature usage (mock data)
        feature_usage: {
          locataires: 85,
          comptabilite: 72,
          decomptes: 68
        }
      }
    });
  } catch (error) {
    console.error('Analytics error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});
// ========================================
// PARRAINAGES
// ========================================

// Liste des parrainages
router.get('/referrals', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        r.*,
        u.email as user_email,
        u.first_name,
        u.last_name
      FROM referrals r
      LEFT JOIN users u ON r.user_id = u.id
      ORDER BY r.successful_referrals DESC, r.created_at DESC
    `);
    
    res.json({ referrals: result.rows });
  } catch (error) {
    console.error('Referrals error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ========================================
// PARTAGES SOCIAUX
// ========================================

// Liste des demandes de partage social
router.get('/social-shares', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        ss.*,
        u.email as user_email,
        u.first_name,
        u.last_name
      FROM social_shares ss
      LEFT JOIN users u ON ss.user_id = u.id
      ORDER BY 
        CASE 
          WHEN ss.status = 'pending' THEN 0
          WHEN ss.status = 'approved' THEN 1
          ELSE 2
        END,
        ss.created_at DESC
    `);
    
    res.json({ requests: result.rows });
  } catch (error) {
    console.error('Social shares error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Approuver un partage social
router.post('/social-shares/:id/approve', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Mettre à jour le statut
    await pool.query(
      `UPDATE social_shares 
       SET status = 'approved', approved_at = NOW(), approved_by = $1 
       WHERE id = $2`,
      [req.admin.id, id]
    );
    
    // Récupérer l'utilisateur pour créer le code promo
    const shareResult = await pool.query(
      'SELECT user_id FROM social_shares WHERE id = $1',
      [id]
    );
    
    if (shareResult.rows.length > 0) {
      const userId = shareResult.rows[0].user_id;
      
      // Créer un code promo de 20% valable 1 an
      await pool.query(
        `INSERT INTO promo_codes 
         (code, discount_type, discount_value, user_id, valid_until, max_uses, is_active)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          `SOCIAL${Date.now()}`,
          'percentage',
          20,
          userId,
          new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // +1 an
          1,
          true
        ]
      );
    }
    
    // Log admin
    await pool.query(
      `INSERT INTO admin_logs (admin_id, action, entity_type, entity_id, details)
       VALUES ($1, $2, $3, $4, $5)`,
      [req.admin.id, 'approve_social_share', 'social_share', id, JSON.stringify({ admin_email: req.admin.email })]
    );
    
    res.json({ success: true, message: 'Partage approuvé et réduction de 20% créée' });
  } catch (error) {
    console.error('Approve social share error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Rejeter un partage social
router.post('/social-shares/:id/reject', async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    
    await pool.query(
      `UPDATE social_shares 
       SET status = 'rejected', rejection_reason = $1, rejected_at = NOW(), rejected_by = $2 
       WHERE id = $3`,
      [reason || null, req.admin.id, id]
    );
    
    // Log admin
    await pool.query(
      `INSERT INTO admin_logs (admin_id, action, entity_type, entity_id, details)
       VALUES ($1, $2, $3, $4, $5)`,
      [req.admin.id, 'reject_social_share', 'social_share', id, JSON.stringify({ reason, admin_email: req.admin.email })]
    );
    
    res.json({ success: true, message: 'Partage rejeté' });
  } catch (error) {
    console.error('Reject social share error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});
export default router;