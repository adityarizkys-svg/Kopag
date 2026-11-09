'use strict';

const productModel = require('../models/productModel');

/**
 * Validate that a string looks like YYYY-MM-DD.
 * @param {string} val
 * @returns {boolean}
 */
function isValidDate(val) {
  return /^\d{4}-\d{2}-\d{2}$/.test(val) && !isNaN(Date.parse(val));
}

/**
 * GET /api/v1/products
 * Query params: ?category_id=&status=&search=
 */
async function getAll(req, res) {
  try {
    const { category_id, status, search } = req.query;

    const validStatuses = ['LAYAK_JUAL', 'MENDEKATI_EXPIRED', 'EXPIRED'];
    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Status tidak valid. Gunakan salah satu: ${validStatuses.join(', ')}.`,
        data: null,
      });
    }

    const filters = {};
    if (category_id) filters.category_id = parseInt(category_id, 10);
    if (status) filters.status = status;
    if (search) filters.search = search;

    const data = await productModel.getAllProducts(filters);
    return res.json({ success: true, message: 'Data produk berhasil diambil.', data });
  } catch (err) {
    console.error('productController.getAll:', err);
    return res
      .status(500)
      .json({ success: false, message: 'Internal server error.', data: null });
  }
}

/**
 * GET /api/v1/products/:id
 */
async function getById(req, res) {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res
        .status(400)
        .json({ success: false, message: 'ID produk tidak valid.', data: null });
    }

    const data = await productModel.getProductById(id);
    if (!data) {
      return res
        .status(404)
        .json({ success: false, message: 'Produk tidak ditemukan.', data: null });
    }

    return res.json({ success: true, message: 'Detail produk berhasil diambil.', data });
  } catch (err) {
    console.error('productController.getById:', err);
    return res
      .status(500)
      .json({ success: false, message: 'Internal server error.', data: null });
  }
}

/**
 * POST /api/v1/products
 */
async function create(req, res) {
  try {
    const { name, category_id, description, unit, quantity, expired_date } =
      req.body;

    // Required field validation
    if (!name || typeof name !== 'string' || !name.trim()) {
      return res
        .status(400)
        .json({ success: false, message: 'Nama produk wajib diisi.', data: null });
    }
    if (!unit || typeof unit !== 'string' || !unit.trim()) {
      return res
        .status(400)
        .json({ success: false, message: 'Unit wajib diisi.', data: null });
    }
    if (!expired_date || !isValidDate(expired_date)) {
      return res.status(400).json({
        success: false,
        message: 'expired_date wajib diisi dan harus berformat YYYY-MM-DD.',
        data: null,
      });
    }
    const qty = quantity !== undefined ? parseInt(quantity, 10) : 0;
    if (isNaN(qty) || qty < 0) {
      return res.status(400).json({
        success: false,
        message: 'Quantity harus berupa bilangan bulat non-negatif.',
        data: null,
      });
    }

    const data = await productModel.createProduct({
      name: name.trim(),
      category_id: category_id ? parseInt(category_id, 10) : null,
      description: description || null,
      unit: unit.trim(),
      quantity: qty,
      expired_date,
      created_by: req.user.id,
    });

    return res
      .status(201)
      .json({ success: true, message: 'Produk berhasil dibuat.', data });
  } catch (err) {
    if (err.code === '23503') {
      // foreign_key_violation
      return res.status(400).json({
        success: false,
        message: 'Kategori yang direferensikan tidak ditemukan.',
        data: null,
      });
    }
    console.error('productController.create:', err);
    return res
      .status(500)
      .json({ success: false, message: 'Internal server error.', data: null });
  }
}

/**
 * PUT /api/v1/products/:id
 */
async function update(req, res) {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res
        .status(400)
        .json({ success: false, message: 'ID produk tidak valid.', data: null });
    }

    const { name, category_id, description, unit, quantity, expired_date } =
      req.body;

    if (
      name === undefined &&
      category_id === undefined &&
      description === undefined &&
      unit === undefined &&
      quantity === undefined &&
      expired_date === undefined
    ) {
      return res.status(400).json({
        success: false,
        message: 'Setidaknya satu field wajib diisi untuk update.',
        data: null,
      });
    }

    if (expired_date !== undefined && !isValidDate(expired_date)) {
      return res.status(400).json({
        success: false,
        message: 'expired_date harus berformat YYYY-MM-DD.',
        data: null,
      });
    }

    if (quantity !== undefined) {
      const qty = parseInt(quantity, 10);
      if (isNaN(qty) || qty < 0) {
        return res.status(400).json({
          success: false,
          message: 'Quantity harus berupa bilangan bulat non-negatif.',
          data: null,
        });
      }
    }

    const fields = {};
    if (name !== undefined) fields.name = name.trim();
    if (category_id !== undefined)
      fields.category_id = category_id ? parseInt(category_id, 10) : null;
    if (description !== undefined) fields.description = description;
    if (unit !== undefined) fields.unit = unit.trim();
    if (quantity !== undefined) fields.quantity = parseInt(quantity, 10);
    if (expired_date !== undefined) fields.expired_date = expired_date;

    const data = await productModel.updateProduct(id, fields);
    if (!data) {
      return res
        .status(404)
        .json({ success: false, message: 'Produk tidak ditemukan.', data: null });
    }

    return res.json({ success: true, message: 'Produk berhasil diperbarui.', data });
  } catch (err) {
    if (err.code === '23503') {
      return res.status(400).json({
        success: false,
        message: 'Kategori yang direferensikan tidak ditemukan.',
        data: null,
      });
    }
    console.error('productController.update:', err);
    return res
      .status(500)
      .json({ success: false, message: 'Internal server error.', data: null });
  }
}

/**
 * DELETE /api/v1/products/:id
 */
async function remove(req, res) {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res
        .status(400)
        .json({ success: false, message: 'ID produk tidak valid.', data: null });
    }

    const data = await productModel.deleteProduct(id);
    if (!data) {
      return res
        .status(404)
        .json({ success: false, message: 'Produk tidak ditemukan.', data: null });
    }

    return res.json({ success: true, message: 'Produk berhasil dihapus.', data });
  } catch (err) {
    console.error('productController.remove:', err);
    return res
      .status(500)
      .json({ success: false, message: 'Internal server error.', data: null });
  }
}

module.exports = { getAll, getById, create, update, remove };
