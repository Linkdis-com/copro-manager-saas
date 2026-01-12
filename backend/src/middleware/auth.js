import { verifyToken } from '../utils/jwt.js';
import pool from '../config/database.js';

// Middleware pour vérifier l'authentification
export async function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ 
      error: 'No token provided',
      message: 'Please provide a valid authorization token'
    });
  }

  const token = authHeader.split(' ')[1];
  const decoded = verifyToken(token);

  if (!decoded) {
    return res.status(401).json({ 
      error: 'Invalid or expired token',
      message: 'Please login again'
    });
  }

  if (decoded.type !== 'access') {
    return res.status(401).json({ 
      error: 'Invalid token type',
      message: 'Please use an access token'
    });
  }

  try {
    const result = await pool.query(
      'SELECT id, email, first_name, last_name, locale, email_verified FROM users WHERE id = $1',
      [decoded.userId]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ 
        error: 'User not found',
        message: 'This user no longer exists'
      });
    }

    req.user = result.rows[0];
    next();
  } catch (error) {
    console.error('❌ Authentication error:', error);
    res.status(500).json({ 
      error: 'Authentication error',
      message: 'Internal server error'
    });
  }
}

// Middleware optionnel : vérifier que l'email est vérifié
export function requireEmailVerified(req, res, next) {
  if (!req.user.email_verified) {
    return res.status(403).json({ 
      error: 'Email not verified',
      message: 'Please verify your email before accessing this resource'
    });
  }
  next();
}