'use strict';

const { Router } = require('express');
const categoryController = require('../controllers/categoryController');
const { authenticate, authorize } = require('../middlewares/authMiddleware');

const router = Router();

// All category routes require authentication + owner role
router.use(authenticate, authorize('owner'));

router.get('/', categoryController.getAll);
router.get('/:id', categoryController.getById);
router.post('/', categoryController.create);
router.put('/:id', categoryController.update);
router.delete('/:id', categoryController.remove);

module.exports = router;
