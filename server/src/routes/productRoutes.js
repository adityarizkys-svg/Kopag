'use strict';

const { Router } = require('express');
const productController = require('../controllers/productController');
const { authenticate, authorize } = require('../middlewares/authMiddleware');

const router = Router();

// All product routes require authentication
router.use(authenticate);

// Owner only: create, update, delete
router.get('/', productController.getAll);
router.get('/:id', productController.getById);
router.post('/', authorize('owner'), productController.create);
router.put('/:id', authorize('owner'), productController.update);
router.delete('/:id', authorize('owner'), productController.remove);

module.exports = router;
