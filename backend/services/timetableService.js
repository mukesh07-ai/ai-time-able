const { Teacher, Subject, Room, Timetable, TimetableEntry, ConflictLog, TeacherAvailability, TeacherSubject, Institution, Semester } = require('../models');
const { Op } = require('sequelize');
const { runSolver } = require('./solverService');
const aiService = require('./aiService');
const { emitToRoom } = require('../config/socket');

const SUBJECT_COLORS = [
  '#4F8EF7', '#10B981', '#F59E0B', '#8B5CF6', '#EF4444',
  '#06B6D4', '#F97316', '#84CC16', '#EC4899', '#6366F1',
  '#14B8A6', '#F43F5E', '#A78BFA', '#34D399', '#FBBF24',
];

/**
 * Full timetable generation orchestration
 */
async function generateTimetable(timetableId, institutionId, nlInput, userId) {
  const emit = (event, data) => emitToRoom(timetableId, event, data);

  try {
    await Timetable.update({ status: 'generating' }, { where: { id: timetableId } });
    emit('step', { step: 1, message: 'Initializing generation engine...', progress: 5 });

    // Step 1: Parse NL if provided
    let parsedNL = null;
    if (nlInput && nlInput.trim()) {
      emit('step', { step: 1, message: 'Parsing AI constraints...', progress: 10 });
      const existingData = await loadExistingData(institutionId);
      parsedNL = await aiService.parseNaturalLanguage(nlInput, existingData);
      await applyParsedUpdates(parsedNL, institutionId);
      emit('nlp_done', { parsed: parsedNL });
    }

    // Step 2: Build solver config filtered by timetable's hierarchy
    emit('step', { step: 2, message: 'Loading targeted schedule data...', progress: 25 });
    const config = await buildSolverConfig(institutionId, timetableId);

    console.log(`[Generator] Timetable ${timetableId}: ${config.subjects.length} subjects, ${config.teachers.length} teachers, ${config.rooms.length} rooms`);

    if (config.subjects.length === 0) {
      throw new Error('No subjects found for the selected Department/Course/Semester. Please ensure subjects are registered for this combination.');
    }
    if (config.teachers.length === 0) {
      throw new Error('No teachers are assigned to the subjects in this Semester. Please assign teachers via Constraints.');
    }
    if (config.rooms.length === 0) {
      throw new Error('No rooms available. Please add rooms first.');
    }

    // Step 3: Run solver
    emit('step', { step: 3, message: `Running CP-SAT solver for ${config.subjects.length} subjects...`, progress: 40 });
    const solverResult = await runSolver(config);

    if (solverResult.status === 'FEASIBLE' || solverResult.status === 'OPTIMAL') {
      emit('step', { step: 4, message: 'Saving schedule entries...', progress: 75 });

      await TimetableEntry.destroy({ where: { timetable_id: timetableId } });

      const entriesToInsert = solverResult.entries.map(e => ({
        timetable_id: timetableId,
        teacher_id: e.teacher_id,
        subject_id: e.subject_id,
        room_id: e.room_id,
        day_of_week: e.day_of_week,
        slot_number: e.slot_number,
        student_group: e.student_group,
        is_free_period: false,
      }));

      await TimetableEntry.bulkCreate(entriesToInsert, { ignoreDuplicates: true });

      await Timetable.update({
        status: 'feasible',
        solver_time_ms: solverResult.stats ? solverResult.stats.time_ms : 0,
        generation_log: { solver_stats: solverResult.stats, entries_count: entriesToInsert.length },
      }, { where: { id: timetableId } });

      emit('step', { step: 5, message: `Done! ${entriesToInsert.length} sessions scheduled ✅`, progress: 95 });
      emit('timetable_ready', { timetableId, entriesCount: entriesToInsert.length, stats: solverResult.stats });

      // Non-blocking: AI improvements
      setImmediate(async () => {
        try {
          const entries = await TimetableEntry.findAll({
            where: { timetable_id: timetableId },
            include: [
              { model: Teacher, as: 'teacher' },
              { model: Subject, as: 'subject' },
              { model: Room, as: 'room' },
            ],
            limit: 100,
          });
          const institution = await Institution.findByPk(institutionId);
          const suggestions = await aiService.suggestImprovements(
            { entries: entries.map(e => ({ day: e.day_of_week, slot: e.slot_number, teacher: e.teacher?.name, subject: e.subject?.name, room: e.room?.name, group: e.student_group })) },
            { working_days: institution.working_days, slots_per_day: institution.slots_per_day, slot_duration: institution.slot_duration_minutes }
          );
          emit('improvements_ready', { suggestions });
        } catch (e) {
          console.error('Improvement suggestion error:', e.message);
        }
      });

      return { success: true, timetableId };

    } else {
      emit('step', { step: 4, message: 'Conflict detected, analyzing...', progress: 70 });

      const conflicts = solverResult.violations || [];
      let explanation;
      try {
        explanation = await aiService.explainConflict(conflicts, config);
      } catch (e) {
        explanation = { root_cause: 'Constraints conflict', explanation: conflicts.map(c => c.message).join('; ') || 'Schedule is infeasible.', fixes: [] };
      }

      await ConflictLog.destroy({ where: { timetable_id: timetableId } });
      await ConflictLog.create({
        timetable_id: timetableId,
        raw_conflicts: conflicts,
        llm_explanation: explanation.explanation || '',
        suggested_fixes: explanation.fixes || [],
        is_resolved: false,
      });

      await Timetable.update({
        status: 'infeasible',
        generation_log: { violations: conflicts, explanation },
      }, { where: { id: timetableId } });

      emit('conflict_found', { explanation, timetableId });
      return { success: false, conflict: explanation };
    }

  } catch (err) {
    console.error(`[Generator] Error for timetable ${timetableId}:`, err.message);
    await Timetable.update({ status: 'draft', generation_log: { error: err.message } }, { where: { id: timetableId } });
    emit('error', { message: err.message });
    throw err;
  }
}

