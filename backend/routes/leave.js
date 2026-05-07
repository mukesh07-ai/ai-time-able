const express = require('express');
const router = express.Router();
const { protect, adminOnly, teacherOrAdmin } = require('../middleware/auth');
const c = require('../controllers/leaveController');

// Teacher routes (own data)
router.post('/submit', protect, teacherOrAdmin, c.submitLeave);
router.get('/my', protect, teacherOrAdmin, c.getMyLeaves);
router.get('/my-timetable', protect, teacherOrAdmin, c.getMyTimetable);

// Admin routes
router.get('/', protect, adminOnly, c.getAllLeaves);
router.get('/summary', protect, adminOnly, c.getLeaveSummary);
router.put('/:id/review', protect, adminOnly, c.reviewLeave);
router.delete('/:id', protect, adminOnly, c.deleteLeave);

module.exports = router;
