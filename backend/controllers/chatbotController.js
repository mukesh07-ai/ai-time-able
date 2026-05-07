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

    // Check API key is configured (accepts sk-ant-... or JWT proxy keys)
    const apiKey = process.env.ANTHROPIC_API_KEY;
    const isKeyMissing = !apiKey || apiKey.includes('your-key-here') || apiKey.length < 20;
    if (isKeyMissing) {
      return res.json({
        answer: `**Note: AI assistant not configured** (add ANTHROPIC_API_KEY to .env)\n\nHere is what I found in the database based on your question:\n\n${context || 'No data found for this query.'}`,
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
      // Anthropic auth error (invalid key) — return fallback, don't crash
      const isAuthErr = aiErr.status === 401 || aiErr.status === 403
        || (aiErr.message && aiErr.message.toLowerCase().includes('auth'));
      if (isAuthErr) {
        return res.json({
          answer: `**AI key error:** ${aiErr.message}\n\nRaw data from database:\n\n${context || 'No data found.'}`,
          intent: ragData.intent,
          sources: ragData.summary,
          timetableId: activeTimetableId,
          _noAI: true,
        });
      }
      throw aiErr; // re-throw unexpected errors
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
    const subjects = await Subject.findAll({ where: { institution_id: instId, is_active: true }, limit: 3, order: [['name', 'ASC']] });

    const dynamic = [];
    if (teachers[0]) dynamic.push(`${teachers[0].name.split(' ').pop()} Sir ka aaj ka schedule kya hai?`);
    if (teachers[1]) dynamic.push(`${teachers[1].name} ke kitne periods hain is week?`);
    if (rooms[0]) dynamic.push(`${rooms[0].name} mein kal kya hai?`);
    if (subjects[0]) dynamic.push(`${subjects[0].name} ke kitne periods hain is week?`);

    const staticQuestions = [
      { category: 'teacher', icon: '👨🏫', text: 'Sharma Sir ka complete timetable dikhao' },
      { category: 'teacher', icon: '👩🏫', text: 'Gupta Ma\'am ke kitne periods hain is week?' },
      { category: 'teacher', icon: '👨🏫', text: 'Kaun sa teacher Monday ko free hai period 3 mein?' },
      { category: 'room', icon: '🏫', text: 'Room 101 mein kal kya hai?' },
      { category: 'room', icon: '🔬', text: 'Lab schedule kya hai is week ka?' },
      { category: 'room', icon: '🏫', text: 'Konsi room Monday ko khali hai?' },
      { category: 'class', icon: '📚', text: 'Class 10A ka aaj ka schedule?' },
      { category: 'class', icon: '📖', text: 'Sem 3 ke free periods kab hain?' },
      { category: 'class', icon: '📚', text: 'Math Class 12 mein kab hai?' },
      { category: 'general', icon: '⚡', text: 'Koi conflict hai timetable mein?' },
      { category: 'general', icon: '📊', text: 'Kitne teachers hain total?' },
      { category: 'general', icon: '🎯', text: 'Konse teachers Friday ko available hain?' },
    ];

    const dynamicFormatted = dynamic.map(text => ({ category: 'dynamic', icon: '✨', text }));

    res.json({ questions: [...dynamicFormatted, ...staticQuestions] });
  } catch (err) { next(err); }
};

module.exports = { ask, suggestImprovements, getQuickQuestions };
