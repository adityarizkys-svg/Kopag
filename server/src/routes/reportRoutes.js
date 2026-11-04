const express = require('express');
const { getDashboard, getStockHistory } = require('../controllers/reportController');
const { authenticate, authorize } = require('../middlewares/authMiddleware');

const router = express.Router();

// Only OWNER can access financial and operational reports.
router.use(authenticate, authorize('OWNER'));
router.get('/dashboard', getDashboard);
router.get('/stock-history', getStockHistory);

module.exports = router;
