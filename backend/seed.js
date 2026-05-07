require('dotenv').config({ path: require('path').resolve(__dirname, '.env') });
const bcrypt = require('bcryptjs');
const { sequelize } = require('./config/database');
const { User, Institution, Teacher, Subject, Room, TeacherSubject } = require('./models');

async function seed() {
  try {
    await sequelize.authenticate();
    console.log('Connected to DB');

    // Institution
    const [institution] = await Institution.findOrCreate({
      where: { code: 'DEMO' },
      defaults: {
        name: 'Demo School', code: 'DEMO',
        working_days: 5, slots_per_day: 8,
        slot_duration_minutes: 45, lunch_slot: 4,
        day_start_time: '08:00',
      },
    });
    console.log('Institution: ' + institution.name);

    // Admin user
    const hash = await bcrypt.hash('admin123', 12);
    const [user, created] = await User.findOrCreate({
      where: { email: 'admin@school.com' },
      defaults: { name: 'Admin User', email: 'admin@school.com', password_hash: hash, role: 'admin', institution_id: institution.id },
    });
    if (!created) await user.update({ password_hash: hash });
    console.log('Admin: admin@school.com / admin123');

    // Subjects
    const subjectDefs = [
      { name: 'Mathematics',  code: 'MATH',  periods_per_week: 5, requires_lab: false, color_hex: '#4F8EF7', student_group: 'Class 10A' },
      { name: 'Physics',      code: 'PHY',   periods_per_week: 4, requires_lab: true,  color_hex: '#10B981', student_group: 'Class 10A' },
      { name: 'Chemistry',    code: 'CHEM',  periods_per_week: 4, requires_lab: true,  color_hex: '#F59E0B', student_group: 'Class 10A' },
      { name: 'English',      code: 'ENG',   periods_per_week: 5, requires_lab: false, color_hex: '#8B5CF6', student_group: 'Class 10A' },
      { name: 'History',      code: 'HIST',  periods_per_week: 3, requires_lab: false, color_hex: '#EF4444', student_group: 'Class 10A' },
      { name: 'Computer Sci', code: 'CS',    periods_per_week: 3, requires_lab: true,  color_hex: '#06B6D4', student_group: 'Class 10A' },
      { name: 'Biology',      code: 'BIO',   periods_per_week: 4, requires_lab: true,  color_hex: '#84CC16', student_group: 'Class 10B' },
      { name: 'Geography',    code: 'GEO',   periods_per_week: 3, requires_lab: false, color_hex: '#F97316', student_group: 'Class 10B' },
    ];
    const subjects = [];
    for (const s of subjectDefs) {
      const [sub] = await Subject.findOrCreate({
        where: { institution_id: institution.id, name: s.name },
        defaults: { ...s, institution_id: institution.id },
      });
      subjects.push(sub);
    }
    console.log('Subjects: ' + subjects.length + ' seeded');

    // Teachers
    const teacherDefs = [
      { name: 'Rajesh Sharma', department: 'Mathematics', email: 'sharma@demo.com', employee_code: 'T001', max_periods_per_day: 6, max_periods_per_week: 25, subjectNames: ['Mathematics', 'Physics'] },
      { name: 'Priya Gupta',   department: 'Science',     email: 'gupta@demo.com',  employee_code: 'T002', max_periods_per_day: 6, max_periods_per_week: 25, subjectNames: ['Chemistry', 'Biology'] },
      { name: 'Amit Singh',    department: 'Languages',   email: 'singh@demo.com',  employee_code: 'T003', max_periods_per_day: 5, max_periods_per_week: 20, subjectNames: ['English', 'History'] },
      { name: 'Sunita Verma',  department: 'Technology',  email: 'verma@demo.com',  employee_code: 'T004', max_periods_per_day: 6, max_periods_per_week: 20, subjectNames: ['Computer Sci', 'Mathematics'] },
      { name: 'Ravi Patel',    department: 'Social Sci',  email: 'patel@demo.com',  employee_code: 'T005', max_periods_per_day: 5, max_periods_per_week: 20, subjectNames: ['Geography', 'History'] },
    ];
    for (const t of teacherDefs) {
      const { subjectNames, ...teacherData } = t;
      const [teacher] = await Teacher.findOrCreate({
        where: { institution_id: institution.id, name: t.name },
        defaults: { ...teacherData, institution_id: institution.id },
      });
      await TeacherSubject.destroy({ where: { teacher_id: teacher.id } });
      for (const sName of subjectNames) {
        const sub = subjects.find(s => s.name === sName);
        if (sub) {
          try {
            await TeacherSubject.create({ teacher_id: teacher.id, subject_id: sub.id });
          } catch (e) { /* ignore duplicate */ }
        }
      }
    }
    console.log('Teachers: ' + teacherDefs.length + ' seeded');

    // Rooms
    const roomDefs = [
      { name: 'Room 101',     capacity: 40, room_type: 'classroom', floor: 1, building: 'Main Block',    is_available: true, is_lab: false },
      { name: 'Room 102',     capacity: 40, room_type: 'classroom', floor: 1, building: 'Main Block',    is_available: true, is_lab: false },
      { name: 'Room 201',     capacity: 35, room_type: 'classroom', floor: 2, building: 'Main Block',    is_available: true, is_lab: false },
      { name: 'Science Lab',  capacity: 30, room_type: 'lab',       floor: 1, building: 'Science Block', is_available: true, is_lab: true  },
      { name: 'Computer Lab', capacity: 30, room_type: 'lab',       floor: 2, building: 'Science Block', is_available: true, is_lab: true  },
    ];
    for (const r of roomDefs) {
      await Room.findOrCreate({
        where: { institution_id: institution.id, name: r.name },
        defaults: { ...r, institution_id: institution.id },
      });
    }
    console.log('Rooms: ' + roomDefs.length + ' seeded');

    console.log('\nSeed complete!');
    console.log('  Login:    admin@school.com / admin123');
    console.log('  Data:     5 teachers | 8 subjects | 5 rooms');
    console.log('  Next:     Go to /generate and click Generate Timetable!');
    process.exit(0);
  } catch (err) {
    console.error('Seed error:', err.message);
    process.exit(1);
  }
}

seed();