/**
 * Load existing data for NL parsing context
 */
async function loadExistingData(institutionId) {
  const [teachers, subjects, rooms] = await Promise.all([
    Teacher.findAll({ where: { institution_id: institutionId, is_active: true }, limit: 50 }),
    Subject.findAll({ where: { institution_id: institutionId }, limit: 50 }),
    Room.findAll({ where: { institution_id: institutionId, is_available: true }, limit: 30 }),
  ]);
  return {
    teachers: teachers.map(t => ({ id: t.id, name: t.name, department: t.department })),
    subjects: subjects.map(s => ({ id: s.id, name: s.name, student_group: s.student_group })),
    rooms: rooms.map(r => ({ id: r.id, name: r.name, room_type: r.room_type })),
  };
}

/**
 * Apply NL parsed updates to DB
 */
async function applyParsedUpdates(parsed, institutionId) {
  if (!parsed || !parsed.updates) return;
  const { teacher_availability_changes, subject_requirements } = parsed.updates;

  if (teacher_availability_changes && teacher_availability_changes.length > 0) {
    for (const change of teacher_availability_changes) {
      const teacher = await Teacher.findOne({
        where: { institution_id: institutionId, name: { [Op.like]: `%${change.teacher_name}%` } },
      });
      if (teacher) {
        for (const slot of (change.slots || [])) {
          await TeacherAvailability.upsert({
            teacher_id: teacher.id,
            day_of_week: change.day,
            slot_number: slot,
            is_available: change.is_available !== false,
          });
        }
      }
    }
  }

  if (subject_requirements && subject_requirements.length > 0) {
    for (const req of subject_requirements) {
      const subject = await Subject.findOne({
        where: { institution_id: institutionId, name: { [Op.like]: `%${req.subject_name}%` } },
      });
      if (subject) {
        const updates = {};
        if (req.periods_per_week) updates.periods_per_week = req.periods_per_week;
        if (req.student_group) updates.student_group = req.student_group;
        await subject.update(updates);
      }
    }
  }
}

/**
 * Build solver config from DB — filtered to the timetable's specific hierarchy
 */
