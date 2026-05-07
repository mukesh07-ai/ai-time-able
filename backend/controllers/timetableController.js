const { Timetable, TimetableEntry, Teacher, Subject, Room, ConflictLog, Institution } = require('../models');
const { generateTimetable } = require('../services/timetableService');
const { generateExcel, generatePDF } = require('../services/exportService');
const { Op } = require('sequelize');

const getAll = async (req, res, next) => {
  try {
    const timetables = await Timetable.findAll({
      where: { institution_id: req.user.institution_id },
      include: [{ model: ConflictLog, as: 'conflictLog' }],
      order: [['createdAt', 'DESC']],
    });
    res.json({ timetables });
  } catch (err) { next(err); }
};

const create = async (req, res, next) => {
  try {
    const { name, academic_year, semester } = req.body;
    const timetable = await Timetable.create({
      name: name || `Timetable ${new Date().toLocaleDateString()}`,
      academic_year,
      semester,
      institution_id: req.user.institution_id,
      created_by: req.user.id,
      status: 'draft',
    });
    res.status(201).json(timetable);
  } catch (err) { next(err); }
};

const getOne = async (req, res, next) => {
  try {
    const timetable = await Timetable.findOne({
      where: { id: req.params.id, institution_id: req.user.institution_id },
      include: [{ model: ConflictLog, as: 'conflictLog' }],
    });
    if (!timetable) return res.status(404).json({ error: 'Timetable not found' });
    res.json(timetable);
  } catch (err) { next(err); }
};

const getGrid = async (req, res, next) => {
  try {
    const timetable = await Timetable.findOne({
      where: { id: req.params.id, institution_id: req.user.institution_id },
      include: [{ model: Institution, as: 'institution' }],
    });
    if (!timetable) return res.status(404).json({ error: 'Timetable not found' });

    const entries = await TimetableEntry.findAll({
      where: { timetable_id: req.params.id },
      include: [
        { model: Teacher, as: 'teacher' },
        { model: Subject, as: 'subject' },
        { model: Room, as: 'room' },
      ],
    });

    const institution = timetable.institution;
    const groups = [...new Set(entries.map(e => e.student_group || 'Default'))];

    // Build grid per group
    const grid = {};
    for (const group of groups) {
      const groupEntries = entries.filter(e => (e.student_group || 'Default') === group);
      grid[group] = {};
      for (let d = 0; d < institution.working_days; d++) {
        grid[group][d] = {};
        for (let s = 0; s < institution.slots_per_day; s++) {
          const entry = groupEntries.find(e => e.day_of_week === d && e.slot_number === s);
          grid[group][d][s] = entry ? {
            id: entry.id,
            teacher: entry.teacher ? { id: entry.teacher.id, name: entry.teacher.name } : null,
            subject: entry.subject ? { id: entry.subject.id, name: entry.subject.name, color_hex: entry.subject.color_hex } : null,
            room: entry.room ? { id: entry.room.id, name: entry.room.name } : null,
            student_group: entry.student_group,
          } : null;
        }
      }
    }

    res.json({ timetable, grid, groups, institution, entriesCount: entries.length });
  } catch (err) { next(err); }
};

const generate = async (req, res, next) => {
  try {
    const { name, academic_year, semester, naturalLanguageInput, timetableId } = req.body;

    let timetable;
    if (timetableId) {
      timetable = await Timetable.findOne({ where: { id: timetableId, institution_id: req.user.institution_id } });
      if (!timetable) return res.status(404).json({ error: 'Timetable not found' });
    } else {
      timetable = await Timetable.create({
        name: name || `AI Timetable ${new Date().toLocaleDateString()}`,
        academic_year: academic_year || new Date().getFullYear() + '-' + (new Date().getFullYear() + 1),
        semester: semester || 'Semester 1',
        institution_id: req.user.institution_id,
        created_by: req.user.id,
        status: 'draft',
      });
    }

    // Start async generation (don't await — progress via socket)
    generateTimetable(timetable.id, req.user.institution_id, naturalLanguageInput, req.user.id)
      .catch(err => console.error('Generation error:', err));

    res.json({ message: 'Generation started', timetableId: timetable.id });
  } catch (err) { next(err); }
};

const applyFix = async (req, res, next) => {
  try {
    const { fixId } = req.body;
    const timetable = await Timetable.findOne({ where: { id: req.params.id, institution_id: req.user.institution_id } });
    if (!timetable) return res.status(404).json({ error: 'Timetable not found' });

    // Update conflict log with selected fix
    const conflictLog = await ConflictLog.findOne({ where: { timetable_id: req.params.id } });
    if (conflictLog) await conflictLog.update({ selected_fix_id: fixId });

    // Trigger regeneration
    generateTimetable(timetable.id, req.user.institution_id, null, req.user.id)
      .catch(err => console.error('Re-generation error:', err));

    res.json({ message: 'Fix applied, regenerating...', timetableId: timetable.id });
  } catch (err) { next(err); }
};

const publish = async (req, res, next) => {
  try {
    const timetable = await Timetable.findOne({ where: { id: req.params.id, institution_id: req.user.institution_id } });
    if (!timetable) return res.status(404).json({ error: 'Timetable not found' });
    await timetable.update({ status: 'published' });
    res.json({ message: 'Published', timetable });
  } catch (err) { next(err); }
};

const exportTimetable = async (req, res, next) => {
  try {
    const { format } = req.query;
    const timetable = await Timetable.findOne({ where: { id: req.params.id, institution_id: req.user.institution_id } });
    if (!timetable) return res.status(404).json({ error: 'Timetable not found' });

    if (format === 'pdf') {
      const buffer = await generatePDF(req.params.id);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${timetable.name}.pdf"`);
      res.send(Buffer.from(buffer));
    } else {
      const buffer = await generateExcel(req.params.id);
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${timetable.name}.xlsx"`);
      res.send(buffer);
    }
  } catch (err) { next(err); }
};

module.exports = { getAll, create, getOne, getGrid, generate, applyFix, publish, exportTimetable };
