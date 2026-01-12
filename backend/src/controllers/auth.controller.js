import bcrypt from 'bcrypt';
import pg from 'pg';
import { generateAccessToken, generateRefreshToken } from '../utils/jwt.js';
import { validateRegistration, validateLogin } from '../utils/validators.js';

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? {
    rejectUnauthorized: false
  } : false
});

// INSCRIPTION (Register)
export async function register(req, res) {
  const { email, password, firstName, lastName, locale = 'fr' } = req.body;

  // Validation des données
  const validation = validateRegistration({ email, password, firstName, lastName, locale });
  if (!validation.valid) {
    return res.status(400).json({ 
      error: 'Validation failed', 
      errors: validation.errors 
    });
  }

  try {
    // Vérifier si l'email existe déjà
    const existingUser = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [email.toLowerCase()]
    );

    if (existingUser.rows.length > 0) {
      return res.status(400).json({ 
        error: 'Email already exists',
        message: 'This email is already registered. Please login instead.'
      });
    }

    // Hasher le mot de passe (10 rounds de bcrypt)
    const passwordHash = await bcrypt.hash(password, 10);

    // Insérer l'utilisateur dans la base de données
    const result = await pool.query(
      `INSERT INTO users (
        email, password_hash, first_name, last_name, locale
      ) VALUES ($1, $2, $3, $4, $5)
      RETURNING id, email, first_name, last_name, locale, created_at`,
      [email.toLowerCase(), passwordHash, firstName, lastName, locale]
    );

    const user = result.rows[0];

    console.log(`✅ New user registered: ${email}`);

    // Réponse (sans les tokens pour l'instant - on pourrait demander de vérifier l'email d'abord)
    res.status(201).json({
      success: true,
      message: 'Registration successful! You can now login.',
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        locale: user.locale,
        createdAt: user.created_at
      }
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ 
      error: 'Registration failed',
      message: 'An error occurred during registration. Please try again.'
    });
  }
}

// CONNEXION (Login)
export async function login(req, res) {
  const { email, password } = req.body;

  // Validation des données
  const validation = validateLogin({ email, password });
  if (!validation.valid) {
    return res.status(400).json({ 
      error: 'Validation failed', 
      errors: validation.errors 
    });
  }

  try {
    // Chercher l'utilisateur dans la base de données
    const result = await pool.query(
      'SELECT id, email, password_hash, first_name, last_name, locale, email_verified FROM users WHERE email = $1',
      [email.toLowerCase()]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ 
        error: 'Invalid credentials',
        message: 'Email or password is incorrect'
      });
    }

    const user = result.rows[0];

    // Vérifier le mot de passe
    const validPassword = await bcrypt.compare(password, user.password_hash);
    
    if (!validPassword) {
      return res.status(401).json({ 
        error: 'Invalid credentials',
        message: 'Email or password is incorrect'
      });
    }

    // Générer les tokens
    const accessToken = generateAccessToken(user.id);
    const refreshToken = generateRefreshToken(user.id);

    // Stocker le refresh token dans la base de données
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 jours
    await pool.query(
      'INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)',
      [user.id, refreshToken, expiresAt]
    );

    // Mettre à jour last_login
    await pool.query(
      'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1',
      [user.id]
    );

    console.log(`✅ User logged in: ${email}`);

    // Réponse avec les tokens
    res.json({
      success: true,
      message: 'Login successful',
      accessToken,
      refreshToken,
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
    console.error('Login error:', error);
    res.status(500).json({ 
      error: 'Login failed',
      message: 'An error occurred during login. Please try again.'
    });
  }
}

// RÉCUPÉRER LE PROFIL (route protégée)
export async function getProfile(req, res) {
  // req.user est défini par le middleware authenticate
  res.json({
    success: true,
    user: {
      id: req.user.id,
      email: req.user.email,
      firstName: req.user.first_name,
      lastName: req.user.last_name,
      locale: req.user.locale,
      emailVerified: req.user.email_verified
    }
  });
}