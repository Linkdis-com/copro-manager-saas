import pool from '../config/database.js';

// GET ALL - Optimisé avec une seule connexion
export async function getAllTransactions(req, res) {
  const { immeubleId } = req.params;
  const { type, limit = 50 } = req.query;

  const client = await pool.connect();
  
  try {
    // Vérifier accès
    const immeubleCheck = await client.query(
      'SELECT id FROM immeubles WHERE id = $1 AND user_id = $2 AND archived_at IS NULL',
      [immeubleId, req.user.id]
    );

    if (immeubleCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Not found', message: 'Immeuble not found or you do not have access' });
    }

    // Exécuter les 2 requêtes en parallèle
    let query = `SELECT * FROM transactions WHERE immeuble_id = $1`;
    const params = [immeubleId];

    if (type) {
      query += ` AND type = $2`;
      params.push(type);
    }

    query += ` ORDER BY date_transaction DESC, created_at DESC LIMIT $${params.length + 1}`;
    params.push(parseInt(limit));

    const [result, totalResult] = await Promise.all([
      client.query(query, params),
      client.query('SELECT COALESCE(SUM(montant), 0) as total FROM transactions WHERE immeuble_id = $1', [immeubleId])
    ]);

    res.json({
      success: true,
      transactions: result.rows,
      count: result.rows.length,
      total: parseFloat(totalResult.rows[0].total)
    });
  } catch (error) {
    console.error('Error fetching transactions:', error);
    res.status(500).json({ error: 'Failed to fetch transactions', message: error.message });
  } finally {
    client.release();
  }
}

// GET ONE - Optimisé
export async function getTransaction(req, res) {
  const { immeubleId, id } = req.params;

  const client = await pool.connect();
  
  try {
    // Exécuter les requêtes en parallèle
    const [immeubleCheck, transactionResult, detailsResult] = await Promise.all([
      client.query('SELECT id FROM immeubles WHERE id = $1 AND user_id = $2 AND archived_at IS NULL', [immeubleId, req.user.id]),
      client.query('SELECT * FROM transactions WHERE id = $1 AND immeuble_id = $2', [id, immeubleId]),
      client.query(
        `SELECT tp.*, p.nom as proprietaire_nom, p.prenom as proprietaire_prenom, p.numero_appartement
         FROM transactions_proprietaires tp
         JOIN proprietaires p ON tp.proprietaire_id = p.id
         WHERE tp.transaction_id = $1
         ORDER BY p.nom ASC`, [id]
      )
    ]);

    if (immeubleCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Not found', message: 'Immeuble not found' });
    }

    if (transactionResult.rows.length === 0) {
      return res.status(404).json({ error: 'Not found', message: 'Transaction not found' });
    }

    res.json({
      success: true,
      transaction: { ...transactionResult.rows[0], details: detailsResult.rows }
    });
  } catch (error) {
    console.error('Error fetching transaction:', error);
    res.status(500).json({ error: 'Failed to fetch transaction', message: error.message });
  } finally {
    client.release();
  }
}

