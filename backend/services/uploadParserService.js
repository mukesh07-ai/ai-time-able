const aiService = require('./aiService');

/**
 * Parse uploaded file data (Excel/CSV/JSON) using Claude AI
 */
async function parseUploadedFile(rawSheets, existingDbData) {
  return await aiService.parseUploadedData(rawSheets, existingDbData);
}

/**
 * Normalize teacher data from parsed result
 */
function normalizeTeachers(parsedTeachers, institutionId) {
  return parsedTeachers.map(t => ({
    institution_id: institutionId,
    name: t.name || 'Unknown Teacher',
    email: t.email || null,
    employee_code: t.employee_code || null,
    department: t.department || null,
    max_periods_per_day: t.max_periods_per_day || 6,
    max_periods_per_week: t.max_periods_per_week || 30,
    is_active: true,
    _subjects: t.subjects || [],
  }));
}

/**
 * Normalize subject data from parsed result
 */
function normalizeSubjects(parsedSubjects, institutionId) {
  const colors = [
    '#4F8EF7', '#10B981', '#F59E0B', '#8B5CF6', '#EF4444',
    '#06B6D4', '#F97316', '#84CC16', '#EC4899', '#6366F1',
  ];
  return parsedSubjects.map((s, i) => ({
    institution_id: institutionId,
    name: s.name || 'Unknown Subject',
    code: s.code || null,
    periods_per_week: s.periods_per_week || 4,
    requires_lab: s.requires_lab || false,
    student_group: s.student_group || 'Default',
    color_hex: colors[i % colors.length],
    is_active: true,
  }));
}

/**
 * Normalize room data from parsed result
 */
function normalizeRooms(parsedRooms, institutionId) {
  return parsedRooms.map(r => ({
    institution_id: institutionId,
    name: r.name || 'Unknown Room',
    capacity: r.capacity || 40,
    room_type: ['classroom', 'lab', 'auditorium', 'seminar_hall'].includes(r.room_type) ? r.room_type : 'classroom',
    floor: r.floor || null,
    building: r.building || null,
    is_available: true,
  }));
}

module.exports = { parseUploadedFile, normalizeTeachers, normalizeSubjects, normalizeRooms };
