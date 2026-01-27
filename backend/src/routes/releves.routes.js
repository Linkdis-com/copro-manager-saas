import express from 'express';
import { authenticate } from '../middleware/auth.js';
import pool from '../config/database.js';

const router = express.Router({ mergeParams: true });
router.use(authenticate);

// GET /api/v1/decomptes/:decompteId/releves
router.get('/', async (req, res) => {
  try {
    const { decompteId } = req.params;

    // Vérifier ownership
    const decompte = await pool.query(
      'SELECT id FROM decomptes WHERE id = $1 AND user_id = $2',
      [decompteId, req.user.id]
    );

    if (decompte.rows.length === 0) {
      return res.status(404).json({ error: 'Décompte not found' });
    }

    const result = await pool.query(`
      SELECT 
        r.*,
        c.numero_compteur,
        c.emplacement,
        l.nom as locataire_nom,
        l.prenom as locataire_prenom,
        l.nombre_habitants,
        p.nom as proprietaire_nom,
        p.prenom as proprietaire_prenom
      FROM releves_compteurs r
      JOIN compteurs_eau c ON r.compteur_id = c.id
      LEFT JOIN locataires l ON c.locataire_id = l.id
      LEFT JOIN proprietaires p ON c.proprietaire_id = p.id
      WHERE r.decompte_id = $1
      ORDER BY c.numero_compteur ASC
    `, [decompteId]);

    res.json({ releves: result.rows });
  } catch (error) {
    console.error('Error fetching releves:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/v1/decomptes/:decompteId/releves - Créer UN relevé
router.post('/', async (req, res) => {
  try {
    const { decompteId } = req.params;
    const { compteurId, dateReleve, indexPrecedent, indexActuel, notes } = req.body;

    // Validation
    if (!compteurId || !dateReleve || indexPrecedent === undefined || indexActuel === undefined) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'compteurId, dateReleve, indexPrecedent, and indexActuel are required'
      });
    }

    if (parseFloat(indexActuel) < parseFloat(indexPrecedent)) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'Index actuel doit être supérieur ou égal à index précédent'
      });
    }

    // Vérifier ownership
    const decompte = await pool.query(
      'SELECT id FROM decomptes WHERE id = $1 AND user_id = $2',
      [decompteId, req.user.id]
    );

    if (decompte.rows.length === 0) {
      return res.status(404).json({ error: 'Décompte not found' });
    }

    // Calculer la consommation
    const consommation = parseFloat(indexActuel) - parseFloat(indexPrecedent);

    const result = await pool.query(`
      INSERT INTO releves_compteurs (
        decompte_id, compteur_id, date_releve, index_precedent, index_actuel, consommation, notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `, [decompteId, compteurId, dateReleve, indexPrecedent, indexActuel, consommation, notes || null]);

    res.status(201).json({ releve: result.rows[0] });
  } catch (error) {
    console.error('Error creating releve:', error);
    res.status(500).json({ error: 'Internal server error', message: error.message });
  }
});

// POST /api/v1/decomptes/:decompteId/releves/bulk - Import BULK (Excel)
router.post('/bulk', async (req, res) => {
  try {
    const { decompteId } = req.params;
    const { releves } = req.body;

    if (!releves || !Array.isArray(releves) || releves.length === 0) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'releves array is required'
      });
    }

    // Vérifier ownership
    const decompte = await pool.query(
      'SELECT d.id, i.id as immeuble_id FROM decomptes d JOIN immeubles i ON d.immeuble_id = i.id WHERE d.id = $1 AND d.user_id = $2',
      [decompteId, req.user.id]
    );

    if (decompte.rows.length === 0) {
      return res.status(404).json({ error: 'Décompte not found' });
    }

    const immeubleId = decompte.rows[0].immeuble_id;

    // Récupérer tous les compteurs de l'immeuble pour mapper par numéro
    const compteursResult = await pool.query(
      'SELECT id, numero_compteur FROM compteurs_eau WHERE immeuble_id = $1',
      [immeubleId]
    );
    
    const compteursMap = {};
    compteursResult.rows.forEach(c => {
      compteursMap[c.numero_compteur.toLowerCase().trim()] = c.id;
    });

    const insertedReleves = [];
    const errors = [];

    for (let i = 0; i < releves.length; i++) {
      const r = releves[i];
      const rowNum = i + 2; // +2 car ligne 1 = headers

      try {
        // Trouver le compteur par numéro
        const compteurId = r.compteurId || compteursMap[r.numeroCompteur?.toLowerCase().trim()];
        
        if (!compteurId) {
          errors.push({ row: rowNum, error: `Compteur "${r.numeroCompteur}" non trouvé` });
          continue;
        }

        const indexPrecedent = parseFloat(r.indexPrecedent);
        const indexActuel = parseFloat(r.indexActuel);

        if (isNaN(indexPrecedent) || isNaN(indexActuel)) {
          errors.push({ row: rowNum, error: 'Index invalides' });
          continue;
        }

        if (indexActuel < indexPrecedent) {
          errors.push({ row: rowNum, error: 'Index actuel < Index précédent' });
          continue;
        }

        const consommation = indexActuel - indexPrecedent;
        const dateReleve = r.dateReleve || new Date().toISOString().split('T')[0];

        // Vérifier si un relevé existe déjà pour ce compteur et cette date
        const existing = await pool.query(
          'SELECT id FROM releves_compteurs WHERE decompte_id = $1 AND compteur_id = $2',
          [decompteId, compteurId]
        );

        if (existing.rows.length > 0) {
          // Mettre à jour
          const updateResult = await pool.query(`
            UPDATE releves_compteurs 
            SET date_releve = $1, index_precedent = $2, index_actuel = $3, consommation = $4, notes = $5, updated_at = NOW()
            WHERE id = $6
            RETURNING *
          `, [dateReleve, indexPrecedent, indexActuel, consommation, r.notes || null, existing.rows[0].id]);
          
          insertedReleves.push({ ...updateResult.rows[0], action: 'updated' });
        } else {
          // Insérer
          const insertResult = await pool.query(`
            INSERT INTO releves_compteurs (decompte_id, compteur_id, date_releve, index_precedent, index_actuel, consommation, notes)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING *
          `, [decompteId, compteurId, dateReleve, indexPrecedent, indexActuel, consommation, r.notes || null]);
          
          insertedReleves.push({ ...insertResult.rows[0], action: 'inserted' });
        }
      } catch (err) {
        errors.push({ row: rowNum, error: err.message });
      }
    }

    res.status(201).json({
      message: `${insertedReleves.length} relevés importés`,
      imported: insertedReleves.length,
      errors: errors.length,
      details: {
        releves: insertedReleves,
        errors: errors
      }
    });
  } catch (error) {
    console.error('Error bulk importing releves:', error);
    res.status(500).json({ error: 'Internal server error', message: error.message });
  }
});

