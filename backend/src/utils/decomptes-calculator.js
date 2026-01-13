import pool from '../config/database.js';

/**
 * Calcule les charges d'eau selon le mode de comptage et la région
 */
export async function calculateEauCharges(immeuble, locataire, consommationData) {
  const {
    compteurPrincipalM3,
    compteurIndividuelM3,
    nombrePersonnes = 1
  } = consommationData;

  const result = {
    compteurPrincipalM3: null,
    compteurIndividuelM3: null,
    eauCommuneM3: null,
    partEauCommune: null,
    tarifAppliqueM3: immeuble.tarif_eau_m3,
    montantTotal: 0,
    sousDetails: {}
  };

  // Récupérer le propriétaire pour les millièmes
  const propResult = await pool.query(
    'SELECT milliemes FROM proprietaires WHERE id = $1',
    [locataire.proprietaire_id]
  );
  const milliemes = propResult.rows[0]?.milliemes || 0;
  const quotite = milliemes / 1000; // Convertir en pourcentage

  // MODE 1 : COMPTEUR COLLECTIF (répartition selon millièmes)
  if (immeuble.mode_comptage_eau === 'collectif') {
    if (!compteurPrincipalM3) {
      throw new Error('compteurPrincipalM3 requis pour mode collectif');
    }

    result.compteurPrincipalM3 = compteurPrincipalM3;
    result.compteurIndividuelM3 = compteurPrincipalM3 * quotite;
    result.montantTotal = result.compteurIndividuelM3 * immeuble.tarif_eau_m3;

    result.sousDetails = {
      mode: 'collectif',
      consommationTotale: compteurPrincipalM3,
      quotite: quotite,
      consommationCalculee: result.compteurIndividuelM3,
      tarif: immeuble.tarif_eau_m3
    };
  }

  // MODE 2 : COMPTEURS DIVISIONNAIRES (le plus courant)
  else if (immeuble.mode_comptage_eau === 'divisionnaire') {
    if (!compteurPrincipalM3 || !compteurIndividuelM3) {
      throw new Error('compteurPrincipalM3 et compteurIndividuelM3 requis pour mode divisionnaire');
    }

    result.compteurPrincipalM3 = compteurPrincipalM3;
    result.compteurIndividuelM3 = compteurIndividuelM3;

    // Récupérer la somme des compteurs individuels de tous les locataires
    const sumResult = await pool.query(`
      SELECT COALESCE(SUM(compteur_individuel_m3), 0) as total
      FROM decomptes_locataires
      WHERE locataire_id IN (
        SELECT id FROM locataires WHERE immeuble_id = $1
      )
      AND annee = EXTRACT(YEAR FROM CURRENT_DATE)
    `, [immeuble.id]);

    const sommeCompteurs = parseFloat(sumResult.rows[0].total) + compteurIndividuelM3;

    // Eau commune = Total - Somme des individuels
    const eauCommuneTotal = Math.max(0, compteurPrincipalM3 - sommeCompteurs);
    result.eauCommuneM3 = eauCommuneTotal;

    // Part eau commune selon millièmes
    result.partEauCommune = eauCommuneTotal * quotite * immeuble.tarif_eau_m3;

    // Montant total = Consommation individuelle + Part eau commune
    const montantIndividuel = compteurIndividuelM3 * immeuble.tarif_eau_m3;
    result.montantTotal = montantIndividuel + result.partEauCommune;

    result.sousDetails = {
      mode: 'divisionnaire',
      consommationIndividuelle: compteurIndividuelM3,
      montantIndividuel: montantIndividuel,
      eauCommune: eauCommuneTotal,
      quotiteEauCommune: quotite,
      partEauCommune: result.partEauCommune,
      tarif: immeuble.tarif_eau_m3
    };
  }

  // MODE 3 : COMPTEURS INDIVIDUELS (contrat direct)
  else if (immeuble.mode_comptage_eau === 'individuel') {
    if (!compteurIndividuelM3) {
      throw new Error('compteurIndividuelM3 requis pour mode individuel');
    }

    result.compteurIndividuelM3 = compteurIndividuelM3;
    result.montantTotal = compteurIndividuelM3 * immeuble.tarif_eau_m3;

    result.sousDetails = {
      mode: 'individuel',
      consommationIndividuelle: compteurIndividuelM3,
      tarif: immeuble.tarif_eau_m3,
      note: 'Contrat direct avec fournisseur'
    };
  }

  // TARIFICATION FLANDRE (tarif base vs confort)
  if (immeuble.region === 'flanders') {
    const tarif = await getTarifRegional(immeuble.region, immeuble.fournisseur_eau);
    if (tarif && tarif.tarif_confort_m3) {
      const volumeBase = calculerVolumeBaseFlandre(nombrePersonnes, 1); // 1 unité
      const consommation = result.compteurIndividuelM3 || 0;

      if (consommation > volumeBase) {
        const volumeBasePaye = volumeBase;
        const volumeConfort = consommation - volumeBase;

        const montantBase = volumeBasePaye * tarif.tarif_base_m3;
        const montantConfort = volumeConfort * tarif.tarif_confort_m3;

        result.montantTotal = montantBase + montantConfort;
        result.tarifAppliqueM3 = null; // Tarif mixte

        result.sousDetails.tarifsProgessifs = {
          volumeBase: volumeBasePaye,
          tarifBase: tarif.tarif_base_m3,
          montantBase: montantBase,
          volumeConfort: volumeConfort,
          tarifConfort: tarif.tarif_confort_m3,
          montantConfort: montantConfort
        };
      } else {
        result.montantTotal = consommation * tarif.tarif_base_m3;
        result.tarifAppliqueM3 = tarif.tarif_base_m3;
      }
    }
  }

  return result;
}

/**
 * Calcule le volume de base pour la Flandre
 */
function calculerVolumeBaseFlandre(nombrePersonnes, nombreUnites) {
  // 30 m³ par personne + 30 m³ par unité
  return (nombrePersonnes * 30) + (nombreUnites * 30);
}

/**
 * Récupère le tarif régional actif
 */
async function getTarifRegional(region, fournisseur) {
  const result = await pool.query(
    `SELECT * FROM tarifs_regionaux
     WHERE region = $1 
     AND fournisseur = $2
     AND actif = true
     AND date_debut <= CURRENT_DATE
     AND (date_fin IS NULL OR date_fin >= CURRENT_DATE)
     ORDER BY date_debut DESC
     LIMIT 1`,
    [region, fournisseur]
  );

  return result.rows[0] || null;
}

/**
 * Récupère les catégories de charges traduites
 */
export async function getCategoriesCharges(locale = 'fr') {
  const result = await pool.query(
    `SELECT 
      code,
      CASE 
        WHEN $1 = 'nl' THEN nom_nl
        WHEN $1 = 'en' THEN nom_en
        ELSE nom_fr
      END as nom,
      recuperable_par_defaut,
      ordre_affichage
    FROM categories_charges
    ORDER BY ordre_affichage`,
    [locale]
  );

  return result.rows;
}

/**
 * Valide les catégories de charges
 */
export function validateCategorie(code) {
  const validCategories = [
    'eau', 'chauffage', 'electricite', 'gaz', 'ascenseur',
    'nettoyage', 'ordures', 'entretien_chaudiere', 'jardinage',
    'assurance', 'syndic', 'travaux', 'autre'
  ];

  return validCategories.includes(code);
}