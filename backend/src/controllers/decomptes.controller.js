import pool from '../config/database.js';
import { calculateEauCharges, getCategoriesCharges, validateCategorie } from '../utils/decomptes-calculator.js';

// GET ALL - Lister tous les décomptes d'un locataire
export async function getAllDecomptes(req, res) {
  const { immeubleId, locataireId } = req.params;

  try {
    const immeubleCheck = await pool.query(
      'SELECT id FROM immeubles WHERE id = $1 AND user_id = $2 AND archived_at IS NULL',
      [immeubleId, req.user.id]
    );

    if (immeubleCheck.rows.length === 0) {
      return res.status(404).json({ 
        error: 'Not found',
        message: 'Immeuble not found or you do not have access' 
      });
    }

    const locataireCheck = await pool.query(
      'SELECT id, nom, prenom FROM locataires WHERE id = $1 AND immeuble_id = $2',
      [locataireId, immeubleId]
    );

    if (locataireCheck.rows.length === 0) {
      return res.status(404).json({ 
        error: 'Not found',
        message: 'Locataire not found' 
      });
    }

    const result = await pool.query(
      `SELECT * FROM decomptes_locataires 
       WHERE locataire_id = $1 
       ORDER BY annee DESC, created_at DESC`,
      [locataireId]
    );

    res.json({
      success: true,
      decomptes: result.rows,
      count: result.rows.length,
      locataire: locataireCheck.rows[0]
    });
  } catch (error) {
    console.error('Error fetching decomptes:', error);
    res.status(500).json({ 
      error: 'Failed to fetch decomptes',
      message: error.message 
    });
  }
}

// GET ONE - Récupérer un décompte avec ses détails
export async function getDecompte(req, res) {
  const { immeubleId, locataireId, id } = req.params;

  try {
    const immeubleCheck = await pool.query(
      'SELECT id FROM immeubles WHERE id = $1 AND user_id = $2 AND archived_at IS NULL',
      [immeubleId, req.user.id]
    );

    if (immeubleCheck.rows.length === 0) {
      return res.status(404).json({ 
        error: 'Not found',
        message: 'Immeuble not found' 
      });
    }

    const decompteResult = await pool.query(
      `SELECT d.*, l.nom as locataire_nom, l.prenom as locataire_prenom
       FROM decomptes_locataires d
       JOIN locataires l ON d.locataire_id = l.id
       WHERE d.id = $1 AND d.locataire_id = $2`,
      [id, locataireId]
    );

    if (decompteResult.rows.length === 0) {
      return res.status(404).json({ 
        error: 'Not found',
        message: 'Décompte not found' 
      });
    }

    const decompte = decompteResult.rows[0];

    const detailsResult = await pool.query(
      `SELECT * FROM decomptes_details 
       WHERE decompte_id = $1 
       ORDER BY categorie ASC`,
      [id]
    );

    res.json({
      success: true,
      decompte: {
        ...decompte,
        details: detailsResult.rows
      }
    });
  } catch (error) {
    console.error('Error fetching decompte:', error);
    res.status(500).json({ 
      error: 'Failed to fetch decompte',
      message: error.message 
    });
  }
}

