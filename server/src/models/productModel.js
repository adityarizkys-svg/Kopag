'use strict';

const pool = require('../config/database');
const { calculateExpiredStatus } = require('../utils/expiredStatus');

/**
 * Timpa kolom status dengan kalkulasi JS real-time (menghindari staleness dari DB trigger).
 * @param {object} product
 * @returns {object}
 */
function attachStatus(product) {
  return {
    ...product,
    status: calculateExpiredStatus(product.expired_date),
  };
}

/**
 * Base SELECT produk beserta nama kategori.
 */
const BASE_SELECT = `
  SELECT
    p.id,
    p.name,
    p.category_id,
    c.name AS category_name,
    p.description,
    p.unit,
    p.quantity,
    p.expired_date,
    p.status,
    p.created_by,
    p.created_at,
    p.updated_at
  FROM products p
  LEFT JOIN categories c ON c.id = p.category_id
`;

/**
 * Ambil semua produk dengan filter opsional.
 * BUG FIX #3: Filter status dilakukan di application-layer setelah attachStatus(),
 * bukan di DB, agar tidak bergantung pada kolom status yang bisa stale.
 *
 * @param {{ category_id?: number, status?: string, search?: string }} filters
 * @returns {Promise<object[]>}
 */
async function getAllProducts(filters = {}) {
  const conditions = [];
  const params = [];

  if (filters.category_id) {
    params.push(filters.category_id);
    conditions.push(`p.category_id = $${params.length}`);
  }

  // BUG FIX #3: Jangan filter status di SQL — dilakukan di JS setelah attachStatus()
  // agar selalu menggunakan status real-time

  if (filters.search) {
    params.push(`%${filters.search}%`);
    conditions.push(`p.name ILIKE $${params.length}`);
  }

  const where =
    conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const { rows } = await pool.query(
    `${BASE_SELECT} ${where} ORDER BY p.expired_date ASC`,
    params
  );

  // Hitung ulang status di JS, lalu filter jika diperlukan
  const withStatus = rows.map(attachStatus);
  if (filters.status) {
    return withStatus.filter((p) => p.status === filters.status);
  }
  return withStatus;
}

/**
 * Ambil satu produk berdasarkan id.
 * @param {number} id
 * @returns {Promise<object|null>}
 */
async function getProductById(id) {
  const { rows } = await pool.query(`${BASE_SELECT} WHERE p.id = $1`, [id]);
  if (!rows[0]) return null;
  return attachStatus(rows[0]);
}

/**
 * Buat produk baru.
 * @param {{ name, category_id, description, unit, quantity, expired_date, created_by }} payload
 * @returns {Promise<object>}
 */
async function createProduct({
  name,
  category_id,
  description,
  unit,
  quantity,
  expired_date,
  created_by,
}) {
  const { rows } = await pool.query(
    `INSERT INTO products (name, category_id, description, unit, quantity, expired_date, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [
      name,
      category_id || null,
      description || null,
      unit,
      quantity ?? 0,
      expired_date,
      created_by,
    ]
  );
  return attachStatus(rows[0]);
}

/**
 * Update produk yang ada (partial update).
 * @param {number} id
 * @param {{ name?, category_id?, description?, unit?, quantity?, expired_date? }} fields
 * @returns {Promise<object|null>}
 */
async function updateProduct(id, fields) {
  const setClauses = [];
  const params = [id];

  const allowed = [
    'name',
    'category_id',
    'description',
    'unit',
    'quantity',
    'expired_date',
  ];

  allowed.forEach((key) => {
    if (fields[key] !== undefined) {
      params.push(fields[key]);
      setClauses.push(`${key} = $${params.length}`);
    }
  });

  if (setClauses.length === 0) return getProductById(id);

  // Selalu perbarui updated_at
  setClauses.push(`updated_at = NOW()`);

  const { rows } = await pool.query(
    `UPDATE products SET ${setClauses.join(', ')} WHERE id = $1 RETURNING *`,
    params
  );

  if (!rows[0]) return null;
  return attachStatus(rows[0]);
}

/**
 * Hapus produk berdasarkan id.
 * @param {number} id
 * @returns {Promise<object|null>}
 */
async function deleteProduct(id) {
  const { rows } = await pool.query(
    `DELETE FROM products WHERE id = $1 RETURNING *`,
    [id]
  );
  if (!rows[0]) return null;
  return attachStatus(rows[0]);
}

module.exports = {
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
};
