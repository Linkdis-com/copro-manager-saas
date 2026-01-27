import pool from '../config/database.js';

export async function createDecompteTables() {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    // 1. Historique habitants
    await client.query(`
      CREATE TABLE IF NOT EXISTS historique_habitants (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        locataire_id UUID REFERENCES locataires(id) ON DELETE CASCADE,
        date_debut DATE NOT NULL,
        date_fin DATE,
        nombre_habitants INTEGER NOT NULL CHECK (nombre_habitants > 0),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 2. Tarifs eau
    await client.query(`
      CREATE TABLE IF NOT EXISTS tarifs_eau (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        nom VARCHAR(100) NOT NULL,
        region VARCHAR(20) NOT NULL CHECK (region IN ('wallonia', 'flanders', 'brussels')),
        fournisseur VARCHAR(50) NOT NULL,
        annee INTEGER NOT NULL,
        
        -- Wallonie
        tarif_cve_distribution DECIMAL(10,4),
        tarif_cve_assainissement DECIMAL(10,4),
        m3_gratuits_par_habitant INTEGER DEFAULT 15,
        max_habitants_gratuits INTEGER DEFAULT 5,
        
        -- Flandre
        tarif_base DECIMAL(10,4),
        tarif_confort DECIMAL(10,4),
        m3_base_fixe INTEGER,
        m3_base_par_habitant INTEGER,
        
        -- Bruxelles / Commun
        tarif_unique DECIMAL(10,4),
        contribution_fonds_eau DECIMAL(10,4),
        
        -- Commun
        redevance_fixe_annuelle DECIMAL(10,2) NOT NULL,
        redevance_par_logement BOOLEAN DEFAULT false,
        tva_pourcent DECIMAL(5,2) DEFAULT 6.00,
        
        actif BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        
        UNIQUE(fournisseur, annee)
      );
    `);

    // 3. Compteurs eau
    await client.query(`
      CREATE TABLE IF NOT EXISTS compteurs_eau (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        immeuble_id UUID REFERENCES immeubles(id) ON DELETE CASCADE,
        locataire_id UUID REFERENCES locataires(id) ON DELETE SET NULL,
        numero_compteur VARCHAR(50) NOT NULL,
        emplacement TEXT,
        actif BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 4. Décomptes
    await client.query(`
      CREATE TABLE IF NOT EXISTS decomptes (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        immeuble_id UUID REFERENCES immeubles(id) ON DELETE CASCADE,
        user_id UUID REFERENCES users(id),
        tarif_eau_id UUID REFERENCES tarifs_eau(id),
        
        annee INTEGER NOT NULL,
        periode_debut DATE NOT NULL,
        periode_fin DATE NOT NULL,
        type_comptage VARCHAR(20) CHECK (type_comptage IN ('collectif', 'divisionnaire', 'individuel')),
        
        -- Facture globale
        facture_total_ttc DECIMAL(10,2),
        facture_consommation_m3 INTEGER,
        facture_url TEXT,
        
        -- Calculs
        total_m3_gratuits INTEGER DEFAULT 0,
        total_habitants INTEGER DEFAULT 0,
        
        statut VARCHAR(20) DEFAULT 'brouillon' CHECK (statut IN ('brouillon', 'calcule', 'valide', 'cloture')),
        date_calcul TIMESTAMP,
        date_validation TIMESTAMP,
        
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        
        UNIQUE(immeuble_id, annee)
      );
    `);

    // 5. Relevés compteurs
    await client.query(`
      CREATE TABLE IF NOT EXISTS releves_compteurs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        decompte_id UUID REFERENCES decomptes(id) ON DELETE CASCADE,
        compteur_id UUID REFERENCES compteurs_eau(id) ON DELETE CASCADE,
        date_releve DATE NOT NULL,
        index_precedent INTEGER NOT NULL,
        index_actuel INTEGER NOT NULL,
        consommation INTEGER GENERATED ALWAYS AS (index_actuel - index_precedent) STORED,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        
        CHECK (index_actuel >= index_precedent)
      );
    `);

    // 6. Répartitions eau (résultat calcul)
    await client.query(`
      CREATE TABLE IF NOT EXISTS repartitions_eau (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        decompte_id UUID REFERENCES decomptes(id) ON DELETE CASCADE,
        locataire_id UUID REFERENCES locataires(id) ON DELETE CASCADE,
        proprietaire_id UUID REFERENCES proprietaires(id) ON DELETE CASCADE,
        
        -- Données calcul
        habitants INTEGER NOT NULL,
        m3_consommes INTEGER NOT NULL,
        m3_gratuits INTEGER DEFAULT 0,
        m3_factures INTEGER GENERATED ALWAYS AS (GREATEST(0, m3_consommes - m3_gratuits)) STORED,
        m3_tarif_base INTEGER DEFAULT 0,
        m3_tarif_confort INTEGER DEFAULT 0,
        
        -- Montants
        montant_eau DECIMAL(10,2) NOT NULL DEFAULT 0,
        montant_assainissement DECIMAL(10,2) NOT NULL DEFAULT 0,
        montant_redevance_fixe DECIMAL(10,2) NOT NULL DEFAULT 0,
        montant_tva DECIMAL(10,2) NOT NULL DEFAULT 0,
        montant_total_ttc DECIMAL(10,2) NOT NULL DEFAULT 0,
        
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 7. Provisions mensuelles
    await client.query(`
      CREATE TABLE IF NOT EXISTS provisions_mensuelles (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        proprietaire_id UUID REFERENCES proprietaires(id) ON DELETE CASCADE,
        mois DATE NOT NULL,
        montant_prevu DECIMAL(10,2) NOT NULL,
        montant_paye DECIMAL(10,2) DEFAULT 0,
        date_paiement DATE,
        statut VARCHAR(20) DEFAULT 'prevu' CHECK (statut IN ('prevu', 'paye', 'partiel', 'retard')),
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        
        UNIQUE(proprietaire_id, mois)
      );
    `);

    // 8. Ajouter nombre_habitants aux locataires
    await client.query(`
      ALTER TABLE locataires 
      ADD COLUMN IF NOT EXISTS nombre_habitants INTEGER DEFAULT 1 CHECK (nombre_habitants > 0);
    `);

    await client.query('COMMIT');
    console.log('✅ Tables décomptes créées avec succès');
    return { success: true };

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Erreur création tables:', error);
    throw error;
  } finally {
    client.release();
  }
}