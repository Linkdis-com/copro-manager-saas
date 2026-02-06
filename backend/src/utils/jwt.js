import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = '4h'; // Access token : 15 minutes
const REFRESH_TOKEN_EXPIRES_IN = '30d'; // Refresh token : 7 jours

// Générer un access token (court, 15 min)
export function generateAccessToken(userId) {
  if (!JWT_SECRET) {
    throw new Error('JWT_SECRET is not defined');
  }
  
  return jwt.sign(
    { userId, type: 'access' }, 
    JWT_SECRET, 
    { expiresIn: JWT_EXPIRES_IN }
  );
}

// Générer un refresh token (long, 7 jours)
export function generateRefreshToken(userId) {
  if (!JWT_SECRET) {
    throw new Error('JWT_SECRET is not defined');
  }
  
  return jwt.sign(
    { userId, type: 'refresh' }, 
    JWT_SECRET, 
    { expiresIn: REFRESH_TOKEN_EXPIRES_IN }
  );
}

// Vérifier un token (access ou refresh)
export function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    console.error('Token verification error:', error.message);
    return null;
  }
}

// Décoder un token sans vérifier (pour debug)
export function decodeToken(token) {
  return jwt.decode(token);
}