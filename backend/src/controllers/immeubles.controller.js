import pool from '../config/database.js';

/**
 * Récupérer tous les immeubles de l'utilisateur connecté
 */
export const getImmeubles = async (req, res) => {
  try {
    // ✅ Filtre seulement les immeubles NON archivés
    const result = await pool.query(
      `SELECT * FROM immeubles 
       WHERE user_id = $1 AND archived_at IS NULL
       ORDER BY created_at DESC`,
      [req.user.id]
    );

    res.json({ immeubles: result.rows });
  } catch (error) {
    console.error('Error fetching immeubles:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des immeubles' });
  }
};

// ✅ ALIAS pour compatibilité avec les routes
export const getAllImmeubles = getImmeubles;

/**
 * Récupérer un immeuble par ID
 */
export const getImmeubleById = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT * FROM immeubles 
       WHERE id = $1 AND user_id = $2 AND archived_at IS NULL`,
      [id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Immeuble non trouvé' });
    }

    res.json({ immeuble: result.rows[0] });
  } catch (error) {
    console.error('Error fetching immeuble:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération de l\'immeuble' });
  }
};

// ✅ ALIAS pour compatibilité avec les routes
export const getImmeuble = getImmeubleById;

/**
 * Créer un nouvel immeuble
 */
export const createImmeuble = async (req, res) => {
  const client = await pool.connect();
  
  try {
    const {
      nom,
      adresse,
      codePostal,
      ville,
      region,
      nombreAppartements,
      systemeRepartition
    } = req.body;

    await client.query('BEGIN');

    // ✅ SANS total_milliemes (colonne n'existe pas dans la DB)
    const immeubleResult = await client.query(
      `INSERT INTO immeubles (
        user_id, nom, adresse, code_postal, ville, region,
        nombre_appartements, systeme_repartition
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *`,
      [req.user.id, nom, adresse, codePostal, ville, region, 
       nombreAppartements, systemeRepartition]
    );

    const immeuble = immeubleResult.rows[0];

    // ✅ SUPPRIMÉ : Ne plus modifier total_units ici
    // total_units représente les unités ACHETÉES (via Stripe)
    // usage.unites est calculé dynamiquement via SUM(nombre_appartements)

    await client.query('COMMIT');

    console.log(`✅ Immeuble créé: ${immeuble.id} (${nombreAppartements} appartements) by user ${req.user.email}`);

    res.status(201).json({ 
      message: 'Immeuble créé avec succès',
      immeuble 
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating immeuble:', error);
    res.status(500).json({ error: 'Erreur lors de la création de l\'immeuble' });
  } finally {
    client.release();
  }
};

/**
 * Mettre à jour un immeuble
 */
export const updateImmeuble = async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { id } = req.params;
    const {
      nom,
      adresse,
      codePostal,
      ville,
      region,
      nombreAppartements,
      systemeRepartition
    } = req.body;

    await client.query('BEGIN');

    // Vérifier que l'immeuble appartient bien à l'utilisateur
    const checkResult = await client.query(
      'SELECT nombre_appartements FROM immeubles WHERE id = $1 AND user_id = $2 AND archived_at IS NULL',
      [id, req.user.id]
    );

    if (checkResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Immeuble non trouvé' });
    }

    const oldNombreAppartements = checkResult.rows[0].nombre_appartements;

    // ✅ SANS total_milliemes
    const result = await client.query(
      `UPDATE immeubles 
       SET nom = $1, adresse = $2, code_postal = $3, ville = $4, region = $5,
           nombre_appartements = $6, systeme_repartition = $7,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $8 AND user_id = $9 AND archived_at IS NULL
       RETURNING *`,
      [nom, adresse, codePostal, ville, region, nombreAppartements, 
       systemeRepartition, id, req.user.id]
    );

    // ✅ SUPPRIMÉ : Ne plus modifier total_units ici
    // Le calcul dynamique de usage.unites prend déjà en compte le nouveau nombre d'appartements

    await client.query('COMMIT');

    console.log(`✅ Immeuble mis à jour: ${id} (${oldNombreAppartements} → ${nombreAppartements} appartements) by user ${req.user.email}`);

    res.json({ 
      message: 'Immeuble mis à jour avec succès',
      immeuble: result.rows[0]
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error updating immeuble:', error);
    res.status(500).json({ error: 'Erreur lors de la mise à jour de l\'immeuble' });
  } finally {
    client.release();
  }
};

/**
 * Supprimer un immeuble (HARD DELETE)
 */
export const deleteImmeuble = async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { id } = req.params;

    await client.query('BEGIN');

    // Vérifier que l'immeuble existe et récupérer le nombre d'appartements
    const checkResult = await client.query(
      'SELECT nombre_appartements FROM immeubles WHERE id = $1 AND user_id = $2',
      [id, req.user.id]
    );

    if (checkResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Immeuble non trouvé' });
    }

    const nombreAppartements = checkResult.rows[0].nombre_appartements;

    // ✅ HARD DELETE - Supprimer toutes les données liées en cascade
    await client.query('DELETE FROM compteurs_eau WHERE immeuble_id = $1', [id]);
    await client.query('DELETE FROM decomptes WHERE immeuble_id = $1', [id]);
    await client.query('DELETE FROM locataires WHERE immeuble_id = $1', [id]);
    await client.query('DELETE FROM proprietaires WHERE immeuble_id = $1', [id]);
    
    // Supprimer l'immeuble
    await client.query('DELETE FROM immeubles WHERE id = $1', [id]);

    // ✅ SUPPRIMÉ : Ne plus modifier total_units ici
    // Le calcul dynamique de usage.unites ne comptera plus cet immeuble automatiquement

    await client.query('COMMIT');

    console.log(`✅ Immeuble supprimé: ${id} (${nombreAppartements} appartements) by user ${req.user.email}`);

    res.json({ message: 'Immeuble supprimé définitivement avec succès' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error deleting immeuble:', error);
    
    if (error.code === '23503') {
      return res.status(400).json({ 
        error: 'Impossible de supprimer cet immeuble car il contient encore des données liées.' 
      });
    }
    
    res.status(500).json({ error: 'Erreur lors de la suppression de l\'immeuble' });
  } finally {
    client.release();
  }
};

// ✅ Export par défaut pour compatibilité
export default {
  getImmeubles,
  getAllImmeubles,
  getImmeubleById,
  getImmeuble,
  createImmeuble,
  updateImmeuble,
  deleteImmeuble
};
