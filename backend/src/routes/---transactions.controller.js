import pool from '../config/database.js';

// GET ALL - Lister toutes les transactions d'un immeuble
export async function getAllTransactions(req, res) {
  const { immeubleId } = req.params;
  const { type, limit = 50 } = req.query;

  try {
    // Vérifier que l'immeuble appartient à l'utilisateur
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

    // Construire la requête avec filtre optionnel sur le type
    let query = `
      SELECT t.*
      FROM transactions t
      WHERE t.immeuble_id = $1
    `;
    const params = [immeubleId];

    if (type) {
      query += ` AND t.type = $2`;
      params.push(type);
    }

    query += ` ORDER BY t.date_transaction DESC, t.created_at DESC LIMIT $${params.length + 1}`;
    params.push(limit);

    const result = await pool.query(query, params);

    // Calculer le total
    const totalResult = await pool.query(
      'SELECT COALESCE(SUM(montant), 0) as total FROM transactions WHERE immeuble_id = $1',
      [immeubleId]
    );

    res.json({
      success: true,
      transactions: result.rows,
      count: result.rows.length,
      total: parseFloat(totalResult.rows[0].total)
    });
  } catch (error) {
    console.error('Error fetching transactions:', error);
    res.status(500).json({ 
      error: 'Failed to fetch transactions',
      message: error.message 
    });
  }
}

// GET ONE - Récupérer une transaction avec ses détails
export async function getTransaction(req, res) {
  const { immeubleId, id } = req.params;

  try {
    // Vérifier que l'immeuble appartient à l'utilisateur
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

    // Récupérer la transaction
    const transactionResult = await pool.query(
      'SELECT * FROM transactions WHERE id = $1 AND immeuble_id = $2',
      [id, immeubleId]
    );

    if (transactionResult.rows.length === 0) {
      return res.status(404).json({ 
        error: 'Not found',
        message: 'Transaction not found' 
      });
    }

    const transaction = transactionResult.rows[0];

    // Récupérer les détails par propriétaire (si applicable)
    const detailsResult = await pool.query(
      `SELECT 
        tp.*,
        p.nom as proprietaire_nom,
        p.prenom as proprietaire_prenom,
        p.numero_appartement
      FROM transactions_proprietaires tp
      JOIN proprietaires p ON tp.proprietaire_id = p.id
      WHERE tp.transaction_id = $1
      ORDER BY p.nom ASC`,
      [id]
    );

    res.json({
      success: true,
      transaction: {
        ...transaction,
        details: detailsResult.rows
      }
    });
  } catch (error) {
    console.error('Error fetching transaction:', error);
    res.status(500).json({ 
      error: 'Failed to fetch transaction',
      message: error.message 
    });
  }
}

// CREATE - Créer une nouvelle transaction
export async function createTransaction(req, res) {
  const { immeubleId } = req.params;
  const {
    factureId,
    dateTransaction,
    type,
    montant,
    description,
    reference,
    repartition = [] // Optionnel : [{proprietaireId, montant, pourcentage}]
  } = req.body;

  // Validation
  if (!dateTransaction || !type || !montant) {
    return res.status(400).json({ 
      error: 'Validation error',
      message: 'dateTransaction, type, and montant are required' 
    });
  }

  const validTypes = ['charge', 'versement', 'remboursement', 'autre'];
  if (!validTypes.includes(type)) {
    return res.status(400).json({ 
      error: 'Validation error',
      message: `type must be one of: ${validTypes.join(', ')}` 
    });
  }

  try {
    // Vérifier que l'immeuble appartient à l'utilisateur
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

    // Si facture spécifiée, vérifier qu'elle existe
    if (factureId) {
      const factureCheck = await pool.query(
        'SELECT id FROM factures WHERE id = $1 AND immeuble_id = $2',
        [factureId, immeubleId]
      );

      if (factureCheck.rows.length === 0) {
        return res.status(404).json({ 
          error: 'Not found',
          message: 'Facture not found' 
        });
      }
    }

    // Commencer une transaction
    await pool.query('BEGIN');

    // Créer la transaction
    const transactionResult = await pool.query(
      `INSERT INTO transactions (
        immeuble_id, facture_id, date_transaction, type,
        montant, description, reference
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *`,
      [immeubleId, factureId, dateTransaction, type, montant, description, reference]
    );

    const transaction = transactionResult.rows[0];

    // Si répartition fournie, l'enregistrer
    const details = [];
    if (repartition && repartition.length > 0) {
      for (const item of repartition) {
        const detailResult = await pool.query(
          `INSERT INTO transactions_proprietaires (
            transaction_id, proprietaire_id, montant, pourcentage
          ) VALUES ($1, $2, $3, $4)
          RETURNING *`,
          [transaction.id, item.proprietaireId, item.montant, item.pourcentage]
        );
        details.push(detailResult.rows[0]);
      }
    }

    await pool.query('COMMIT');

    console.log(`✅ Transaction created: ${transaction.id} (${type}: ${montant}€) by user ${req.user.email}`);

    res.status(201).json({
      success: true,
      message: 'Transaction created successfully',
      transaction: {
        ...transaction,
        details
      }
    });
  } catch (error) {
    await pool.query('ROLLBACK');
    console.error('Error creating transaction:', error);
    res.status(500).json({ 
      error: 'Failed to create transaction',
      message: error.message 
    });
  }
}

