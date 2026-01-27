import express from 'express';
import pool from '../config/database.js';
import bcrypt from 'bcrypt';

const router = express.Router();

/**
 * POST /api/v1/migrations/setup-admin
 * Crée la colonne role et le premier utilisateur admin
 */
router.post('/setup-admin', async (req, res) => {
  try {
    console.log('🚀 Starting admin setup migration...');

    // ============================================
    // 1. AJOUTER COLONNE ROLE AUX USERS
    // ============================================
    
    await pool.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS role VARCHAR(20) DEFAULT 'user'
    `);
    console.log('✅ Column "role" added to users');

    // ============================================
    // 2. CRÉER LE PREMIER ADMIN
    // ============================================
    
    const adminEmail = 'admin@copromanager.be';
    const adminPassword = 'Admin2025!'; // À CHANGER EN PRODUCTION !
    
    // Vérifier si l'admin existe déjà
    const existingAdmin = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [adminEmail]
    );

    let adminId;
    
    if (existingAdmin.rows.length > 0) {
      // Mettre à jour le rôle de l'utilisateur existant
      await pool.query(
        "UPDATE users SET role = 'admin' WHERE email = $1",
        [adminEmail]
      );
      adminId = existingAdmin.rows[0].id;
      console.log('✅ Existing user promoted to admin');
    } else {
      // Créer un nouvel admin (sans is_verified qui n'existe pas)
      const hashedPassword = await bcrypt.hash(adminPassword, 10);
      
      const result = await pool.query(`
        INSERT INTO users (email, password_hash, first_name, last_name, role)
        VALUES ($1, $2, 'Admin', 'CoproManager', 'admin')
        RETURNING id
      `, [adminEmail, hashedPassword]);
      
      adminId = result.rows[0].id;
      console.log('✅ Admin user created');
    }

    // ============================================
    // 3. CRÉER UN ABONNEMENT ADMIN (si table existe)
    // ============================================
    
    try {
      // Vérifier si l'admin a déjà un abonnement
      const existingSub = await pool.query(
        'SELECT id FROM subscriptions WHERE user_id = $1',
        [adminId]
      );

      if (existingSub.rows.length === 0) {
        // Récupérer le plan professionnel
        const proPlan = await pool.query(
          "SELECT id FROM plans WHERE code = 'professionnel'"
        );

        if (proPlan.rows.length > 0) {
          await pool.query(`
            INSERT INTO subscriptions (user_id, plan_id, status)
            VALUES ($1, $2, 'active')
          `, [adminId, proPlan.rows[0].id]);
          console.log('✅ Admin subscription created');
        } else {
          console.log('ℹ️ No pro plan found, skipping subscription');
        }
      } else {
        console.log('ℹ️ Admin already has a subscription');
      }
    } catch (subError) {
      console.log('ℹ️ Subscriptions table may not exist yet, skipping');
    }

    // ============================================
    // 4. CRÉER INDEX SUR ROLE
    // ============================================
    
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_users_role ON users(role)
    `);
    console.log('✅ Index on role created');

    // ============================================
    // RÉSULTAT
    // ============================================

    res.json({
      success: true,
      message: 'Admin setup completed!',
      data: {
        adminEmail,
        adminPassword,
        note: '⚠️ CHANGEZ LE MOT DE PASSE APRÈS LA PREMIÈRE CONNEXION !',
        columnsAdded: ['users.role'],
        indexesCreated: ['idx_users_role']
      }
    });

  } catch (error) {
    console.error('❌ Admin setup migration error:', error);
    res.status(500).json({ 
      error: 'Admin setup failed', 
      details: error.message 
    });
  }
});

/**
 * POST /api/v1/migrations/make-admin/:email
 * Promouvoir un utilisateur existant en admin (ex: ton compte actuel)
 */
router.post('/make-admin/:email', async (req, res) => {
  const { email } = req.params;

  try {
    const result = await pool.query(
      "UPDATE users SET role = 'admin' WHERE email = $1 RETURNING id, email, first_name, last_name, role",
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }

    res.json({
      success: true,
      message: `${email} est maintenant admin`,
      user: result.rows[0]
    });

  } catch (error) {
    console.error('Error making admin:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

export default router;
