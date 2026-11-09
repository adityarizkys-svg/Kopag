'use strict';

const categoryModel = require('../models/categoryModel');

/**
 * GET /api/v1/categories
 */
async function getAll(req, res) {
  try {
    const data = await categoryModel.getAllCategories();
    return res.json({
      success: true,
      message: 'Data kategori berhasil diambil.',
      data,
    });
  } catch (err) {
    console.error('categoryController.getAll:', err);
    return res
      .status(500)
      .json({ success: false, message: 'Terjadi kesalahan server.', data: null });
  }
}

/**
 * GET /api/v1/categories/:id
 */
async function getById(req, res) {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res
        .status(400)
        .json({ success: false, message: 'ID kategori tidak valid.', data: null });
    }

    const data = await categoryModel.getCategoryById(id);
    if (!data) {
      return res
        .status(404)
        .json({ success: false, message: 'Kategori tidak ditemukan.', data: null });
    }

    return res.json({
      success: true,
      message: 'Detail kategori berhasil diambil.',
      data,
    });
  } catch (err) {
    console.error('categoryController.getById:', err);
    return res
      .status(500)
      .json({ success: false, message: 'Terjadi kesalahan server.', data: null });
  }
}

/**
 * POST /api/v1/categories
 */
async function create(req, res) {
  try {
    const { name, description } = req.body;

    // BUG FIX #5 & #6: validasi name lebih ketat (trim + minimal 1 karakter)
    if (!name || typeof name !== 'string' || !name.trim()) {
      return res
        .status(400)
        .json({ success: false, message: 'Nama kategori wajib diisi.', data: null });
    }

    const data = await categoryModel.createCategory({
      name: name.trim(),
      description: description ? description.trim() : null,
    });

    return res
      .status(201)
      .json({ success: true, message: 'Kategori berhasil dibuat.', data });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({
        success: false,
        message: 'Nama kategori sudah digunakan.',
        data: null,
      });
    }
    console.error('categoryController.create:', err);
    return res
      .status(500)
      .json({ success: false, message: 'Terjadi kesalahan server.', data: null });
  }
}

/**
 * PUT /api/v1/categories/:id
 */
async function update(req, res) {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res
        .status(400)
        .json({ success: false, message: 'ID kategori tidak valid.', data: null });
    }

    const { name, description } = req.body;

    // BUG FIX #6: validasi ketat — name tidak boleh string kosong
    const trimmedName = name !== undefined ? name.trim() : undefined;
    if (trimmedName === '' ) {
      return res.status(400).json({
        success: false,
        message: 'Nama kategori tidak boleh kosong.',
        data: null,
      });
    }
    if (trimmedName === undefined && description === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Setidaknya satu field (name, description) harus diisi.',
        data: null,
      });
    }

    const data = await categoryModel.updateCategory(id, {
      name: trimmedName,
      description,
    });

    if (!data) {
      return res
        .status(404)
        .json({ success: false, message: 'Kategori tidak ditemukan.', data: null });
    }

    return res.json({
      success: true,
      message: 'Kategori berhasil diperbarui.',
      data,
    });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({
        success: false,
        message: 'Nama kategori sudah digunakan.',
        data: null,
      });
    }
    console.error('categoryController.update:', err);
    return res
      .status(500)
      .json({ success: false, message: 'Terjadi kesalahan server.', data: null });
  }
}

/**
 * DELETE /api/v1/categories/:id
 */
async function remove(req, res) {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res
        .status(400)
        .json({ success: false, message: 'ID kategori tidak valid.', data: null });
    }

    const data = await categoryModel.deleteCategory(id);
    if (!data) {
      return res
        .status(404)
        .json({ success: false, message: 'Kategori tidak ditemukan.', data: null });
    }

    return res.json({
      success: true,
      message: 'Kategori berhasil dihapus.',
      data,
    });
  } catch (err) {
    if (err.code === 'CATEGORY_IN_USE') {
      return res.status(409).json({
        success: false,
        message: 'Kategori tidak dapat dihapus karena masih digunakan oleh produk.',
        data: null,
      });
    }
    console.error('categoryController.remove:', err);
    return res
      .status(500)
      .json({ success: false, message: 'Terjadi kesalahan server.', data: null });
  }
}

module.exports = { getAll, getById, create, update, remove };
