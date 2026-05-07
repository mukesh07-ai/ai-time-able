const ragService = require('../services/ragService');
const aiService = require('../services/aiService');
const { Institution, Timetable, Teacher, Subject, Room, TimetableEntry } = require('../models');

/**
 * POST /chatbot/ask — Main RAG chatbot endpoint
 */
const ask = async (req, res, next) => {
  try {
    const { question, institutionId, timetableId, conversationHistory = [] } = req.body;

    if (!question || !question.trim()) {
      return res.status(400).json({ error: 'Question is required' });
    }

    const instId = institutionId || req.user?.institution_id;
    if (!instId) return res.status(400).json({ error: 'institutionId required' });

    // Find active timetable if not specified
    let activeTimetableId = timetableId;
    if (!activeTimetableId) {
      const latest = await Timetable.findOne({
        where: { institution_id: instId, status: ['feasible', 'published'] },
        order: [['updatedAt', 'DESC']],
      });
      activeTimetableId = latest ? latest.id : null;
    }

    // RAG: classify intent and fetch relevant data
    const ragData = await ragService.classifyAndFetch(question, instId, activeTimetableId);
    const context = ragService.buildContext(ragData);

    const institution = await Institution.findByPk(instId);
    const institutionName = institution ? institution.name : 'Your School';
    const slotTimings = ragData.slotTimings || [];

    // Check API key
    const apiKey = process.env.ANTHROPIC_API_KEY;
    const isKeyMissing = !apiKey || apiKey.includes('your-key-here') || apiKey.length < 20;
    if (isKeyMissing) {
      // Format the database context into a clean English answer without AI
      const dbAnswer = formatDbAnswerEnglish(question, ragData, context);
      return res.json({
        answer: dbAnswer,
        intent: ragData.intent,
        sources: ragData.summary,
        timetableId: activeTimetableId,
        _noAI: true,
      });
    }

    // Call Claude with RAG context
    let result;
    try {
      result = await aiService.answerTimetableQuestion(
        question, context, institutionName,
        conversationHistory, slotTimings,
        institution ? institution.working_days : 5
      );
    } catch (aiErr) {
      const isAuthErr = aiErr.status === 401 || aiErr.status === 403
        || (aiErr.message && aiErr.message.toLowerCase().includes('auth'));
      if (isAuthErr) {
        // Return database data in clean English format
        const dbAnswer = formatDbAnswerEnglish(question, ragData, context);
        return res.json({
          answer: dbAnswer,
          intent: ragData.intent,
          sources: ragData.summary,
          timetableId: activeTimetableId,
          _noAI: true,
        });
      }
      throw aiErr;
    }

    res.json({
      answer: result.answer,
      intent: ragData.intent,
      sources: ragData.summary,
      timetableId: activeTimetableId,
    });
  } catch (err) { next(err); }
};

/**
 * Format database results into a clean English response (used when AI key is not configured)
 */
function formatDbAnswerEnglish(question, ragData, rawContext) {
  const intent = ragData.intent;
  const summary = ragData.summary || {};

  if (!rawContext || rawContext.trim() === '') {
    return `I searched the database but couldn't find any data related to your question: **"${question}"**\n\nThis may be because:\n- No timetable has been generated yet\n- The teacher/room/subject you mentioned doesn't exist\n\nTry generating a timetable first from the **Generate** section.`;
  }

  let intro = '';
  switch (intent) {
    case 'TEACHER_SCHEDULE':
      intro = summary.teacherName
        ? `Here is the schedule information for **${summary.teacherName}**:\n\n`
        : `Here is the teacher schedule data I found:\n\n`;
      break;
    case 'ROOM_QUERY':
      intro = summary.roomName
        ? `Here is the room information for **${summary.roomName}**:\n\n`
        : `Here is the room data I found:\n\n`;
      break;
    case 'CLASS_SCHEDULE':
      intro = summary.groupName
        ? `Here is the schedule for student group **${summary.groupName}**:\n\n`
        : `Here is the class schedule data I found:\n\n`;
      break;
    case 'SUBJECT_QUERY':
      intro = summary.subjectName
        ? `Here is the information for subject **${summary.subjectName}**:\n\n`
        : `Here is the subject data I found:\n\n`;
      break;
    case 'FREE_PERIOD':
      intro = `Here is the teacher availability information:\n\n`;
      break;
    case 'CONFLICT_QUERY':
      intro = `Here is the conflict report for the current timetable:\n\n`;
      break;
    case 'GENERAL':
      intro = `Here is an overview of your institution's scheduling data:\n\n`;
      break;
    default:
      intro = `Here is what I found in the database:\n\n`;
  }

  // Convert raw context to clean formatted markdown
  const formatted = rawContext
    .replace(/^([A-Z ]+:)/gm, '**$1**')
    .trim();

  return `${intro}\`\`\`\n${formatted}\n\`\`\`\n\n> *Note: For AI-powered natural language answers, configure the ANTHROPIC_API_KEY in your backend .env file.*`;
}