// CREATE - Créer un nouveau décompte avec calcul automatique avancé
export async function createDecompte(req, res) {
  const { immeubleId, locataireId } = req.params;
  const {
    annee,
    periodeDebut,
    periodeFin,
    chargesProvisionnees,
    chargesReelles,
    details = [],
    consommationEau = {},
    notes
  } = req.body;

  if (!annee || !periodeDebut || !periodeFin || chargesProvisionnees === undefined || chargesReelles === undefined) {
    return res.status(400).json({ 
      error: 'Validation error',
      message: 'annee, periodeDebut, periodeFin, chargesProvisionnees, and chargesReelles are required' 
    });
  }

  try {
    const immeubleCheck = await pool.query(
      'SELECT * FROM immeubles WHERE id = $1 AND user_id = $2 AND archived_at IS NULL',
      [immeubleId, req.user.id]
    );

    if (immeubleCheck.rows.length === 0) {
      return res.status(404).json({ 
        error: 'Not found',
        message: 'Immeuble not found or you do not have access' 
      });
    }

    const immeuble = immeubleCheck.rows[0];

    const locataireCheck = await pool.query(
      'SELECT * FROM locataires WHERE id = $1 AND immeuble_id = $2',
      [locataireId, immeubleId]
    );

    if (locataireCheck.rows.length === 0) {
      return res.status(404).json({ 
        error: 'Not found',
        message: 'Locataire not found' 
      });
    }

    const locataire = locataireCheck.rows[0];

    const existingCheck = await pool.query(
      'SELECT id FROM decomptes_locataires WHERE locataire_id = $1 AND annee = $2',
      [locataireId, annee]
    );

    if (existingCheck.rows.length > 0) {
      return res.status(400).json({ 
        error: 'Duplicate',
        message: `A décompte already exists for year ${annee}` 
      });
    }

    // CALCUL AUTOMATIQUE DU SOLDE
    const solde = parseFloat(chargesProvisionnees) - parseFloat(chargesReelles);

    await pool.query('BEGIN');

    // Calculer les charges d'eau si données fournies
    let eauCalcul = null;
    if (consommationEau && (consommationEau.compteurPrincipalM3 || consommationEau.compteurIndividuelM3)) {
      try {
        eauCalcul = await calculateEauCharges(immeuble, locataire, consommationEau);
      } catch (calcError) {
        await pool.query('ROLLBACK');
        return res.status(400).json({
          error: 'Eau calculation error',
          message: calcError.message
        });
      }
    }

    // Créer le décompte
    const decompteResult = await pool.query(
      `INSERT INTO decomptes_locataires (
        locataire_id, annee, periode_debut, periode_fin,
        charges_provisionnees, charges_reelles, solde,
        compteur_principal_m3, compteur_individuel_m3, eau_commune_m3,
        part_eau_commune, tarif_applique_m3, notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *`,
      [
        locataireId, annee, periodeDebut, periodeFin,
        chargesProvisionnees, chargesReelles, solde.toFixed(2),
        eauCalcul?.compteurPrincipalM3, eauCalcul?.compteurIndividuelM3,
        eauCalcul?.eauCommuneM3, eauCalcul?.partEauCommune,
        eauCalcul?.tarifAppliqueM3, notes
      ]
    );

    const decompte = decompteResult.rows[0];

    // Ajouter les détails par catégorie
    const savedDetails = [];

    // Si calcul eau automatique, l'ajouter en premier
    if (eauCalcul) {
      const eauDetail = await pool.query(
        `INSERT INTO decomptes_details (
          decompte_id, categorie, montant, recuperable,
          sous_details, unite, quantite, prix_unitaire
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *`,
        [
          decompte.id, 'eau', eauCalcul.montantTotal.toFixed(2), true,
          JSON.stringify(eauCalcul.sousDetails), 'm³',
          eauCalcul.compteurIndividuelM3, eauCalcul.tarifAppliqueM3
        ]
      );
      savedDetails.push(eauDetail.rows[0]);
    }

    // Ajouter les autres détails fournis
    if (details && details.length > 0) {
      for (const detail of details) {
        if (!validateCategorie(detail.categorie)) {
          await pool.query('ROLLBACK');
          return res.status(400).json({
            error: 'Invalid category',
            message: `Invalid category: ${detail.categorie}`
          });
        }

        // Skip eau si déjà calculée automatiquement
        if (detail.categorie === 'eau' && eauCalcul) continue;

        const detailResult = await pool.query(
          `INSERT INTO decomptes_details (
            decompte_id, categorie, montant, recuperable,
            sous_details, unite, quantite, prix_unitaire
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          RETURNING *`,
          [
            decompte.id, detail.categorie, detail.montant,
            detail.recuperable !== false,
            detail.sousDetails ? JSON.stringify(detail.sousDetails) : null,
            detail.unite, detail.quantite, detail.prixUnitaire
          ]
        );
        savedDetails.push(detailResult.rows[0]);
      }
    }

    await pool.query('COMMIT');

    console.log(`✅ Décompte created: ${annee} for ${locataire.nom} (solde: ${solde.toFixed(2)}€) by user ${req.user.email}`);

    res.status(201).json({
      success: true,
      message: 'Décompte created successfully',
      decompte: {
        ...decompte,
        details: savedDetails,
        interpretation: solde > 0 
          ? `Rembourser ${solde.toFixed(2)}€ au locataire` 
          : solde < 0 
            ? `Locataire doit payer ${Math.abs(solde).toFixed(2)}€` 
            : 'Comptes équilibrés'
      }
    });
  } catch (error) {
    await pool.query('ROLLBACK');
    console.error('Error creating decompte:', error);
    res.status(500).json({ 
      error: 'Failed to create decompte',
      message: error.message 
    });
  }
}

