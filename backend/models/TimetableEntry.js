const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const TimetableEntry = sequelize.define('TimetableEntry', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  timetable_id: { type: DataTypes.UUID, allowNull: false },
  teacher_id: { type: DataTypes.UUID, allowNull: true },
  subject_id: { type: DataTypes.UUID, allowNull: true },
  room_id: { type: DataTypes.UUID, allowNull: true },
  day_of_week: { type: DataTypes.INTEGER, allowNull: false },
  slot_number: { type: DataTypes.INTEGER, allowNull: false },
  student_group: { type: DataTypes.STRING(50) },
  is_free_period: { type: DataTypes.BOOLEAN, defaultValue: false },
}, {
  tableName: 'timetable_entries',
  timestamps: true,
  indexes: [
    { name: 'tte_teacher_slot', unique: true, fields: ['timetable_id', 'teacher_id', 'day_of_week', 'slot_number'] },
    { name: 'tte_room_slot', unique: true, fields: ['timetable_id', 'room_id', 'day_of_week', 'slot_number'] },
  ],
});

module.exports = TimetableEntry;
