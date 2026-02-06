// Route temporaire - À SUPPRIMER après migration
router.post('/api/v1/migrate/charges-recurrentes', async (req, res) => {
  try {
    await pool.query(`
      -- Table principale des charges récurrentes
      CREATE TABLE IF NOT EXISTS charges_recurrentes (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        immeuble_id UUID NOT NULL REFERENCES immeubles(id) ON DELETE CASCADE,
        exercice_id UUID REFERENCES exercices(id) ON DELETE SET NULL,
        
        type VARCHAR(50) NOT NULL CHECK (type IN (
          'fonds_roulement',
          'fonds_reserve', 
          'charges_generales',
          'charges_speciales',
          'frais_administration'
        )),
        libelle VARCHAR(255) NOT NULL,
        description TEXT,
        
        montant_annuel DECIMAL(12,2) NOT NULL DEFAULT 0,
        frequence VARCHAR(20) NOT NULL DEFAULT 'trimestriel' CHECK (frequence IN (
          'mensuel', 'trimestriel', 'semestriel', 'annuel'
        )),
        
        cle_repartition VARCHAR(20) NOT NULL DEFAULT 'milliemes' CHECK (cle_repartition IN (
          'milliemes',
          'egalitaire',
          'custom'
        )),
        
        actif BOOLEAN DEFAULT true,
        date_debut DATE,
        date_fin DATE,
        
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      -- Exclusions pour charges spéciales (proprio non concernés)
      CREATE TABLE IF NOT EXISTS charges_recurrentes_exclusions (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        charge_id UUID NOT NULL REFERENCES charges_recurrentes(id) ON DELETE CASCADE,
        proprietaire_id UUID NOT NULL REFERENCES proprietaires(id) ON DELETE CASCADE,
        motif VARCHAR(255),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(charge_id, proprietaire_id)
      );

      -- Quote-parts custom (pour cle_repartition = 'custom')
      CREATE TABLE IF NOT EXISTS charges_recurrentes_quotesparts (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        charge_id UUID NOT NULL REFERENCES charges_recurrentes(id) ON DELETE CASCADE,
        proprietaire_id UUID NOT NULL REFERENCES proprietaires(id) ON DELETE CASCADE,
        quote_part DECIMAL(8,4) NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(charge_id, proprietaire_id)
      );

      -- Appels de charges générés
      CREATE TABLE IF NOT EXISTS appels_charges (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        charge_recurrente_id UUID NOT NULL REFERENCES charges_recurrentes(id) ON DELETE CASCADE,
        proprietaire_id UUID NOT NULL REFERENCES proprietaires(id) ON DELETE CASCADE,
        
        periode_debut DATE NOT NULL,
        periode_fin DATE NOT NULL,
        montant_appele DECIMAL(12,2) NOT NULL,
        montant_paye DECIMAL(12,2) DEFAULT 0,
        
        statut VARCHAR(20) DEFAULT 'en_attente' CHECK (statut IN (
          'en_attente', 'partiellement_paye', 'paye', 'en_retard'
        )),
        
        date_echeance DATE,
        date_paiement TIMESTAMP WITH TIME ZONE,
        reference_paiement VARCHAR(100),
        
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      -- Index pour performance
      CREATE INDEX IF NOT EXISTS idx_charges_recurrentes_immeuble ON charges_recurrentes(immeuble_id);
      CREATE INDEX IF NOT EXISTS idx_charges_recurrentes_exercice ON charges_recurrentes(exercice_id);
      CREATE INDEX IF NOT EXISTS idx_charges_recurrentes_type ON charges_recurrentes(type);
      CREATE INDEX IF NOT EXISTS idx_appels_charges_proprio ON appels_charges(proprietaire_id);
      CREATE INDEX IF NOT EXISTS idx_appels_charges_statut ON appels_charges(statut);
      CREATE INDEX IF NOT EXISTS idx_appels_charges_echeance ON appels_charges(date_echeance);
    `);

    res.json({ success: true, message: 'Migration charges_recurrentes effectuée ✅' });
  } catch (error) {
    console.error('Migration error:', error);
    res.status(500).json({ error: error.message });
  }
});