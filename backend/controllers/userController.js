const bcrypt = require('bcryptjs');
const { User, Teacher, Student, Institution } = require('../models');

const addTeacher = async (req, res, next) => {
  try {
    const { name, email, password, employee_code, department_id, max_periods_per_day, max_periods_per_week } = req.body;
    if (!req.user.institution_id) return res.status(400).json({ error: 'No institution linked to admin' });
    
    const existing = await User.findOne({ where: { email } });
    if (existing) return res.status(409).json({ error: 'Email already registered' });

    const hash = await bcrypt.hash(password || 'Teacher123', 12);
    const user = await User.create({
      name, email, password_hash: hash, institution_id: req.user.institution_id, role: 'teacher'
    });

    await Teacher.create({
      institution_id: req.user.institution_id,
      user_id: user.id,
      name, email, employee_code, department_id, max_periods_per_day, max_periods_per_week, is_active: true
    });

    res.status(201).json({ user });
  } catch (err) { next(err); }
};

const addStudent = async (req, res, next) => {
  try {
    const { name, email, password, student_group } = req.body;
    if (!req.user.institution_id) return res.status(400).json({ error: 'No institution linked to admin' });

    const existing = await User.findOne({ where: { email } });
    if (existing) return res.status(409).json({ error: 'Email already registered' });

    const hash = await bcrypt.hash(password || 'Student123', 12);
    const user = await User.create({
      name, email, password_hash: hash, institution_id: req.user.institution_id, role: 'student'
    });

    await Student.create({
      institution_id: req.user.institution_id,
      user_id: user.id,
      name, email, student_group, is_active: true
    });

    res.status(201).json({ user });
  } catch (err) { next(err); }
};

const getAllUsers = async (req, res, next) => {
  try {
    const users = await User.findAll({
      where: { institution_id: req.user.institution_id },
      attributes: { exclude: ['password_hash'] },
      include: [
        { model: Teacher, as: 'teacherProfile' },
        { model: Student, as: 'studentProfile' }
      ]
    });
    res.json(users);
  } catch (err) { next(err); }
};

const deleteUser = async (req, res, next) => {
  try {
    const user = await User.findOne({ where: { id: req.params.id, institution_id: req.user.institution_id } });
    if (!user) return res.status(404).json({ error: 'User not found' });

    if (user.id === req.user.id) return res.status(400).json({ error: 'Cannot delete yourself' });

    // Delete linked profiles first
    await Teacher.destroy({ where: { user_id: user.id } });
    await Student.destroy({ where: { user_id: user.id } });
    
    await user.destroy();
    res.json({ message: 'User deleted successfully' });
  } catch (err) { next(err); }
};

module.exports = { addTeacher, addStudent, getAllUsers, deleteUser };
