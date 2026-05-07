const XLSX = require('xlsx');
const { jsPDF } = require('jspdf');
const autoTable = require('jspdf-autotable').default || require('jspdf-autotable');
const { TimetableEntry, Teacher, Subject, Room, Timetable, Institution } = require('../models');

const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function generateSlotTimings(dayStartTime, slotDurationMinutes, slotsPerDay, lunchSlot) {
  const timings = [];
  const [startHour, startMin] = (dayStartTime || '08:00').split(':').map(Number);
  let totalMinutes = startHour * 60 + startMin;
  for (let i = 0; i < slotsPerDay; i++) {
    const h = Math.floor(totalMinutes / 60).toString().padStart(2, '0');
    const m = (totalMinutes % 60).toString().padStart(2, '0');
    const endMinutes = totalMinutes + slotDurationMinutes;
    const eh = Math.floor(endMinutes / 60).toString().padStart(2, '0');
    const em = (endMinutes % 60).toString().padStart(2, '0');
    timings.push(`${h}:${m}-${eh}:${em}`);
    totalMinutes = endMinutes;
    if (i === lunchSlot - 1) totalMinutes += 30;
  }
  return timings;
}

/**
 * Generate Excel export
 */
async function generateExcel(timetableId) {
  const timetable = await Timetable.findByPk(timetableId, {
    include: [{ model: Institution, as: 'institution' }],
  });

  const entries = await TimetableEntry.findAll({
    where: { timetable_id: timetableId },
    include: [
      { model: Teacher, as: 'teacher' },
      { model: Subject, as: 'subject' },
      { model: Room, as: 'room' },
    ],
  });

  const institution = timetable.institution;
  const slotTimings = generateSlotTimings(
    institution.day_start_time,
    institution.slot_duration_minutes,
    institution.slots_per_day,
    institution.lunch_slot
  );

  // Group entries by student group
  const groups = new Set(entries.map(e => e.student_group || 'Default'));
  const wb = XLSX.utils.book_new();

  for (const group of groups) {
    const groupEntries = entries.filter(e => (e.student_group || 'Default') === group);

    // Build grid
    const rows = [];
    // Header row
    const headerRow = ['Time', ...DAY_NAMES.slice(0, institution.working_days)];
    rows.push(headerRow);

    for (let sl = 0; sl < institution.slots_per_day; sl++) {
      const row = [slotTimings[sl] || `Slot ${sl + 1}`];
      if (sl === institution.lunch_slot) {
        for (let d = 0; d < institution.working_days; d++) row.push('LUNCH BREAK');
      } else {
        for (let d = 0; d < institution.working_days; d++) {
          const entry = groupEntries.find(e => e.day_of_week === d && e.slot_number === sl);
          if (entry) {
            const sub = entry.subject ? entry.subject.name : '';
            const teach = entry.teacher ? entry.teacher.name : '';
            const room = entry.room ? entry.room.name : '';
            row.push(`${sub}\n${teach}\n${room}`);
          } else {
            row.push('');
          }
        }
      }
      rows.push(row);
    }

    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws['!cols'] = [{ wch: 15 }, ...Array(institution.working_days).fill({ wch: 22 })];
    XLSX.utils.book_append_sheet(wb, ws, group.substring(0, 31));
  }

  // Teachers summary sheet
  const teacherRows = [['Teacher', 'Department', 'Total Periods']];
  const teacherMap = {};
  for (const e of entries) {
    if (e.teacher) {
      if (!teacherMap[e.teacher.name]) teacherMap[e.teacher.name] = { dept: e.teacher.department, count: 0 };
      teacherMap[e.teacher.name].count++;
    }
  }
  for (const [name, data] of Object.entries(teacherMap)) {
    teacherRows.push([name, data.dept || '', data.count]);
  }
  const teacherWs = XLSX.utils.aoa_to_sheet(teacherRows);
  XLSX.utils.book_append_sheet(wb, teacherWs, 'All Teachers');

  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
}

