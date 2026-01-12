-- ===================================
-- COPRO MANAGER - SCHEMA IMMEUBLES
-- ===================================

-- Table: subscriptions (abonnements utilisateurs)
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  plan VARCHAR(20) NOT NULL DEFAULT 'free', -- free, pro, premium
  status VARCHAR(20) NOT NULL DEFAULT 'active', -- active, cancelled, expired
  current_units INTEGER DEFAULT 0,
  max_units INTEGER, -- NULL = unlimited (premium)
  amount_annual DECIMAL(10,2),
  stripe_customer_id VARCHAR(255),
  stripe_subscription_id VARCHAR(255),
  current_period_start DATE,
  current_period_end DATE,
  cancel_at_period_end BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table: immeubles
CREATE TABLE IF NOT EXISTS immeubles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  nom VARCHAR(255) NOT NULL,
  adresse TEXT,
  code_postal VARCHAR(10),
  ville VARCHAR(100),
  pays VARCHAR(2) DEFAULT 'BE',
  nombre_appartements INTEGER NOT NULL,
  charges_mensuelles DECIMAL(10,2) DEFAULT 0,
  date_prelevement_charges INTEGER DEFAULT 5, -- Jour du mois (1-31)
  seuil_tresorerie_min DECIMAL(10,2) DEFAULT 1000,
  archived_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table: proprietaires
CREATE TABLE IF NOT EXISTS proprietaires (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  immeuble_id UUID REFERENCES immeubles(id) ON DELETE CASCADE,
  nom VARCHAR(100) NOT NULL,
  prenom VARCHAR(100),
  email VARCHAR(255),
  telephone VARCHAR(20),
  milliemes INTEGER NOT NULL,
  numero_appartement VARCHAR(20),
  date_debut DATE,
  date_fin DATE,
  actif BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_immeubles_user ON immeubles(user_id);
CREATE INDEX IF NOT EXISTS idx_immeubles_archived ON immeubles(archived_at);
CREATE INDEX IF NOT EXISTS idx_proprietaires_immeuble ON proprietaires(immeuble_id);
CREATE INDEX IF NOT EXISTS idx_proprietaires_actif ON proprietaires(actif);

-- Créer une subscription FREE par défaut pour chaque utilisateur existant
INSERT INTO subscriptions (user_id, plan, status, current_units, max_units)
SELECT id, 'free', 'active', 0, 2
FROM users
WHERE NOT EXISTS (
  SELECT 1 FROM subscriptions WHERE subscriptions.user_id = users.id
);