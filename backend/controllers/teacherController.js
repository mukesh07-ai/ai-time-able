const { Teacher, TeacherAvailability, TeacherSubject, Subject } = require('../models');
const { Op } = require('sequelize');

const getAll = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, search, department } = req.query;
    const where = { institution_id: req.user.institution_id, is_active: true };
    if (search) where.name = { [Op.like]: `%${search}%` };
    if (department) where.department = department;

    const { count, rows } = await Teacher.findAndCountAll({
      where, limit: parseInt(limit), offset: (parseInt(page) - 1) * parseInt(limit),
      include: [{ model: Subject, as: 'subjects', through: { attributes: [] } }],
      order: [['name', 'ASC']],
    });
    res.json({ teachers: rows, total: count, page: parseInt(page), pages: Math.ceil(count / parseInt(limit)) });
  } catch (err) { next(err); }
};

const create = async (req, res, next) => {
  try {
    const teacher = await Teacher.create({ ...req.body, institution_id: req.user.institution_id });
    if (req.body.subject_ids && req.body.subject_ids.length > 0) {
      await Promise.all(req.body.subject_ids.map(sid => TeacherSubject.upsert({ teacher_id: teacher.id, subject_id: sid })));
    }
    const full = await Teacher.findByPk(teacher.id, { include: [{ model: Subject, as: 'subjects', through: { attributes: [] } }] });
    res.status(201).json(full);
  } catch (err) { next(err); }
};

const getOne = async (req, res, next) => {
  try {
    const teacher = await Teacher.findOne({
      where: { id: req.params.id, institution_id: req.user.institution_id },
      include: [
        { model: Subject, as: 'subjects', through: { attributes: [] } },
        { model: TeacherAvailability, as: 'availability' },
      ],
    });
    if (!teacher) return res.status(404).json({ error: 'Teacher not found' });
    res.json(teacher);
  } catch (err) { next(err); }
};

const update = async (req, res, next) => {
  try {
    const teacher = await Teacher.findOne({ where: { id: req.params.id, institution_id: req.user.institution_id } });
    if (!teacher) return res.status(404).json({ error: 'Teacher not found' });
    await teacher.update(req.body);
    if (req.body.subject_ids !== undefined) {
      await TeacherSubject.destroy({ where: { teacher_id: teacher.id } });
      if (req.body.subject_ids.length > 0) {
        await Promise.all(req.body.subject_ids.map(sid => TeacherSubject.upsert({ teacher_id: teacher.id, subject_id: sid })));
      }
    }
    const full = await Teacher.findByPk(teacher.id, { include: [{ model: Subject, as: 'subjects', through: { attributes: [] } }] });
    res.json(full);
  } catch (err) { next(err); }
};

const remove = async (req, res, next) => {
  try {
    const teacher = await Teacher.findOne({ where: { id: req.params.id, institution_id: req.user.institution_id } });
    if (!teacher) return res.status(404).json({ error: 'Teacher not found' });
    await teacher.update({ is_active: false });
    res.json({ message: 'Teacher deactivated' });
  } catch (err) { next(err); }
};

const updateAvailability = async (req, res, next) => {
  try {
    const teacher = await Teacher.findOne({ where: { id: req.params.id, institution_id: req.user.institution_id } });
    if (!teacher) return res.status(404).json({ error: 'Teacher not found' });

    const { availability } = req.body;
    if (!Array.isArray(availability)) return res.status(400).json({ error: 'availability must be array' });

    await TeacherAvailability.destroy({ where: { teacher_id: teacher.id } });
    if (availability.length > 0) {
      await TeacherAvailability.bulkCreate(
        availability.map(a => ({ teacher_id: teacher.id, day_of_week: a.day_of_week, slot_number: a.slot_number, is_available: a.is_available !== false })),
        { ignoreDuplicates: true }
      );
    }
    res.json({ message: 'Availability updated', count: availability.length });
  } catch (err) { next(err); }
};

const assignSubjects = async (req, res, next) => {
  try {
    const teacher = await Teacher.findOne({ where: { id: req.params.id, institution_id: req.user.institution_id } });
    if (!teacher) return res.status(404).json({ error: 'Teacher not found' });
    const { subject_ids } = req.body;
    await TeacherSubject.destroy({ where: { teacher_id: teacher.id } });
    if (subject_ids && subject_ids.length > 0) {
      await Promise.all(subject_ids.map(sid => TeacherSubject.upsert({ teacher_id: teacher.id, subject_id: sid })));
    }
    res.json({ message: 'Subjects assigned', count: subject_ids ? subject_ids.length : 0 });
  } catch (err) { next(err); }
};

module.exports = { getAll, create, getOne, update, remove, updateAvailability, assignSubjects };
