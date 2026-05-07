const { LeaveRequest, Teacher, User, Department } = require('../models');
const { Op } = require('sequelize');

// ── TEACHER: Submit a leave request ──────────────────────────────────────────
const submitLeave = async (req, res, next) => {
  try {
    const teacher = await Teacher.findOne({ where: { user_id: req.user.id } });
    if (!teacher) return res.status(403).json({ error: 'Teacher profile not found for this user' });

    const { from_date, to_date, reason, leave_type } = req.body;
    if (!from_date || !to_date || !reason)
      return res.status(400).json({ error: 'from_date, to_date, and reason are required' });

    const leave = await LeaveRequest.create({
      teacher_id: teacher.id,
      institution_id: teacher.institution_id,
      from_date, to_date, reason,
      leave_type: leave_type || 'casual',
      status: 'pending',
    });
    res.status(201).json(leave);
  } catch (err) { next(err); }
};

// ── TEACHER: Get own leave requests ──────────────────────────────────────────
const getMyLeaves = async (req, res, next) => {
  try {
    const teacher = await Teacher.findOne({ where: { user_id: req.user.id } });
    if (!teacher) return res.status(403).json({ error: 'Teacher profile not found' });

    const leaves = await LeaveRequest.findAll({
      where: { teacher_id: teacher.id },
      include: [{ model: User, as: 'reviewer', attributes: ['name', 'email'] }],
      order: [['createdAt', 'DESC']],
    });
    res.json({ leaves, teacher: { id: teacher.id, name: teacher.name } });
  } catch (err) { next(err); }
};

// ── TEACHER: Get own timetable entries ───────────────────────────────────────
const getMyTimetable = async (req, res, next) => {
  try {
    const { TimetableEntry, Subject, Room, Timetable } = require('../models');
    const teacher = await Teacher.findOne({ where: { user_id: req.user.id } });
    if (!teacher) return res.status(403).json({ error: 'Teacher profile not found' });

    const latestTimetable = await Timetable.findOne({
      where: { institution_id: teacher.institution_id, status: ['feasible', 'published'] },
      order: [['updatedAt', 'DESC']],
    });

    if (!latestTimetable) return res.json({ entries: [], timetable: null });

    const entries = await TimetableEntry.findAll({
      where: { timetable_id: latestTimetable.id, teacher_id: teacher.id },
      include: [
        { model: Subject, as: 'subject' },
        { model: Room, as: 'room' },
      ],
      order: [['day_of_week', 'ASC'], ['slot_number', 'ASC']],
    });

    res.json({ entries, timetable: latestTimetable, teacher: { id: teacher.id, name: teacher.name } });
  } catch (err) { next(err); }
};

// ── ADMIN: Get ALL leave requests for institution ─────────────────────────────
const getAllLeaves = async (req, res, next) => {
  try {
    const { status, teacher_id } = req.query;
    const where = { institution_id: req.user.institution_id };
    if (status) where.status = status;
    if (teacher_id) where.teacher_id = teacher_id;

    const leaves = await LeaveRequest.findAll({
      where,
      include: [
        {
          model: Teacher, as: 'teacher',
          include: [{ model: Department, as: 'department' }],
        },
        { model: User, as: 'reviewer', attributes: ['name', 'email'] },
      ],
      order: [['createdAt', 'DESC']],
    });
    res.json({ leaves });
  } catch (err) { next(err); }
};

// ── ADMIN: Get leave summary per teacher ─────────────────────────────────────
const getLeaveSummary = async (req, res, next) => {
  try {
    const { sequelize } = require('../models');
    const teachers = await Teacher.findAll({
      where: { institution_id: req.user.institution_id, is_active: true },
      include: [
        { model: Department, as: 'department' },
        {
          model: LeaveRequest, as: 'leaveRequests',
          attributes: ['id', 'status', 'from_date', 'to_date', 'leave_type'],
        },
      ],
      order: [['name', 'ASC']],
    });

    const summary = teachers.map(t => {
      const leaves = t.leaveRequests || [];
      const approved = leaves.filter(l => l.status === 'approved');
      const pending  = leaves.filter(l => l.status === 'pending');
      const rejected = leaves.filter(l => l.status === 'rejected');

      // Count actual leave days taken (approved)
      const daysTaken = approved.reduce((sum, l) => {
        const from = new Date(l.from_date);
        const to   = new Date(l.to_date);
        const diff = Math.ceil((to - from) / (1000 * 60 * 60 * 24)) + 1;
        return sum + diff;
      }, 0);

      return {
        teacher_id: t.id,
        teacher_name: t.name,
        department: t.department?.name || 'N/A',
        total_requests: leaves.length,
        approved_count: approved.length,
        pending_count:  pending.length,
        rejected_count: rejected.length,
        days_taken: daysTaken,
        has_active_leave: approved.some(l => {
          const today = new Date().toISOString().split('T')[0];
          return l.from_date <= today && l.to_date >= today;
        }),
      };
    });

    res.json({ summary });
  } catch (err) { next(err); }
};

// ── ADMIN: Approve or reject a leave ─────────────────────────────────────────
const reviewLeave = async (req, res, next) => {
  try {
    const { status, admin_note } = req.body;
    if (!['approved', 'rejected'].includes(status))
      return res.status(400).json({ error: 'status must be "approved" or "rejected"' });

    const leave = await LeaveRequest.findOne({
      where: { id: req.params.id, institution_id: req.user.institution_id },
    });
    if (!leave) return res.status(404).json({ error: 'Leave request not found' });

    await leave.update({
      status,
      admin_note: admin_note || null,
      reviewed_by: req.user.id,
      reviewed_at: new Date(),
    });

    res.json({ message: `Leave ${status} successfully`, leave });
  } catch (err) { next(err); }
};

// ── ADMIN: Delete a leave request ────────────────────────────────────────────
const deleteLeave = async (req, res, next) => {
  try {
    const leave = await LeaveRequest.findOne({
      where: { id: req.params.id, institution_id: req.user.institution_id },
    });
    if (!leave) return res.status(404).json({ error: 'Leave request not found' });
    await leave.destroy();
    res.json({ message: 'Leave request deleted' });
  } catch (err) { next(err); }
};

module.exports = { submitLeave, getMyLeaves, getMyTimetable, getAllLeaves, getLeaveSummary, reviewLeave, deleteLeave };
