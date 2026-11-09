'use strict';

const { Router } = require('express');

const authRoutes        = require('./authRoutes');
const categoryRoutes    = require('./categoryRoutes');
const productRoutes     = require('./productRoutes');
const transactionRoutes = require('./transactionRoutes');
const reportRoutes      = require('./reportRoutes');

const router = Router();

router.use('/auth',         authRoutes);
router.use('/categories',   categoryRoutes);
router.use('/products',     productRoutes);
router.use('/transactions', transactionRoutes);
router.use('/reports',      reportRoutes);

module.exports = router;
