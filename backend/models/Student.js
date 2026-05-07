const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Student = sequelize.define('Student', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  institution_id: { type: DataTypes.UUID, allowNull: false },
  user_id: { type: DataTypes.UUID, allowNull: true },
  name: { type: DataTypes.STRING(100), allowNull: false },
  email: { type: DataTypes.STRING(150) },
  student_group: { type: DataTypes.STRING(100) }, // e.g. "Class 10A"
  is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
}, { tableName: 'students', timestamps: true });

module.exports = Student;
