// À ajouter temporairement dans un fichier route (ex: exercices.routes.js)
// SUPPRIMER APRÈS USAGE

router.post('/run-migration-appels-charges', async (req, res) => {
  try {
    const pool = (await import('../config/db.js')).default;
    
    await pool.query(`
      CREATE TABLE IF NOT EXISTS appels_charges (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        charge_recurrente_id UUID NOT NULL REFERENCES charges_recurrentes(id) ON DELETE CASCADE,
        proprietaire_id UUID NOT NULL REFERENCES proprietaires(id) ON DELETE CASCADE,
        exercice_id UUID REFERENCES exercices(id) ON DELETE SET NULL,
        periode_debut DATE NOT NULL,
        periode_fin DATE NOT NULL,
        montant_appele DECIMAL(12,2) NOT NULL DEFAULT 0,
        montant_paye DECIMAL(12,2) NOT NULL DEFAULT 0,
        date_echeance DATE,
        statut VARCHAR(20) NOT NULL DEFAULT 'en_attente',
        date_paiement TIMESTAMP WITH TIME ZONE,
        notes TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_appels_charges_charge ON appels_charges(charge_recurrente_id);
      CREATE INDEX IF NOT EXISTS idx_appels_charges_proprio ON appels_charges(proprietaire_id);
      CREATE INDEX IF NOT EXISTS idx_appels_charges_exercice ON appels_charges(exercice_id);
      CREATE INDEX IF NOT EXISTS idx_appels_charges_periode ON appels_charges(periode_debut, periode_fin);
      CREATE INDEX IF NOT EXISTS idx_appels_charges_statut ON appels_charges(statut);
    `);

    res.json({ success: true, message: 'Table appels_charges créée avec succès' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});
export default router;