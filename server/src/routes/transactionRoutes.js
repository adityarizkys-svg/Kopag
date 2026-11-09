'use strict';

const { Router } = require('express');
const transactionController = require('../controllers/transactionController');
const { authenticate, authorize } = require('../middlewares/authMiddleware');

const router = Router();

// All transaction routes require authentication
router.use(authenticate);

// Owner + Employee: stock in / stock out
router.post(
  '/stock-in',
  authorize('owner', 'employee'),
  transactionController.stockIn
);
router.post(
  '/stock-out',
  authorize('owner', 'employee'),
  transactionController.stockOut
);

// History accessible by both roles
router.get('/', authorize('owner', 'employee'), transactionController.getHistory);
router.get('/:id', authorize('owner', 'employee'), transactionController.getById);

module.exports = router;
