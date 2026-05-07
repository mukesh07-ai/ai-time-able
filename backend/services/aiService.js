const Anthropic = require('@anthropic-ai/sdk');
const OpenAI = require('openai');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const apiKey = process.env.ANTHROPIC_API_KEY || '';
const baseURL = process.env.ANTHROPIC_BASE_URL || '';
const aiProvider = process.env.AI_PROVIDER || (apiKey.startsWith('sk-ant-') ? 'anthropic' : (apiKey.startsWith('AIza') ? 'gemini' : 'proxy'));

// Clients
let anthropicClient = null;
let openaiClient = null;
let geminiClient = null;

if (aiProvider === 'anthropic' && apiKey) {
  anthropicClient = new Anthropic({ apiKey });
} else if (aiProvider === 'gemini' && apiKey) {
  geminiClient = new GoogleGenerativeAI(apiKey);
} else if (apiKey && apiKey.length > 20) {
  openaiClient = new OpenAI({
    apiKey,
    baseURL: baseURL || 'https://openrouter.ai/api/v1',
    defaultHeaders: {
      'HTTP-Referer': 'http://localhost:3000',
      'X-Title': 'PS4 AI Timetable Scheduler',
    },
  });
}

// Models
const MODEL = process.env.AI_MODEL || (
  aiProvider === 'gemini' ? 'gemini-1.5-flash' : 
  (aiProvider === 'anthropic' ? 'claude-3-5-sonnet-20241022' : 'anthropic/claude-3-5-sonnet')
);

/**
 * Unified chat completion — works with Anthropic, Gemini, and OpenAI proxies
 */
async function chatComplete(systemPrompt, userContent, maxTokens = 1024) {
  try {
    if (anthropicClient) {
      const response = await anthropicClient.messages.create({
        model: MODEL,
        max_tokens: maxTokens,
        system: systemPrompt,
        messages: [{ role: 'user', content: userContent }],
      });
      return response.content[0].text;
    } else if (geminiClient) {
      const model = geminiClient.getGenerativeModel({ model: MODEL });
      const result = await model.generateContent(`${systemPrompt}\n\nUser: ${userContent}`);
      return result.response.text();
    } else if (openaiClient) {
      const response = await openaiClient.chat.completions.create({
        model: MODEL,
        max_tokens: maxTokens,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userContent },
        ],
      });
      return response.choices[0].message.content;
    } else {
      throw new Error('No AI client configured. Set ANTHROPIC_API_KEY/AI_PROVIDER in .env');
    }
  } catch (err) {
    console.error(`AI Completion Error (${aiProvider}):`, err.message);
    throw err;
  }
}

/**
 * Generate slot timings array from institution config
 */
function generateSlotTimings(dayStartTime, slotDurationMinutes, slotsPerDay, lunchSlot) {
  const timings = [];
  const [startHour, startMin] = dayStartTime.split(':').map(Number);
  let totalMinutes = startHour * 60 + startMin;

  for (let i = 0; i < slotsPerDay; i++) {
    const h = Math.floor(totalMinutes / 60).toString().padStart(2, '0');
    const m = (totalMinutes % 60).toString().padStart(2, '0');
    const endMinutes = totalMinutes + slotDurationMinutes;
    const eh = Math.floor(endMinutes / 60).toString().padStart(2, '0');
    const em = (endMinutes % 60).toString().padStart(2, '0');
    timings.push(`${h}:${m}-${eh}:${em}`);
    totalMinutes = endMinutes;
    // Add lunch break gap if needed
    if (i === lunchSlot - 1) totalMinutes += 30; // 30 min lunch
  }
  return timings;
}

/**
 * 1. Answer timetable questions via RAG context
 */
