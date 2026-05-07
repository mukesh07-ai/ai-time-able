const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const c = require('../controllers/timetableController');

router.get('/', auth, c.getAll);
router.post('/', auth, c.create);
router.post('/generate', auth, c.generate);
router.get('/:id', auth, c.getOne);
router.get('/:id/grid', auth, c.getGrid);
router.get('/:id/export', auth, c.exportTimetable);
router.post('/:id/apply-fix', auth, c.applyFix);
router.put('/:id/publish', auth, c.publish);

module.exports = router;
