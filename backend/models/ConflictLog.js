const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const ConflictLog = sequelize.define('ConflictLog', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  timetable_id: { type: DataTypes.UUID, allowNull: false },
  raw_conflicts: { type: DataTypes.JSON },
  llm_explanation: { type: DataTypes.TEXT },
  suggested_fixes: { type: DataTypes.JSON },
  selected_fix_id: { type: DataTypes.STRING(10) },
  is_resolved: { type: DataTypes.BOOLEAN, defaultValue: false },
}, { tableName: 'conflict_logs', timestamps: true });

module.exports = ConflictLog;
