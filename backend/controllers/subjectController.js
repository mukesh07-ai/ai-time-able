const { Subject } = require('../models');
const { Op } = require('sequelize');

const getAll = async (req, res, next) => {
  try {
    const { page = 1, limit = 50, search, student_group } = req.query;
    const where = { institution_id: req.user.institution_id, is_active: true };
    if (search) where.name = { [Op.like]: `%${search}%` };
    if (student_group) where.student_group = student_group;

    const { count, rows } = await Subject.findAndCountAll({
      where, limit: parseInt(limit), offset: (parseInt(page) - 1) * parseInt(limit), order: [['name', 'ASC']],
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
    res.status(201).json(subject);
  } catch (err) { next(err); }
};

const getOne = async (req, res, next) => {
  try {
    const subject = await Subject.findOne({ where: { id: req.params.id, institution_id: req.user.institution_id } });
    if (!subject) return res.status(404).json({ error: 'Subject not found' });
    res.json(subject);
  } catch (err) { next(err); }
};

const update = async (req, res, next) => {
  try {
    const subject = await Subject.findOne({ where: { id: req.params.id, institution_id: req.user.institution_id } });
    if (!subject) return res.status(404).json({ error: 'Subject not found' });
    await subject.update(req.body);
    res.json(subject);
  } catch (err) { next(err); }
};

const remove = async (req, res, next) => {
  try {
    const subject = await Subject.findOne({ where: { id: req.params.id, institution_id: req.user.institution_id } });
    if (!subject) return res.status(404).json({ error: 'Subject not found' });
    await subject.update({ is_active: false });
    res.json({ message: 'Subject deactivated' });
  } catch (err) { next(err); }
};

module.exports = { getAll, create, getOne, update, remove };
