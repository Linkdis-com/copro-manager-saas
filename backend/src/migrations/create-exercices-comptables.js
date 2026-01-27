import pool from '../config/database.js';

/**
 * Migration: Création des tables pour la gestion des exercices comptables
 * et le Report À Nouveau (RAN)
 * 
 * Conforme à la loi belge du 6 mai 2010 sur les copropriétés
 */
export async function createExercicesComptables() {
  const migrations = [];

  try {
    console.log('🔧 Starting exercices comptables migration...');

    // ============================================
    // TABLE 1: EXERCICES COMPTABLES
    // ============================================
    await pool.query(`
      CREATE TABLE IF NOT EXISTS exercices (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        immeuble_id UUID NOT NULL REFERENCES immeubles(id) ON DELETE CASCADE,
        
        -- Période
        annee INTEGER NOT NULL,
        date_debut DATE NOT NULL,
        date_fin DATE NOT NULL,
        
        -- Statut: brouillon, ouvert, cloture, archive
        statut VARCHAR(20) NOT NULL DEFAULT 'brouillon',
        
        -- Budget prévisionnel
        budget_previsionnel DECIMAL(12,2) DEFAULT 0,
        budget_fonds_reserve DECIMAL(12,2) DEFAULT 0,
        
        -- Clôture
        date_cloture TIMESTAMP,
        cloture_par UUID REFERENCES users(id),
        notes_cloture TEXT,
        
        -- AG validation
        date_ag_approbation DATE,
        pv_ag_reference VARCHAR(100),
        
        -- Metadata
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        
        -- Contraintes
        UNIQUE(immeuble_id, annee),
        CHECK (date_fin > date_debut),
        CHECK (statut IN ('brouillon', 'ouvert', 'cloture', 'archive'))
      );
    `);
    migrations.push('✅ Table exercices créée');
    console.log('✅ Table exercices créée');

    // Index pour exercices
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_exercices_immeuble ON exercices(immeuble_id);
      CREATE INDEX IF NOT EXISTS idx_exercices_annee ON exercices(annee);
      CREATE INDEX IF NOT EXISTS idx_exercices_statut ON exercices(statut);
    `);
    migrations.push('✅ Index exercices créés');

    // ============================================
    // TABLE 2: SOLDES PAR EXERCICE (RAN)
    // ============================================
    await pool.query(`
      CREATE TABLE IF NOT EXISTS soldes_exercices (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        exercice_id UUID NOT NULL REFERENCES exercices(id) ON DELETE CASCADE,
        proprietaire_id UUID NOT NULL REFERENCES proprietaires(id) ON DELETE CASCADE,
        
        -- Report À Nouveau (solde début = solde fin exercice précédent)
        solde_debut DECIMAL(12,2) NOT NULL DEFAULT 0,
        
        -- Mouvements de l'exercice
        total_provisions DECIMAL(12,2) DEFAULT 0,     -- Appels de fonds payés
        total_charges DECIMAL(12,2) DEFAULT 0,        -- Quote-part des charges
        total_ajustements DECIMAL(12,2) DEFAULT 0,    -- Régularisations
        
        -- Fonds de réserve (séparé)
        cotisation_reserve DECIMAL(12,2) DEFAULT 0,
        
        -- Solde fin (calculé)
        solde_fin DECIMAL(12,2) DEFAULT 0,
        
        -- Statut de paiement
        est_a_jour BOOLEAN DEFAULT true,
        date_derniere_relance DATE,
        
        -- Metadata
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        
        -- Contrainte unicité
        UNIQUE(exercice_id, proprietaire_id)
      );
    `);
    migrations.push('✅ Table soldes_exercices créée');
    console.log('✅ Table soldes_exercices créée');

    // Index pour soldes_exercices
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_soldes_exercice ON soldes_exercices(exercice_id);
      CREATE INDEX IF NOT EXISTS idx_soldes_proprietaire ON soldes_exercices(proprietaire_id);
    `);
    migrations.push('✅ Index soldes_exercices créés');

    // ============================================
    // TABLE 3: APPELS DE FONDS
    // ============================================
    await pool.query(`
      CREATE TABLE IF NOT EXISTS appels_fonds (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        exercice_id UUID NOT NULL REFERENCES exercices(id) ON DELETE CASCADE,
        
        -- Type: provision (trimestriel), travaux, exceptionnel
        type VARCHAR(20) NOT NULL DEFAULT 'provision',
        
        -- Numéro d'appel (1-4 pour provisions trimestrielles)
        numero INTEGER NOT NULL,
        libelle VARCHAR(255) NOT NULL,
        
        -- Dates
        date_appel DATE NOT NULL,
        date_echeance DATE NOT NULL,
        
        -- Montant total
        montant_total DECIMAL(12,2) NOT NULL,
        
        -- Statut
        statut VARCHAR(20) DEFAULT 'en_attente',
        
        -- Metadata
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        
        CHECK (type IN ('provision', 'travaux', 'exceptionnel', 'reserve')),
        CHECK (statut IN ('en_attente', 'partiel', 'complet', 'annule'))
      );
    `);
    migrations.push('✅ Table appels_fonds créée');
    console.log('✅ Table appels_fonds créée');

    // ============================================
    // TABLE 4: APPELS PAR PROPRIÉTAIRE
    // ============================================
    await pool.query(`
      CREATE TABLE IF NOT EXISTS appels_proprietaires (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        appel_id UUID NOT NULL REFERENCES appels_fonds(id) ON DELETE CASCADE,
        proprietaire_id UUID NOT NULL REFERENCES proprietaires(id) ON DELETE CASCADE,
        
        -- Montants
        montant_du DECIMAL(12,2) NOT NULL,
        montant_paye DECIMAL(12,2) DEFAULT 0,
        
        -- Statut: en_attente, partiel, paye, retard
        statut VARCHAR(20) DEFAULT 'en_attente',
        
        -- Lien avec transaction de paiement
        transaction_id UUID,
        date_paiement DATE,
        
        -- Relance
        date_derniere_relance DATE,
        nombre_relances INTEGER DEFAULT 0,
        
        -- Metadata
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        
        UNIQUE(appel_id, proprietaire_id),
        CHECK (statut IN ('en_attente', 'partiel', 'paye', 'retard'))
      );
    `);
    migrations.push('✅ Table appels_proprietaires créée');
    console.log('✅ Table appels_proprietaires créée');

    // Index pour appels
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_appels_exercice ON appels_fonds(exercice_id);
      CREATE INDEX IF NOT EXISTS idx_appels_proprio_appel ON appels_proprietaires(appel_id);
      CREATE INDEX IF NOT EXISTS idx_appels_proprio_proprio ON appels_proprietaires(proprietaire_id);
      CREATE INDEX IF NOT EXISTS idx_appels_proprio_statut ON appels_proprietaires(statut);
    `);
    migrations.push('✅ Index appels créés');

    // ============================================
    // MODIFICATION: Ajouter exercice_id aux transactions
    // ============================================
    await pool.query(`
      ALTER TABLE transactions 
      ADD COLUMN IF NOT EXISTS exercice_id UUID REFERENCES exercices(id) ON DELETE SET NULL;
    `);
    migrations.push('✅ Colonne exercice_id ajoutée à transactions');
    console.log('✅ Colonne exercice_id ajoutée à transactions');

    // Index pour transactions par exercice
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_transactions_exercice ON transactions(exercice_id);
    `);
    migrations.push('✅ Index transactions_exercice créé');

    // ============================================
    // MODIFICATION: Ajouter exercice_id aux factures
    // ============================================
    await pool.query(`
      ALTER TABLE factures 
      ADD COLUMN IF NOT EXISTS exercice_id UUID REFERENCES exercices(id) ON DELETE SET NULL;
    `);
    migrations.push('✅ Colonne exercice_id ajoutée à factures');
    console.log('✅ Colonne exercice_id ajoutée à factures');

    // Index pour factures par exercice
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_factures_exercice ON factures(exercice_id);
    `);
    migrations.push('✅ Index factures_exercice créé');

    // ============================================
    // FONCTION: Calculer le solde fin automatiquement
    // ============================================
    await pool.query(`
      CREATE OR REPLACE FUNCTION calculer_solde_fin()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.solde_fin := NEW.solde_debut + NEW.total_provisions - NEW.total_charges + NEW.total_ajustements;
        NEW.updated_at := CURRENT_TIMESTAMP;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);
    migrations.push('✅ Fonction calculer_solde_fin créée');
    console.log('✅ Fonction calculer_solde_fin créée');

    // Trigger pour mise à jour automatique du solde
    await pool.query(`
      DROP TRIGGER IF EXISTS trigger_calculer_solde ON soldes_exercices;
      CREATE TRIGGER trigger_calculer_solde
        BEFORE INSERT OR UPDATE ON soldes_exercices
        FOR EACH ROW
        EXECUTE FUNCTION calculer_solde_fin();
    `);
    migrations.push('✅ Trigger calculer_solde créé');
    console.log('✅ Trigger calculer_solde créé');

    console.log('🎉 Exercices comptables migration completed!');

    return {
      success: true,
      message: 'Exercices comptables migration completed successfully',
      migrations
    };

  } catch (error) {
    console.error('❌ Migration error:', error);
    return {
      success: false,
      error: error.message,
      migrations
    };
  }
}