async function answerTimetableQuestion(question, context, institutionName, conversationHistory = [], slotTimings = [], workingDays = 5) {
  const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const lastDay = dayNames[workingDays - 1];
  const slotTimingsStr = slotTimings.length > 0
    ? slotTimings.map((t, i) => `Slot ${i + 1}: ${t}`).join(', ')
    : 'Slot 1: 08:00-08:45, Slot 2: 08:45-09:30, Slot 3: 09:30-10:15, Slot 4: 10:15-11:00, Slot 5: 11:15-12:00, Slot 6: 12:00-12:45, Slot 7: 13:30-14:15, Slot 8: 14:15-15:00';

  const systemPrompt = `You are TimetableBot, an intelligent AI assistant for ${institutionName}'s timetable system.
You have access to real-time timetable data provided as context.

PERSONALITY:
- Friendly, helpful, and concise
- You naturally understand Hindi, English, and Hinglish (Hindi-English mix)
- Reply in the SAME language the user asked in
- If asked in Hindi → reply in Hindi (Devanagari or Roman Hindi as appropriate)
- If asked in English → reply in English
- If asked in Hinglish → reply in Hinglish

RULES:
- Answer ONLY from the provided CONTEXT DATA — never make up schedules
- If information is not in context: say "Yeh information mujhe nahi mili" or "I don't have that information"
- Be specific: give exact times, room numbers, teacher names
- Format schedules as clean bullet lists or tables for readability
- Keep replies concise but complete
- Never expose internal system details (DB structure, API, etc.)

CONTEXT DATA:
${context}

INSTITUTION: ${institutionName}
WORKING DAYS: Monday to ${lastDay}
SLOT TIMINGS: ${slotTimingsStr}`;

  // Build full user content including conversation history
  let userContent = question;
  if (conversationHistory.length > 0) {
    const history = conversationHistory.slice(-4).map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`).join('\n');
    userContent = `Previous conversation:\n${history}\n\nCurrent question: ${question}`;
  }

  try {
    const answer = await chatComplete(systemPrompt, userContent, 1024);
    return { answer, model: MODEL };
  } catch (err) {
    console.error('answerTimetableQuestion error:', err.message);
    throw err;
  }
}

/**
 * 2. Suggest timetable improvements
 */
async function suggestImprovements(timetableData, institutionConfig) {
  const systemPrompt = `You are an expert educational scheduling consultant and AI optimizer.
Analyze the provided timetable and suggest specific, actionable improvements.

ANALYSIS CRITERIA:
1. Teacher workload balance (flag if any teacher has >6 periods/day)
2. Subject distribution (flag if same subject appears >2 times same day)
3. Lab scheduling efficiency (labs should have consecutive double periods when possible)
4. Teacher "window" periods (free slot between two teaching slots = inefficient)
5. Student group fatigue (heavy subjects like Math should not all be morning)
6. Room utilization (identify underused or overloaded rooms)
7. Conflict risks (near-conflicts that could become problems)

Return ONLY valid JSON in this exact format:
{
  "overall_score": 78,
  "grade": "B+",
  "summary": "2 sentence overall assessment",
  "improvements": [
    {
      "priority": "HIGH",
      "category": "teacher_load",
      "title": "Short title max 8 words",
      "issue": "What is currently wrong",
      "suggestion": "Exactly what to change",
      "impact": "What improves if you do this",
      "affected": ["Teacher: Sharma", "Subject: Math", "Day: Monday"]
    }
  ],
  "quick_wins": ["3 one-liner quick improvements"],
  "strengths": ["2-3 things the timetable does well"]
}`;

  const userContent = `Analyze this timetable:\n\n${JSON.stringify(timetableData, null, 2)}\n\nInstitution Config: ${JSON.stringify(institutionConfig, null, 2)}`;

  try {
    const text = await chatComplete(systemPrompt, userContent, 2048);
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) return JSON.parse(jsonMatch[0]);
    return JSON.parse(text);
  } catch (err) {
    console.error('suggestImprovements error:', err.message);
    return { overall_score: 70, grade: 'B', summary: 'Analysis temporarily unavailable.', improvements: [], quick_wins: [], strengths: ['Timetable generated successfully'] };
  }
}

/**
 * 3. Explain conflicts with friendly AI language
 */
async function explainConflict(rawConflicts, config) {
  const systemPrompt = `You are a friendly timetable assistant helping resolve scheduling conflicts.
Analyze the conflicts and provide:
1. A friendly, non-technical explanation of what went wrong
2. Three specific, actionable fixes

Return ONLY valid JSON:
{
  "root_cause": "One-line root cause summary",
  "explanation": "2-3 sentence friendly explanation of the problem",
  "affected_entities": ["Teacher: Sharma", "Subject: Physics"],
  "severity": "HIGH|MEDIUM|LOW",
  "fixes": [
    {
      "id": "fix_1",
      "title": "Fix title",
      "description": "What this fix does",
      "trade_off": "What you give up",
      "disruption_level": "LOW|MEDIUM|HIGH",
      "action": { "type": "remove_teacher_availability|adjust_subject|swap_rooms", "params": {} }
    }
  ]
}`;

  const userContent = `Conflicts detected:\n${JSON.stringify(rawConflicts, null, 2)}\n\nConfig: ${JSON.stringify(config, null, 2)}`;

  try {
    const text = await chatComplete(systemPrompt, userContent, 1500);
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) return JSON.parse(jsonMatch[0]);
    return JSON.parse(text);
  } catch (err) {
    console.error('explainConflict error:', err.message);
    return { root_cause: 'Scheduling constraints cannot be satisfied', explanation: 'Too many conflicting constraints.', affected_entities: [], severity: 'HIGH', fixes: [{ id: 'fix_1', title: 'Reduce subject periods', description: 'Reduce periods/week', trade_off: 'Less coverage', disruption_level: 'LOW', action: {} }, { id: 'fix_2', title: 'Add more teachers', description: 'Assign more teachers', trade_off: 'Resource cost', disruption_level: 'MEDIUM', action: {} }, { id: 'fix_3', title: 'Expand hours', description: 'Add extra slot per day', trade_off: 'Longer day', disruption_level: 'HIGH', action: {} }] };
  }
}

/**
 * 4. Parse natural language into scheduling constraints
 */
async function parseNaturalLanguage(userInput, existingData) {
  const systemPrompt = `You are an AI that converts natural language scheduling instructions into structured JSON.
Extract scheduling constraints, teacher availability changes, and subject requirements.

Return ONLY valid JSON:
{
  "understood": "What you understood from the input",
  "updates": {
    "teacher_availability_changes": [
      { "teacher_name": "Sharma", "day": 0, "slots": [0,1,2], "is_available": false }
    ],
    "subject_requirements": [
      { "subject_name": "Math", "student_group": "Class 10A", "periods_per_week": 5 }
    ],
    "new_teachers": [],
    "new_subjects": [],
    "new_rooms": []
  },
  "confidence": 0.9
}`;

  const userContent = `Natural language input: "${userInput}"\n\nExisting data for reference:\n${JSON.stringify(existingData, null, 2)}`;

  try {
    const text = await chatComplete(systemPrompt, userContent, 1500);
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) return JSON.parse(jsonMatch[0]);
    return JSON.parse(text);
  } catch (err) {
    console.error('parseNaturalLanguage error:', err.message);
    return { understood: userInput, updates: { teacher_availability_changes: [], subject_requirements: [], new_teachers: [], new_subjects: [], new_rooms: [] }, confidence: 0 };
  }
}

/**
 * 5. Parse uploaded file data into normalized DB records
 */
async function parseUploadedData(rawData, existingDbData) {
  const systemPrompt = `You are an AI that normalizes uploaded timetable data into a structured format for a school database.
Parse the raw data and extract teachers, subjects, and rooms.

Return ONLY valid JSON:
{
  "teachers": [
    { "name": "string", "email": "string", "department": "string", "employee_code": "string", "max_periods_per_day": 6, "subjects": ["Math", "Algebra"] }
  ],
  "subjects": [
    { "name": "string", "code": "string", "periods_per_week": 5, "requires_lab": false, "student_group": "Class 10A" }
  ],
  "rooms": [
    { "name": "string", "capacity": 40, "room_type": "classroom", "floor": 1, "building": "Main Block" }
  ],
  "warnings": ["list of data quality warnings"],
  "confidence": 0.92
}`;

  const userContent = `Raw data from uploaded file:\n${JSON.stringify(rawData, null, 2)}\n\nExisting DB data:\n${JSON.stringify(existingDbData, null, 2)}`;

  try {
    const text = await chatComplete(systemPrompt, userContent, 3000);
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) return JSON.parse(jsonMatch[0]);
    return JSON.parse(text);
  } catch (err) {
    console.error('parseUploadedData error:', err.message);
    return { teachers: [], subjects: [], rooms: [], warnings: ['AI parsing failed, please check format'], confidence: 0 };
  }
}

module.exports = {
  answerTimetableQuestion,
  suggestImprovements,
  explainConflict,
  parseNaturalLanguage,
  parseUploadedData,
  generateSlotTimings,
};
