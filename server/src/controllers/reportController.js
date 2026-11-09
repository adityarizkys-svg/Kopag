'use strict';

const reportModel = require('../models/reportModel');

/**
 * GET /api/v1/reports/summary
 * Owner only.
 */
async function getSummary(req, res) {
  try {
    const data = await reportModel.getSummaryReport();
    return res.json({ success: true, message: 'Laporan ringkasan berhasil diambil.', data });
  } catch (err) {
    console.error('reportController.getSummary:', err);
    return res
      .status(500)
      .json({ success: false, message: 'Internal server error.', data: null });
  }
}

/**
 * GET /api/v1/reports/expired
 * Owner only.
 */
async function getExpiredReport(req, res) {
  try {
    const data = await reportModel.getExpiredReport();
    return res.json({
      success: true,
      message: 'Laporan produk expired/mendekati expired berhasil diambil.',
      data,
    });
  } catch (err) {
    console.error('reportController.getExpiredReport:', err);
    return res
      .status(500)
      .json({ success: false, message: 'Internal server error.', data: null });
  }
}

/**
 * GET /api/v1/reports/transactions
 * Owner only.
 * Query params: ?start_date=YYYY-MM-DD&end_date=YYYY-MM-DD
 */
async function getTransactionReport(req, res) {
  try {
    const { start_date, end_date } = req.query;

    const filters = {};
    if (start_date) filters.start_date = start_date;
    if (end_date) filters.end_date = end_date;

    const data = await reportModel.getTransactionReport(filters);
    return res.json({ success: true, message: 'Laporan transaksi berhasil diambil.', data });
  } catch (err) {
    console.error('reportController.getTransactionReport:', err);
    return res
      .status(500)
      .json({ success: false, message: 'Internal server error.', data: null });
  }
}

module.exports = { getSummary, getExpiredReport, getTransactionReport };
