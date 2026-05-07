const { Teacher, Subject, Room, TimetableEntry, Timetable, TeacherAvailability, Institution, ConflictLog } = require('../models');
const { Op } = require('sequelize');

const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/**
 * Detect intent from question text using keyword matching
 */
function detectIntent(question) {
  const q = question.toLowerCase();

  // Conflict query
  if (/conflict|clash|problem|issue|error|galat|problem/.test(q)) return 'CONFLICT_QUERY';

  // Improvement query
  if (/improve|better|suggest|optimize|change|behtar|sudhar/.test(q)) return 'IMPROVEMENT';

  // Free period query
  if (/free|khali|available|break|fursat|khaali|kab free/.test(q)) return 'FREE_PERIOD';

  // Room query
  if (/room|hall|lab|kamra|class room|konsi room|kahan|where|building/.test(q)) return 'ROOM_QUERY';

  // Subject query
  if (/subject|kitne periods|period|padhata|padhati|kaun padhata|kaun padhati|padha|math|science|physics|chemistry|biology|english|hindi|history|geography|computer/.test(q)) return 'SUBJECT_QUERY';

  // Class/group schedule
  if (/class|sem |group|section|10a|10b|11a|11b|12a|12b|9a|9b|8a|ka schedule|class ka/.test(q)) return 'CLASS_SCHEDULE';

  // Teacher schedule (most general — check last)
  if (/teacher|sir|ma'am|madam|mam|sir|miss|mr\.|dr\.|prof|schedule|timetable|kab|when|available|ka time|ke period/.test(q)) return 'TEACHER_SCHEDULE';

  return 'GENERAL';
}

/**
 * Extract teacher name from question using fuzzy match
 */
function extractTeacherName(question, teachers) {
  const q = question.toLowerCase();
  let bestMatch = null;
  let bestScore = 0;

  for (const teacher of teachers) {
    const nameParts = teacher.name.toLowerCase().split(' ');
    for (const part of nameParts) {
      if (part.length > 2 && q.includes(part)) {
        const score = part.length;
        if (score > bestScore) {
          bestScore = score;
          bestMatch = teacher;
        }
      }
    }
  }
  return bestMatch;
}

/**
 * Extract room name from question
 */
function extractRoomName(question, rooms) {
  const q = question.toLowerCase();
  let bestMatch = null;
  let bestScore = 0;

  for (const room of rooms) {
    const roomName = room.name.toLowerCase();
    if (q.includes(roomName)) {
      const score = roomName.length;
      if (score > bestScore) {
        bestScore = score;
        bestMatch = room;
      }
    }
    // Try extracting room numbers
    const roomNumMatch = roomName.match(/\d+/);
    if (roomNumMatch && q.includes(roomNumMatch[0])) {
      if (!bestMatch) bestMatch = room;
    }
  }
  return bestMatch;
}

/**
 * Extract student group from question
 */
function extractStudentGroup(question, subjects) {
  const groups = new Set();
  for (const s of subjects) {
    if (s.student_group) groups.add(s.student_group);
  }

  const q = question.toLowerCase();
  for (const group of groups) {
    if (q.includes(group.toLowerCase())) return group;
  }

  // Common patterns: "class 10a", "10a", "sem 3"
  const patterns = [
    /class\s+([0-9]+[a-z]?)/i,
    /([0-9]+[a-z])\s+class/i,
    /sem\s+([0-9]+)/i,
    /semester\s+([0-9]+)/i,
  ];
  for (const p of patterns) {
    const m = question.match(p);
    if (m) return m[0].trim();
  }
  return null;
}

/**
 * Extract subject name from question
 */
function extractSubjectName(question, subjects) {
  const q = question.toLowerCase();
  for (const subject of subjects) {
    if (q.includes(subject.name.toLowerCase())) return subject;
  }
  return null;
}

/**
 * Parse day and slot from question text
 */
function parseDaySlot(question) {
  const q = question.toLowerCase();
  const dayKeywords = {
    0: ['monday', 'mon', 'somwar', 'sомвар'],
    1: ['tuesday', 'tue', 'mangalwar'],
    2: ['wednesday', 'wed', 'budhwar'],
    3: ['thursday', 'thu', 'guruwar', 'brihaspatiwar'],
    4: ['friday', 'fri', 'shukrawar'],
    5: ['saturday', 'sat', 'shaniwar'],
  };

  let day = null;
  for (const [d, keywords] of Object.entries(dayKeywords)) {
    if (keywords.some(k => q.includes(k))) { day = parseInt(d); break; }
  }

  // Slot keywords
  const slotMatch = q.match(/slot\s*(\d)|period\s*(\d)|(\d)(st|nd|rd|th)\s*period/);
  let slot = slotMatch ? parseInt(slotMatch[1] || slotMatch[2] || slotMatch[3]) - 1 : null;

  return { day, slot };
}

/**
 * Build context string for teacher schedule
 */
function buildTeacherScheduleContext(teacher, entries, slotTimings, institution) {
  if (!teacher) return 'Teacher not found in the database.';

  const subjectNames = teacher.subjects ? teacher.subjects.map(s => s.name).join(', ') : 'None assigned';

  let ctx = `TEACHER: ${teacher.name}\n`;
  ctx += `DEPARTMENT: ${teacher.department || 'Not specified'}\n`;
  ctx += `EMPLOYEE CODE: ${teacher.employee_code || 'N/A'}\n`;
  ctx += `EMAIL: ${teacher.email || 'N/A'}\n`;
  ctx += `SUBJECTS ASSIGNED: ${subjectNames}\n`;
  ctx += `MAX PERIODS/DAY: ${teacher.max_periods_per_day}\n`;
  ctx += `MAX PERIODS/WEEK: ${teacher.max_periods_per_week}\n\n`;

  if (!entries || entries.length === 0) {
    ctx += 'NO TIMETABLE ENTRIES FOUND for this teacher in the current timetable.\n';
    return ctx;
  }

  ctx += `CURRENT WEEK SCHEDULE:\n`;

  // Group by day
  const byDay = {};
  for (const e of entries) {
    if (!byDay[e.day_of_week]) byDay[e.day_of_week] = [];
    byDay[e.day_of_week].push(e);
  }

  let totalPeriods = 0;
  for (let d = 0; d < (institution.working_days || 5); d++) {
    const dayEntries = (byDay[d] || []).sort((a, b) => a.slot_number - b.slot_number);
    ctx += `${DAY_NAMES[d]}:\n`;
    for (let sl = 0; sl < (institution.slots_per_day || 8); sl++) {
      if (sl === institution.lunch_slot) {
        ctx += `  Slot ${sl + 1} (${slotTimings[sl] || ''}): LUNCH BREAK\n`;
        continue;
      }
      const entry = dayEntries.find(e => e.slot_number === sl);
      if (entry) {
        const subName = entry.subject ? entry.subject.name : 'Unknown Subject';
        const roomName = entry.room ? entry.room.name : 'Unknown Room';
        const group = entry.student_group || '';
        ctx += `  Slot ${sl + 1} (${slotTimings[sl] || ''}): ${subName} — ${group} — ${roomName}\n`;
        totalPeriods++;
      } else {
        ctx += `  Slot ${sl + 1} (${slotTimings[sl] || ''}): Free\n`;
      }
    }
  }

  const totalPossible = (institution.slots_per_day || 8) * (institution.working_days || 5) - (institution.working_days || 5);
  ctx += `\nTOTAL TEACHING PERIODS THIS WEEK: ${totalPeriods}\n`;
  ctx += `FREE PERIODS THIS WEEK: ${totalPossible - totalPeriods}\n`;

  return ctx;
}

/**
 * Build context string for room query
 */
function buildRoomContext(room, entries, slotTimings, institution) {
  if (!room) return 'Room not found in the database.';

  let ctx = `ROOM: ${room.name}\n`;
  ctx += `TYPE: ${room.room_type}\n`;
  ctx += `CAPACITY: ${room.capacity}\n`;
  ctx += `FLOOR: ${room.floor || 'N/A'}, BUILDING: ${room.building || 'Main Block'}\n`;
  ctx += `STATUS: ${room.is_available ? 'Available' : 'Unavailable'}\n\n`;

  if (!entries || entries.length === 0) {
    ctx += 'NO TIMETABLE ENTRIES FOUND for this room.\n';
    return ctx;
  }

  // Group by day
  const byDay = {};
  for (const e of entries) {
    if (!byDay[e.day_of_week]) byDay[e.day_of_week] = [];
    byDay[e.day_of_week].push(e);
  }

  let occupiedSlots = 0;
  const totalSlots = (institution.slots_per_day || 8) * (institution.working_days || 5);

  for (let d = 0; d < (institution.working_days || 5); d++) {
    const dayEntries = (byDay[d] || []).sort((a, b) => a.slot_number - b.slot_number);
    ctx += `${DAY_NAMES[d]} SCHEDULE:\n`;
    for (let sl = 0; sl < (institution.slots_per_day || 8); sl++) {
      if (sl === institution.lunch_slot) {
        ctx += `  Slot ${sl + 1}: LUNCH BREAK\n`;
        continue;
      }
      const entry = dayEntries.find(e => e.slot_number === sl);
      if (entry) {
        const subName = entry.subject ? entry.subject.name : 'Unknown Subject';
        const teachName = entry.teacher ? entry.teacher.name : 'Unknown Teacher';
        const group = entry.student_group || '';
        ctx += `  Slot ${sl + 1} (${slotTimings[sl] || ''}): ${subName} — ${group} — ${teachName}\n`;
        occupiedSlots++;
      } else {
        ctx += `  Slot ${sl + 1}: EMPTY\n`;
      }
    }
  }

  const utilization = Math.round((occupiedSlots / totalSlots) * 100);
  ctx += `\nWEEKLY UTILIZATION: ${utilization}% (${occupiedSlots} of ${totalSlots} slots used)\n`;

  return ctx;
}

/**
 * Build context for class/group schedule
 */
function buildClassContext(group, entries, slotTimings, institution) {
  if (!group || !entries || entries.length === 0) {
    return `No timetable data found for student group: ${group || 'Unknown'}`;
  }

  let ctx = `STUDENT GROUP: ${group}\n\n`;

  const byDay = {};
  for (const e of entries) {
    if (!byDay[e.day_of_week]) byDay[e.day_of_week] = [];
    byDay[e.day_of_week].push(e);
  }

  for (let d = 0; d < (institution.working_days || 5); d++) {
    const dayEntries = (byDay[d] || []).sort((a, b) => a.slot_number - b.slot_number);
    ctx += `${DAY_NAMES[d]}:\n`;
    for (let sl = 0; sl < (institution.slots_per_day || 8); sl++) {
      if (sl === institution.lunch_slot) {
        ctx += `  Slot ${sl + 1}: LUNCH BREAK\n`;
        continue;
      }
      const entry = dayEntries.find(e => e.slot_number === sl);
      if (entry) {
        const subName = entry.subject ? entry.subject.name : 'Unknown';
        const teachName = entry.teacher ? entry.teacher.name : 'Unknown';
        const roomName = entry.room ? entry.room.name : 'Unknown';
        ctx += `  Slot ${sl + 1} (${slotTimings[sl] || ''}): ${subName} — ${teachName} — ${roomName}\n`;
      } else {
        ctx += `  Slot ${sl + 1}: Free Period\n`;
      }
    }
  }

  return ctx;
}

/**
 * Build context for free period / availability query
 */
function buildFreePeriodContext(allTeachers, busyTeacherIds, day, slot, slotTimings) {
  const freeTeachers = allTeachers.filter(t => !busyTeacherIds.has(t.id));
  const busyTeachers = allTeachers.filter(t => busyTeacherIds.has(t.id));

  let ctx = '';
  if (day !== null && slot !== null) {
    ctx += `AVAILABILITY ON ${DAY_NAMES[day] || `Day ${day}`}, SLOT ${slot + 1} (${slotTimings[slot] || ''}):\n\n`;
  }

  ctx += `BUSY TEACHERS (${busyTeachers.length}):\n`;
  for (const t of busyTeachers) ctx += `  - ${t.name} (${t.department || 'Dept N/A'})\n`;

  ctx += `\nFREE TEACHERS (${freeTeachers.length}):\n`;
  for (const t of freeTeachers) ctx += `  - ${t.name} (${t.department || 'Dept N/A'})\n`;

  return ctx;
}

/**
 * Build context for subject query
 */
function buildSubjectContext(subject, entries, teachers) {
  if (!subject) return 'Subject not found in the database.';

  const subjectTeachers = teachers.filter(t => t.subjects && t.subjects.some(s => s.id === subject.id));

  let ctx = `SUBJECT: ${subject.name}\n`;
  ctx += `CODE: ${subject.code || 'N/A'}\n`;
  ctx += `STUDENT GROUP: ${subject.student_group || 'All'}\n`;
  ctx += `PERIODS PER WEEK: ${subject.periods_per_week}\n`;
  ctx += `REQUIRES LAB: ${subject.requires_lab ? 'Yes' : 'No'}\n\n`;

  ctx += `TEACHERS ASSIGNED:\n`;
  for (const t of subjectTeachers) {
    ctx += `  - ${t.name} (${t.department || 'Dept N/A'})\n`;
  }

  if (entries && entries.length > 0) {
    ctx += `\nSCHEDULED SLOTS (${entries.length} total):\n`;
    for (const e of entries.slice(0, 20)) {
      const day = DAY_NAMES[e.day_of_week] || `Day ${e.day_of_week}`;
      const room = e.room ? e.room.name : 'No Room';
      const teacher = e.teacher ? e.teacher.name : 'No Teacher';
      ctx += `  ${day} Slot ${e.slot_number + 1}: ${teacher} — ${room} — ${e.student_group || ''}\n`;
    }
  }

  return ctx;
}

/**
 * Build general context (overview stats)
 */
function buildGeneralContext(stats, recentEntries) {
  let ctx = `SYSTEM OVERVIEW:\n`;
  ctx += `Total Teachers: ${stats.teachers}\n`;
  ctx += `Total Subjects: ${stats.subjects}\n`;
  ctx += `Total Rooms: ${stats.rooms}\n`;
  ctx += `Total Timetables: ${stats.timetables}\n`;
  ctx += `Active Timetable: ${stats.activeTimetableName || 'None'}\n\n`;

  if (recentEntries && recentEntries.length > 0) {
    ctx += `SAMPLE SCHEDULE ENTRIES:\n`;
    for (const e of recentEntries.slice(0, 15)) {
      const day = DAY_NAMES[e.day_of_week] || `Day ${e.day_of_week}`;
      const sub = e.subject ? e.subject.name : 'Unknown';
      const teach = e.teacher ? e.teacher.name : 'Unknown';
      const room = e.room ? e.room.name : 'Unknown';
      const group = e.student_group || '';
      ctx += `  ${day} Slot ${e.slot_number + 1}: ${sub} — ${teach} — ${room} — ${group}\n`;
    }
  }

  return ctx;
}

/**
 * MAIN: Classify intent, fetch relevant data, and build context
 */
async function classifyAndFetch(question, institutionId, activeTimetableId) {
  const intent = detectIntent(question);

  // Fetch all basic data
  const [allTeachers, allSubjects, allRooms] = await Promise.all([
    Teacher.findAll({
      where: { institution_id: institutionId, is_active: true },
      include: [
        { model: Subject, as: 'subjects', through: { attributes: [] } },
        { model: TeacherAvailability, as: 'availability' },
      ],
    }),
    Subject.findAll({ where: { institution_id: institutionId, is_active: true } }),
    Room.findAll({ where: { institution_id: institutionId, is_available: true } }),
  ]);

  const institution = await Institution.findByPk(institutionId);
  if (!institution) return { intent, context: 'Institution not found.', summary: {} };

  const slotTimings = generateSlotTimings(
    institution.day_start_time,
    institution.slot_duration_minutes,
    institution.slots_per_day,
    institution.lunch_slot
  );

  let context = '';
  let summary = { intent, teacherName: null, roomName: null, groupName: null };

  if (intent === 'TEACHER_SCHEDULE') {
    const teacher = extractTeacherName(question, allTeachers);
    summary.teacherName = teacher ? teacher.name : null;

    let entries = [];
    if (teacher && activeTimetableId) {
      entries = await TimetableEntry.findAll({
        where: { timetable_id: activeTimetableId, teacher_id: teacher.id },
        include: [
          { model: Subject, as: 'subject' },
          { model: Room, as: 'room' },
        ],
      });
    }
    context = buildTeacherScheduleContext(teacher, entries, slotTimings, institution);

  } else if (intent === 'ROOM_QUERY') {
    const room = extractRoomName(question, allRooms);
    summary.roomName = room ? room.name : null;

    let entries = [];
    if (room && activeTimetableId) {
      entries = await TimetableEntry.findAll({
        where: { timetable_id: activeTimetableId, room_id: room.id },
        include: [
          { model: Subject, as: 'subject' },
          { model: Teacher, as: 'teacher' },
        ],
      });
    }
    context = buildRoomContext(room, entries, slotTimings, institution);

  } else if (intent === 'CLASS_SCHEDULE') {
    const group = extractStudentGroup(question, allSubjects);
    summary.groupName = group;

    let entries = [];
    if (group && activeTimetableId) {
      entries = await TimetableEntry.findAll({
        where: { timetable_id: activeTimetableId, student_group: group },
        include: [
          { model: Subject, as: 'subject' },
          { model: Teacher, as: 'teacher' },
          { model: Room, as: 'room' },
        ],
      });
    }
    context = buildClassContext(group, entries, slotTimings, institution);

  } else if (intent === 'FREE_PERIOD') {
    const { day, slot } = parseDaySlot(question);

    let busyTeacherIds = new Set();
    if (activeTimetableId) {
      const whereClause = { timetable_id: activeTimetableId };
      if (day !== null) whereClause.day_of_week = day;
      if (slot !== null) whereClause.slot_number = slot;

      const busyEntries = await TimetableEntry.findAll({ where: whereClause });
      busyEntries.forEach(e => { if (e.teacher_id) busyTeacherIds.add(e.teacher_id); });
    }

    context = buildFreePeriodContext(allTeachers, busyTeacherIds, day, slot, slotTimings);

  } else if (intent === 'SUBJECT_QUERY') {
    const subject = extractSubjectName(question, allSubjects);
    summary.subjectName = subject ? subject.name : null;

    let entries = [];
    if (subject && activeTimetableId) {
      entries = await TimetableEntry.findAll({
        where: { timetable_id: activeTimetableId, subject_id: subject.id },
        include: [
          { model: Teacher, as: 'teacher' },
          { model: Room, as: 'room' },
        ],
      });
    }
    context = buildSubjectContext(subject, entries, allTeachers);

  } else if (intent === 'CONFLICT_QUERY') {
    if (activeTimetableId) {
      const conflictLog = await ConflictLog.findOne({ where: { timetable_id: activeTimetableId } });
      if (conflictLog) {
        context = `CONFLICT REPORT:\n`;
        context += `LLM Explanation: ${conflictLog.llm_explanation || 'No explanation available'}\n`;
        context += `Raw Conflicts: ${JSON.stringify(conflictLog.raw_conflicts, null, 2)}\n`;
        context += `Is Resolved: ${conflictLog.is_resolved ? 'Yes' : 'No'}\n`;
      } else {
        context = 'No conflicts found in the current timetable. The schedule is clean!';
      }
    } else {
      context = 'No active timetable to check for conflicts.';
    }

  } else {
    // GENERAL
    const [teacherCount, subjectCount, roomCount, timetableCount] = await Promise.all([
      Teacher.count({ where: { institution_id: institutionId, is_active: true } }),
      Subject.count({ where: { institution_id: institutionId, is_active: true } }),
      Room.count({ where: { institution_id: institutionId, is_available: true } }),
      Timetable.count({ where: { institution_id: institutionId } }),
    ]);

    let recentEntries = [];
    if (activeTimetableId) {
      recentEntries = await TimetableEntry.findAll({
        where: { timetable_id: activeTimetableId },
        include: [
          { model: Subject, as: 'subject' },
          { model: Teacher, as: 'teacher' },
          { model: Room, as: 'room' },
        ],
        limit: 20,
      });
    }

    const activeTimetable = activeTimetableId ? await Timetable.findByPk(activeTimetableId) : null;

    context = buildGeneralContext(
      { teachers: teacherCount, subjects: subjectCount, rooms: roomCount, timetables: timetableCount, activeTimetableName: activeTimetable ? activeTimetable.name : null },
      recentEntries
    );
  }

  return { intent, context, summary, slotTimings, institution };
}

/**
 * Build full context string (called by chatbot controller)
 */
function buildContext(ragData) {
  return ragData.context || '';
}

function generateSlotTimings(dayStartTime, slotDurationMinutes, slotsPerDay, lunchSlot) {
  const timings = [];
  const [startHour, startMin] = (dayStartTime || '08:00').split(':').map(Number);
  let totalMinutes = startHour * 60 + startMin;

  for (let i = 0; i < (slotsPerDay || 8); i++) {
    const h = Math.floor(totalMinutes / 60).toString().padStart(2, '0');
    const m = (totalMinutes % 60).toString().padStart(2, '0');
    const endMinutes = totalMinutes + (slotDurationMinutes || 45);
    const eh = Math.floor(endMinutes / 60).toString().padStart(2, '0');
    const em = (endMinutes % 60).toString().padStart(2, '0');
    timings.push(`${h}:${m}-${eh}:${em}`);
    totalMinutes = endMinutes;
    if (i === (lunchSlot || 4) - 1) totalMinutes += 30;
  }
  return timings;
}

module.exports = { classifyAndFetch, buildContext, detectIntent, generateSlotTimings };
