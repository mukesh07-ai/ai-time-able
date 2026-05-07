const { sequelize } = require('../config/database');
const Institution = require('./Institution');
const User = require('./User');
const Teacher = require('./Teacher');
const Student = require('./Student');
const TeacherAvailability = require('./TeacherAvailability');
const TeacherSubject = require('./TeacherSubject');
const Subject = require('./Subject');
const Room = require('./Room');
const Timetable = require('./Timetable');
const TimetableEntry = require('./TimetableEntry');
const ConflictLog = require('./ConflictLog');
const Department = require('./Department');
const Course = require('./Course');
const Semester = require('./Semester');
const LeaveRequest = require('./LeaveRequest');

// Institution associations
Institution.hasMany(Teacher, { foreignKey: 'institution_id', as: 'teachers', onDelete: 'CASCADE' });
Institution.hasMany(Student, { foreignKey: 'institution_id', as: 'students', onDelete: 'CASCADE' });
Institution.hasMany(Subject, { foreignKey: 'institution_id', as: 'subjects', onDelete: 'CASCADE' });
Institution.hasMany(Room, { foreignKey: 'institution_id', as: 'rooms', onDelete: 'CASCADE' });
Institution.hasMany(Timetable, { foreignKey: 'institution_id', as: 'timetables', onDelete: 'CASCADE' });
Institution.hasMany(User, { foreignKey: 'institution_id', as: 'users', onDelete: 'CASCADE' });
Institution.hasMany(Department, { foreignKey: 'institution_id', as: 'departments', onDelete: 'CASCADE' });
Institution.hasMany(Course, { foreignKey: 'institution_id', as: 'courses', onDelete: 'CASCADE' });
Institution.hasMany(Semester, { foreignKey: 'institution_id', as: 'semesters', onDelete: 'CASCADE' });
Institution.hasMany(LeaveRequest, { foreignKey: 'institution_id', as: 'leaveRequests', onDelete: 'CASCADE' });

// User associations
User.belongsTo(Institution, { foreignKey: 'institution_id', as: 'institution' });
User.hasOne(Teacher, { foreignKey: 'user_id', as: 'teacherProfile', onDelete: 'CASCADE' });
User.hasOne(Student, { foreignKey: 'user_id', as: 'studentProfile', onDelete: 'CASCADE' });

// Teacher associations
Teacher.belongsTo(Institution, { foreignKey: 'institution_id', as: 'institution' });
Teacher.belongsTo(User, { foreignKey: 'user_id', as: 'user', onDelete: 'CASCADE' });
Teacher.hasMany(TeacherAvailability, { foreignKey: 'teacher_id', as: 'availability', onDelete: 'CASCADE' });
Teacher.belongsToMany(Subject, { through: TeacherSubject, foreignKey: 'teacher_id', otherKey: 'subject_id', as: 'subjects', onDelete: 'CASCADE' });
Teacher.hasMany(Subject, { foreignKey: 'teacher_id', as: 'assignedSubjects' });
Teacher.belongsTo(Department, { foreignKey: 'department_id', as: 'department' });
Teacher.hasMany(LeaveRequest, { foreignKey: 'teacher_id', as: 'leaveRequests', onDelete: 'CASCADE' });

// Student associations
Student.belongsTo(Institution, { foreignKey: 'institution_id', as: 'institution' });
Student.belongsTo(User, { foreignKey: 'user_id', as: 'user', onDelete: 'CASCADE' });

// TeacherAvailability
TeacherAvailability.belongsTo(Teacher, { foreignKey: 'teacher_id', as: 'teacher', onDelete: 'CASCADE' });

// Subject associations
Subject.belongsTo(Institution, { foreignKey: 'institution_id', as: 'institution' });
Subject.belongsToMany(Teacher, { through: TeacherSubject, foreignKey: 'subject_id', otherKey: 'teacher_id', as: 'teachers', onDelete: 'CASCADE' });
Subject.belongsTo(Teacher, { foreignKey: 'teacher_id', as: 'assignedTeacher' });
Subject.belongsTo(Department, { foreignKey: 'department_id', as: 'department' });
Subject.belongsTo(Course, { foreignKey: 'course_id', as: 'course' });
Subject.belongsTo(Semester, { foreignKey: 'semester_id', as: 'semester' });

// Room associations
Room.belongsTo(Institution, { foreignKey: 'institution_id', as: 'institution' });

// Timetable associations
Timetable.belongsTo(Institution, { foreignKey: 'institution_id', as: 'institution' });
Timetable.belongsTo(User, { foreignKey: 'created_by', as: 'creator' });
Timetable.hasMany(TimetableEntry, { foreignKey: 'timetable_id', as: 'entries', onDelete: 'CASCADE' });
Timetable.hasOne(ConflictLog, { foreignKey: 'timetable_id', as: 'conflictLog', onDelete: 'CASCADE' });

// TimetableEntry associations
TimetableEntry.belongsTo(Timetable, { foreignKey: 'timetable_id', as: 'timetable' });
TimetableEntry.belongsTo(Teacher, { foreignKey: 'teacher_id', as: 'teacher' });
TimetableEntry.belongsTo(Subject, { foreignKey: 'subject_id', as: 'subject' });
TimetableEntry.belongsTo(Room, { foreignKey: 'room_id', as: 'room' });

// ConflictLog associations
ConflictLog.belongsTo(Timetable, { foreignKey: 'timetable_id', as: 'timetable' });

// Department associations
Department.belongsTo(Institution, { foreignKey: 'institution_id', as: 'institution' });
Department.hasMany(Course, { foreignKey: 'department_id', as: 'courses', onDelete: 'CASCADE' });
Department.hasMany(Semester, { foreignKey: 'department_id', as: 'semesters', onDelete: 'CASCADE' });
Department.hasMany(Subject, { foreignKey: 'department_id', as: 'subjects' });
Department.hasMany(Teacher, { foreignKey: 'department_id', as: 'teachers' });

// Course associations
Course.belongsTo(Department, { foreignKey: 'department_id', as: 'department' });
Course.hasMany(Semester, { foreignKey: 'course_id', as: 'semesters', onDelete: 'CASCADE' });
Course.belongsTo(Institution, { foreignKey: 'institution_id', as: 'institution' });
Course.hasMany(Subject, { foreignKey: 'course_id', as: 'subjects' });

// Semester associations
Semester.belongsTo(Course, { foreignKey: 'course_id', as: 'course' });
Semester.belongsTo(Department, { foreignKey: 'department_id', as: 'department' });
Semester.belongsTo(Room, { foreignKey: 'room_id', as: 'room' });
Semester.belongsTo(Institution, { foreignKey: 'institution_id', as: 'institution' });
Semester.hasMany(Subject, { foreignKey: 'semester_id', as: 'subjects' });

// LeaveRequest associations
LeaveRequest.belongsTo(Teacher, { foreignKey: 'teacher_id', as: 'teacher' });
LeaveRequest.belongsTo(Institution, { foreignKey: 'institution_id', as: 'institution' });
LeaveRequest.belongsTo(User, { foreignKey: 'reviewed_by', as: 'reviewer' });

module.exports = {
  sequelize,
  Institution, User, Teacher, Student,
  TeacherAvailability, TeacherSubject,
  Subject, Room,
  Timetable, TimetableEntry, ConflictLog,
  Department, Course, Semester,
  LeaveRequest,
};
