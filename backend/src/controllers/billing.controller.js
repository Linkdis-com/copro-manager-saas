import pool from '../config/database.js';

// ============================================
// PARAMÈTRES DE FACTURATION (Admin)
// ============================================

/**
 * Récupérer les paramètres de facturation
 * GET /api/v1/admin/billing-settings
 */
export async function getBillingSettings(req, res) {
  try {
    const result = await pool.query('SELECT * FROM billing_settings LIMIT 1');

    if (result.rows.length === 0) {
      // Créer une entrée par défaut
      const newResult = await pool.query(`
        INSERT INTO billing_settings (company_name)
        VALUES ('Ma Société')
        RETURNING *
      `);
      return res.json({ success: true, settings: newResult.rows[0] });
    }

    res.json({ success: true, settings: result.rows[0] });
  } catch (error) {
    console.error('Error getting billing settings:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
}

/**
 * Mettre à jour les paramètres de facturation
 * PUT /api/v1/admin/billing-settings
 */
export async function updateBillingSettings(req, res) {
  const {
    company_name,
    vat_number,
    bce_number,
    address_street,
    address_postal_code,
    address_city,
    address_country,
    email,
    phone,
    website,
    iban,
    bic,
    bank_name,
    invoice_prefix,
    vat_applicable,
    vat_rate,
    legal_mentions,
    logo_url
  } = req.body;

  try {
    // Vérifier qu'il existe une entrée
    const existing = await pool.query('SELECT id FROM billing_settings LIMIT 1');
    
    if (existing.rows.length === 0) {
      // Créer
      const result = await pool.query(`
        INSERT INTO billing_settings (
          company_name, vat_number, bce_number, 
          address_street, address_postal_code, address_city, address_country,
          email, phone, website,
          iban, bic, bank_name,
          invoice_prefix, vat_applicable, vat_rate, legal_mentions, logo_url
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
        RETURNING *
      `, [
        company_name, vat_number, bce_number,
        address_street, address_postal_code, address_city, address_country || 'Belgique',
        email, phone, website,
        iban, bic, bank_name,
        invoice_prefix || 'F', vat_applicable !== false, vat_rate || 21, legal_mentions, logo_url
      ]);

      return res.json({ success: true, settings: result.rows[0] });
    }

    // Mettre à jour
    const result = await pool.query(`
      UPDATE billing_settings SET
        company_name = COALESCE($1, company_name),
        vat_number = $2,
        bce_number = $3,
        address_street = $4,
        address_postal_code = $5,
        address_city = $6,
        address_country = COALESCE($7, 'Belgique'),
        email = $8,
        phone = $9,
        website = $10,
        iban = $11,
        bic = $12,
        bank_name = $13,
        invoice_prefix = COALESCE($14, invoice_prefix),
        vat_applicable = COALESCE($15, vat_applicable),
        vat_rate = COALESCE($16, vat_rate),
        legal_mentions = $17,
        logo_url = $18,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $19
      RETURNING *
    `, [
      company_name, vat_number, bce_number,
      address_street, address_postal_code, address_city, address_country,
      email, phone, website,
      iban, bic, bank_name,
      invoice_prefix, vat_applicable, vat_rate, legal_mentions, logo_url,
      existing.rows[0].id
    ]);

    console.log('✅ Billing settings updated');
    res.json({ success: true, settings: result.rows[0] });

  } catch (error) {
    console.error('Error updating billing settings:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
}

/**
 * Récupérer le prochain numéro de facture
 * GET /api/v1/admin/billing-settings/next-invoice-number
 */
export async function getNextInvoiceNumber(req, res) {
  try {
    const result = await pool.query(`
      SELECT invoice_prefix, invoice_next_number 
      FROM billing_settings LIMIT 1
    `);

    if (result.rows.length === 0) {
      return res.json({ 
        invoiceNumber: 'F' + new Date().getFullYear() + '-001' 
      });
    }

    const { invoice_prefix, invoice_next_number } = result.rows[0];
    const year = new Date().getFullYear();
    const number = String(invoice_next_number).padStart(3, '0');
    
    res.json({ 
      invoiceNumber: `${invoice_prefix}${year}-${number}` 
    });
  } catch (error) {
    console.error('Error getting next invoice number:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
}

/**
 * Incrémenter le numéro de facture
 */
export async function incrementInvoiceNumber() {
  await pool.query(`
    UPDATE billing_settings 
    SET invoice_next_number = invoice_next_number + 1
  `);
}
