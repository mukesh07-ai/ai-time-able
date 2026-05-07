# 🚀 PS4 AI-Powered Timetable Scheduler

> Hackathon Day 1 MVP — AI scheduling with Claude + OR-Tools CP-SAT + RAG Chatbot

## ⚡ Quick Start (5 Commands)

```bash
# 1. Create MySQL database
mysql -u root -p -e "CREATE DATABASE ps4_timetable CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

# 2. Start Backend (port 4000)
cd backend && npm install && npm run dev

# 3. Start Python Solver (port 5001)
cd solver && python -m venv venv && venv\Scripts\activate && pip install -r requirements.txt && python app.py

# 4. Start Frontend (port 3000)
cd frontend && npm install && npm run dev

# 5. Visit http://localhost:3000 → Register → Upload → Generate → Chat!
```

## 🔧 Environment Setup

Copy `.env.example` to `.env` and fill in:
- `DB_PASSWORD` — your MySQL root password
- `ANTHROPIC_API_KEY` — get from console.anthropic.com

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│  Next.js 14 Frontend (port 3000)                        │
│  • Neural Dark UI • Framer Motion • Socket.io client    │
└────────────────────┬────────────────────────────────────┘
                     │ REST + WebSocket
┌────────────────────▼────────────────────────────────────┐
│  Express.js Backend (port 4000)                         │
│  • JWT Auth • Sequelize ORM • Socket.io server          │
│  • RAG Service → Claude AI (claude-sonnet-4-20250514)   │
└──────┬────────────────────────────────┬─────────────────┘
       │ SQL                            │ HTTP
┌──────▼──────┐              ┌──────────▼──────────┐
│  MySQL 8.0  │              │  Python Flask +      │
│  10 tables  │              │  OR-Tools CP-SAT     │
│  (port 3306)│              │  (port 5001)         │
└─────────────┘              └─────────────────────┘
```

## 🎯 Demo Flow (5 Minutes for Judges)

| Time | Action |
|------|--------|
| 0:00 | Login → Dashboard (show stats cards) |
| 0:30 | `/upload` → Drag `teachers.xlsx` → AI parses → Confirm |
| 1:00 | `/constraints` → Show teacher availability grid (editable) |
| 1:30 | `/generate` → Voice: "Sharma Sir Monday available nahi hai, Math ke 5 periods chahiye Class 10A ke liye" → Real-time progress |
| 2:30 | Click "💡 AI Improvements" → Claude suggests 3 improvements |
| 3:00 | `/chatbot` → Type: "Sharma Sir ka schedule kya hai?" → AI gives exact answer with room numbers |
| 3:30 | Voice: "Room 101 mein kal kya hai?" → Instant answer |
| 4:00 | Trigger conflict → Conflict panel with AI explanation + 3 fixes → Pick fix → Clean grid |
| 4:45 | Export → Excel downloads with per-class sheets |

## 📁 Key Files

| File | Purpose |
|------|---------|
| `backend/services/ragService.js` | Intent classification + smart DB fetching + context building |
| `backend/services/aiService.js` | All Claude API calls (5 functions) |
| `backend/controllers/chatbotController.js` | RAG chatbot endpoints |
| `solver/solver.py` | OR-Tools CP-SAT constraint solver |
| `frontend/src/app/(dashboard)/chatbot/page.js` | AI chatbot UI with voice |
| `frontend/src/app/(dashboard)/generate/page.js` | Generation + grid + conflicts |

## 🤖 AI Chatbot Questions (Demo)

```
Hindi:   "Sharma Sir ka timetable kya hai?"
English: "What is Room 101's schedule on Monday?"
Hinglish: "Class 10A ke kitne free periods hain?"
         "Konse teacher available hain Friday 3rd period mein?"
         "Math ke kitne periods hain is week?"
```

## 🛠️ Tech Stack

- **Frontend**: Next.js 14, TailwindCSS, Framer Motion, React Query
- **Backend**: Express.js, Sequelize, Socket.io
- **Database**: MySQL 8.0
- **AI**: Claude claude-sonnet-4-20250514 + In-context RAG
- **Solver**: Python Flask + Google OR-Tools CP-SAT
- **Auth**: JWT + bcryptjs

## 📊 Database Schema

10 tables: User, Institution, Teacher, TeacherAvailability, TeacherSubject, Subject, Room, Timetable, TimetableEntry, ConflictLog

All tables use UUID primary keys and auto-sync on startup via `sequelize.sync({ alter: true })`.

## 🏆 PS4 Hackathon Checklist

- ✅ Timetable Web App (Next.js 14, responsive)
- ✅ Input Constraints UI (Teachers, Rooms)
- ✅ OR-Tools CP-SAT Solver via Python microservice
- ✅ LLM Assistant with RAG (Claude + live MySQL)
- ✅ Conflict Detection (visual + AI explanation + 3 fixes)
- ✅ AI Chatbot for ANY timetable question in Hindi/English/Hinglish
- ✅ Voice input (Web Speech API, Hindi + English)
- ✅ Real-time Socket.io progress updates
- ✅ Export Excel (multi-sheet) + PDF
- ✅ JWT Authentication
