import pool from '../config/database.js';

export async function getAllImmeubles(req, res) {
  try {
    const result = await pool.query(
      `SELECT i.*, COUNT(p.id) as nombre_proprietaires_actifs,
       COALESCE(SUM(CASE WHEN p.actif = true THEN 1 ELSE 0 END), 0) as unites_utilisees
       FROM immeubles i LEFT JOIN proprietaires p ON i.id = p.immeuble_id AND p.actif = true
       WHERE i.user_id = $1 AND i.archived_at IS NULL GROUP BY i.id ORDER BY i.created_at DESC`,
      [req.user.id]
    );
    res.json({ success: true, immeubles: result.rows, count: result.rows.length });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Failed to fetch', message: error.message });
  }
}

export async function getImmeuble(req, res) {
  try {
    const result = await pool.query(
      `SELECT i.*, COUNT(p.id) as nombre_proprietaires_actifs,
       COALESCE(SUM(CASE WHEN p.actif = true THEN 1 ELSE 0 END), 0) as unites_utilisees
       FROM immeubles i LEFT JOIN proprietaires p ON i.id = p.immeuble_id AND p.actif = true
       WHERE i.id = $1 AND i.user_id = $2 AND i.archived_at IS NULL GROUP BY i.id`,
      [req.params.id, req.user.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ success: true, immeuble: result.rows[0] });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Failed to fetch', message: error.message });
  }
}

export async function createImmeuble(req, res) {
  const { nom, adresse, codePostal, ville, pays = 'BE', region = 'brussels',
    nombreAppartements, systemeRepartition = 'milliemes', chargesMensuelles = 0,
    datePrelevementCharges = 5, seuilTresorerieMin = 1000 } = req.body;

  if (!nom || !nombreAppartements) return res.status(400).json({ error: 'nom and nombreAppartements required' });
  if (nombreAppartements < 1) return res.status(400).json({ error: 'nombreAppartements must be >= 1' });

  const validRegions = ['brussels', 'wallonia', 'flanders'];
  if (!validRegions.includes(region)) return res.status(400).json({ error: `region must be: ${validRegions.join(', ')}` });

  const validSystemes = ['milliemes', 'parts'];
  if (!validSystemes.includes(systemeRepartition)) return res.status(400).json({ error: `systemeRepartition must be: ${validSystemes.join(', ')}` });

  try {
    const subscription = await pool.query('SELECT * FROM subscriptions WHERE user_id = $1 AND status = $2', [req.user.id, 'active']);
    if (subscription.rows.length === 0) return res.status(403).json({ error: 'No active subscription' });

    const sub = subscription.rows[0];
    const existingImmeubles = await pool.query('SELECT COUNT(*) as count FROM immeubles WHERE user_id = $1 AND archived_at IS NULL', [req.user.id]);
    const immeublesCount = parseInt(existingImmeubles.rows[0].count);

    if (sub.plan !== 'premium' && immeublesCount >= 1) return res.status(403).json({ error: `${sub.plan} plan allows only 1 immeuble` });
    if (sub.max_units && (sub.current_units + nombreAppartements) > sub.max_units) {
      return res.status(403).json({ error: 'Unit limit reached', message: `Would exceed limit of ${sub.max_units} units` });
    }

    const result = await pool.query(
      `INSERT INTO immeubles (user_id, nom, adresse, code_postal, ville, pays, region, nombre_appartements, 
       systeme_repartition, charges_mensuelles, date_prelevement_charges, seuil_tresorerie_min)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING *`,
      [req.user.id, nom, adresse, codePostal, ville, pays, region, nombreAppartements, systemeRepartition,
       chargesMensuelles, datePrelevementCharges, seuilTresorerieMin]
    );

    await pool.query('UPDATE subscriptions SET current_units = current_units + $1 WHERE user_id = $2', [nombreAppartements, req.user.id]);
    console.log(`✅ Immeuble created: ${nom} by ${req.user.email}`);
    res.status(201).json({ success: true, immeuble: result.rows[0] });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Failed to create', message: error.message });
  }
}

