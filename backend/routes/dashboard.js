const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { Teacher, Subject, Room, Timetable, ConflictLog } = require('../models');

// Dashboard stats
router.get('/stats', protect, async (req, res, next) => {
  try {
    const instId = req.user.institution_id;
    const [teachers, subjects, rooms, timetables, conflicts] = await Promise.all([
      Teacher.count({ where: { institution_id: instId, is_active: true } }),
      Subject.count({ where: { institution_id: instId, is_active: true } }),
      Room.count({ where: { institution_id: instId, is_available: true } }),
      Timetable.count({ where: { institution_id: instId } }),
      ConflictLog.findAll({
        include: [{ model: Timetable, as: 'timetable', where: { institution_id: instId }, required: true }],
        where: { is_resolved: false },
        limit: 5,
        order: [['createdAt', 'DESC']],
      }),
    ]);

    const recentTimetables = await Timetable.findAll({
      where: { institution_id: instId },
      limit: 5,
      order: [['createdAt', 'DESC']],
    });

    res.json({ teachers, subjects, rooms, timetables, recentConflicts: conflicts, recentTimetables });
  } catch (err) { next(err); }
});

module.exports = router;
