// =====================================================
// 🌊 CALCULS EAU - 3 RÉGIONS BELGES
// frontend/src/components/Eau/calculs/index.js
// =====================================================

/**
 * 🟢 WALLONIE - Tarifs PROGRESSIFS
 * Tranche 1 : 0-30 m³ → CVD * 0.5
 * Tranche 2 : 30+ m³ → CVD plein
 */
export function calculerWallonie(params) {
  const {
    consommation,           // m³ consommés
    tarif_distribution,     // CVD (ex: 5.315)
    tarif_assainissement,   // CVA (ex: 3.50)
    redevance_fixe = 0,
    tva_pourcent = 6,
    m3_gratuits = 0        // m³ gratuits déduits AVANT calcul
  } = params;

  // Déduire m³ gratuits
  const m3_facturables = Math.max(0, consommation - m3_gratuits);

  let montant_distribution = 0;
  
  // TRANCHE 1 : 0-30 m³ à tarif réduit (50% CVD)
  if (m3_facturables <= 30) {
    montant_distribution = m3_facturables * (tarif_distribution * 0.5);
  } 
  // TRANCHE 2 : 30+ m³ à tarif plein
  else {
    montant_distribution = (30 * tarif_distribution * 0.5) + 
                          ((m3_facturables - 30) * tarif_distribution);
  }

  // Assainissement : tarif linéaire
  const montant_assainissement = m3_facturables * tarif_assainissement;

  // Sous-total HTVA
  const sous_total_htva = montant_distribution + montant_assainissement + redevance_fixe;

  // TVA
  const montant_tva = sous_total_htva * (tva_pourcent / 100);

  // Total TTC
  const total_ttc = sous_total_htva + montant_tva;

  return {
    region: 'wallonie',
    consommation_brute: consommation,
    m3_gratuits,
    m3_facturables,
    
    detail_tranches: {
      tranche1_m3: Math.min(m3_facturables, 30),
      tranche1_tarif: tarif_distribution * 0.5,
      tranche1_montant: Math.min(m3_facturables, 30) * (tarif_distribution * 0.5),
      
      tranche2_m3: Math.max(0, m3_facturables - 30),
      tranche2_tarif: tarif_distribution,
      tranche2_montant: Math.max(0, m3_facturables - 30) * tarif_distribution
    },
    
    montant_distribution,
    montant_assainissement,
    redevance_fixe,
    sous_total_htva,
    montant_tva,
    tva_pourcent,
    total_ttc
  };
}

/**
 * 🔵 BRUXELLES - Tarif LINÉAIRE unique
 * Pas de tranches, tarif unique par m³
 */
export function calculerBruxelles(params) {
  const {
    consommation,
    tarif_unique = 4.49,    // Tarif Vivaqua 2025
    redevance_fixe = 0,
    tva_pourcent = 6,
    m3_gratuits = 0
  } = params;

  // Déduire m³ gratuits
  const m3_facturables = Math.max(0, consommation - m3_gratuits);

  // Calcul simple : tarif unique
  const sous_total_htva = (m3_facturables * tarif_unique) + redevance_fixe;

  // TVA
  const montant_tva = sous_total_htva * (tva_pourcent / 100);

  // Total TTC
  const total_ttc = sous_total_htva + montant_tva;

  return {
    region: 'bruxelles',
    consommation_brute: consommation,
    m3_gratuits,
    m3_facturables,
    
    tarif_unique,
    montant_eau: m3_facturables * tarif_unique,
    redevance_fixe,
    sous_total_htva,
    montant_tva,
    tva_pourcent,
    total_ttc
  };
}

/**
 * 🟡 FLANDRE - Système BASE + CONFORT
 * Tarif de base pour volume forfaitaire (30 m³/habitant)
 * Tarif confort (double) au-delà
 */
export function calculerFlandre(params) {
  const {
    consommation,
    nombre_habitants,
    tarif_base = 6.98,        // De Watergroep 2025
    tarif_confort = 13.95,    // ~double du tarif base
    m3_base_par_habitant = 30,
    redevance_fixe = 0,
    tva_pourcent = 6,
    m3_gratuits = 0
  } = params;

  // Déduire m³ gratuits
  const m3_facturables = Math.max(0, consommation - m3_gratuits);

  // Volume de base (forfait par habitant)
  const volume_base = nombre_habitants * m3_base_par_habitant;

  let montant_eau = 0;
  
  // Si consommation <= volume base → tarif base uniquement
  if (m3_facturables <= volume_base) {
    montant_eau = m3_facturables * tarif_base;
  } 
  // Sinon → tarif base jusqu'au forfait, puis tarif confort
  else {
    montant_eau = (volume_base * tarif_base) + 
                  ((m3_facturables - volume_base) * tarif_confort);
  }

  // Sous-total HTVA
  const sous_total_htva = montant_eau + redevance_fixe;

  // TVA
  const montant_tva = sous_total_htva * (tva_pourcent / 100);

  // Total TTC
  const total_ttc = sous_total_htva + montant_tva;

  return {
    region: 'flandre',
    consommation_brute: consommation,
    m3_gratuits,
    m3_facturables,
    
    detail_tranches: {
      volume_base,
      m3_base: Math.min(m3_facturables, volume_base),
      tarif_base,
      montant_base: Math.min(m3_facturables, volume_base) * tarif_base,
      
      m3_confort: Math.max(0, m3_facturables - volume_base),
      tarif_confort,
      montant_confort: Math.max(0, m3_facturables - volume_base) * tarif_confort
    },
    
    montant_eau,
    redevance_fixe,
    sous_total_htva,
    montant_tva,
    tva_pourcent,
    total_ttc
  };
}

/**
 * 💧 RÉPARTITION DES PERTES
 * Les pertes du compteur principal sont réparties au prorata
 */
export function repartirPertes(params) {
  const {
    pertes_totales,
    consommations  // Array: [{compteur_id, consommation}]
  } = params;

  // Total consommé par tous les divisionnaires
  const total_consommation = consommations.reduce((sum, c) => sum + c.consommation, 0);

  // Répartir pertes au prorata
  return consommations.map(c => ({
    ...c,
    part_pertes: (c.consommation / total_consommation) * pertes_totales,
    consommation_avec_pertes: c.consommation + ((c.consommation / total_consommation) * pertes_totales)
  }));
}

/**
 * 🎁 CALCUL M³ GRATUITS
 * En Wallonie : 15 m³/habitant (max 5 habitants)
 */
export function calculerM3Gratuits(params) {
  const {
    nombre_habitants,
    m3_gratuits_par_habitant = 15,
    max_habitants_gratuits = 5
  } = params;

  const habitants_pris_en_compte = Math.min(nombre_habitants, max_habitants_gratuits);
  return habitants_pris_en_compte * m3_gratuits_par_habitant;
}

// =====================================================
// EXPORT PRINCIPAL
// =====================================================
export default {
  calculerWallonie,
  calculerBruxelles,
  calculerFlandre,
  repartirPertes,
  calculerM3Gratuits
};
