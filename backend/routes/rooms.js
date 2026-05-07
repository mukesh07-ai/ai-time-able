const express = require('express');
const router = express.Router();
const { protect, adminOnly } = require('../middleware/auth');
const c = require('../controllers/roomController');

router.get('/', protect, c.getAll);
router.post('/', protect, adminOnly, c.create);
router.get('/:id', protect, c.getOne);
router.put('/:id', protect, adminOnly, c.update);
router.delete('/:id', protect, adminOnly, c.remove);

module.exports = router;
