const { Subject, Teacher, Department, Course, Semester, TeacherSubject } = require('../models');
const { Op } = require('sequelize');

const getAll = async (req, res, next) => {
  try {
    const { page = 1, limit = 100, search, department_id, course_id, semester_id } = req.query;
    const where = { institution_id: req.user.institution_id };
    if (search) where.name = { [Op.like]: `%${search}%` };
    if (department_id) where.department_id = department_id;
    if (course_id) where.course_id = course_id;
    if (semester_id) where.semester_id = semester_id;

    const { count, rows } = await Subject.findAndCountAll({
      where, 
      limit: parseInt(limit), 
      offset: (parseInt(page) - 1) * parseInt(limit), 
      order: [['name', 'ASC']],
      include: [
        { model: Teacher, as: 'assignedTeacher' },
        { model: Department, as: 'department' },
        { model: Course, as: 'course' },
        { model: Semester, as: 'semester' }
      ]
    });
    res.json({ subjects: rows, total: count });
  } catch (err) { next(err); }
};

const create = async (req, res, next) => {
  try {
    const colors = ['#4F8EF7','#10B981','#F59E0B','#8B5CF6','#EF4444','#06B6D4','#F97316','#84CC16','#EC4899','#6366F1'];
    const count = await Subject.count({ where: { institution_id: req.user.institution_id } });
    
    const subject = await Subject.create({
      ...req.body,
      institution_id: req.user.institution_id,
      color_hex: req.body.color_hex || colors[count % colors.length],
    });

    // Link teacher in TeacherSubject junction table for solver compatibility
    if (req.body.teacher_id) {
      await TeacherSubject.create({
        teacher_id: req.body.teacher_id,
        subject_id: subject.id
      });
    }

    res.status(201).json(subject);
  } catch (err) { next(err); }
};

const getOne = async (req, res, next) => {
  try {
    const subject = await Subject.findOne({ 
      where: { id: req.params.id, institution_id: req.user.institution_id },
      include: [
        { model: Teacher, as: 'assignedTeacher' },
        { model: Department, as: 'department' },
        { model: Course, as: 'course' },
        { model: Semester, as: 'semester' }
      ]
    });
    if (!subject) return res.status(404).json({ error: 'Subject not found' });
    res.json(subject);
  } catch (err) { next(err); }
};

const update = async (req, res, next) => {
  try {
    const subject = await Subject.findOne({ where: { id: req.params.id, institution_id: req.user.institution_id } });
    if (!subject) return res.status(404).json({ error: 'Subject not found' });
    
    const oldTeacherId = subject.teacher_id;
    await subject.update(req.body);

    // Sync TeacherSubject junction table
    if (req.body.teacher_id !== undefined && req.body.teacher_id !== oldTeacherId) {
      // Remove old link if it existed
      if (oldTeacherId) {
        await TeacherSubject.destroy({ where: { teacher_id: oldTeacherId, subject_id: subject.id } });
      }
      // Create new link if teacher_id is not null
      if (req.body.teacher_id) {
        await TeacherSubject.upsert({
          teacher_id: req.body.teacher_id,
          subject_id: subject.id
        });
      }
    }

    res.json(subject);
  } catch (err) { next(err); }
};

const remove = async (req, res, next) => {
  try {
    const subject = await Subject.findOne({ where: { id: req.params.id, institution_id: req.user.institution_id } });
    if (!subject) return res.status(404).json({ error: 'Subject not found' });
    await subject.destroy();
    res.json({ message: 'Subject deleted permanently' });
  } catch (err) { next(err); }
};

module.exports = { getAll, create, getOne, update, remove };
