const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Teacher = sequelize.define('Teacher', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  institution_id: { type: DataTypes.UUID, allowNull: false },
  name: { type: DataTypes.STRING(100), allowNull: false },
  email: { type: DataTypes.STRING(150) },
  employee_code: { type: DataTypes.STRING(30) },
  department: { type: DataTypes.STRING(100) },
  max_periods_per_day: { type: DataTypes.INTEGER, defaultValue: 6 },
  max_periods_per_week: { type: DataTypes.INTEGER, defaultValue: 30 },
  is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
}, { tableName: 'teachers', timestamps: true });

module.exports = Teacher;