// UPDATE - Modifier un décompte
export async function updateDecompte(req, res) {
  const { immeubleId, locataireId, id } = req.params;
  const {
    chargesProvisionnees,
    chargesReelles,
    statut,
    dateEnvoi,
    notes
  } = req.body;

  const validStatuts = ['draft', 'sent', 'closed'];
  if (statut && !validStatuts.includes(statut)) {
    return res.status(400).json({ 
      error: 'Validation error',
      message: `statut must be one of: ${validStatuts.join(', ')}` 
    });
  }

  try {
    const immeubleCheck = await pool.query(
      'SELECT id FROM immeubles WHERE id = $1 AND user_id = $2 AND archived_at IS NULL',
      [immeubleId, req.user.id]
    );

    if (immeubleCheck.rows.length === 0) {
      return res.status(404).json({ 
        error: 'Not found',
        message: 'Immeuble not found' 
      });
    }

    const currentResult = await pool.query(
      'SELECT * FROM decomptes_locataires WHERE id = $1 AND locataire_id = $2',
      [id, locataireId]
    );

    if (currentResult.rows.length === 0) {
      return res.status(404).json({ 
        error: 'Not found',
        message: 'Décompte not found' 
      });
    }

    const current = currentResult.rows[0];

    let newSolde = current.solde;
    if (chargesProvisionnees !== undefined || chargesReelles !== undefined) {
      const provisionnees = chargesProvisionnees !== undefined ? chargesProvisionnees : current.charges_provisionnees;
      const reelles = chargesReelles !== undefined ? chargesReelles : current.charges_reelles;
      newSolde = parseFloat(provisionnees) - parseFloat(reelles);
    }

    const result = await pool.query(
      `UPDATE decomptes_locataires SET
        charges_provisionnees = COALESCE($1, charges_provisionnees),
        charges_reelles = COALESCE($2, charges_reelles),
        solde = $3,
        statut = COALESCE($4, statut),
        date_envoi = COALESCE($5, date_envoi),
        notes = COALESCE($6, notes),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $7 AND locataire_id = $8
      RETURNING *`,
      [chargesProvisionnees, chargesReelles, newSolde.toFixed(2), statut, dateEnvoi, notes, id, locataireId]
    );

    console.log(`✅ Décompte updated: ${id} by user ${req.user.email}`);

    res.json({
      success: true,
      message: 'Décompte updated successfully',
      decompte: result.rows[0]
    });
  } catch (error) {
    console.error('Error updating decompte:', error);
    res.status(500).json({ 
      error: 'Failed to update decompte',
      message: error.message 
    });
  }
}

// DELETE - Supprimer un décompte
export async function deleteDecompte(req, res) {
  const { immeubleId, locataireId, id } = req.params;

  try {
    const immeubleCheck = await pool.query(
      'SELECT id FROM immeubles WHERE id = $1 AND user_id = $2 AND archived_at IS NULL',
      [immeubleId, req.user.id]
    );

    if (immeubleCheck.rows.length === 0) {
      return res.status(404).json({ 
        error: 'Not found',
        message: 'Immeuble not found' 
      });
    }

    await pool.query('BEGIN');

    await pool.query(
      'DELETE FROM decomptes_details WHERE decompte_id = $1',
      [id]
    );

    const result = await pool.query(
      'DELETE FROM decomptes_locataires WHERE id = $1 AND locataire_id = $2 RETURNING id',
      [id, locataireId]
    );

    if (result.rows.length === 0) {
      await pool.query('ROLLBACK');
      return res.status(404).json({ 
        error: 'Not found',
        message: 'Décompte not found' 
      });
    }

    await pool.query('COMMIT');

    console.log(`✅ Décompte deleted: ${id} by user ${req.user.email}`);

    res.json({
      success: true,
      message: 'Décompte deleted successfully'
    });
  } catch (error) {
    await pool.query('ROLLBACK');
    console.error('Error deleting decompte:', error);
    res.status(500).json({ 
      error: 'Failed to delete decompte',
      message: error.message 
    });
  }
}

// GET CATEGORIES - Récupérer les catégories de charges traduites
export async function getCategories(req, res) {
  const locale = req.query.locale || req.headers['accept-language']?.split(',')[0]?.split('-')[0] || 'fr';

  try {
    const categories = await getCategoriesCharges(locale);

    res.json({
      success: true,
      categories,
      locale
    });
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ 
      error: 'Failed to fetch categories',
      message: error.message 
    });
  }
}