async function buildSolverConfig(institutionId, timetableId) {
  const institution = await Institution.findByPk(institutionId);
  const timetable = await Timetable.findByPk(timetableId);

  if (!timetable) throw new Error('Timetable not found');

  // ── 1. Filter subjects by semester > course > department (most specific wins) ──
  const whereSubject = { institution_id: institutionId };
  let resolvedScope = { semester_id: timetable.semester_id, course_id: timetable.course_id, department_id: timetable.department_id };

  if (timetable.semester_id) {
    whereSubject.semester_id = timetable.semester_id;
  } else if (timetable.course_id) {
    whereSubject.course_id = timetable.course_id;
  } else if (timetable.department_id) {
    whereSubject.department_id = timetable.department_id;
  } else {
    // AI Prompt mode: no scope provided — auto-select the first semester that has subjects
    // This prevents the solver from being overwhelmed with 480+ subjects
    const firstSubjectWithSem = await Subject.findOne({
      where: { institution_id: institutionId, semester_id: { [Op.ne]: null } },
    });
    if (firstSubjectWithSem?.semester_id) {
      whereSubject.semester_id = firstSubjectWithSem.semester_id;
      resolvedScope.semester_id = firstSubjectWithSem.semester_id;
      // Update the timetable record with the resolved scope
      await Timetable.update({ semester_id: firstSubjectWithSem.semester_id }, { where: { id: timetableId } });
      console.log(`[Config] AI Prompt mode — auto-scoped to semester: ${firstSubjectWithSem.semester_id}`);
    }
  }

  const subjects = await Subject.findAll({ where: whereSubject });
  const subjectIds = subjects.map(s => s.id);

  console.log(`[Config] Filter: dept=${timetable.department_id} course=${timetable.course_id} sem=${timetable.semester_id}`);
  console.log(`[Config] Found ${subjects.length} subjects: ${subjects.map(s => s.name).join(', ')}`);

  // ── 2. Get teachers linked to these subjects via TeacherSubject junction ──
  let teachers = [];
  if (subjectIds.length > 0) {
    // Find teacher IDs from junction table
    const teacherSubjectLinks = await TeacherSubject.findAll({
      where: { subject_id: { [Op.in]: subjectIds } },
    });
    const teacherIds = [...new Set(teacherSubjectLinks.map(ts => ts.teacher_id))];

    if (teacherIds.length > 0) {
      teachers = await Teacher.findAll({
        where: { id: { [Op.in]: teacherIds }, is_active: true },
        include: [{ model: TeacherAvailability, as: 'availability' }],
      });

      // Attach their filtered subject_ids (only subjects in this semester)
      for (const teacher of teachers) {
        const links = teacherSubjectLinks.filter(ts => ts.teacher_id === teacher.id);
        teacher._subjectIds = links.map(l => l.subject_id).filter(id => subjectIds.includes(id));
      }
    }
  }

  console.log(`[Config] Found ${teachers.length} teachers for these subjects.`);

  // ── 3. Get dedicated rooms for the semester + institution rooms ──
  // Start with the semester's dedicated room, then add general rooms
  const semesterRoom = timetable.semester_id
    ? await Semester.findByPk(timetable.semester_id, { attributes: ['room_id'] })
    : null;

  const dedicatedRoomId = semesterRoom?.room_id;

  // Fetch all available rooms for the institution (limit to avoid solver overwhelm)
  const rooms = await Room.findAll({
    where: { institution_id: institutionId, is_available: true },
    limit: 20,
  });

  // ── 4. Build configs ──
  const teacherConfig = teachers.map(t => {
    const unavailableSlots = t.availability
      ? t.availability.filter(a => !a.is_available).map(a => [a.day_of_week, a.slot_number])
      : [];
    return {
      id: t.id,
      name: t.name,
      subject_ids: t._subjectIds || [],
      max_periods_per_day: t.max_periods_per_day || 5,
      max_periods_per_week: t.max_periods_per_week || 25,
      unavailable_slots: unavailableSlots,
    };
  });

  const subjectConfig = subjects.map((s, i) => ({
    id: s.id,
    name: s.name,
    periods_per_week: s.credits || 3,
    requires_lab: s.type === 'lab',
    dedicated_room_id: dedicatedRoomId || null,
    student_group: s.student_group || 'Default',
    color_hex: SUBJECT_COLORS[i % SUBJECT_COLORS.length],
  }));

  const roomConfig = rooms.map(r => ({
    id: r.id,
    name: r.name,
    room_type: r.room_type,
    is_lab: r.room_type === 'lab',
    capacity: r.capacity || 40,
  }));

  return {
    institution_id: institutionId,
    working_days: institution.working_days || 5,
    slots_per_day: institution.slots_per_day || 8,
    lunch_slot: institution.lunch_slot || 4,
    teachers: teacherConfig,
    subjects: subjectConfig,
    rooms: roomConfig,
  };
}

module.exports = { generateTimetable, buildSolverConfig };
