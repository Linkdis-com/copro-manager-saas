// =====================================================
// 🌊 CONSTANTS - Régions & Distributeurs
// frontend/src/components/Eau/constants/index.js
// =====================================================

/**
 * Régions de Belgique
 */
export const REGIONS = {
  WALLONIE: {
    code: 'wallonie',
    nom: 'Wallonie',
    emoji: '🟢',
    couleur: 'green',
    systeme: 'Tarifs progressifs (tranches)',
    description: 'Tranche 1: 0-30 m³ à tarif réduit (50% CVD), puis tarif plein'
  },
  BRUXELLES: {
    code: 'bruxelles',
    nom: 'Bruxelles-Capitale',
    emoji: '🔵',
    couleur: 'blue',
    systeme: 'Tarif linéaire unique',
    description: 'Tarif unique par m³, pas de tranches (depuis 2022)'
  },
  FLANDRE: {
    code: 'flandre',
    nom: 'Flandre',
    emoji: '🟡',
    couleur: 'yellow',
    systeme: 'Base + Confort',
    description: 'Tarif de base pour forfait habitant, tarif confort au-delà'
  }
};

/**
 * Distributeurs par région
 */
export const DISTRIBUTEURS = {
  wallonie: [
    { code: 'SWDE', nom: 'SWDE', principal: true },
    { code: 'CILE', nom: 'CILE' },
    { code: 'INASEP', nom: 'INASEP' },
    { code: 'AIDE', nom: 'AIDE' },
    { code: 'AIEC', nom: 'AIEC' }
  ],
  bruxelles: [
    { code: 'VIVAQUA', nom: 'Vivaqua', principal: true }
  ],
  flandre: [
    { code: 'DE_WATERGROEP', nom: 'De Watergroep', principal: true },
    { code: 'FARYS', nom: 'Farys' },
    { code: 'PIDPA', nom: 'Pidpa' },
    { code: 'TMVW', nom: 'TMVW' }
  ]
};

/**
 * Tarifs par défaut 2025
 */
export const TARIFS_DEFAUT = {
  wallonie: {
    SWDE: {
      tarif_distribution: 5.315,
      tarif_assainissement: 3.50,
      redevance_fixe: 30.0,
      tva_pourcent: 6.0,
      m3_gratuits_par_habitant: 15,
      max_habitants_gratuits: 5
    }
  },
  bruxelles: {
    VIVAQUA: {
      tarif_unique: 4.49,
      redevance_fixe: 0,
      tva_pourcent: 6.0
    }
  },
  flandre: {
    DE_WATERGROEP: {
      tarif_base: 6.98,
      tarif_confort: 13.95,
      m3_base_par_habitant: 30,
      redevance_fixe: 0,
      tva_pourcent: 6.0
    }
  }
};

/**
 * Types de comptage
 */
export const TYPES_COMPTAGE = {
  COLLECTIF: {
    code: 'collectif',
    nom: 'Compteur Collectif',
    emoji: '🏢',
    description: 'Un seul compteur pour tout l\'immeuble',
    repartition: 'Selon millièmes ou habitants'
  },
  DIVISIONNAIRE: {
    code: 'divisionnaire',
    nom: 'Système Divisionnaire',
    emoji: '🔢',
    description: 'Compteur principal + compteurs individuels',
    repartition: 'Selon consommation réelle + pertes'
  },
  INDIVIDUEL: {
    code: 'individuel',
    nom: 'Compteurs Individuels',
    emoji: '👤',
    description: 'Chaque logement paie directement au fournisseur',
    repartition: 'Aucune - facturation directe'
  }
};

/**
 * Helper functions
 */
export function getDistributeurs(region) {
  return DISTRIBUTEURS[region] || [];
}

export function getTarifsDefaut(region, distributeur) {
  return TARIFS_DEFAUT[region]?.[distributeur] || null;
}

export function getRegionInfo(regionCode) {
  return Object.values(REGIONS).find(r => r.code === regionCode);
}

export function getTypeComptageInfo(typeCode) {
  return Object.values(TYPES_COMPTAGE).find(t => t.code === typeCode);
}
