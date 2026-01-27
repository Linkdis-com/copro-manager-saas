import pool from '../config/database.js';

export async function seedTarifsDefaut() {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    // WALLONIE - SWDE 2024
    await client.query(`
      INSERT INTO tarifs_eau (
        nom, region, fournisseur, annee,
        tarif_cve_distribution, tarif_cve_assainissement,
        m3_gratuits_par_habitant, max_habitants_gratuits,
        redevance_fixe_annuelle, tva_pourcent
      ) VALUES (
        'SWDE 2024 (Indicatif)', 'wallonia', 'SWDE', 2024,
        2.50, 3.20,
        15, 5,
        30.00, 6.00
      ) ON CONFLICT (fournisseur, annee) DO NOTHING;
    `);

    // BRUXELLES - VIVAQUA 2024
    await client.query(`
      INSERT INTO tarifs_eau (
        nom, region, fournisseur, annee,
        tarif_unique, contribution_fonds_eau,
        redevance_fixe_annuelle, redevance_par_logement, tva_pourcent
      ) VALUES (
        'VIVAQUA 2024 (Indicatif)', 'brussels', 'VIVAQUA', 2024,
        4.50, 0.90,
        45.00, true, 6.00
      ) ON CONFLICT (fournisseur, annee) DO NOTHING;
    `);

    // FLANDRE - De Watergroep 2024
    await client.query(`
      INSERT INTO tarifs_eau (
        nom, region, fournisseur, annee,
        tarif_base, tarif_confort,
        m3_base_fixe, m3_base_par_habitant,
        redevance_fixe_annuelle, tva_pourcent
      ) VALUES (
        'De Watergroep 2024 (Indicatif)', 'flanders', 'De Watergroep', 2024,
        2.20, 5.00,
        30, 10,
        40.00, 6.00
      ) ON CONFLICT (fournisseur, annee) DO NOTHING;
    `);

    await client.query('COMMIT');
    console.log('✅ Tarifs par défaut insérés');
    return { success: true };

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Erreur seed tarifs:', error);
    throw error;
  } finally {
    client.release();
  }
}