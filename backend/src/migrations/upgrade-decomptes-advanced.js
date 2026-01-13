import pool from '../config/database.js';

export async function upgradeDecomptesAdvanced() {
  const migrations = [];

  try {
    console.log('🔧 Starting advanced decomptes migration...');

    // MIGRATION 1: Enrichir la table immeubles
    await pool.query(`
      -- Ajouter les colonnes de configuration avancée
      ALTER TABLE immeubles 
      ADD COLUMN IF NOT EXISTS region VARCHAR(10) DEFAULT 'brussels',
      ADD COLUMN IF NOT EXISTS mode_comptage_eau VARCHAR(20) DEFAULT 'divisionnaire',
      ADD COLUMN IF NOT EXISTS tarif_eau_m3 DECIMAL(6,4) DEFAULT 5.8500,
      ADD COLUMN IF NOT EXISTS fournisseur_eau VARCHAR(50);
    `);
    migrations.push('✅ Table immeubles enrichie');
    console.log('✅ Table immeubles enrichie');

    // Mettre à jour les immeubles existants
    await pool.query(`
      UPDATE immeubles 
      SET region = 'brussels', 
          mode_comptage_eau = 'divisionnaire',
          tarif_eau_m3 = 5.8500,
          fournisseur_eau = 'VIVAQUA'
      WHERE region IS NULL;
    `);
    migrations.push('✅ Immeubles existants mis à jour');
    console.log('✅ Immeubles existants mis à jour');

    // MIGRATION 2: Améliorer la table decomptes_locataires
    await pool.query(`
      ALTER TABLE decomptes_locataires
      ADD COLUMN IF NOT EXISTS compteur_principal_m3 DECIMAL(10,2),
      ADD COLUMN IF NOT EXISTS compteur_individuel_m3 DECIMAL(10,2),
      ADD COLUMN IF NOT EXISTS eau_commune_m3 DECIMAL(10,2),
      ADD COLUMN IF NOT EXISTS part_eau_commune DECIMAL(10,2),
      ADD COLUMN IF NOT EXISTS tarif_applique_m3 DECIMAL(6,4);
    `);
    migrations.push('✅ Table decomptes_locataires enrichie');
    console.log('✅ Table decomptes_locataires enrichie');

    // MIGRATION 3: Améliorer la table decomptes_details
    await pool.query(`
      ALTER TABLE decomptes_details
      ADD COLUMN IF NOT EXISTS sous_details JSONB,
      ADD COLUMN IF NOT EXISTS unite VARCHAR(20),
      ADD COLUMN IF NOT EXISTS quantite DECIMAL(10,2),
      ADD COLUMN IF NOT EXISTS prix_unitaire DECIMAL(10,4);
    `);
    migrations.push('✅ Table decomptes_details enrichie');
    console.log('✅ Table decomptes_details enrichie');

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_decomptes_details_recuperable 
      ON decomptes_details(recuperable);
    `);
    migrations.push('✅ Index decomptes_details créé');

    // MIGRATION 4: Créer table categories_charges
    await pool.query(`
      CREATE TABLE IF NOT EXISTS categories_charges (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        code VARCHAR(50) UNIQUE NOT NULL,
        nom_fr VARCHAR(100) NOT NULL,
        nom_nl VARCHAR(100) NOT NULL,
        nom_en VARCHAR(100) NOT NULL,
        recuperable_par_defaut BOOLEAN DEFAULT true,
        ordre_affichage INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    migrations.push('✅ Table categories_charges créée');
    console.log('✅ Table categories_charges créée');

    // Insérer les catégories standard
    await pool.query(`
      INSERT INTO categories_charges (code, nom_fr, nom_nl, nom_en, recuperable_par_defaut, ordre_affichage) VALUES
      ('eau', 'Eau', 'Water', 'Water', true, 1),
      ('chauffage', 'Chauffage', 'Verwarming', 'Heating', true, 2),
      ('electricite', 'Électricité parties communes', 'Elektriciteit gemeenschappelijke delen', 'Common areas electricity', true, 3),
      ('gaz', 'Gaz', 'Gas', 'Gas', true, 4),
      ('ascenseur', 'Ascenseur', 'Lift', 'Elevator', true, 5),
      ('nettoyage', 'Nettoyage parties communes', 'Schoonmaak gemeenschappelijke delen', 'Common areas cleaning', true, 6),
      ('ordures', 'Enlèvement ordures', 'Vuilnisophaling', 'Waste collection', true, 7),
      ('entretien_chaudiere', 'Entretien chaudière', 'Onderhoud ketel', 'Boiler maintenance', true, 8),
      ('jardinage', 'Entretien espaces verts', 'Onderhoud groene ruimten', 'Garden maintenance', true, 9),
      ('assurance', 'Assurance copropriété', 'Verzekering mede-eigendom', 'Building insurance', false, 10),
      ('syndic', 'Honoraires syndic', 'Syndicus honoraria', 'Property manager fees', false, 11),
      ('travaux', 'Travaux exceptionnels', 'Buitengewone werken', 'Exceptional works', false, 12),
      ('autre', 'Autre', 'Andere', 'Other', true, 99)
      ON CONFLICT (code) DO NOTHING;
    `);
    migrations.push('✅ Catégories standard insérées');
    console.log('✅ Catégories standard insérées');

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_categories_charges_code 
      ON categories_charges(code);
    `);
    migrations.push('✅ Index categories_charges créé');

    // MIGRATION 5: Créer table tarifs_regionaux
    await pool.query(`
      CREATE TABLE IF NOT EXISTS tarifs_regionaux (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        region VARCHAR(10) NOT NULL,
        fournisseur VARCHAR(50) NOT NULL,
        tarif_base_m3 DECIMAL(6,4),
        tarif_confort_m3 DECIMAL(6,4),
        volume_forfaitaire_personne INTEGER DEFAULT 30,
        volume_forfaitaire_unite INTEGER DEFAULT 30,
        redevance_annuelle DECIMAL(10,2),
        actif BOOLEAN DEFAULT true,
        date_debut DATE NOT NULL,
        date_fin DATE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    migrations.push('✅ Table tarifs_regionaux créée');
    console.log('✅ Table tarifs_regionaux créée');

    // Insérer les tarifs 2025
    await pool.query(`
      INSERT INTO tarifs_regionaux (region, fournisseur, tarif_base_m3, tarif_confort_m3, volume_forfaitaire_personne, volume_forfaitaire_unite, redevance_annuelle, date_debut) VALUES
      ('brussels', 'VIVAQUA', 5.8500, NULL, NULL, NULL, 40.23, '2025-01-01'),
      ('wallonia', 'SWDE', 2.8000, 5.9880, NULL, NULL, 147.24, '2025-01-01'),
      ('wallonia', 'CILE', 3.1000, 6.2000, NULL, NULL, 150.00, '2025-01-01'),
      ('flanders', 'De Watergroep', 2.8000, 5.6000, 30, 30, 100.00, '2025-01-01'),
      ('flanders', 'Farys', 3.4000, 6.8000, 30, 30, 100.00, '2025-01-01'),
      ('flanders', 'PIDPA', 3.0100, 6.0200, 30, 30, 100.00, '2025-01-01'),
      ('flanders', 'Water-link', 2.7000, 5.4000, 30, 30, 100.00, '2025-01-01')
      ON CONFLICT DO NOTHING;
    `);
    migrations.push('✅ Tarifs régionaux 2025 insérés');
    console.log('✅ Tarifs régionaux 2025 insérés');

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_tarifs_regionaux_region 
      ON tarifs_regionaux(region);
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_tarifs_regionaux_actif 
      ON tarifs_regionaux(actif, date_debut, date_fin);
    `);
    migrations.push('✅ Index tarifs_regionaux créés');

    console.log('🎉 Advanced decomptes migration completed!');

    return {
      success: true,
      message: 'Advanced decomptes migration completed successfully',
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