const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Subject = sequelize.define('Subject', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  institution_id: { type: DataTypes.UUID, allowNull: false },
  name: { type: DataTypes.STRING(100), allowNull: false },
  code: { type: DataTypes.STRING(20) },
  periods_per_week: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 4 },
  requires_lab: { type: DataTypes.BOOLEAN, defaultValue: false },
  student_group: { type: DataTypes.STRING(50) },
  color_hex: { type: DataTypes.STRING(7), defaultValue: '#4F8EF7' },
  is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
}, { tableName: 'subjects', timestamps: true });

module.exports = Subject;
