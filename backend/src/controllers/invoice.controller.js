import pool from '../config/database.js';
import { incrementInvoiceNumber } from './billing.controller.js';

// ============================================
// FACTURES CLIENTS
// ============================================

/**
 * Récupérer les factures de l'utilisateur connecté
 * GET /api/v1/invoices
 */
export async function getMyInvoices(req, res) {
  try {
    const result = await pool.query(`
      SELECT 
        id, invoice_number, invoice_date, due_date,
        subtotal, discount_percentage, discount_amount,
        vat_rate, vat_amount, total,
        period_start, period_end, plan_name, units_count,
        status, paid_at, pdf_url, created_at
      FROM invoices
      WHERE user_id = $1
      ORDER BY invoice_date DESC
    `, [req.user.id]);

    res.json({
      success: true,
      invoices: result.rows
    });
  } catch (error) {
    console.error('Error getting invoices:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
}

/**
 * Récupérer une facture spécifique
 * GET /api/v1/invoices/:id
 */
export async function getInvoice(req, res) {
  const { id } = req.params;

  try {
    const result = await pool.query(`
      SELECT * FROM invoices
      WHERE id = $1 AND user_id = $2
    `, [id, req.user.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Facture non trouvée' });
    }

    // Récupérer les infos de l'émetteur
    const billingResult = await pool.query('SELECT * FROM billing_settings LIMIT 1');
    const billingSettings = billingResult.rows[0] || {};

    res.json({
      success: true,
      invoice: result.rows[0],
      issuer: {
        company_name: billingSettings.company_name,
        vat_number: billingSettings.vat_number,
        bce_number: billingSettings.bce_number,
        address: `${billingSettings.address_street || ''}, ${billingSettings.address_postal_code || ''} ${billingSettings.address_city || ''}, ${billingSettings.address_country || ''}`,
        email: billingSettings.email,
        phone: billingSettings.phone,
        website: billingSettings.website,
        iban: billingSettings.iban,
        bic: billingSettings.bic,
        bank_name: billingSettings.bank_name
      }
    });
  } catch (error) {
    console.error('Error getting invoice:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
}

/**
 * Créer une facture (interne - appelé lors du paiement)
 */
export async function createInvoice(userId, subscriptionData) {
  try {
    // Récupérer les paramètres de facturation
    const billingResult = await pool.query('SELECT * FROM billing_settings LIMIT 1');
    const settings = billingResult.rows[0];

    if (!settings) {
      throw new Error('Billing settings not configured');
    }

    // Générer le numéro de facture
    const year = new Date().getFullYear();
    const number = String(settings.invoice_next_number).padStart(3, '0');
    const invoiceNumber = `${settings.invoice_prefix}${year}-${number}`;

    // Récupérer les infos du client
    const userResult = await pool.query(`
      SELECT first_name, last_name, email, company_name, vat_number, is_professional,
             billing_address_street, billing_address_postal_code, 
             billing_address_city, billing_address_country
      FROM users WHERE id = $1
    `, [userId]);

    const user = userResult.rows[0];
    const clientName = user.is_professional && user.company_name 
      ? user.company_name 
      : `${user.first_name} ${user.last_name}`;
    
    const clientAddress = [
      user.billing_address_street,
      `${user.billing_address_postal_code || ''} ${user.billing_address_city || ''}`.trim(),
      user.billing_address_country || 'Belgique'
    ].filter(Boolean).join('\n');

    // Calculer les montants
    const {
      planCode,
      planName,
      unitsCount,
      pricePerUnit,
      discountPercentage = 0,
      isProfessional
    } = subscriptionData;

    const subtotal = unitsCount * pricePerUnit * 12; // Prix annuel
    const discountAmount = subtotal * (discountPercentage / 100);
    const subtotalAfterDiscount = subtotal - discountAmount;
    const vatRate = isProfessional ? 21 : 0;
    const vatAmount = subtotalAfterDiscount * (vatRate / 100);
    const total = subtotalAfterDiscount + vatAmount;

    // Créer la facture
    const result = await pool.query(`
      INSERT INTO invoices (
        user_id, invoice_number, invoice_date, due_date,
        client_name, client_address, client_vat_number, client_is_professional,
        subtotal, discount_percentage, discount_amount,
        vat_rate, vat_amount, total,
        period_start, period_end, plan_code, plan_name, units_count, price_per_unit,
        status
      ) VALUES (
        $1, $2, CURRENT_DATE, CURRENT_DATE + INTERVAL '30 days',
        $3, $4, $5, $6,
        $7, $8, $9,
        $10, $11, $12,
        CURRENT_DATE, CURRENT_DATE + INTERVAL '1 year', $13, $14, $15, $16,
        'pending'
      )
      RETURNING *
    `, [
      userId, invoiceNumber,
      clientName, clientAddress, user.vat_number, isProfessional,
      subtotal, discountPercentage, discountAmount,
      vatRate, vatAmount, total,
      planCode, planName, unitsCount, pricePerUnit
    ]);

    // Incrémenter le compteur
    await incrementInvoiceNumber();

    console.log(`✅ Invoice ${invoiceNumber} created for user ${userId}`);
    return result.rows[0];

  } catch (error) {
    console.error('Error creating invoice:', error);
    throw error;
  }
}

/**
 * Marquer une facture comme payée
 */
export async function markInvoiceAsPaid(invoiceId, paymentMethod = 'stripe', paymentId = null) {
  try {
    await pool.query(`
      UPDATE invoices
      SET status = 'paid', 
          paid_at = CURRENT_TIMESTAMP, 
          payment_method = $2,
          stripe_payment_id = $3
      WHERE id = $1
    `, [invoiceId, paymentMethod, paymentId]);

    console.log(`✅ Invoice ${invoiceId} marked as paid`);
  } catch (error) {
    console.error('Error marking invoice as paid:', error);
    throw error;
  }
}

/**
 * [ADMIN] Récupérer toutes les factures
 * GET /api/v1/admin/invoices
 */
export async function getAllInvoices(req, res) {
  const { status, limit = 50, offset = 0 } = req.query;

  try {
    let query = `
      SELECT i.*, u.email, u.first_name, u.last_name
      FROM invoices i
      JOIN users u ON i.user_id = u.id
    `;
    const params = [];

    if (status) {
      query += ' WHERE i.status = $1';
      params.push(status);
    }

    query += ' ORDER BY i.invoice_date DESC LIMIT $' + (params.length + 1) + ' OFFSET $' + (params.length + 2);
    params.push(limit, offset);

    const result = await pool.query(query, params);

    // Compter le total
    let countQuery = 'SELECT COUNT(*) FROM invoices';
    if (status) {
      countQuery += ' WHERE status = $1';
    }
    const countResult = await pool.query(countQuery, status ? [status] : []);

    res.json({
      success: true,
      invoices: result.rows,
      total: parseInt(countResult.rows[0].count),
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
  } catch (error) {
    console.error('Error getting all invoices:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
}

/**
 * [ADMIN] Statistiques des factures
 * GET /api/v1/admin/invoices/stats
 */
export async function getInvoiceStats(req, res) {
  try {
    const result = await pool.query(`
      SELECT 
        COUNT(*) FILTER (WHERE status = 'pending') as pending_count,
        COUNT(*) FILTER (WHERE status = 'paid') as paid_count,
        SUM(total) FILTER (WHERE status = 'paid') as total_revenue,
        SUM(total) FILTER (WHERE status = 'pending') as pending_revenue,
        COUNT(*) FILTER (WHERE status = 'paid' AND paid_at >= DATE_TRUNC('month', CURRENT_DATE)) as paid_this_month,
        SUM(total) FILTER (WHERE status = 'paid' AND paid_at >= DATE_TRUNC('month', CURRENT_DATE)) as revenue_this_month
      FROM invoices
    `);

    res.json({
      success: true,
      stats: {
        pendingCount: parseInt(result.rows[0].pending_count) || 0,
        paidCount: parseInt(result.rows[0].paid_count) || 0,
        totalRevenue: parseFloat(result.rows[0].total_revenue) || 0,
        pendingRevenue: parseFloat(result.rows[0].pending_revenue) || 0,
        paidThisMonth: parseInt(result.rows[0].paid_this_month) || 0,
        revenueThisMonth: parseFloat(result.rows[0].revenue_this_month) || 0
      }
    });
  } catch (error) {
    console.error('Error getting invoice stats:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
}
