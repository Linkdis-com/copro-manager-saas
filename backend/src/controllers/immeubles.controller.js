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
      totalMilliemes,
      systemeRepartition
    } = req.body;

    await client.query('BEGIN');

    // Créer l'immeuble
    const immeubleResult = await client.query(
      `INSERT INTO immeubles (
        user_id, nom, adresse, code_postal, ville, region,
        nombre_appartements, total_milliemes, systeme_repartition
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *`,
      [req.user.id, nom, adresse, codePostal, ville, region, 
       nombreAppartements, totalMilliemes, systemeRepartition]
    );

    const immeuble = immeubleResult.rows[0];

    // ✅ CORRECTION : Utiliser total_units au lieu de current_units
    // Incrémenter les unités utilisées dans l'abonnement
    await client.query(
      `UPDATE subscriptions 
       SET total_units = total_units + $1
       WHERE user_id = $2`,
      [nombreAppartements, req.user.id]
    );

    await client.query('COMMIT');

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
      totalMilliemes,
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
    const difference = nombreAppartements - oldNombreAppartements;

    // Mettre à jour l'immeuble
    const result = await client.query(
      `UPDATE immeubles 
       SET nom = $1, adresse = $2, code_postal = $3, ville = $4, region = $5,
           nombre_appartements = $6, total_milliemes = $7, systeme_repartition = $8,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $9 AND user_id = $10 AND archived_at IS NULL
       RETURNING *`,
      [nom, adresse, codePostal, ville, region, nombreAppartements, 
       totalMilliemes, systemeRepartition, id, req.user.id]
    );

    // ✅ CORRECTION : Utiliser total_units au lieu de current_units
    // Ajuster les unités dans l'abonnement si le nombre d'appartements a changé
    if (difference !== 0) {
      await client.query(
        `UPDATE subscriptions 
         SET total_units = total_units + $1
         WHERE user_id = $2`,
        [difference, req.user.id]
      );
    }

    await client.query('COMMIT');

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
 * Supprimer un immeuble (HARD DELETE - Option A)
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

    // ✅ OPTION A : VRAI DELETE (suppression complète de la DB)
    // Supprimer toutes les données liées en cascade
    await client.query('DELETE FROM compteurs_eau WHERE immeuble_id = $1', [id]);
    await client.query('DELETE FROM decomptes_eau WHERE immeuble_id = $1', [id]);
    await client.query('DELETE FROM locataires WHERE immeuble_id = $1', [id]);
    await client.query('DELETE FROM proprietaires WHERE immeuble_id = $1', [id]);
    
    // Supprimer l'immeuble
    await client.query('DELETE FROM immeubles WHERE id = $1', [id]);

    // ✅ CORRECTION : Utiliser total_units au lieu de current_units
    // Décrémenter les unités dans l'abonnement
    await client.query(
      `UPDATE subscriptions 
       SET total_units = GREATEST(0, total_units - $1)
       WHERE user_id = $2`,
      [nombreAppartements, req.user.id]
    );

    await client.query('COMMIT');

    res.json({ message: 'Immeuble supprimé définitivement avec succès' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error deleting immeuble:', error);
    
    // Gérer l'erreur de contrainte de clé étrangère
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

export default {
  getImmeubles,
  getImmeubleById,
  createImmeuble,
  updateImmeuble,
  deleteImmeuble
};
