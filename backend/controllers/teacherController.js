const bcrypt = require('bcryptjs');
const { Teacher, TeacherAvailability, TeacherSubject, Subject, User, Department } = require('../models');
const { Op } = require('sequelize');

const getAll = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, search, department_id } = req.query;
    const where = { institution_id: req.user.institution_id };
    if (search) where.name = { [Op.like]: `%${search}%` };
    if (department_id) where.department_id = department_id;

    const { count, rows } = await Teacher.findAndCountAll({
      where, limit: parseInt(limit), offset: (parseInt(page) - 1) * parseInt(limit),
      include: [
        { model: Subject, as: 'subjects', through: { attributes: [] } },
        { model: Department, as: 'department' },
        { model: User, as: 'user', attributes: ['id', 'email', 'role'] },
      ],
      order: [['name', 'ASC']],
    });
    res.json({ teachers: rows, total: count, page: parseInt(page), pages: Math.ceil(count / parseInt(limit)) });
  } catch (err) { next(err); }
};

const create = async (req, res, next) => {
  try {
    const { email, password, subject_ids, ...teacherData } = req.body;

    // ── Auto-create User account if email + password provided ──
    let userId = null;
    if (email && password) {
      const existing = await User.findOne({ where: { email } });
      if (existing) return res.status(400).json({ error: `A user with email "${email}" already exists.` });

      const password_hash = await bcrypt.hash(password, 10);
      const newUser = await User.create({
        name: teacherData.name,
        email,
        password_hash,
        role: 'teacher',
        institution_id: req.user.institution_id,
      });
      userId = newUser.id;
    }

    const teacher = await Teacher.create({
      ...teacherData,
      email: email || teacherData.email,
      user_id: userId,
      institution_id: req.user.institution_id,
    });

    if (subject_ids && subject_ids.length > 0) {
      await Promise.all(subject_ids.map(sid => TeacherSubject.upsert({ teacher_id: teacher.id, subject_id: sid })));
    }

    const full = await Teacher.findByPk(teacher.id, {
      include: [
        { model: Subject, as: 'subjects', through: { attributes: [] } },
        { model: Department, as: 'department' },
        { model: User, as: 'user', attributes: ['id', 'email', 'role'] },
      ]
    });
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
        { model: Department, as: 'department' },
        { model: User, as: 'user', attributes: ['id', 'email', 'role'] },
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

    const { subject_ids, password, ...updateData } = req.body;
    await teacher.update(updateData);

    // If a new password is provided, update the linked User account
    if (password && teacher.user_id) {
      const hash = await bcrypt.hash(password, 10);
      await User.update({ password_hash: hash }, { where: { id: teacher.user_id } });
    }

    if (subject_ids !== undefined) {
      await TeacherSubject.destroy({ where: { teacher_id: teacher.id } });
      if (subject_ids.length > 0) {
        await Promise.all(subject_ids.map(sid => TeacherSubject.upsert({ teacher_id: teacher.id, subject_id: sid })));
      }
    }
    const full = await Teacher.findByPk(teacher.id, {
      include: [
        { model: Subject, as: 'subjects', through: { attributes: [] } },
        { model: Department, as: 'department' },
        { model: User, as: 'user', attributes: ['id', 'email', 'role'] },
      ]
    });
    res.json(full);
  } catch (err) { next(err); }
};

const remove = async (req, res, next) => {
  try {
    const teacher = await Teacher.findOne({ where: { id: req.params.id, institution_id: req.user.institution_id } });
    if (!teacher) return res.status(404).json({ error: 'Teacher not found' });
    const userId = teacher.user_id;
    await TeacherAvailability.destroy({ where: { teacher_id: teacher.id } });
    await TeacherSubject.destroy({ where: { teacher_id: teacher.id } });
    await teacher.destroy();
    if (userId) await User.destroy({ where: { id: userId } });
    res.json({ message: 'Teacher deleted successfully' });
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
