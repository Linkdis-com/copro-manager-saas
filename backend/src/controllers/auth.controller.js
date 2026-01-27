import bcrypt from 'bcrypt';
import pool from '../config/database.js';
import { generateAccessToken, generateRefreshToken } from '../utils/jwt.js';
import { validateRegistration, validateLogin } from '../utils/validators.js';


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
        'SELECT id, email, password_hash, first_name, last_name, locale, email_verified, telephone, role FROM users WHERE email = $1',
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
        telephone: user.telephone,
        emailVerified: user.email_verified,
        role: user.role || 'user'
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
  try {
    // Récupérer les informations complètes de l'utilisateur
    const result = await pool.query(
      'SELECT id, email, first_name, last_name, locale, email_verified, telephone, created_at FROM users WHERE id = $1',
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = result.rows[0];

    res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        locale: user.locale,
        telephone: user.telephone,
        emailVerified: user.email_verified,
        createdAt: user.created_at
      }
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Failed to get profile' });
  }
}

// METTRE À JOUR LE PROFIL
export async function updateProfile(req, res) {
  const { firstName, lastName, telephone, locale } = req.body;

  try {
    // Construire la requête dynamiquement
    const updates = [];
    const values = [];
    let paramCount = 1;

    if (firstName !== undefined) {
      updates.push(`first_name = $${paramCount}`);
      values.push(firstName);
      paramCount++;
    }

    if (lastName !== undefined) {
      updates.push(`last_name = $${paramCount}`);
      values.push(lastName);
      paramCount++;
    }

    if (telephone !== undefined) {
      updates.push(`telephone = $${paramCount}`);
      values.push(telephone);
      paramCount++;
    }

    if (locale !== undefined) {
      updates.push(`locale = $${paramCount}`);
      values.push(locale);
      paramCount++;
    }

    if (updates.length === 0) {
      return res.status(400).json({ 
        error: 'No fields to update',
        message: 'Please provide at least one field to update'
      });
    }

    // Ajouter updated_at
    updates.push(`updated_at = CURRENT_TIMESTAMP`);

    // Ajouter l'ID utilisateur
    values.push(req.user.id);

    const query = `
      UPDATE users 
      SET ${updates.join(', ')}
      WHERE id = $${paramCount}
      RETURNING id, email, first_name, last_name, locale, telephone, email_verified
    `;

    const result = await pool.query(query, values);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = result.rows[0];

    console.log(`✅ Profile updated for user: ${user.email}`);

    res.json({
      success: true,
      message: 'Profil mis à jour avec succès',
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        locale: user.locale,
        telephone: user.telephone,
        emailVerified: user.email_verified
      }
    });

  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ 
      error: 'Update failed',
      message: 'An error occurred while updating your profile'
    });
  }
}

// CHANGER LE MOT DE PASSE
export async function changePassword(req, res) {
  const { currentPassword, newPassword } = req.body;

  // Validation
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ 
      error: 'Validation failed',
      message: 'Le mot de passe actuel et le nouveau mot de passe sont requis'
    });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({ 
      error: 'Validation failed',
      message: 'Le nouveau mot de passe doit contenir au moins 6 caractères'
    });
  }

  try {
    // Récupérer le hash du mot de passe actuel
    const result = await pool.query(
      'SELECT password_hash FROM users WHERE id = $1',
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = result.rows[0];

    // Vérifier le mot de passe actuel
    const validPassword = await bcrypt.compare(currentPassword, user.password_hash);
    
    if (!validPassword) {
      return res.status(401).json({ 
        error: 'Invalid password',
        message: 'Le mot de passe actuel est incorrect'
      });
    }

    // Hasher le nouveau mot de passe
    const newPasswordHash = await bcrypt.hash(newPassword, 10);

    // Mettre à jour le mot de passe
    await pool.query(
      'UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [newPasswordHash, req.user.id]
    );

    // Optionnel: Invalider tous les refresh tokens pour forcer une reconnexion
    await pool.query(
      'DELETE FROM refresh_tokens WHERE user_id = $1',
      [req.user.id]
    );

    console.log(`✅ Password changed for user ID: ${req.user.id}`);

    res.json({
      success: true,
      message: 'Mot de passe modifié avec succès'
    });

  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ 
      error: 'Password change failed',
      message: 'Une erreur est survenue lors du changement de mot de passe'
    });
  }
}
