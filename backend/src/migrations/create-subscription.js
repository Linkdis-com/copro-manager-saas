import pool from '../config/database.js';

export async function createSubscriptionForUser(userId) {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    console.log('🔍 Checking if user has a subscription...');

    // Vérifier si l'utilisateur a déjà un abonnement
    const existingSub = await client.query(
      'SELECT id, plan, status, max_units FROM subscriptions WHERE user_id = $1',
      [userId]
    );

    if (existingSub.rows.length > 0) {
      const sub = existingSub.rows[0];
      console.log('ℹ️ User already has a subscription:', sub.plan);
      
      // Si c'est un plan free, on le met à jour en premium
      if (sub.plan === 'free') {
        console.log('⬆️ Upgrading from free to premium...');
        
        const updated = await client.query(`
          UPDATE subscriptions 
          SET plan = 'premium',
              status = 'active',
              max_units = 999,
              current_period_start = CURRENT_DATE,
              current_period_end = CURRENT_DATE + INTERVAL '1 year',
              updated_at = CURRENT_TIMESTAMP
          WHERE user_id = $1
          RETURNING *
        `, [userId]);

        await client.query('COMMIT');
        
        console.log('✅ Subscription upgraded to premium');
        return { subscription: updated.rows[0], upgraded: true };
      }
      
      await client.query('COMMIT');
      return { alreadyExists: true, subscription: sub };
    }

    // Créer un nouvel abonnement premium
    console.log('📝 Creating new premium subscription...');
    
    const result = await client.query(`
      INSERT INTO subscriptions (
        user_id, 
        plan, 
        status, 
        current_units, 
        max_units,
        current_period_start,
        current_period_end,
        cancel_at_period_end,
        created_at,
        updated_at
      )
      VALUES ($1, 'premium', 'active', 0, 999, CURRENT_DATE, CURRENT_DATE + INTERVAL '1 year', false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING *
    `, [userId]);

    await client.query('COMMIT');
    
    console.log('✅ Premium subscription created for user:', userId);
    return { subscription: result.rows[0], created: true };

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error creating subscription:', error);
    throw error;
  } finally {
    client.release();
  }
}