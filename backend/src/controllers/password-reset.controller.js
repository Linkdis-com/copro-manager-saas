import pool from '../config/database.js';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { sendPasswordResetEmail, sendPasswordChangedEmail } from '../services/email.service.js';

/**
 * Demander une réinitialisation de mot de passe
 * POST /api/v1/auth/forgot-password
 */
export async function forgotPassword(req, res) {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ message: 'Email requis' });
  }

  try {
    // Vérifier si l'utilisateur existe
    const userResult = await pool.query(
      'SELECT id, email, first_name FROM users WHERE email = $1',
      [email.toLowerCase()]
    );

    // Pour des raisons de sécurité, on retourne toujours un succès
    // (pour ne pas révéler si un email existe ou non)
    if (userResult.rows.length === 0) {
      console.log(`📧 Password reset requested for unknown email: ${email}`);
      return res.json({ 
        success: true, 
        message: 'Si un compte existe avec cet email, vous recevrez un lien de réinitialisation.' 
      });
    }

    const user = userResult.rows[0];

    // Générer un token unique
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 heure

    // Supprimer les anciens tokens pour cet utilisateur
    await pool.query(
      'DELETE FROM password_reset_tokens WHERE user_id = $1',
      [user.id]
    );

    // Sauvegarder le nouveau token
    await pool.query(
      `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at) 
       VALUES ($1, $2, $3)`,
      [user.id, resetTokenHash, expiresAt]
    );

    // Envoyer l'email
    try {
      const emailResult = await sendPasswordResetEmail(user.email, resetToken, user.first_name);
      
      console.log(`📧 Password reset email sent to ${user.email}`);
      
      // En développement, retourner le lien de prévisualisation
      if (process.env.NODE_ENV !== 'production' && emailResult.previewUrl) {
        return res.json({
          success: true,
          message: 'Email de réinitialisation envoyé',
          // Uniquement en dev pour faciliter les tests
          dev: {
            previewUrl: emailResult.previewUrl,
            resetToken: resetToken // Pour tester sans email
          }
        });
      }
    } catch (emailError) {
      console.error('❌ Failed to send email:', emailError);
      // En cas d'échec d'envoi, on log mais on ne révèle pas l'erreur
    }

    res.json({ 
      success: true, 
      message: 'Si un compte existe avec cet email, vous recevrez un lien de réinitialisation.' 
    });

  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
}

/**
 * Vérifier la validité d'un token de réinitialisation
 * POST /api/v1/auth/verify-reset-token
 */
export async function verifyResetToken(req, res) {
  const { token } = req.body;

  if (!token) {
    return res.status(400).json({ valid: false, message: 'Token requis' });
  }

  try {
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const result = await pool.query(
      `SELECT prt.*, u.email 
       FROM password_reset_tokens prt
       JOIN users u ON prt.user_id = u.id
       WHERE prt.token_hash = $1 AND prt.expires_at > NOW() AND prt.used_at IS NULL`,
      [tokenHash]
    );

    if (result.rows.length === 0) {
      return res.json({ valid: false, message: 'Token invalide ou expiré' });
    }

    res.json({ valid: true });

  } catch (error) {
    console.error('Verify token error:', error);
    res.status(500).json({ valid: false, message: 'Erreur serveur' });
  }
}

/**
 * Réinitialiser le mot de passe avec un token
 * POST /api/v1/auth/reset-password
 */
export async function resetPassword(req, res) {
  const { token, password } = req.body;

  if (!token || !password) {
    return res.status(400).json({ message: 'Token et mot de passe requis' });
  }

  if (password.length < 6) {
    return res.status(400).json({ message: 'Le mot de passe doit contenir au moins 6 caractères' });
  }

  try {
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    // Trouver le token valide
    const tokenResult = await pool.query(
      `SELECT prt.*, u.email, u.first_name 
       FROM password_reset_tokens prt
       JOIN users u ON prt.user_id = u.id
       WHERE prt.token_hash = $1 AND prt.expires_at > NOW() AND prt.used_at IS NULL`,
      [tokenHash]
    );

    if (tokenResult.rows.length === 0) {
      return res.status(400).json({ message: 'Token invalide ou expiré' });
    }

    const tokenData = tokenResult.rows[0];

    // Hasher le nouveau mot de passe
    const hashedPassword = await bcrypt.hash(password, 10);

    // Mettre à jour le mot de passe
    await pool.query(
      'UPDATE users SET password_hash = $1 WHERE id = $2',
      [hashedPassword, tokenData.user_id]
    );

    // Marquer le token comme utilisé
    await pool.query(
      'UPDATE password_reset_tokens SET used_at = NOW() WHERE id = $1',
      [tokenData.id]
    );

    // Invalider tous les refresh tokens de l'utilisateur (sécurité)
    await pool.query(
      'DELETE FROM refresh_tokens WHERE user_id = $1',
      [tokenData.user_id]
    );

    // Envoyer un email de confirmation
    try {
      await sendPasswordChangedEmail(tokenData.email, tokenData.first_name);
    } catch (emailError) {
      console.error('Failed to send confirmation email:', emailError);
      // Non bloquant
    }

    console.log(`✅ Password reset successful for user ${tokenData.user_id}`);

    res.json({ 
      success: true, 
      message: 'Mot de passe réinitialisé avec succès' 
    });

  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
}
