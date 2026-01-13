import pool from '../config/database.js';

export async function createTransactionsTables() {
  const sql = `
    -- Table: fournisseurs
    CREATE TABLE IF NOT EXISTS fournisseurs (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      immeuble_id UUID REFERENCES immeubles(id) ON DELETE CASCADE,
      nom VARCHAR(255) NOT NULL,
      type VARCHAR(50),
      email VARCHAR(255),
      telephone VARCHAR(20),
      iban VARCHAR(50),
      numero_tva VARCHAR(50),
      tags TEXT[],
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- Table: factures
    CREATE TABLE IF NOT EXISTS factures (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      immeuble_id UUID REFERENCES immeubles(id) ON DELETE CASCADE,
      fournisseur_id UUID REFERENCES fournisseurs(id) ON DELETE SET NULL,
      numero_facture VARCHAR(100),
      date_facture DATE NOT NULL,
      date_echeance DATE,
      montant_total DECIMAL(10,2) NOT NULL,
      statut VARCHAR(20) DEFAULT 'pending',
      mode_repartition VARCHAR(20) DEFAULT 'auto',
      description TEXT,
      fichier_url TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- Table: factures_repartition
    CREATE TABLE IF NOT EXISTS factures_repartition (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      facture_id UUID REFERENCES factures(id) ON DELETE CASCADE,
      proprietaire_id UUID REFERENCES proprietaires(id) ON DELETE CASCADE,
      montant DECIMAL(10,2) NOT NULL,
      pourcentage DECIMAL(5,2),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- Table: transactions
    CREATE TABLE IF NOT EXISTS transactions (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      immeuble_id UUID REFERENCES immeubles(id) ON DELETE CASCADE,
      facture_id UUID REFERENCES factures(id) ON DELETE SET NULL,
      date_transaction DATE NOT NULL,
      type VARCHAR(50) NOT NULL,
      montant DECIMAL(10,2) NOT NULL,
      description TEXT,
      reference VARCHAR(100),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- Table: transactions_proprietaires
    CREATE TABLE IF NOT EXISTS transactions_proprietaires (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      transaction_id UUID REFERENCES transactions(id) ON DELETE CASCADE,
      proprietaire_id UUID REFERENCES proprietaires(id) ON DELETE CASCADE,
      montant DECIMAL(10,2) NOT NULL,
      pourcentage DECIMAL(5,2),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- Index
    CREATE INDEX IF NOT EXISTS idx_fournisseurs_immeuble ON fournisseurs(immeuble_id);
    CREATE INDEX IF NOT EXISTS idx_fournisseurs_type ON fournisseurs(type);
    CREATE INDEX IF NOT EXISTS idx_factures_immeuble ON factures(immeuble_id);
    CREATE INDEX IF NOT EXISTS idx_factures_fournisseur ON factures(fournisseur_id);
    CREATE INDEX IF NOT EXISTS idx_factures_statut ON factures(statut);
    CREATE INDEX IF NOT EXISTS idx_factures_date ON factures(date_facture);
    CREATE INDEX IF NOT EXISTS idx_factures_repartition_facture ON factures_repartition(facture_id);
    CREATE INDEX IF NOT EXISTS idx_factures_repartition_proprietaire ON factures_repartition(proprietaire_id);
    CREATE INDEX IF NOT EXISTS idx_transactions_immeuble ON transactions(immeuble_id);
    CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date_transaction);
    CREATE INDEX IF NOT EXISTS idx_transactions_proprietaires_transaction ON transactions_proprietaires(transaction_id);
    CREATE INDEX IF NOT EXISTS idx_transactions_proprietaires_proprietaire ON transactions_proprietaires(proprietaire_id);
  `;

  try {
    await pool.query(sql);
    console.log('✅ Migration: transactions tables created successfully');
    return { success: true, message: 'Transactions tables created' };
  } catch (error) {
    console.error('❌ Migration error:', error);
    return { success: false, error: error.message };
  }
}