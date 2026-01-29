import pool from '../config/database.js';
import bcrypt from 'bcryptjs';

/**
 * Mettre à jour le profil utilisateur
 * PUT /api/v1/auth/profile
 */
export async function updateProfile(req, res) {
  const userId = req.user.id;
  const { firstName, lastName, telephone, locale } = req.body;

  try {
    // Construire la requête dynamiquement
    const updates = [];
    const values = [];
    let paramIndex = 1;

    if (firstName !== undefined) {
      updates.push(`first_name = $${paramIndex++}`);
      values.push(firstName);
    }
    if (lastName !== undefined) {
      updates.push(`last_name = $${paramIndex++}`);
      values.push(lastName);
    }
    if (telephone !== undefined) {
      updates.push(`telephone = $${paramIndex++}`);
      values.push(telephone);
    }
    if (locale !== undefined) {
      updates.push(`locale = $${paramIndex++}`);
      values.push(locale);
    }

    if (updates.length === 0) {
      return res.status(400).json({ message: 'Aucune donnée à mettre à jour' });
    }

    // Ajouter updated_at
    updates.push(`updated_at = CURRENT_TIMESTAMP`);

    // Exécuter la mise à jour
    values.push(userId);
    const query = `
      UPDATE users 
      SET ${updates.join(', ')} 
      WHERE id = $${paramIndex}
      RETURNING id, email, first_name, last_name, telephone, locale
    `;

    const result = await pool.query(query, values);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }

    const user = result.rows[0];

    res.json({
      success: true,
      message: 'Profil mis à jour avec succès',
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        telephone: user.telephone || '',
        locale: user.locale
      }
    });

  } catch (error) {
    console.error('Update profile error:', error);
    
    // Gestion du cas où la colonne telephone n'existe pas
    if (error.code === '42703') {
      try {
        // Réessayer sans telephone
        const updates = [];
        const values = [];
        let paramIndex = 1;

        if (firstName !== undefined) {
          updates.push(`first_name = $${paramIndex++}`);
          values.push(firstName);
        }
        if (lastName !== undefined) {
          updates.push(`last_name = $${paramIndex++}`);
          values.push(lastName);
        }
        if (locale !== undefined) {
          updates.push(`locale = $${paramIndex++}`);
          values.push(locale);
        }

        if (updates.length === 0) {
          return res.status(400).json({ message: 'Aucune donnée à mettre à jour' });
        }

        values.push(userId);
        const query = `
          UPDATE users 
          SET ${updates.join(', ')} 
          WHERE id = $${paramIndex}
          RETURNING id, email, first_name, last_name, locale
        `;

        const result = await pool.query(query, values);
        const user = result.rows[0];

        return res.json({
          success: true,
          message: 'Profil mis à jour avec succès',
          user: {
            id: user.id,
            email: user.email,
            firstName: user.first_name,
            lastName: user.last_name,
            telephone: '',
            locale: user.locale
          }
        });
      } catch (fallbackError) {
        console.error('Fallback update error:', fallbackError);
      }
    }

    res.status(500).json({ message: 'Erreur lors de la mise à jour du profil' });
  }
}

/**
 * Changer le mot de passe
 * PUT /api/v1/auth/change-password
 */
export async function changePassword(req, res) {
  const userId = req.user.id;
  const { currentPassword, newPassword } = req.body;

  // Validation
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ message: 'Mot de passe actuel et nouveau mot de passe requis' });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({ message: 'Le nouveau mot de passe doit contenir au moins 6 caractères' });
  }

  try {
    // Récupérer le hash actuel
    const userResult = await pool.query(
      'SELECT password_hash FROM users WHERE id = $1',
      [userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }

    const user = userResult.rows[0];

    // Vérifier le mot de passe actuel
    const validPassword = await bcrypt.compare(currentPassword, user.password_hash);
    
    if (!validPassword) {
      return res.status(401).json({ message: 'Mot de passe actuel incorrect' });
    }

    // Hasher le nouveau mot de passe
    const newPasswordHash = await bcrypt.hash(newPassword, 10);

    // Mettre à jour le mot de passe
    await pool.query(
      'UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [newPasswordHash, userId]
    );

    // Invalider tous les refresh tokens (force reconnexion sur autres appareils)
    await pool.query(
      'DELETE FROM refresh_tokens WHERE user_id = $1',
      [userId]
    );

    console.log(`✅ Password changed for user ${userId}`);

    res.json({
      success: true,
      message: 'Mot de passe modifié avec succès'
    });

  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ message: 'Erreur lors du changement de mot de passe' });
  }
}
