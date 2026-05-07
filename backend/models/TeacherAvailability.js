const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const TeacherAvailability = sequelize.define('TeacherAvailability', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  teacher_id: { type: DataTypes.UUID, allowNull: false },
  day_of_week: { type: DataTypes.INTEGER, allowNull: false },
  slot_number: { type: DataTypes.INTEGER, allowNull: false },
  is_available: { type: DataTypes.BOOLEAN, defaultValue: true },
}, {
  tableName: 'teacher_availability',
  timestamps: true,
  indexes: [{ unique: true, fields: ['teacher_id', 'day_of_week', 'slot_number'] }],
});

module.exports = TeacherAvailability;