// CREATE - Optimisé
export async function createTransaction(req, res) {
  const { immeubleId } = req.params;
  const { factureId, dateTransaction, type, montant, description, reference, repartition = [] } = req.body;

  if (!dateTransaction || !type || !montant) {
    return res.status(400).json({ error: 'Validation error', message: 'dateTransaction, type, and montant are required' });
  }

  const validTypes = ['charge', 'versement', 'remboursement', 'autre'];
  if (!validTypes.includes(type)) {
    return res.status(400).json({ error: 'Validation error', message: `type must be one of: ${validTypes.join(', ')}` });
  }

  const client = await pool.connect();
  
  try {
    const immeubleCheck = await client.query(
      'SELECT id FROM immeubles WHERE id = $1 AND user_id = $2 AND archived_at IS NULL',
      [immeubleId, req.user.id]
    );

    if (immeubleCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Not found', message: 'Immeuble not found or you do not have access' });
    }

    await client.query('BEGIN');

    const transactionResult = await client.query(
      `INSERT INTO transactions (immeuble_id, facture_id, date_transaction, type, montant, description, reference)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [immeubleId, factureId, dateTransaction, type, montant, description, reference]
    );

    const transaction = transactionResult.rows[0];

    // Insert batch si répartition
    let details = [];
    if (repartition && repartition.length > 0) {
      const values = repartition.map((_, i) => 
        `($1, $${i * 3 + 2}, $${i * 3 + 3}, $${i * 3 + 4})`
      ).join(', ');
      
      const params = [transaction.id];
      repartition.forEach(item => {
        params.push(item.proprietaireId, item.montant, item.pourcentage);
      });

      const detailResult = await client.query(
        `INSERT INTO transactions_proprietaires (transaction_id, proprietaire_id, montant, pourcentage)
         VALUES ${values} RETURNING *`,
        params
      );
      details = detailResult.rows;
    }

    await client.query('COMMIT');
    console.log(`✅ Transaction created: ${transaction.id} (${type}: ${montant}€)`);

    res.status(201).json({
      success: true,
      message: 'Transaction created successfully',
      transaction: { ...transaction, details }
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating transaction:', error);
    res.status(500).json({ error: 'Failed to create transaction', message: error.message });
  } finally {
    client.release();
  }
}

// UPDATE - Optimisé
export async function updateTransaction(req, res) {
  const { immeubleId, id } = req.params;
  const { dateTransaction, type, montant, description, reference, tags, proprietaire_id, nom_contrepartie } = req.body;

  const client = await pool.connect();
  
  try {
    // Vérifications en parallèle
    const [immeubleCheck, transactionCheck] = await Promise.all([
      client.query('SELECT id FROM immeubles WHERE id = $1 AND user_id = $2 AND archived_at IS NULL', [immeubleId, req.user.id]),
      client.query('SELECT * FROM transactions WHERE id = $1 AND immeuble_id = $2', [id, immeubleId])
    ]);

    if (immeubleCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Not found', message: 'Immeuble not found' });
    }

    if (transactionCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Not found', message: 'Transaction not found' });
    }

    // Update base fields
    const result = await client.query(
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

    // ✅ CORRECTION : Ajouter nom_contrepartie dans les colonnes optionnelles
    if (tags !== undefined || proprietaire_id !== undefined || nom_contrepartie !== undefined) {
      try {
        const optUpdates = [];
        const optValues = [];
        let idx = 1;

        if (tags !== undefined) {
          optUpdates.push(`tags = $${idx}`);
          optValues.push(JSON.stringify(tags));
          idx++;
        }
        if (proprietaire_id !== undefined) {
          optUpdates.push(`proprietaire_id = $${idx}`);
          optValues.push(proprietaire_id);
          idx++;
        }
        // ✅ AJOUTÉ : Support de nom_contrepartie
        if (nom_contrepartie !== undefined) {
          optUpdates.push(`nom_contrepartie = $${idx}`);
          optValues.push(nom_contrepartie);
          idx++;
        }

        if (optUpdates.length > 0) {
          optValues.push(id);
          await client.query(`UPDATE transactions SET ${optUpdates.join(', ')} WHERE id = $${idx}`, optValues);
        }
      } catch (optErr) {
        console.log('Optional columns not available:', optErr.message);
      }
    }

    console.log(`✅ Transaction updated: ${id}`);
    res.json({ success: true, message: 'Transaction updated successfully', transaction: result.rows[0] });
  } catch (error) {
    console.error('Error updating transaction:', error);
    res.status(500).json({ error: 'Failed to update transaction', message: error.message });
  } finally {
    client.release();
  }
}

// DELETE - Optimisé
export async function deleteTransaction(req, res) {
  const { immeubleId, id } = req.params;

  const client = await pool.connect();
  
  try {
    const immeubleCheck = await client.query(
      'SELECT id FROM immeubles WHERE id = $1 AND user_id = $2 AND archived_at IS NULL',
      [immeubleId, req.user.id]
    );

    if (immeubleCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Not found', message: 'Immeuble not found' });
    }

    await client.query('BEGIN');
    await client.query('DELETE FROM transactions_proprietaires WHERE transaction_id = $1', [id]);

    const result = await client.query(
      'DELETE FROM transactions WHERE id = $1 AND immeuble_id = $2 RETURNING id',
      [id, immeubleId]
    );

    if (result.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Not found', message: 'Transaction not found' });
    }

    await client.query('COMMIT');
    console.log(`✅ Transaction deleted: ${id}`);
    res.json({ success: true, message: 'Transaction deleted successfully' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error deleting transaction:', error);
    res.status(500).json({ error: 'Failed to delete transaction', message: error.message });
  } finally {
    client.release();
  }
}

// GET STATS - Optimisé avec une seule requête
export async function getStats(req, res) {
  const { immeubleId } = req.params;

  const client = await pool.connect();
  
  try {
    // Une seule requête pour tout !
    const result = await client.query(`
      SELECT 
        i.seuil_tresorerie_min,
        COALESCE(SUM(CASE WHEN t.type = 'versement' THEN t.montant ELSE 0 END), 0) as total_versements,
        COALESCE(SUM(CASE WHEN t.type = 'charge' THEN t.montant ELSE 0 END), 0) as total_charges
      FROM immeubles i
      LEFT JOIN transactions t ON t.immeuble_id = i.id
      WHERE i.id = $1 AND i.user_id = $2 AND i.archived_at IS NULL
      GROUP BY i.id, i.seuil_tresorerie_min
    `, [immeubleId, req.user.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Not found', message: 'Immeuble not found' });
    }

    const row = result.rows[0];
    const totalVersements = parseFloat(row.total_versements);
    const totalCharges = parseFloat(row.total_charges);
    const tresorerie = totalVersements - totalCharges;
    const seuilMin = parseFloat(row.seuil_tresorerie_min || 0);

    res.json({
      success: true,
      stats: { totalVersements, totalCharges, tresorerie, seuilMin, alerteTresorerie: tresorerie < seuilMin }
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: 'Failed to fetch stats', message: error.message });
  } finally {
    client.release();
  }
}

// IMPORT BULK - Optimisé avec INSERT batch
export async function importBulk(req, res) {
  const { immeubleId } = req.params;
  const { transactions: rawTransactions } = req.body;

  if (!rawTransactions || !Array.isArray(rawTransactions) || rawTransactions.length === 0) {
    return res.status(400).json({ error: 'Validation error', message: 'transactions array is required' });
  }

  const client = await pool.connect();

  try {
    // Vérifier accès
    const immeubleCheck = await client.query(
      'SELECT id FROM immeubles WHERE id = $1 AND user_id = $2 AND archived_at IS NULL',
      [immeubleId, req.user.id]
    );

    if (immeubleCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Not found', message: 'Immeuble not found' });
    }

    // Charger fournisseurs et propriétaires en parallèle
    const [fournisseursResult, proprietairesResult] = await Promise.all([
      client.query('SELECT id, nom, type, tags FROM fournisseurs WHERE immeuble_id = $1', [immeubleId]),
      client.query('SELECT id, nom, prenom FROM proprietaires WHERE immeuble_id = $1 AND actif = true', [immeubleId])
    ]);

    const fournisseurs = fournisseursResult.rows;
    const proprietaires = proprietairesResult.rows;

    // Préparer les données
    const toInsert = [];
    const errors = [];
    let autoRecognized = 0;

    for (let i = 0; i < rawTransactions.length; i++) {
      const t = rawTransactions[i];

      try {
        // ✅ CORRIGÉ : Lire avec underscores (snake_case) ET camelCase
        let dateTransaction = t.date_transaction || t.date_comptabilisation || t.dateComptabilisation || t.date;
        
        // ✅ Vérifier que la date existe
        if (!dateTransaction) {
          errors.push({ row: i + 1, error: 'Date manquante', data: t });
          continue;
        }
        
        // ✅ Si c'est déjà une string
        if (typeof dateTransaction === 'string') {
          dateTransaction = dateTransaction.trim();
          
          // ✅ AJOUTÉ : Vérifier si c'est déjà au format ISO (YYYY-MM-DD)
          if (/^\d{4}-\d{2}-\d{2}/.test(dateTransaction)) {
            // Déjà au format ISO, ne rien faire
            dateTransaction = dateTransaction.substring(0, 10); // Prendre seulement YYYY-MM-DD
          } 
          // Sinon, parser DD-MM-YYYY ou DD/MM/YYYY
          else {
            const parts = dateTransaction.split(/[-\/]/);
            if (parts.length === 3) {
              let day, month, year;
              
              // Format YYYY-MM-DD (au cas où)
              if (parts[0].length === 4) {
                [year, month, day] = parts;
              }
              // Format DD-MM-YYYY ou DD/MM/YYYY
              else {
                [day, month, year] = parts;
                if (year.length === 2) year = '20' + year;
              }
              
              dateTransaction = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
            }
          }
        }
        
        // ✅ Vérifier que la date est valide après parsing
        if (!dateTransaction || !/^\d{4}-\d{2}-\d{2}$/.test(dateTransaction)) {
          errors.push({ row: i + 1, error: 'Date invalide après parsing', data: t });
          continue;
        }


        // Parser montant
        let montant = t.montant;
        if (typeof montant === 'string') {
          montant = montant.replace(/\s/g, '').replace(',', '.');
        }
        montant = parseFloat(montant);

        if (isNaN(montant)) {
          errors.push({ row: i + 1, error: 'Montant invalide', data: t });
          continue;
        }

        const type = montant < 0 ? 'charge' : 'versement';
        const montantAbs = Math.abs(montant);

        // Reconnaissance auto
        let proprietaireId = null;

        // Reconnaître propriétaire pour dépôts
        if (type === 'versement' && (t.nomContrepartie || t.communication)) {
          const searchText = `${t.nomContrepartie || ''} ${t.communication || ''}`.toUpperCase();
          for (const prop of proprietaires) {
            if (searchText.includes(prop.nom.toUpperCase())) {
              proprietaireId = prop.id;
              autoRecognized++;
              break;
            }
          }
        }

        // Reconnaître fournisseur pour charges
        if (type === 'charge' && t.nomContrepartie) {
          const nomUpper = t.nomContrepartie.toUpperCase();
          for (const f of fournisseurs) {
            if (nomUpper.includes(f.nom.toUpperCase())) {
              autoRecognized++;
              break;
            }
          }
          // Frais bancaires
          const communication = (t.communication || '').toUpperCase();
          if (nomUpper.includes('FRAIS') || communication.includes('FRAIS')) {
            autoRecognized++;
          }
        }

        const description = [t.nomContrepartie, t.communication].filter(Boolean).join(' - ').substring(0, 500);

        toInsert.push({
          dateTransaction,
          type,
          montant: montantAbs,
          description,
          reference: t.reference || t.compte || null,
          proprietaireId
        });

      } catch (err) {
        errors.push({ row: i + 1, error: err.message, data: t });
      }
    }

    // INSERT BATCH en une seule requête
    if (toInsert.length > 0) {
      await client.query('BEGIN');

      const values = [];
      const params = [];
      
      toInsert.forEach((t, i) => {
        const offset = i * 6;
        values.push(`($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6})`);
        params.push(immeubleId, t.dateTransaction, t.type, t.montant, t.description, t.reference);
      });

      await client.query(
        `INSERT INTO transactions (immeuble_id, date_transaction, type, montant, description, reference)
         VALUES ${values.join(', ')}`,
        params
      );

      await client.query('COMMIT');
    }

    console.log(`✅ Bulk import: ${toInsert.length} transactions imported, ${autoRecognized} auto-recognized`);

    res.status(201).json({
      success: true,
      message: `${toInsert.length} transactions importées`,
      imported: toInsert.length,
      autoRecognized,
      errors: errors.length,
      details: { errors }
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error importing transactions:', error);
    res.status(500).json({ error: 'Failed to import transactions', message: error.message });
  } finally {
    client.release();
  }
}

// MIGRATION - Ajouter colonnes manquantes
export async function migrateColumns(req, res) {
  const client = await pool.connect();
  
  try {
    const results = [];
    
    const columns = [
      { sql: `ALTER TABLE transactions ADD COLUMN proprietaire_id UUID REFERENCES proprietaires(id) ON DELETE SET NULL`, name: 'proprietaire_id' },
      { sql: `ALTER TABLE transactions ADD COLUMN tags JSONB DEFAULT '[]'::jsonb`, name: 'tags' },
      { sql: `ALTER TABLE transactions ADD COLUMN nom_contrepartie VARCHAR(255)`, name: 'nom_contrepartie' },
      { sql: `ALTER TABLE transactions ADD COLUMN communication TEXT`, name: 'communication' }
    ];

    for (const col of columns) {
      try {
        await client.query(col.sql);
        results.push(`${col.name}: ajouté`);
      } catch (e) {
        results.push(`${col.name}: ${e.message.includes('already exists') ? 'existe déjà' : e.message}`);
      }
    }
    
    console.log('✅ Migration colonnes:', results);
    res.json({ success: true, results });
  } catch (error) {
    console.error('Migration error:', error);
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
}