// UPDATE - Modifier une transaction
export async function updateTransaction(req, res) {
  const { immeubleId, id } = req.params;
  const { dateTransaction, type, montant, description, reference } = req.body;

  try {
    // Vérifier que l'immeuble appartient à l'utilisateur
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

    // Vérifier que la transaction existe
    const transactionCheck = await pool.query(
      'SELECT id FROM transactions WHERE id = $1 AND immeuble_id = $2',
      [id, immeubleId]
    );

    if (transactionCheck.rows.length === 0) {
      return res.status(404).json({ 
        error: 'Not found',
        message: 'Transaction not found' 
      });
    }

    // Mettre à jour
    const result = await pool.query(
      `UPDATE transactions SET
        date_transaction = COALESCE($1, date_transaction),
        type = COALESCE($2, type),
        montant = COALESCE($3, montant),
        description = COALESCE($4, description),
        reference = COALESCE($5, reference)
      WHERE id = $6 AND immeuble_id = $7
      RETURNING *`,
      [dateTransaction, type, montant, description, reference, id, immeubleId]
    );

    console.log(`✅ Transaction updated: ${id} by user ${req.user.email}`);

    res.json({
      success: true,
      message: 'Transaction updated successfully',
      transaction: result.rows[0]
    });
  } catch (error) {
    console.error('Error updating transaction:', error);
    res.status(500).json({ 
      error: 'Failed to update transaction',
      message: error.message 
    });
  }
}

// DELETE - Supprimer une transaction
export async function deleteTransaction(req, res) {
  const { immeubleId, id } = req.params;

  try {
    // Vérifier que l'immeuble appartient à l'utilisateur
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

    // Commencer une transaction
    await pool.query('BEGIN');

    // Supprimer les détails d'abord
    await pool.query(
      'DELETE FROM transactions_proprietaires WHERE transaction_id = $1',
      [id]
    );

    // Supprimer la transaction
    const result = await pool.query(
      'DELETE FROM transactions WHERE id = $1 AND immeuble_id = $2 RETURNING id',
      [id, immeubleId]
    );

    if (result.rows.length === 0) {
      await pool.query('ROLLBACK');
      return res.status(404).json({ 
        error: 'Not found',
        message: 'Transaction not found' 
      });
    }

    await pool.query('COMMIT');

    console.log(`✅ Transaction deleted: ${id} by user ${req.user.email}`);

    res.json({
      success: true,
      message: 'Transaction deleted successfully'
    });
  } catch (error) {
    await pool.query('ROLLBACK');
    console.error('Error deleting transaction:', error);
    res.status(500).json({ 
      error: 'Failed to delete transaction',
      message: error.message 
    });
  }
}

// GET STATS - Statistiques et trésorerie
export async function getStats(req, res) {
  const { immeubleId } = req.params;

  try {
    // Vérifier que l'immeuble appartient à l'utilisateur
    const immeubleCheck = await pool.query(
      'SELECT id, seuil_tresorerie_min FROM immeubles WHERE id = $1 AND user_id = $2 AND archived_at IS NULL',
      [immeubleId, req.user.id]
    );

    if (immeubleCheck.rows.length === 0) {
      return res.status(404).json({ 
        error: 'Not found',
        message: 'Immeuble not found' 
      });
    }

    const immeuble = immeubleCheck.rows[0];

    // Total des versements
    const versementsResult = await pool.query(
      `SELECT COALESCE(SUM(montant), 0) as total 
       FROM transactions 
       WHERE immeuble_id = $1 AND type = 'versement'`,
      [immeubleId]
    );

    // Total des charges
    const chargesResult = await pool.query(
      `SELECT COALESCE(SUM(montant), 0) as total 
       FROM transactions 
       WHERE immeuble_id = $1 AND type = 'charge'`,
      [immeubleId]
    );

    const totalVersements = parseFloat(versementsResult.rows[0].total);
    const totalCharges = parseFloat(chargesResult.rows[0].total);
    const tresorerie = totalVersements - totalCharges;
    const seuilMin = parseFloat(immeuble.seuil_tresorerie_min || 0);

    res.json({
      success: true,
      stats: {
        totalVersements,
        totalCharges,
        tresorerie,
        seuilMin,
        alerteTresorerie: tresorerie < seuilMin
      }
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ 
      error: 'Failed to fetch stats',
      message: error.message 
    });
  }
}