import pool from '../config/database.js';

export async function createLocatairesTables() {
  const sql = `
    -- Table: locataires
    CREATE TABLE IF NOT EXISTS locataires (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      immeuble_id UUID REFERENCES immeubles(id) ON DELETE CASCADE,
      proprietaire_id UUID REFERENCES proprietaires(id) ON DELETE CASCADE,
      nom VARCHAR(100) NOT NULL,
      prenom VARCHAR(100),
      email VARCHAR(255),
      telephone VARCHAR(20),
      date_debut_bail DATE NOT NULL,
      date_fin_bail DATE,
      loyer_mensuel DECIMAL(10,2),
      charges_mensuelles DECIMAL(10,2),
      depot_garantie DECIMAL(10,2),
      actif BOOLEAN DEFAULT true,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- Table: decomptes_locataires
    CREATE TABLE IF NOT EXISTS decomptes_locataires (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      locataire_id UUID REFERENCES locataires(id) ON DELETE CASCADE,
      annee INTEGER NOT NULL,
      periode_debut DATE NOT NULL,
      periode_fin DATE NOT NULL,
      charges_provisionnees DECIMAL(10,2) NOT NULL,
      charges_reelles DECIMAL(10,2) NOT NULL,
      solde DECIMAL(10,2) NOT NULL,
      statut VARCHAR(20) DEFAULT 'draft',
      date_envoi DATE,
      notes TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- Table: decomptes_details (détail par catégorie de charges)
    CREATE TABLE IF NOT EXISTS decomptes_details (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      decompte_id UUID REFERENCES decomptes_locataires(id) ON DELETE CASCADE,
      categorie VARCHAR(100) NOT NULL,
      montant DECIMAL(10,2) NOT NULL,
      recuperable BOOLEAN DEFAULT true,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- Index
    CREATE INDEX IF NOT EXISTS idx_locataires_immeuble ON locataires(immeuble_id);
    CREATE INDEX IF NOT EXISTS idx_locataires_proprietaire ON locataires(proprietaire_id);
    CREATE INDEX IF NOT EXISTS idx_locataires_actif ON locataires(actif);
    CREATE INDEX IF NOT EXISTS idx_decomptes_locataire ON decomptes_locataires(locataire_id);
    CREATE INDEX IF NOT EXISTS idx_decomptes_annee ON decomptes_locataires(annee);
    CREATE INDEX IF NOT EXISTS idx_decomptes_statut ON decomptes_locataires(statut);
    CREATE INDEX IF NOT EXISTS idx_decomptes_details_decompte ON decomptes_details(decompte_id);
  `;

  try {
    await pool.query(sql);
    console.log('✅ Migration: locataires tables created successfully');
    return { success: true, message: 'Locataires tables created' };
  } catch (error) {
    console.error('❌ Migration error:', error);
    return { success: false, error: error.message };
  }
}