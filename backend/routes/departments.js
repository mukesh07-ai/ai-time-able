const express = require('express');
const router = express.Router();
const departmentController = require('../controllers/departmentController');
const { protect, adminOnly } = require('../middleware/auth');

router.get('/', protect, departmentController.getAll);
router.post('/setup', protect, adminOnly, departmentController.setupStructure);
router.put('/:id', protect, adminOnly, departmentController.update);
router.delete('/:id', protect, adminOnly, departmentController.remove);

module.exports = router;
