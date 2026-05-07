const { Department, Course, Semester, Room, sequelize } = require('../models');

const setupStructure = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  try {
    const { departmentName, courses } = req.body;
    if (!departmentName) {
      await transaction.rollback();
      return res.status(400).json({ error: 'Department name required' });
    }
    if (!courses || !Array.isArray(courses)) {
      await transaction.rollback();
      return res.status(400).json({ error: 'Courses array required' });
    }

    // 1. Create Department
    const dept = await Department.create({
      name: departmentName,
      institution_id: req.user.institution_id
    }, { transaction });

    // 2. Create Courses and their Semesters
    const createdStructure = [];
    for (const c of courses) {
      const course = await Course.create({
        name: c.name,
        department_id: dept.id,
        institution_id: req.user.institution_id
      }, { transaction });

      const sems = [];
      if (c.semesters && Array.isArray(c.semesters)) {
        for (const s of c.semesters) {
          const sem = await Semester.create({
            name: s.name,
            course_id: course.id,
            department_id: dept.id,
            room_id: s.room_id && s.room_id !== '' ? s.room_id : null,
            institution_id: req.user.institution_id
          }, { transaction });
          sems.push(sem);
        }
      }
      createdStructure.push({ course, semesters: sems });
    }

    await transaction.commit();
    res.status(201).json({ department: dept, structure: createdStructure });
  } catch (err) {
    if (transaction) await transaction.rollback();
    next(err);
  }
};

const getAll = async (req, res, next) => {
  try {
    const depts = await Department.findAll({
      where: { institution_id: req.user.institution_id },
      include: [
        { 
          model: Course, 
          as: 'courses',
          include: [
            { 
              model: Semester, 
              as: 'semesters',
              include: [{ model: Room, as: 'room' }] 
            }
          ] 
        }
      ]
    });
    res.json(depts);
  } catch (err) { next(err); }
};

const update = async (req, res, next) => {
  try {
    const { name } = req.body;
    const dept = await Department.findOne({ where: { id: req.params.id, institution_id: req.user.institution_id } });
    if (!dept) return res.status(404).json({ error: 'Department not found' });
    await dept.update({ name });
    res.json(dept);
  } catch (err) { next(err); }
};

const remove = async (req, res, next) => {
  try {
    const dept = await Department.findOne({ where: { id: req.params.id, institution_id: req.user.institution_id } });
    if (!dept) return res.status(404).json({ error: 'Department not found' });
    await dept.destroy();
    res.json({ message: 'Department deleted successfully' });
  } catch (err) { next(err); }
};

module.exports = { setupStructure, getAll, update, remove };