// GET /api/v1/decomptes/:decompteId/releves/template - Télécharger modèle
router.get('/template', async (req, res) => {
  try {
    const { decompteId } = req.params;

    // Vérifier ownership et récupérer l'immeuble
    const decompte = await pool.query(`
      SELECT d.id, i.id as immeuble_id, i.nom as immeuble_nom
      FROM decomptes d 
      JOIN immeubles i ON d.immeuble_id = i.id 
      WHERE d.id = $1 AND d.user_id = $2
    `, [decompteId, req.user.id]);

    if (decompte.rows.length === 0) {
      return res.status(404).json({ error: 'Décompte not found' });
    }

    // Récupérer tous les compteurs avec leurs occupants
    const compteurs = await pool.query(`
      SELECT 
        c.numero_compteur,
        c.emplacement,
        COALESCE(l.nom || ' ' || l.prenom, p.nom || ' ' || p.prenom, 'Non assigné') as occupant
      FROM compteurs_eau c
      LEFT JOIN locataires l ON c.locataire_id = l.id
      LEFT JOIN proprietaires p ON c.proprietaire_id = p.id
      WHERE c.immeuble_id = $1 AND c.actif = true
      ORDER BY c.numero_compteur
    `, [decompte.rows[0].immeuble_id]);

    // Créer le template avec les données pré-remplies
    const template = {
      headers: ['Numéro Compteur', 'Occupant', 'Emplacement', 'Index Précédent', 'Index Actuel', 'Notes'],
      rows: compteurs.rows.map(c => ({
        numeroCompteur: c.numero_compteur,
        occupant: c.occupant,
        emplacement: c.emplacement || '',
        indexPrecedent: '',
        indexActuel: '',
        notes: ''
      })),
      immeuble: decompte.rows[0].immeuble_nom
    };

    res.json({ template });
  } catch (error) {
    console.error('Error generating template:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /api/v1/decomptes/:decompteId/releves/:id
router.patch('/:id', async (req, res) => {
  try {
    const { decompteId, id } = req.params;
    const { dateReleve, indexPrecedent, indexActuel, notes } = req.body;

    const updates = [];
    const values = [];
    let valueIndex = 1;

    if (dateReleve) {
      updates.push(`date_releve = $${valueIndex}`);
      values.push(dateReleve);
      valueIndex++;
    }

    if (indexPrecedent !== undefined) {
      updates.push(`index_precedent = $${valueIndex}`);
      values.push(indexPrecedent);
      valueIndex++;
    }

    if (indexActuel !== undefined) {
      updates.push(`index_actuel = $${valueIndex}`);
      values.push(indexActuel);
      valueIndex++;
    }

    if (notes !== undefined) {
      updates.push(`notes = $${valueIndex}`);
      values.push(notes);
      valueIndex++;
    }

    // Recalculer la consommation si les index changent
    if (indexPrecedent !== undefined || indexActuel !== undefined) {
      updates.push(`consommation = index_actuel - index_precedent`);
    }

    updates.push(`updated_at = NOW()`);

    if (updates.length === 1) { // Seulement updated_at
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    values.push(id, decompteId, req.user.id);

    const query = `
      UPDATE releves_compteurs r
      SET ${updates.join(', ')}
      FROM decomptes d
      WHERE r.id = $${valueIndex}
        AND r.decompte_id = $${valueIndex + 1}
        AND d.id = r.decompte_id
        AND d.user_id = $${valueIndex + 2}
      RETURNING r.*
    `;

    const result = await pool.query(query, values);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Relevé not found' });
    }

    res.json({ releve: result.rows[0] });
  } catch (error) {
    console.error('Error updating releve:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/v1/decomptes/:decompteId/releves/:id
router.delete('/:id', async (req, res) => {
  try {
    const { decompteId, id } = req.params;

    const result = await pool.query(`
      DELETE FROM releves_compteurs r
      USING decomptes d
      WHERE r.id = $1
        AND r.decompte_id = $2
        AND d.id = r.decompte_id
        AND d.user_id = $3
      RETURNING r.id
    `, [id, decompteId, req.user.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Relevé not found' });
    }

    res.json({ message: 'Relevé deleted successfully' });
  } catch (error) {
    console.error('Error deleting releve:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;