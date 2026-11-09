'use strict';

const pool = require('../config/database');

/**
 * Record a stock-in transaction and update product quantity.
 * Must be called within an existing pg client transaction (BEGIN already issued).
 *
 * @param {import('pg').PoolClient} client
 * @param {{ product_id: number, quantity: number, notes?: string, performed_by: number }} payload
 * @returns {Promise<object>} inserted transaction row
 */
async function stockIn(client, { product_id, quantity, notes, performed_by }) {
  // BUG FIX #4: Lock baris produk agar tidak ada race condition saat dua stockIn bersamaan
  await client.query(`SELECT id FROM products WHERE id = $1 FOR UPDATE`, [
    product_id,
  ]);

  // Insert transaction record
  const { rows: txRows } = await client.query(
    `INSERT INTO stock_transactions (product_id, type, quantity, notes, performed_by)
     VALUES ($1, 'stock_in', $2, $3, $4)
     RETURNING *`,
    [product_id, quantity, notes || null, performed_by]
  );

  // Update product quantity
  await client.query(
    `UPDATE products SET quantity = quantity + $2, updated_at = NOW() WHERE id = $1`,
    [product_id, quantity]
  );

  return txRows[0];
}

/**
 * Record a stock-out transaction and update product quantity.
 * Must be called within an existing pg client transaction (BEGIN already issued).
 * The caller is responsible for the FOR UPDATE lock and all business validations.
 *
 * @param {import('pg').PoolClient} client
 * @param {{ product_id: number, quantity: number, notes?: string, performed_by: number }} payload
 * @returns {Promise<object>} inserted transaction row
 */
async function stockOut(client, { product_id, quantity, notes, performed_by }) {
  // Insert transaction record
  const { rows: txRows } = await client.query(
    `INSERT INTO stock_transactions (product_id, type, quantity, notes, performed_by)
     VALUES ($1, 'stock_out', $2, $3, $4)
     RETURNING *`,
    [product_id, quantity, notes || null, performed_by]
  );

  // Deduct from product
  await client.query(
    `UPDATE products SET quantity = quantity - $2, updated_at = NOW() WHERE id = $1`,
    [product_id, quantity]
  );

  return txRows[0];
}

/**
 * Retrieve transaction history with optional filters.
 * @param {{ product_id?: number, type?: string, start_date?: string, end_date?: string }} filters
 * @returns {Promise<object[]>}
 */
async function getTransactionHistory(filters = {}) {
  const conditions = [];
  const params = [];

  if (filters.product_id) {
    params.push(filters.product_id);
    conditions.push(`t.product_id = $${params.length}`);
  }

  if (filters.type) {
    params.push(filters.type);
    conditions.push(`t.type = $${params.length}`);
  }

  if (filters.start_date) {
    params.push(filters.start_date);
    conditions.push(`t.created_at >= $${params.length}::timestamptz`);
  }

  if (filters.end_date) {
    // Include the whole end date day
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
       p.name AS product_name,
       t.type,
       t.quantity,
       t.notes,
       t.performed_by,
       u.full_name AS performed_by_name,
       t.created_at
     FROM stock_transactions t
     LEFT JOIN products p ON p.id = t.product_id
     LEFT JOIN users   u ON u.id = t.performed_by
     ${where}
     ORDER BY t.created_at DESC`,
    params
  );

  return rows;
}

/**
 * Get a single transaction by id.
 * @param {number} id
 * @returns {Promise<object|null>}
 */
async function getTransactionById(id) {
  const { rows } = await pool.query(
    `SELECT
       t.id,
       t.product_id,
       p.name AS product_name,
       t.type,
       t.quantity,
       t.notes,
       t.performed_by,
       u.full_name AS performed_by_name,
       t.created_at
     FROM stock_transactions t
     LEFT JOIN products p ON p.id = t.product_id
     LEFT JOIN users   u ON u.id = t.performed_by
     WHERE t.id = $1`,
    [id]
  );
  return rows[0] || null;
}

module.exports = {
  stockIn,
  stockOut,
  getTransactionHistory,
  getTransactionById,
};
