const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Semester = sequelize.define('Semester', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  name: { type: DataTypes.STRING(100), allowNull: false },
  course_id: { type: DataTypes.UUID, allowNull: false },
  department_id: { type: DataTypes.UUID, allowNull: false },
  room_id: { type: DataTypes.UUID, allowNull: true },
  institution_id: { type: DataTypes.UUID, allowNull: false },
}, { tableName: 'semesters', timestamps: true });

module.exports = Semester;
