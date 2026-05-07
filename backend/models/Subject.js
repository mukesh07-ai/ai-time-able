const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Subject = sequelize.define('Subject', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  institution_id: { type: DataTypes.UUID, allowNull: false },
  name: { type: DataTypes.STRING(100), allowNull: false },
  code: { type: DataTypes.STRING(20) },
  credits: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 3 },
  type: { type: DataTypes.ENUM('theory', 'lab', 'both'), defaultValue: 'theory' },
  department_id: { type: DataTypes.UUID, allowNull: true },
  course_id: { type: DataTypes.UUID, allowNull: true },
  semester_id: { type: DataTypes.UUID, allowNull: true },
  teacher_id: { type: DataTypes.UUID, allowNull: true },
  student_group: { type: DataTypes.STRING(100), allowNull: true },
  color_hex: { type: DataTypes.STRING(7), defaultValue: '#4F8EF7' },
}, { tableName: 'subjects', timestamps: true });

module.exports = Subject;