/**
 * POST /chatbot/suggest-improvements
 */
const suggestImprovements = async (req, res, next) => {
  try {
    const { timetableId, institutionId } = req.body;
    const instId = institutionId || req.user?.institution_id;

    let ttId = timetableId;
    if (!ttId) {
      const latest = await Timetable.findOne({
        where: { institution_id: instId, status: ['feasible', 'published'] },
        order: [['updatedAt', 'DESC']],
      });
      ttId = latest ? latest.id : null;
    }

    if (!ttId) return res.status(404).json({ error: 'No feasible timetable found' });

    const entries = await TimetableEntry.findAll({
      where: { timetable_id: ttId },
      include: [
        { model: Teacher, as: 'teacher' },
        { model: Subject, as: 'subject' },
        { model: Room, as: 'room' },
      ],
      limit: 200,
    });

    const institution = await Institution.findByPk(instId);

    const timetableData = {
      entries: entries.map(e => ({
        day: e.day_of_week,
        slot: e.slot_number,
        teacher: e.teacher ? e.teacher.name : null,
        subject: e.subject ? e.subject.name : null,
        room: e.room ? e.room.name : null,
        group: e.student_group,
      })),
      total_entries: entries.length,
    };

    const institutionConfig = institution ? {
      working_days: institution.working_days,
      slots_per_day: institution.slots_per_day,
      slot_duration_minutes: institution.slot_duration_minutes,
      lunch_slot: institution.lunch_slot,
    } : {};

    const suggestions = await aiService.suggestImprovements(timetableData, institutionConfig);
    res.json(suggestions);
  } catch (err) { next(err); }
};

/**
 * GET /chatbot/quick-questions/:institutionId
 */
const getQuickQuestions = async (req, res, next) => {
  try {
    const instId = req.params.institutionId || req.user?.institution_id;

    const teachers = await Teacher.findAll({ where: { institution_id: instId, is_active: true }, limit: 5, order: [['name', 'ASC']] });
    const rooms = await Room.findAll({ where: { institution_id: instId, is_available: true }, limit: 3, order: [['name', 'ASC']] });
    const subjects = await Subject.findAll({ where: { institution_id: instId }, limit: 3, order: [['name', 'ASC']] });

    const dynamic = [];
    if (teachers[0]) dynamic.push({ icon: '👨‍🏫', category: 'teacher', text: `What is ${teachers[0].name}'s schedule this week?` });
    if (teachers[1]) dynamic.push({ icon: '👩‍🏫', category: 'teacher', text: `How many periods does ${teachers[1].name} have this week?` });
    if (rooms[0]) dynamic.push({ icon: '🏫', category: 'room', text: `What is scheduled in ${rooms[0].name} tomorrow?` });
    if (subjects[0]) dynamic.push({ icon: '📚', category: 'subject', text: `How many periods per week does "${subjects[0].name}" have?` });

    const staticQuestions = [
      { category: 'teacher', icon: '👨‍🏫', text: 'Which teacher is free on Monday in period 3?' },
      { category: 'room', icon: '🔬', text: 'What is the lab schedule for this week?' },
      { category: 'room', icon: '🏫', text: 'Which rooms are empty on Monday?' },
      { category: 'class', icon: '📖', text: 'When are the free periods for Semester 1?' },
      { category: 'general', icon: '⚡', text: 'Are there any conflicts in the current timetable?' },
      { category: 'general', icon: '📊', text: 'How many teachers are registered in the system?' },
      { category: 'general', icon: '🎯', text: 'Which teachers are available on Friday?' },
    ];

    res.json({ questions: [...dynamic, ...staticQuestions] });
  } catch (err) { next(err); }
};

module.exports = { ask, suggestImprovements, getQuickQuestions };
