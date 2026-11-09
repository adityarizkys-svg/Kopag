'use strict';

const { Router } = require('express');
const reportController = require('../controllers/reportController');
const { authenticate, authorize } = require('../middlewares/authMiddleware');

const router = Router();

// All report routes: authenticated + owner only
router.use(authenticate, authorize('owner'));

router.get('/summary', reportController.getSummary);
router.get('/expired', reportController.getExpiredReport);
router.get('/transactions', reportController.getTransactionReport);

module.exports = router;
