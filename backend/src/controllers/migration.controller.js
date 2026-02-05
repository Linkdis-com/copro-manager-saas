import pool from '../config/database.js';

// ═══════════════════════════════════════════════════════════
// ENDPOINT TEMPORAIRE DE MIGRATION - À SUPPRIMER APRÈS USAGE
// ═══════════════════════════════════════════════════════════

export async function migratePromoCodesSchema(req, res) {
  try {
    console.log('🚀 Starting promo_codes migration...');

    // 1. Ajouter les colonnes manquantes
    await pool.query(`
      ALTER TABLE promo_codes 
      ADD COLUMN IF NOT EXISTS is_dual_benefit BOOLEAN DEFAULT false,
      ADD COLUMN IF NOT EXISTS usage_limit_per_user INTEGER DEFAULT 1,
      ADD COLUMN IF NOT EXISTS requires_minimum_units INTEGER;
    `);
    console.log('✅ Colonnes ajoutées');

    // 2. Créer index pour optimiser les recherches de codes
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_promo_codes_code_upper 
      ON promo_codes (UPPER(code));
    `);
    console.log('✅ Index code créé');

    // 3. Créer index sur les codes actifs
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_promo_codes_active 
      ON promo_codes (is_active, valid_from, valid_until) 
      WHERE is_active = true;
    `);
    console.log('✅ Index actifs créé');

    // 4. Ajouter contrainte pour s'assurer que current_uses <= max_uses
    await pool.query(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'check_uses_limit'
        ) THEN
          ALTER TABLE promo_codes 
          ADD CONSTRAINT check_uses_limit 
          CHECK (max_uses IS NULL OR current_uses <= max_uses);
        END IF;
      END $$;
    `);
    console.log('✅ Contrainte check_uses_limit ajoutée');

    // 5. Enrichir la table discounts pour tracker les codes promo utilisés
    await pool.query(`
      ALTER TABLE discounts 
      ADD COLUMN IF NOT EXISTS promo_code_used VARCHAR(50);
    `);
    console.log('✅ Colonne promo_code_used ajoutée à discounts');

    // 6. Créer index pour recherche rapide des discounts par user + code
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_discounts_user_promo 
      ON discounts (user_id, type, reason) 
      WHERE type = 'promo_code';
    `);
    console.log('✅ Index discounts créé');

    // 7. Vérification finale
    const result = await pool.query(`
      SELECT 
        column_name, 
        data_type, 
        column_default, 
        is_nullable
      FROM information_schema.columns
      WHERE table_name = 'promo_codes'
      ORDER BY ordinal_position;
    `);

    res.json({
      success: true,
      message: '🎉 Migration promo_codes terminée avec succès !',
      columns_after_migration: result.rows,
      steps_completed: [
        'Colonnes ajoutées (is_dual_benefit, usage_limit_per_user, requires_minimum_units)',
        'Index de performance créés',
        'Contrainte check_uses_limit ajoutée',
        'Table discounts enrichie',
        'Index discounts créé'
      ]
    });

  } catch (error) {
    console.error('❌ Erreur migration:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      hint: 'Vérifiez les logs backend pour plus de détails'
    });
  }
}

// ═══════════════════════════════════════════════════════════
// ENDPOINT DE TEST - CRÉER UN CODE PROMO DE TEST
// ═══════════════════════════════════════════════════════════

export async function createTestPromoCode(req, res) {
  try {
    const result = await pool.query(`
      INSERT INTO promo_codes (
        code, description, discount_type, discount_value,
        max_uses, current_uses, valid_from, valid_until,
        is_active, is_dual_benefit, usage_limit_per_user
      ) VALUES (
        'WELCOME2025',
        'Code de bienvenue - 3 mois gratuits',
        'free_months',
        3,
        100,
        0,
        CURRENT_DATE,
        CURRENT_DATE + INTERVAL '6 months',
        true,
        false,
        1
      )
      ON CONFLICT (code) DO NOTHING
      RETURNING *;
    `);

    if (result.rows.length > 0) {
      res.json({
        success: true,
        message: '✅ Code promo de test créé avec succès !',
        promo_code: result.rows[0]
      });
    } else {
      res.json({
        success: true,
        message: '✅ Code WELCOME2025 existe déjà',
        note: 'Vous pouvez l\'utiliser directement'
      });
    }

  } catch (error) {
    console.error('❌ Erreur création code test:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

// ═══════════════════════════════════════════════════════════
// ENDPOINT DE TEST - VÉRIFIER QUE LA MIGRATION A FONCTIONNÉ
// ═══════════════════════════════════════════════════════════

export async function verifyPromoMigration(req, res) {
  try {
    // Vérifier les colonnes de promo_codes
    const columns = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns
      WHERE table_name = 'promo_codes'
      ORDER BY ordinal_position;
    `);

    // Vérifier les index
    const indexes = await pool.query(`
      SELECT indexname, indexdef
      FROM pg_indexes
      WHERE tablename = 'promo_codes'
      ORDER BY indexname;
    `);

    // Vérifier les contraintes
    const constraints = await pool.query(`
      SELECT conname, pg_get_constraintdef(oid) as definition
      FROM pg_constraint
      WHERE conrelid = 'promo_codes'::regclass;
    `);

    res.json({
      success: true,
      message: '✅ Vérification de la migration',
      columns: columns.rows,
      indexes: indexes.rows,
      constraints: constraints.rows,
      required_columns: {
        is_dual_benefit: columns.rows.some(c => c.column_name === 'is_dual_benefit'),
        usage_limit_per_user: columns.rows.some(c => c.column_name === 'usage_limit_per_user'),
        requires_minimum_units: columns.rows.some(c => c.column_name === 'requires_minimum_units')
      }
    });

  } catch (error) {
    console.error('❌ Erreur vérification:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}
