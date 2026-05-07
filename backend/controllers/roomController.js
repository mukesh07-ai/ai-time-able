const { Room } = require('../models');
const { Op } = require('sequelize');

const getAll = async (req, res, next) => {
  try {
    const { page = 1, limit = 50, room_type } = req.query;
    const where = { institution_id: req.user.institution_id };
    if (room_type) where.room_type = room_type;

    const { count, rows } = await Room.findAndCountAll({
      where, limit: parseInt(limit), offset: (parseInt(page) - 1) * parseInt(limit), order: [['name', 'ASC']],
    });
    res.json({ rooms: rows, total: count });
  } catch (err) { next(err); }
};

const create = async (req, res, next) => {
  try {
    const room = await Room.create({ ...req.body, institution_id: req.user.institution_id });
    res.status(201).json(room);
  } catch (err) { next(err); }
};

const getOne = async (req, res, next) => {
  try {
    const room = await Room.findOne({ where: { id: req.params.id, institution_id: req.user.institution_id } });
    if (!room) return res.status(404).json({ error: 'Room not found' });
    res.json(room);
  } catch (err) { next(err); }
};

const update = async (req, res, next) => {
  try {
    const room = await Room.findOne({ where: { id: req.params.id, institution_id: req.user.institution_id } });
    if (!room) return res.status(404).json({ error: 'Room not found' });
    await room.update(req.body);
    res.json(room);
  } catch (err) { next(err); }
};

const remove = async (req, res, next) => {
  try {
    const room = await Room.findOne({ where: { id: req.params.id, institution_id: req.user.institution_id } });
    if (!room) return res.status(404).json({ error: 'Room not found' });
    await room.update({ is_available: false });
    res.json({ message: 'Room marked unavailable' });
  } catch (err) { next(err); }
};

module.exports = { getAll, create, getOne, update, remove };
