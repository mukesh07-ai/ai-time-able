const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Institution = sequelize.define('Institution', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  name: { type: DataTypes.STRING(200), allowNull: false },
  code: { type: DataTypes.STRING(20), unique: true },
  working_days: { type: DataTypes.INTEGER, defaultValue: 5 },
  slots_per_day: { type: DataTypes.INTEGER, defaultValue: 8 },
  slot_duration_minutes: { type: DataTypes.INTEGER, defaultValue: 45 },
  lunch_slot: { type: DataTypes.INTEGER, defaultValue: 4 },
  day_start_time: { type: DataTypes.STRING(5), defaultValue: '08:00' },
}, { tableName: 'institutions', timestamps: true });

module.exports = Institution;
