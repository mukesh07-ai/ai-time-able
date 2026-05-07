const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Timetable = sequelize.define('Timetable', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  institution_id: { type: DataTypes.UUID, allowNull: false },
  name: { type: DataTypes.STRING(200), allowNull: false },
  academic_year: { type: DataTypes.STRING(20) },
  department_id: { type: DataTypes.UUID, allowNull: true },
  course_id: { type: DataTypes.UUID, allowNull: true },
  semester_id: { type: DataTypes.UUID, allowNull: true },
  semester: { type: DataTypes.STRING(20) }, // Kept for legacy/text fallback
  status: {
    type: DataTypes.ENUM('draft', 'generating', 'feasible', 'infeasible', 'published'),
    defaultValue: 'draft',
  },
  solver_time_ms: { type: DataTypes.INTEGER },
  generation_log: { type: DataTypes.JSON },
  created_by: { type: DataTypes.UUID },
}, { tableName: 'timetables', timestamps: true });

module.exports = Timetable;
