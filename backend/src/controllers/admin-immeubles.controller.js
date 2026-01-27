import pool from '../config/database.js';

// ============================================
// GESTION IMMEUBLES (Vue Admin)
// ============================================

/**
 * GET /api/v1/admin/immeubles
 * Liste TOUS les immeubles de TOUS les utilisateurs
 */
export async function getAllImmeubles(req, res) {
  const { page = 1, limit = 20, search = '', userId = '' } = req.query;
  const offset = (page - 1) * limit;

  try {
    let query = `
      SELECT 
        i.id, i.nom, i.adresse, i.code_postal, i.ville, i.created_at,
        u.id as user_id, u.email as user_email, u.first_name, u.last_name,
        (SELECT COUNT(*) FROM proprietaires WHERE immeuble_id = i.id) as nb_proprietaires,
        (SELECT COUNT(*) FROM locataires WHERE immeuble_id = i.id) as nb_locataires,
        (SELECT COUNT(*) FROM exercices_comptables WHERE immeuble_id = i.id) as nb_exercices,
        (SELECT COUNT(*) FROM exercices_comptables WHERE immeuble_id = i.id AND is_cloture = true) as nb_exercices_clotures
      FROM immeubles i
      JOIN users u ON i.user_id = u.id
      WHERE 1=1
    `;
    const params = [];
    let paramIndex = 1;

    if (search) {
      query += ` AND (i.nom ILIKE $${paramIndex} OR i.adresse ILIKE $${paramIndex} OR i.ville ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    if (userId) {
      query += ` AND i.user_id = $${paramIndex}`;
      params.push(userId);
      paramIndex++;
    }

    query += ` ORDER BY i.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(parseInt(limit), offset);

    const result = await pool.query(query, params);

    // Compter le total
    let countQuery = `
      SELECT COUNT(*) FROM immeubles i
      JOIN users u ON i.user_id = u.id
      WHERE 1=1
    `;
    const countParams = [];
    let countIndex = 1;

    if (search) {
      countQuery += ` AND (i.nom ILIKE $${countIndex} OR i.adresse ILIKE $${countIndex} OR i.ville ILIKE $${countIndex})`;
      countParams.push(`%${search}%`);
      countIndex++;
    }
    if (userId) {
      countQuery += ` AND i.user_id = $${countIndex}`;
      countParams.push(userId);
    }

    const countResult = await pool.query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].count);

    res.json({
      success: true,
      immeubles: result.rows,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Error getting all immeubles:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
}

/**
 * GET /api/v1/admin/immeubles/:id
 * Détail d'un immeuble avec tous ses exercices
 */
export async function getImmeubleDetail(req, res) {
  const { id } = req.params;

  try {
    // Infos immeuble
    const immeubleResult = await pool.query(`
      SELECT 
        i.*,
        u.id as user_id, u.email as user_email, u.first_name, u.last_name
      FROM immeubles i
      JOIN users u ON i.user_id = u.id
      WHERE i.id = $1
    `, [id]);

    if (immeubleResult.rows.length === 0) {
      return res.status(404).json({ error: 'Immeuble non trouvé' });
    }

    const immeuble = immeubleResult.rows[0];

    // Exercices de cet immeuble
    const exercicesResult = await pool.query(`
      SELECT 
        id, nom, date_debut, date_fin, is_cloture, date_cloture, created_at
      FROM exercices_comptables
      WHERE immeuble_id = $1
      ORDER BY date_debut DESC
    `, [id]);

    // Propriétaires
    const proprietairesResult = await pool.query(`
      SELECT id, nom, prenom, email
      FROM proprietaires
      WHERE immeuble_id = $1
      ORDER BY nom, prenom
    `, [id]);

    res.json({
      success: true,
      immeuble,
      exercices: exercicesResult.rows,
      proprietaires: proprietairesResult.rows
    });

  } catch (error) {
    console.error('Error getting immeuble detail:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
}

// ============================================
// GESTION EXERCICES COMPTABLES (Vue Admin)
// ============================================

/**
 * GET /api/v1/admin/exercices
 * Liste TOUS les exercices comptables (filtrables)
 */
export async function getAllExercices(req, res) {
  const { page = 1, limit = 20, cloture = '', immeubleId = '', userId = '' } = req.query;
  const offset = (page - 1) * limit;

  try {
    let query = `
      SELECT 
        e.id, e.nom, e.date_debut, e.date_fin, e.is_cloture, e.date_cloture, e.created_at,
        i.id as immeuble_id, i.nom as immeuble_nom, i.adresse as immeuble_adresse,
        u.id as user_id, u.email as user_email, u.first_name, u.last_name
      FROM exercices_comptables e
      JOIN immeubles i ON e.immeuble_id = i.id
      JOIN users u ON i.user_id = u.id
      WHERE 1=1
    `;
    const params = [];
    let paramIndex = 1;

    // Filtre par statut clôturé
    if (cloture === 'true') {
      query += ` AND e.is_cloture = true`;
    } else if (cloture === 'false') {
      query += ` AND e.is_cloture = false`;
    }

    if (immeubleId) {
      query += ` AND e.immeuble_id = $${paramIndex}`;
      params.push(immeubleId);
      paramIndex++;
    }

    if (userId) {
      query += ` AND i.user_id = $${paramIndex}`;
      params.push(userId);
      paramIndex++;
    }

    query += ` ORDER BY e.date_cloture DESC NULLS LAST, e.date_debut DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(parseInt(limit), offset);

    const result = await pool.query(query, params);

    // Compter le total
    let countQuery = `
      SELECT COUNT(*) 
      FROM exercices_comptables e
      JOIN immeubles i ON e.immeuble_id = i.id
      WHERE 1=1
    `;
    const countParams = [];
    let countIndex = 1;

    if (cloture === 'true') {
      countQuery += ` AND e.is_cloture = true`;
    } else if (cloture === 'false') {
      countQuery += ` AND e.is_cloture = false`;
    }

    if (immeubleId) {
      countQuery += ` AND e.immeuble_id = $${countIndex}`;
      countParams.push(immeubleId);
      countIndex++;
    }
    if (userId) {
      countQuery += ` AND i.user_id = $${countIndex}`;
      countParams.push(userId);
    }

    const countResult = await pool.query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].count);

    res.json({
      success: true,
      exercices: result.rows,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Error getting all exercices:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
}

/**
 * POST /api/v1/admin/exercices/:id/reopen
 * Rouvrir (débloquer) un exercice clôturé
 */
export async function reopenExercice(req, res) {
  const { id } = req.params;
  const { reason } = req.body;

  try {
    // Vérifier que l'exercice existe et est clôturé
    const exerciceResult = await pool.query(`
      SELECT e.*, i.nom as immeuble_nom, u.email as user_email
      FROM exercices_comptables e
      JOIN immeubles i ON e.immeuble_id = i.id
      JOIN users u ON i.user_id = u.id
      WHERE e.id = $1
    `, [id]);

    if (exerciceResult.rows.length === 0) {
      return res.status(404).json({ error: 'Exercice non trouvé' });
    }

    const exercice = exerciceResult.rows[0];

    if (!exercice.is_cloture) {
      return res.status(400).json({ error: 'Cet exercice n\'est pas clôturé' });
    }

    // Rouvrir l'exercice
    await pool.query(`
      UPDATE exercices_comptables 
      SET is_cloture = false, 
          date_cloture = NULL,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `, [id]);

    // Logger l'action admin (optionnel mais recommandé)
    try {
      await pool.query(`
        INSERT INTO admin_logs (admin_id, action, entity_type, entity_id, details, created_at)
        VALUES ($1, 'reopen_exercice', 'exercice_comptable', $2, $3, CURRENT_TIMESTAMP)
      `, [req.user.id, id, JSON.stringify({
        exercice_nom: exercice.nom,
        immeuble: exercice.immeuble_nom,
        user_email: exercice.user_email,
        reason: reason || 'Non spécifiée'
      })]);
    } catch (logError) {
      // Table admin_logs n'existe peut-être pas, on continue
      console.log('Admin logs table not available');
    }

    console.log(`✅ Exercice ${exercice.nom} rouvert par admin ${req.user.email} - Raison: ${reason || 'Non spécifiée'}`);

    res.json({
      success: true,
      message: `Exercice "${exercice.nom}" rouvert avec succès`,
      exercice: {
        id: exercice.id,
        nom: exercice.nom,
        immeuble: exercice.immeuble_nom,
        user: exercice.user_email
      }
    });

  } catch (error) {
    console.error('Error reopening exercice:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
}

/**
 * GET /api/v1/admin/stats/overview
 * Statistiques globales pour le dashboard
 */
export async function getOverviewStats(req, res) {
  try {
    // Stats générales
    const stats = await pool.query(`
      SELECT
        (SELECT COUNT(*) FROM users WHERE role != 'admin') as total_users,
        (SELECT COUNT(*) FROM immeubles) as total_immeubles,
        (SELECT COUNT(*) FROM proprietaires) as total_proprietaires,
        (SELECT COUNT(*) FROM locataires) as total_locataires,
        (SELECT COUNT(*) FROM exercices_comptables) as total_exercices,
        (SELECT COUNT(*) FROM exercices_comptables WHERE is_cloture = true) as exercices_clotures
    `);

    res.json({
      success: true,
      stats: stats.rows[0]
    });

  } catch (error) {
    console.error('Error getting overview stats:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
}
