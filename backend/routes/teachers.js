const express = require('express');
const router = express.Router();
const { protect, adminOnly, teacherOrAdmin } = require('../middleware/auth');
const c = require('../controllers/teacherController');

router.get('/', protect, c.getAll);
router.post('/', protect, adminOnly, c.create);
router.get('/:id', protect, c.getOne);
router.put('/:id', protect, teacherOrAdmin, c.update);
router.delete('/:id', protect, adminOnly, c.remove);
router.put('/:id/availability', protect, teacherOrAdmin, c.updateAvailability);
router.post('/:id/subjects', protect, adminOnly, c.assignSubjects);

module.exports = router;