/**
 * Generate PDF export
 */
async function generatePDF(timetableId) {
  const timetable = await Timetable.findByPk(timetableId, {
    include: [{ model: Institution, as: 'institution' }],
  });

  const entries = await TimetableEntry.findAll({
    where: { timetable_id: timetableId },
    include: [
      { model: Teacher, as: 'teacher' },
      { model: Subject, as: 'subject' },
      { model: Room, as: 'room' },
    ],
  });

  const institution = timetable.institution;
  const slotTimings = generateSlotTimings(
    institution.day_start_time,
    institution.slot_duration_minutes,
    institution.slots_per_day,
    institution.lunch_slot
  );

  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

  const groups = [...new Set(entries.map(e => e.student_group || 'Default'))];

  groups.forEach((group, idx) => {
    if (idx > 0) doc.addPage();

    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(institution.name, 14, 15);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text(`${timetable.name} | ${timetable.academic_year || ''} | Group: ${group}`, 14, 22);
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 28);

    const groupEntries = entries.filter(e => (e.student_group || 'Default') === group);
    const head = [['Time', ...DAY_NAMES.slice(0, institution.working_days)]];
    const body = [];

    for (let sl = 0; sl < institution.slots_per_day; sl++) {
      const row = [slotTimings[sl] || `Slot ${sl + 1}`];
      if (sl === institution.lunch_slot) {
        for (let d = 0; d < institution.working_days; d++) row.push('LUNCH');
      } else {
        for (let d = 0; d < institution.working_days; d++) {
          const entry = groupEntries.find(e => e.day_of_week === d && e.slot_number === sl);
          if (entry) {
            const sub = entry.subject ? entry.subject.name : '';
            const teach = entry.teacher ? entry.teacher.name : '';
            const room = entry.room ? entry.room.name : '';
            row.push(`${sub}\n${teach}\n${room}`);
          } else {
            row.push('—');
          }
        }
      }
      body.push(row);
    }

    autoTable(doc, {
      head,
      body,
      startY: 33,
      styles: { fontSize: 7, cellPadding: 2 },
      headStyles: { fillColor: [79, 142, 247], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [245, 247, 255] },
      columnStyles: { 0: { fontStyle: 'bold', fillColor: [230, 235, 255] } },
    });

    const finalY = doc.lastAutoTable.finalY;
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text('AI-Generated by PS4 Timetable Scheduler | Powered by Claude AI + OR-Tools CP-SAT', 14, finalY + 8);
    doc.text(`Page ${idx + 1} of ${groups.length}`, doc.internal.pageSize.width - 30, finalY + 8);
  });

  return doc.output('arraybuffer');
}

/**
 * Generate download template Excel
 */
function generateTemplate() {
  const wb = XLSX.utils.book_new();

  // Teachers sheet
  const teacherData = [
    ['Name*', 'Email', 'Employee Code', 'Department', 'Max Periods/Day', 'Max Periods/Week', 'Subjects (comma-separated)'],
    ['Rajesh Sharma', 'sharma@school.com', 'T001', 'Mathematics', '6', '30', 'Math,Algebra'],
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(teacherData), 'Teachers');

  // Subjects sheet
  const subjectData = [
    ['Name*', 'Code', 'Periods/Week*', 'Requires Lab (yes/no)', 'Student Group'],
    ['Mathematics', 'MATH', '5', 'no', 'Class 10A'],
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(subjectData), 'Subjects');

  // Rooms sheet
  const roomData = [
    ['Name*', 'Capacity', 'Type (classroom/lab/auditorium/seminar_hall)', 'Floor', 'Building'],
    ['Room 101', '40', 'classroom', '1', 'Main Block'],
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(roomData), 'Rooms');

  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
}

module.exports = { generateExcel, generatePDF, generateTemplate };
