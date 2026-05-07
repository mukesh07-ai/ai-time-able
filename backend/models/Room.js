const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Room = sequelize.define('Room', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  institution_id: { type: DataTypes.UUID, allowNull: false },
  name: { type: DataTypes.STRING(100), allowNull: false },
  capacity: { type: DataTypes.INTEGER, defaultValue: 40 },
  room_type: {
    type: DataTypes.ENUM('classroom', 'lab', 'auditorium', 'seminar_hall'),
    defaultValue: 'classroom',
  },
  floor: { type: DataTypes.INTEGER },
  building: { type: DataTypes.STRING(50) },
  is_available: { type: DataTypes.BOOLEAN, defaultValue: true },
}, { tableName: 'rooms', timestamps: true });

module.exports = Room;
