const express = require('express');
const router = express.Router();
const { protect, adminOnly, teacherOrAdmin } = require('../middleware/auth');
const c = require('../controllers/timetableController');

router.get('/', protect, c.getAll);
router.post('/', protect, adminOnly, c.create);
router.post('/generate', protect, adminOnly, c.generate);
router.get('/:id', protect, c.getOne);
router.get('/:id/grid', protect, c.getGrid);
router.get('/:id/export', protect, c.exportTimetable);
router.post('/:id/apply-fix', protect, adminOnly, c.applyFix);
router.put('/:id/publish', protect, adminOnly, c.publish);
router.delete('/:id', protect, adminOnly, c.deleteTimetable);
router.post('/:id/regenerate', protect, adminOnly, c.regenerate);

module.exports = router;
