'use strict';

const pool = require('../config/database');
const transactionModel = require('../models/transactionModel');
const { calculateExpiredStatus } = require('../utils/expiredStatus');

/**
 * POST /api/v1/transactions/stock-in
 * Owner atau Employee.
 */
async function stockIn(req, res) {
  const { product_id, quantity, notes } = req.body;

  if (!product_id || isNaN(parseInt(product_id, 10))) {
    return res.status(400).json({
      success: false,
      message: 'product_id wajib diisi.',
      data: null,
    });
  }
  const qty = parseInt(quantity, 10);
  if (!quantity || isNaN(qty) || qty <= 0) {
    return res.status(400).json({
      success: false,
      message: 'quantity harus berupa bilangan bulat positif.',
      data: null,
    });
  }

  const pid = parseInt(product_id, 10);
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Verifikasi produk ada
    const { rows: productRows } = await client.query(
      `SELECT id FROM products WHERE id = $1`,
      [pid]
    );
    if (!productRows[0]) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        message: 'Produk tidak ditemukan.',
        data: null,
      });
    }

    const data = await transactionModel.stockIn(client, {
      product_id: pid,
      quantity: qty,
      notes: notes || null,
      performed_by: req.user.id,
    });

    await client.query('COMMIT');

    return res.status(201).json({
      success: true,
      message: 'Stok masuk berhasil dicatat.',
      data,
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('transactionController.stockIn:', err);
    return res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan server.',
      data: null,
    });
  } finally {
    // BUG FIX #2: selalu release client, bahkan jika terjadi error
    client.release();
  }
}

/**
 * POST /api/v1/transactions/stock-out
 * Owner atau Employee.
 */
async function stockOut(req, res) {
  const { product_id, quantity, notes } = req.body;

  if (!product_id || isNaN(parseInt(product_id, 10))) {
    return res.status(400).json({
      success: false,
      message: 'product_id wajib diisi.',
      data: null,
    });
  }
  const qty = parseInt(quantity, 10);
  if (!quantity || isNaN(qty) || qty <= 0) {
    return res.status(400).json({
      success: false,
      message: 'quantity harus berupa bilangan bulat positif.',
      data: null,
    });
  }

  const pid = parseInt(product_id, 10);
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Kunci baris produk untuk mencegah race condition
    const { rows: productRows } = await client.query(
      `SELECT id, name, quantity, expired_date, status
       FROM products
       WHERE id = $1
       FOR UPDATE`,
      [pid]
    );

    if (!productRows[0]) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        message: 'Produk tidak ditemukan.',
        data: null,
      });
    }

    const product = productRows[0];

    // Cek status expired secara real-time via JS helper (bukan kolom DB yang bisa stale)
    const currentStatus = calculateExpiredStatus(product.expired_date);
    if (currentStatus === 'EXPIRED') {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: 'Produk sudah EXPIRED dan tidak dapat dijual.',
        data: null,
      });
    }

    // Cek kecukupan stok
    if (product.quantity < qty) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: `Stok tidak mencukupi. Stok tersedia: ${product.quantity}, diminta: ${qty}.`,
        data: null,
      });
    }

    const data = await transactionModel.stockOut(client, {
      product_id: pid,
      quantity: qty,
      notes: notes || null,
      performed_by: req.user.id,
    });

    await client.query('COMMIT');

    return res.status(201).json({
      success: true,
      message: 'Stok keluar berhasil dicatat.',
      data,
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('transactionController.stockOut:', err);
    return res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan server.',
      data: null,
    });
  } finally {
    // BUG FIX #2: selalu release client, bahkan jika terjadi error
    client.release();
  }
}

/**
 * GET /api/v1/transactions
 * Query params: ?product_id=&type=&start_date=&end_date=
 */
async function getHistory(req, res) {
  try {
    const { product_id, type, start_date, end_date } = req.query;

    const validTypes = ['stock_in', 'stock_out'];
    if (type && !validTypes.includes(type)) {
      return res.status(400).json({
        success: false,
        message: `Tipe tidak valid. Gunakan salah satu: ${validTypes.join(', ')}.`,
        data: null,
      });
    }

    const filters = {};
    if (product_id) filters.product_id = parseInt(product_id, 10);
    if (type) filters.type = type;
    if (start_date) filters.start_date = start_date;
    if (end_date) filters.end_date = end_date;

    const data = await transactionModel.getTransactionHistory(filters);
    return res.json({
      success: true,
      message: 'Riwayat transaksi berhasil diambil.',
      data,
    });
  } catch (err) {
    console.error('transactionController.getHistory:', err);
    return res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan server.',
      data: null,
    });
  }
}

/**
 * GET /api/v1/transactions/:id
 */
async function getById(req, res) {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({
        success: false,
        message: 'ID transaksi tidak valid.',
        data: null,
      });
    }

    const data = await transactionModel.getTransactionById(id);
    if (!data) {
      return res.status(404).json({
        success: false,
        message: 'Transaksi tidak ditemukan.',
        data: null,
      });
    }

    return res.json({
      success: true,
      message: 'Detail transaksi berhasil diambil.',
      data,
    });
  } catch (err) {
    console.error('transactionController.getById:', err);
    return res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan server.',
      data: null,
    });
  }
}

module.exports = { stockIn, stockOut, getHistory, getById };
