'use strict';

const pool = require('../config/database');
const { calculateExpiredStatus } = require('../utils/expiredStatus');

/**
 * Ringkasan agregat: total produk dan jumlah per status (dihitung real-time di JS).
 * @returns {Promise<object>}
 */
async function getSummaryReport() {
  const { rows } = await pool.query(
    `SELECT
       id,
       expired_date,
       quantity
     FROM products`
  );

  // Hitung status real-time
  let layakJual = 0;
  let mendekatiExpired = 0;
  let expired = 0;
  let totalQuantity = 0;

  rows.forEach((p) => {
    const status = calculateExpiredStatus(p.expired_date);
    totalQuantity += parseInt(p.quantity, 10) || 0;
    if (status === 'LAYAK_JUAL') layakJual++;
    else if (status === 'MENDEKATI_EXPIRED') mendekatiExpired++;
    else expired++;
  });

  return {
    total_products: rows.length,
    layak_jual: layakJual,
    mendekati_expired: mendekatiExpired,
    expired,
    total_quantity: totalQuantity,
  };
}

/**
 * BUG FIX #8: Ambil semua produk lalu filter EXPIRED/MENDEKATI_EXPIRED di JS
 * agar hasilnya real-time dan tidak bergantung kolom status DB yang bisa stale.
 * @returns {Promise<object[]>}
 */
async function getExpiredReport() {
  const { rows } = await pool.query(
    `SELECT
       p.id,
       p.name,
       c.name AS category_name,
       p.unit,
       p.quantity,
       p.expired_date,
       p.status,
       p.updated_at
     FROM products p
     LEFT JOIN categories c ON c.id = p.category_id
     ORDER BY p.expired_date ASC`
  );

  return rows
    .map((p) => ({ ...p, status: calculateExpiredStatus(p.expired_date) }))
    .filter(
      (p) => p.status === 'EXPIRED' || p.status === 'MENDEKATI_EXPIRED'
    );
}

/**
 * Ambil semua transaksi dengan filter rentang tanggal opsional.
 * @param {{ start_date?: string, end_date?: string }} filters
 * @returns {Promise<object[]>}
 */
async function getTransactionReport(filters = {}) {
  const conditions = [];
  const params = [];

  if (filters.start_date) {
    params.push(filters.start_date);
    conditions.push(`t.created_at >= $${params.length}::timestamptz`);
  }

  if (filters.end_date) {
    params.push(filters.end_date);
    conditions.push(
      `t.created_at < ($${params.length}::date + INTERVAL '1 day')`
    );
  }

  const where =
    conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const { rows } = await pool.query(
    `SELECT
       t.id,
       t.product_id,
       p.name       AS product_name,
       c.name       AS category_name,
       t.type,
       t.quantity,
       t.notes,
       t.performed_by,
       u.full_name  AS performed_by_name,
       t.created_at
     FROM stock_transactions t
     LEFT JOIN products    p ON p.id = t.product_id
     LEFT JOIN categories  c ON c.id = p.category_id
     LEFT JOIN users       u ON u.id = t.performed_by
     ${where}
     ORDER BY t.created_at DESC`,
    params
  );

  return rows;
}

module.exports = {
  getSummaryReport,
  getExpiredReport,
  getTransactionReport,
};
