const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const TeacherSubject = sequelize.define('TeacherSubject', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  teacher_id: { type: DataTypes.UUID, allowNull: false },
  subject_id: { type: DataTypes.UUID, allowNull: false },
}, {
  tableName: 'teacher_subjects',
  timestamps: true,
  indexes: [{ unique: true, fields: ['teacher_id', 'subject_id'] }],
});

module.exports = TeacherSubject;
