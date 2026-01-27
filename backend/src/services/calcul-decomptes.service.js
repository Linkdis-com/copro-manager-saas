import pool from '../config/database.js';

/**
 * Calcule les répartitions d'eau pour un décompte
 * ⚠️ VERSION CORRIGÉE - Fixes du bug "invalid input syntax for type integer"
 * ✅ SUPPORT PROPRIÉTAIRES OCCUPANTS avec nombre_habitants
 */
export async function calculerDecompte(decompteId) {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    // Charger le décompte avec tarif et immeuble
    const decompteResult = await client.query(`
      SELECT 
        d.*,
        i.region as immeuble_region,
        i.nombre_appartements,
        t.*
      FROM decomptes d
      JOIN immeubles i ON d.immeuble_id = i.id
      LEFT JOIN tarifs_eau t ON d.tarif_eau_id = t.id
      WHERE d.id = $1
    `, [decompteId]);

    if (decompteResult.rows.length === 0) {
      throw new Error('Décompte not found');
    }

    const decompte = decompteResult.rows[0];
    const tarif = decompte;

    if (!tarif.id) {
      throw new Error('Aucun tarif associé au décompte');
    }

    // ✅ FIX: LEFT JOIN pour supporter propriétaires occupants + récupérer nombre_habitants
    const relevesResult = await client.query(`
      SELECT 
        r.*,
        c.locataire_id,
        c.proprietaire_id,
        l.nombre_habitants as locataire_habitants,
        l.nom as locataire_nom,
        l.prenom as locataire_prenom,
        p.id as proprietaire_id_final,
        p.nom as proprietaire_nom,
        p.prenom as proprietaire_prenom,
        p.nombre_habitants as proprietaire_habitants,
        COALESCE(l.nombre_habitants, p.nombre_habitants, 1) as nombre_habitants
      FROM releves_compteurs r
      JOIN compteurs_eau c ON r.compteur_id = c.id
      LEFT JOIN locataires l ON c.locataire_id = l.id
      LEFT JOIN proprietaires p ON c.proprietaire_id = p.id
      WHERE r.decompte_id = $1
    `, [decompteId]);

    if (relevesResult.rows.length === 0) {
      throw new Error('Aucun relevé de compteur trouvé');
    }

    const releves = relevesResult.rows;

    // Supprimer anciennes répartitions
    await client.query('DELETE FROM repartitions_eau WHERE decompte_id = $1', [decompteId]);

    // ✅ FIX: Normaliser les noms de région (wallonia → wallonie, etc.)
    const regionNormalized = normalizeRegion(tarif.region);

    // Calcul selon région
    let repartitions = [];
    
    if (regionNormalized === 'wallonie') {
      repartitions = calculerWallonie(releves, tarif, decompte);
    } else if (regionNormalized === 'flandre') {
      repartitions = calculerFlandre(releves, tarif, decompte);
    } else if (regionNormalized === 'bruxelles') {
      repartitions = calculerBruxelles(releves, tarif, decompte);
    } else {
      throw new Error(`Région inconnue: ${tarif.region}`);
    }

    // Insérer les répartitions
    for (const rep of repartitions) {
      // ✅ FIX: Ajouter m3_factures dans l'INSERT
      await client.query(`
        INSERT INTO repartitions_eau (
          decompte_id, locataire_id, proprietaire_id,
          habitants, m3_consommes, m3_gratuits, m3_factures,
          m3_tarif_base, m3_tarif_confort,
          montant_eau, montant_assainissement, montant_redevance_fixe, 
          montant_tva, montant_total_ttc
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      `, [
        decompteId,
        rep.locataireId,
        rep.proprietaireId,
        rep.habitants,
        rep.m3Consommes,      // ⚠️ Déjà arrondi dans les fonctions de calcul
        rep.m3Gratuits,
        rep.m3Factures,       // ✅ FIX: Ajouté
        rep.m3TarifBase,
        rep.m3TarifConfort,
        rep.montantEau,
        rep.montantAssainissement,
        rep.montantRedevance,
        rep.montantTva,
        rep.montantTotal
      ]);
    }

    // Mettre à jour statut décompte
    const totalHabitants = releves.reduce((sum, r) => sum + (r.nombre_habitants || 0), 0);
    const totalM3Gratuits = repartitions.reduce((sum, r) => sum + r.m3Gratuits, 0);

    await client.query(`
      UPDATE decomptes 
      SET statut = 'calcule',
          date_calcul = CURRENT_TIMESTAMP,
          total_habitants = $1,
          total_m3_gratuits = $2
      WHERE id = $3
    `, [totalHabitants, totalM3Gratuits, decompteId]);

    await client.query('COMMIT');

    return {
      success: true,
      repartitions,
      totalHabitants,
      totalM3Gratuits
    };

  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * ✅ FIX: Normaliser les noms de régions
 */
function normalizeRegion(region) {
  if (!region) return 'bruxelles';
  
  const r = region.toLowerCase().trim();
  
  if (r.includes('wall')) return 'wallonie';
  if (r.includes('fland') || r.includes('vlaam')) return 'flandre';
  if (r.includes('brux')) return 'bruxelles';
  
  return r;
}

/**
 * Calcul WALLONIE - M³ gratuits (15/habitant, max 75)
 */
function calculerWallonie(releves, tarif, decompte) {
  const repartitions = [];
  const nombreLogements = releves.length;

  releves.forEach(releve => {
    // ✅ Utilise nombre_habitants qui vient déjà du COALESCE (locataire ou propriétaire)
    const habitants = releve.nombre_habitants || 1;
    
    // ⚠️ FIX CRITIQUE: Parser et arrondir la consommation
    const m3Consommes = Math.round(parseFloat(releve.consommation) || 0);
    
    // M³ gratuits (15/habitant, max 75)
    const m3Gratuits = Math.min(habitants * 15, 75);
    const m3Factures = Math.max(0, m3Consommes - m3Gratuits);

    // CVE-Distribution (uniquement sur m³ payants)
    const montantDistribution = m3Factures * parseFloat(tarif.tarif_cve_distribution || 0);

    // CVE-Assainissement (sur TOUS les m³)
    const montantAssainissement = m3Consommes * parseFloat(tarif.tarif_cve_assainissement || 0);

    // Redevance fixe (divisée par nombre de logements)
    const montantRedevance = parseFloat(tarif.redevance_fixe_annuelle || 0) / nombreLogements;

    // Sous-total HT
    const sousTotal = montantDistribution + montantAssainissement + montantRedevance;

    // TVA
    const montantTva = sousTotal * (parseFloat(tarif.tva_pourcent || 6) / 100);

    // Total TTC
    const montantTotal = sousTotal + montantTva;

    repartitions.push({
      locataireId: releve.locataire_id || null,
      proprietaireId: releve.proprietaire_id_final || releve.proprietaire_id || null,
      habitants,
      m3Consommes,
      m3Gratuits,
      m3Factures,           // ✅ FIX: Ajouté
      m3TarifBase: 0,
      m3TarifConfort: 0,
      montantEau: parseFloat(montantDistribution.toFixed(2)),
      montantAssainissement: parseFloat(montantAssainissement.toFixed(2)),
      montantRedevance: parseFloat(montantRedevance.toFixed(2)),
      montantTva: parseFloat(montantTva.toFixed(2)),
      montantTotal: parseFloat(montantTotal.toFixed(2))
    });
  });

  return repartitions;
}

/**
 * Calcul FLANDRE - Tarif progressif (base + confort)
 */
function calculerFlandre(releves, tarif, decompte) {
  const repartitions = [];
  const nombreLogements = releves.length;

  releves.forEach(releve => {
    // ✅ Utilise nombre_habitants qui vient déjà du COALESCE (locataire ou propriétaire)
    const habitants = releve.nombre_habitants || 1;
    
    // ⚠️ FIX CRITIQUE: Parser et arrondir la consommation
    const m3Consommes = Math.round(parseFloat(releve.consommation) || 0);

    // Volume au tarif base
    const volumeTarifBase = (parseInt(tarif.m3_base_fixe) || 0) + 
                           (habitants * (parseInt(tarif.m3_base_par_habitant) || 0));
    
    const m3Base = Math.min(m3Consommes, volumeTarifBase);
    const m3Confort = Math.max(0, m3Consommes - volumeTarifBase);

    // Montants
    const montantBase = m3Base * parseFloat(tarif.tarif_base || 0);
    const montantConfort = m3Confort * parseFloat(tarif.tarif_confort || 0);
    const montantEau = montantBase + montantConfort;

    // Assainissement (en Flandre, c'est souvent inclus dans les tarifs)
    const montantAssainissement = 0;

    // Redevance fixe
    const montantRedevance = parseFloat(tarif.redevance_fixe_annuelle || 0) / nombreLogements;

    // Sous-total
    const sousTotal = montantEau + montantAssainissement + montantRedevance;

    // TVA
    const montantTva = sousTotal * (parseFloat(tarif.tva_pourcent || 6) / 100);

    // Total
    const montantTotal = sousTotal + montantTva;

    repartitions.push({
      locataireId: releve.locataire_id || null,
      proprietaireId: releve.proprietaire_id_final || releve.proprietaire_id || null,
      habitants,
      m3Consommes,
      m3Gratuits: 0,
      m3Factures: m3Consommes,  // ✅ FIX: Ajouté
      m3TarifBase: m3Base,
      m3TarifConfort: m3Confort,
      montantEau: parseFloat(montantEau.toFixed(2)),
      montantAssainissement: parseFloat(montantAssainissement.toFixed(2)),
      montantRedevance: parseFloat(montantRedevance.toFixed(2)),
      montantTva: parseFloat(montantTva.toFixed(2)),
      montantTotal: parseFloat(montantTotal.toFixed(2))
    });
  });

  return repartitions;
}

/**
 * Calcul BRUXELLES - Redevance par logement
 */
function calculerBruxelles(releves, tarif, decompte) {
  const repartitions = [];

  releves.forEach(releve => {
    // ✅ Utilise nombre_habitants qui vient déjà du COALESCE (locataire ou propriétaire)
    const habitants = releve.nombre_habitants || 1;
    
    // ⚠️ FIX CRITIQUE: Parser et arrondir la consommation
    const m3Consommes = Math.round(parseFloat(releve.consommation) || 0);

    // Prix m³
    const montantEau = m3Consommes * parseFloat(tarif.tarif_unique || 0);

    // Contribution Fonds Eau
    const montantFonds = m3Consommes * parseFloat(tarif.contribution_fonds_eau || 0);

    // Redevance fixe PAR LOGEMENT
    const montantRedevance = parseFloat(tarif.redevance_fixe_annuelle || 0);

    // Assainissement (inclus dans tarif_unique à Bruxelles)
    const montantAssainissement = 0;

    // Sous-total
    const sousTotal = montantEau + montantFonds + montantRedevance;

    // TVA
    const montantTva = sousTotal * (parseFloat(tarif.tva_pourcent || 6) / 100);

    // Total
    const montantTotal = sousTotal + montantTva;

    repartitions.push({
      locataireId: releve.locataire_id || null,
      proprietaireId: releve.proprietaire_id_final || releve.proprietaire_id || null,
      habitants,
      m3Consommes,
      m3Gratuits: 0,
      m3Factures: m3Consommes,  // ✅ FIX: Ajouté
      m3TarifBase: 0,
      m3TarifConfort: 0,
      montantEau: parseFloat((montantEau + montantFonds).toFixed(2)),
      montantAssainissement: parseFloat(montantAssainissement.toFixed(2)),
      montantRedevance: parseFloat(montantRedevance.toFixed(2)),
      montantTva: parseFloat(montantTva.toFixed(2)),
      montantTotal: parseFloat(montantTotal.toFixed(2))
    });
  });

  return repartitions;
}
