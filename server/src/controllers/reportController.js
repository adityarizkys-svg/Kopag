const reportService = require('../services/reportService');

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const isValidDate = (value) => {
  if (!DATE_PATTERN.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
};

const parsePositiveInteger = (value, fallback, max) => {
  if (value === undefined) return { value: fallback };
  if (!/^\d+$/.test(String(value))) return { error: true };
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 1 || parsed > max) {
    return { error: true };
  }
  return { value: parsed };
};

const getDashboard = async (req, res, next) => {
  try {
    const data = await reportService.getDashboardReport();
    return res.status(200).json({
      success: true,
      message: 'Laporan dashboard berhasil diambil',
      data,
    });
  } catch (error) {
    return next(error);
  }
};

const getStockHistory = async (req, res, next) => {
  try {
    const pageResult = parsePositiveInteger(req.query.page, 1, 1000000);
    const limitResult = parsePositiveInteger(req.query.limit, 10, 100);

    if (pageResult.error || limitResult.error) {
      return res.status(400).json({
        success: false,
        message: 'Parameter page harus >= 1 dan limit harus antara 1 sampai 100',
      });
    }

    const { type, productId, from, to } = req.query;

    if (type !== undefined && !['IN', 'OUT'].includes(String(type).toUpperCase())) {
      return res.status(400).json({
        success: false,
        message: 'Parameter type hanya boleh IN atau OUT',
      });
    }

    let parsedProductId;
    if (productId !== undefined) {
      const productResult = parsePositiveInteger(productId, null, 2147483647);
      if (productResult.error) {
        return res.status(400).json({
          success: false,
          message: 'Parameter productId harus berupa bilangan bulat positif',
        });
      }
      parsedProductId = productResult.value;
    }

    if (from !== undefined && !isValidDate(String(from))) {
      return res.status(400).json({
        success: false,
        message: 'Parameter from harus menggunakan tanggal YYYY-MM-DD yang valid',
      });
    }

    if (to !== undefined && !isValidDate(String(to))) {
      return res.status(400).json({
        success: false,
        message: 'Parameter to harus menggunakan tanggal YYYY-MM-DD yang valid',
      });
    }

    if (from && to && String(from) > String(to)) {
      return res.status(400).json({
        success: false,
        message: 'Tanggal from tidak boleh setelah tanggal to',
      });
    }

    const data = await reportService.getStockHistory({
      page: pageResult.value,
      limit: limitResult.value,
      type: type ? String(type).toUpperCase() : undefined,
      productId: parsedProductId,
      from: from ? String(from) : undefined,
      to: to ? String(to) : undefined,
    });

    return res.status(200).json({
      success: true,
      message: 'Riwayat stok berhasil diambil',
      data,
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = { getDashboard, getStockHistory };
