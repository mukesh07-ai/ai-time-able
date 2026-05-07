const { sequelize } = require('../config/database');
const Institution = require('./Institution');
const User = require('./User');
const Teacher = require('./Teacher');
const TeacherAvailability = require('./TeacherAvailability');
const TeacherSubject = require('./TeacherSubject');
const Subject = require('./Subject');
const Room = require('./Room');
const Timetable = require('./Timetable');
const TimetableEntry = require('./TimetableEntry');
const ConflictLog = require('./ConflictLog');

// Institution associations
Institution.hasMany(Teacher, { foreignKey: 'institution_id', as: 'teachers' });
Institution.hasMany(Subject, { foreignKey: 'institution_id', as: 'subjects' });
Institution.hasMany(Room, { foreignKey: 'institution_id', as: 'rooms' });
Institution.hasMany(Timetable, { foreignKey: 'institution_id', as: 'timetables' });
Institution.hasMany(User, { foreignKey: 'institution_id', as: 'users' });

// User associations
User.belongsTo(Institution, { foreignKey: 'institution_id', as: 'institution' });

// Teacher associations
Teacher.belongsTo(Institution, { foreignKey: 'institution_id', as: 'institution' });
Teacher.hasMany(TeacherAvailability, { foreignKey: 'teacher_id', as: 'availability' });
Teacher.belongsToMany(Subject, { through: TeacherSubject, foreignKey: 'teacher_id', otherKey: 'subject_id', as: 'subjects' });

// TeacherAvailability
TeacherAvailability.belongsTo(Teacher, { foreignKey: 'teacher_id', as: 'teacher' });

// Subject associations
Subject.belongsTo(Institution, { foreignKey: 'institution_id', as: 'institution' });
Subject.belongsToMany(Teacher, { through: TeacherSubject, foreignKey: 'subject_id', otherKey: 'teacher_id', as: 'teachers' });

// Room associations
Room.belongsTo(Institution, { foreignKey: 'institution_id', as: 'institution' });

// Timetable associations
Timetable.belongsTo(Institution, { foreignKey: 'institution_id', as: 'institution' });
Timetable.belongsTo(User, { foreignKey: 'created_by', as: 'creator' });
Timetable.hasMany(TimetableEntry, { foreignKey: 'timetable_id', as: 'entries' });
Timetable.hasOne(ConflictLog, { foreignKey: 'timetable_id', as: 'conflictLog' });

// TimetableEntry associations
TimetableEntry.belongsTo(Timetable, { foreignKey: 'timetable_id', as: 'timetable' });
TimetableEntry.belongsTo(Teacher, { foreignKey: 'teacher_id', as: 'teacher' });
TimetableEntry.belongsTo(Subject, { foreignKey: 'subject_id', as: 'subject' });
TimetableEntry.belongsTo(Room, { foreignKey: 'room_id', as: 'room' });

// ConflictLog associations
ConflictLog.belongsTo(Timetable, { foreignKey: 'timetable_id', as: 'timetable' });

module.exports = {
  sequelize,
  Institution,
  User,
  Teacher,
  TeacherAvailability,
  TeacherSubject,
  Subject,
  Room,
  Timetable,
  TimetableEntry,
  ConflictLog,
};
