import pool from '../config/database.js';
import { verifyToken, generateAccessToken, generateRefreshToken } from '../utils/jwt.js';

/**
 * Rafraîchir le token d'accès
 * POST /api/v1/auth/refresh-token
 */
export async function refreshToken(req, res) {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return res.status(400).json({ 
      error: 'refresh_token_required',
      message: 'Refresh token requis' 
    });
  }

  try {
    // Vérifier le refresh token
    const decoded = verifyToken(refreshToken);

    if (!decoded) {
      return res.status(401).json({ 
        error: 'invalid_refresh_token',
        message: 'Refresh token invalide ou expiré' 
      });
    }

    if (decoded.type !== 'refresh') {
      return res.status(401).json({ 
        error: 'invalid_token_type',
        message: 'Ce n\'est pas un refresh token' 
      });
    }

    // Vérifier que le token existe en base de données (pas révoqué)
    const tokenResult = await pool.query(
      'SELECT * FROM refresh_tokens WHERE token = $1 AND user_id = $2 AND expires_at > NOW()',
      [refreshToken, decoded.userId]
    );

    if (tokenResult.rows.length === 0) {
      return res.status(401).json({ 
        error: 'token_revoked',
        message: 'Ce token a été révoqué. Veuillez vous reconnecter.' 
      });
    }

    // Vérifier que l'utilisateur existe toujours
    const userResult = await pool.query(
      'SELECT id, email, first_name, last_name, locale, email_verified FROM users WHERE id = $1',
      [decoded.userId]
    );

    if (userResult.rows.length === 0) {
      // Supprimer le token orphelin
      await pool.query('DELETE FROM refresh_tokens WHERE user_id = $1', [decoded.userId]);
      return res.status(401).json({ 
        error: 'user_not_found',
        message: 'Utilisateur introuvable' 
      });
    }

    const user = userResult.rows[0];

    // Générer un nouveau access token
    const newAccessToken = generateAccessToken(user.id);

    // Option : Rotation du refresh token (plus sécurisé)
    // Supprimer l'ancien et créer un nouveau
    const newRefreshToken = generateRefreshToken(user.id);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 jours

    // Supprimer l'ancien refresh token
    await pool.query(
      'DELETE FROM refresh_tokens WHERE token = $1',
      [refreshToken]
    );

    // Créer le nouveau refresh token
    await pool.query(
      'INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)',
      [user.id, newRefreshToken, expiresAt]
    );

    console.log(`🔄 Token refreshed for user ${user.email}`);

    res.json({
      success: true,
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      expiresIn: 900, // 15 minutes en secondes
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        locale: user.locale,
        emailVerified: user.email_verified
      }
    });

  } catch (error) {
    console.error('Refresh token error:', error);
    res.status(500).json({ 
      error: 'server_error',
      message: 'Erreur serveur lors du rafraîchissement du token' 
    });
  }
}

/**
 * Déconnexion - Révoquer le refresh token
 * POST /api/v1/auth/logout
 */
export async function logout(req, res) {
  const { refreshToken } = req.body;
  const authHeader = req.headers.authorization;

  try {
    // Si un refresh token est fourni, le supprimer
    if (refreshToken) {
      await pool.query(
        'DELETE FROM refresh_tokens WHERE token = $1',
        [refreshToken]
      );
    }

    // Si un access token est fourni, récupérer le user_id pour supprimer tous ses tokens
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const accessToken = authHeader.split(' ')[1];
      const decoded = verifyToken(accessToken);
      
      if (decoded && decoded.userId) {
        // Option : Supprimer TOUS les refresh tokens de l'utilisateur (déconnexion de tous les appareils)
        // await pool.query('DELETE FROM refresh_tokens WHERE user_id = $1', [decoded.userId]);
        
        console.log(`👋 User ${decoded.userId} logged out`);
      }
    }

    res.json({
      success: true,
      message: 'Déconnexion réussie'
    });

  } catch (error) {
    console.error('Logout error:', error);
    // Même en cas d'erreur, on répond OK car le client va de toute façon supprimer ses tokens locaux
    res.json({
      success: true,
      message: 'Déconnexion effectuée'
    });
  }
}

/**
 * Déconnexion de tous les appareils
 * POST /api/v1/auth/logout-all
 */
export async function logoutAll(req, res) {
  try {
    // Supprimer tous les refresh tokens de l'utilisateur
    await pool.query(
      'DELETE FROM refresh_tokens WHERE user_id = $1',
      [req.user.id]
    );

    console.log(`👋 User ${req.user.id} logged out from all devices`);

    res.json({
      success: true,
      message: 'Déconnexion de tous les appareils réussie'
    });

  } catch (error) {
    console.error('Logout all error:', error);
    res.status(500).json({ 
      error: 'server_error',
      message: 'Erreur lors de la déconnexion' 
    });
  }
}

/**
 * Lister les sessions actives
 * GET /api/v1/auth/sessions
 */
export async function getSessions(req, res) {
  try {
    const result = await pool.query(
      `SELECT id, created_at, expires_at 
       FROM refresh_tokens 
       WHERE user_id = $1 AND expires_at > NOW()
       ORDER BY created_at DESC`,
      [req.user.id]
    );

    res.json({
      success: true,
      sessions: result.rows.map(session => ({
        id: session.id,
        createdAt: session.created_at,
        expiresAt: session.expires_at
      })),
      totalSessions: result.rows.length
    });

  } catch (error) {
    console.error('Get sessions error:', error);
    res.status(500).json({ 
      error: 'server_error',
      message: 'Erreur lors de la récupération des sessions' 
    });
  }
}

/**
 * Révoquer une session spécifique
 * DELETE /api/v1/auth/sessions/:sessionId
 */
export async function revokeSession(req, res) {
  const { sessionId } = req.params;

  try {
    const result = await pool.query(
      'DELETE FROM refresh_tokens WHERE id = $1 AND user_id = $2 RETURNING id',
      [sessionId, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ 
        error: 'session_not_found',
        message: 'Session introuvable' 
      });
    }

    res.json({
      success: true,
      message: 'Session révoquée'
    });

  } catch (error) {
    console.error('Revoke session error:', error);
    res.status(500).json({ 
      error: 'server_error',
      message: 'Erreur lors de la révocation de la session' 
    });
  }
}