export async function updateImmeuble(req, res) {
  const { id } = req.params;
  const { nom, adresse, codePostal, ville, pays, region, nombreAppartements, systemeRepartition,
    chargesMensuelles, datePrelevementCharges, seuilTresorerieMin, mode_comptage_eau, numero_compteur_principal } = req.body;

  if (region && !['brussels', 'wallonia', 'flanders'].includes(region)) {
    return res.status(400).json({ error: 'Invalid region' });
  }
  if (systemeRepartition && !['milliemes', 'parts'].includes(systemeRepartition)) {
    return res.status(400).json({ error: 'Invalid systemeRepartition' });
  }

  try {
    const existing = await pool.query('SELECT * FROM immeubles WHERE id = $1 AND user_id = $2 AND archived_at IS NULL', [id, req.user.id]);
    if (existing.rows.length === 0) return res.status(404).json({ error: 'Not found' });

    const oldImmeuble = existing.rows[0];

    if (nombreAppartements && nombreAppartements !== oldImmeuble.nombre_appartements) {
      const subscription = await pool.query('SELECT * FROM subscriptions WHERE user_id = $1 AND status = $2', [req.user.id, 'active']);
      if (subscription.rows.length > 0) {
        const sub = subscription.rows[0];
        const difference = nombreAppartements - oldImmeuble.nombre_appartements;
        const newTotal = sub.current_units + difference;
        if (sub.max_units && newTotal > sub.max_units) {
          return res.status(403).json({ error: 'Unit limit reached' });
        }
        await pool.query('UPDATE subscriptions SET current_units = current_units + $1 WHERE user_id = $2', [difference, req.user.id]);
      }
    }

    // ✅ SANS total_milliemes
    const result = await pool.query(
      `UPDATE immeubles SET
        nom = COALESCE($1, nom), adresse = COALESCE($2, adresse), code_postal = COALESCE($3, code_postal),
        ville = COALESCE($4, ville), pays = COALESCE($5, pays), region = COALESCE($6, region),
        nombre_appartements = COALESCE($7, nombre_appartements), systeme_repartition = COALESCE($8, systeme_repartition),
        charges_mensuelles = COALESCE($9, charges_mensuelles), date_prelevement_charges = COALESCE($10, date_prelevement_charges),
        seuil_tresorerie_min = COALESCE($11, seuil_tresorerie_min), mode_comptage_eau = COALESCE($12, mode_comptage_eau),
        numero_compteur_principal = COALESCE($13, numero_compteur_principal), updated_at = CURRENT_TIMESTAMP
      WHERE id = $14 AND user_id = $15 RETURNING *`,
      [nom, adresse, codePostal, ville, pays, region, nombreAppartements, systemeRepartition, chargesMensuelles,
       datePrelevementCharges, seuilTresorerieMin, mode_comptage_eau, numero_compteur_principal, id, req.user.id]
    );

    console.log(`✅ Immeuble updated: ${id}`);
    res.json({ success: true, immeuble: result.rows[0] });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Failed to update', message: error.message });
  }
}

export async function deleteImmeuble(req, res) {
  try {
    const existing = await pool.query('SELECT * FROM immeubles WHERE id = $1 AND user_id = $2 AND archived_at IS NULL', [req.params.id, req.user.id]);
    if (existing.rows.length === 0) return res.status(404).json({ error: 'Not found' });

    const immeuble = existing.rows[0];
    await pool.query('UPDATE immeubles SET archived_at = CURRENT_TIMESTAMP WHERE id = $1', [req.params.id]);
    await pool.query('UPDATE subscriptions SET current_units = current_units - $1 WHERE user_id = $2', [immeuble.nombre_appartements, req.user.id]);

    console.log(`✅ Immeuble archived: ${req.params.id}`);
    res.json({ success: true });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Failed to delete', message: error.message });
  }
}
