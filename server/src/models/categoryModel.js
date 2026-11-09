'use strict';

const pool = require('../config/database');

/**
 * Retrieve all categories ordered by name.
 * @returns {Promise<object[]>}
 */
async function getAllCategories() {
  const { rows } = await pool.query(
    `SELECT id, name, description, created_at, updated_at
     FROM categories
     ORDER BY name ASC`
  );
  return rows;
}

/**
 * Retrieve a single category by primary key.
 * @param {number} id
 * @returns {Promise<object|null>}
 */
async function getCategoryById(id) {
  const { rows } = await pool.query(
    `SELECT id, name, description, created_at, updated_at
     FROM categories
     WHERE id = $1`,
    [id]
  );
  return rows[0] || null;
}

/**
 * Create a new category.
 * @param {{ name: string, description?: string }} payload
 * @returns {Promise<object>}
 */
async function createCategory({ name, description }) {
  const { rows } = await pool.query(
    `INSERT INTO categories (name, description)
     VALUES ($1, $2)
     RETURNING id, name, description, created_at, updated_at`,
    [name, description || null]
  );
  return rows[0];
}

/**
 * Update an existing category.
 * @param {number} id
 * @param {{ name?: string, description?: string }} fields
 * @returns {Promise<object|null>}
 */
async function updateCategory(id, { name, description }) {
  const { rows } = await pool.query(
    `UPDATE categories
     SET name        = COALESCE($2, name),
         description = COALESCE($3, description),
         updated_at  = NOW()
     WHERE id = $1
     RETURNING id, name, description, created_at, updated_at`,
    [id, name || null, description !== undefined ? description : null]
  );
  return rows[0] || null;
}

/**
 * Delete a category.  Fails if any product still references it.
 * @param {number} id
 * @returns {Promise<object|null>} deleted row or null if not found
 * @throws {Error} with code 'CATEGORY_IN_USE' when products exist
 */
async function deleteCategory(id) {
  // Guard: refuse deletion when products are still linked
  const ref = await pool.query(
    `SELECT COUNT(*) AS cnt FROM products WHERE category_id = $1`,
    [id]
  );
  if (parseInt(ref.rows[0].cnt, 10) > 0) {
    const err = new Error(
      'Category is still referenced by one or more products.'
    );
    err.code = 'CATEGORY_IN_USE';
    throw err;
  }

  const { rows } = await pool.query(
    `DELETE FROM categories WHERE id = $1
     RETURNING id, name, description, created_at, updated_at`,
    [id]
  );
  return rows[0] || null;
}

module.exports = {
  getAllCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
};
