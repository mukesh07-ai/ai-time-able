'use client';
import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Mic, MicOff, Trash2, Zap, ChevronRight, Database, BookOpen, Users, Building2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { chatbotApi, dashboardApi } from '@/lib/api';
import useAuthStore from '@/lib/auth';
import ChatMessage from '@/components/chatbot/ChatMessage';
import { useQuery } from '@tanstack/react-query';

const DEFAULT_QUESTIONS = [
  { category: 'teacher', icon: '👨‍🏫', text: "Who is teaching Computer Core 1 this week?" },
  { category: 'teacher', icon: '👩‍🏫', text: "How many periods does Prof. Core have per week?" },
  { category: 'teacher', icon: '👨‍🏫', text: "Which teacher is free on Monday in slot 3?" },
  { category: 'room', icon: '🏫', text: "What is scheduled in Room BC10 tomorrow?" },
  { category: 'room', icon: '🔬', text: "What is the lab schedule for this week?" },
  { category: 'room', icon: '🏫', text: "Which rooms are empty on Monday?" },
  { category: 'class', icon: '📚', text: "What is B.Tech CS - Semester 1 schedule today?" },
  { category: 'class', icon: '📖', text: "When are the free periods for Semester 3?" },
  { category: 'general', icon: '⚡', text: "Are there any conflicts in the timetable?" },
  { category: 'general', icon: '📊', text: "How many teachers are registered in the system?" },
  { category: 'general', icon: '🎯', text: "Which teachers are available on Friday?" },
];

const WELCOME_MESSAGE = {
  role: 'assistant',
  content: `Hello! 👋 I'm **TimetableBot** — your AI-powered scheduling assistant.

You can ask me anything about your institution's timetable, such as:
• *"Who is teaching B.Tech CS - Semester 1 on Monday?"*
• *"Which rooms are available on Wednesday at slot 2?"*
• *"How many periods does Prof. Core have this week?"*

I have live access to your institution's schedule database and can answer questions about teachers, rooms, subjects, and student groups.

*Powered by Claude AI with real-time database access* 🤖`,
  timestamp: new Date().toISOString(),
  intent: 'welcome',
};

export default function ChatbotPage() {
  const { user } = useAuthStore();
  const [messages, setMessages] = useState([WELCOME_MESSAGE]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [quickQuestions, setQuickQuestions] = useState(DEFAULT_QUESTIONS);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const recognitionRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    const instId = user?.institution_id;
    if (instId) {
      chatbotApi.getQuickQuestions(instId)
        .then(data => { if (data.questions?.length) setQuickQuestions(data.questions); })
        .catch(() => {});
    }
  }, [user]);

  const sendMessage = async (text) => {
    const q = text || input.trim();
    if (!q || isLoading) return;
    setInput('');

    const userMsg = { role: 'user', content: q, timestamp: new Date().toISOString() };
    setMessages(prev => [...prev, userMsg]);
    setIsLoading(true);

    const history = messages.slice(-6).map(m => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: m.content }));

    try {
      const result = await chatbotApi.ask({
        question: q,
        institutionId: user?.institution_id,
        conversationHistory: history,
      });

      const aiMsg = {
        role: 'assistant',
        content: result.answer,
        timestamp: new Date().toISOString(),
        intent: result.intent,
        sources: result.sources,
      };
      setMessages(prev => [...prev, aiMsg]);
    } catch (err) {
      const errorMsg = {
        role: 'assistant',
        content: 'I encountered a technical issue. Please try again in a moment.',
        timestamp: new Date().toISOString(),
        error: true,
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  const startVoice = () => {
    if (typeof window === 'undefined') return;
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) { toast.error('Voice not supported in this browser. Use Chrome.'); return; }

    const recognition = new SpeechRecognition();
    recognition.lang = 'en-IN';
    recognition.interimResults = true;
    recognition.continuous = false;

    recognition.onstart = () => setIsListening(true);
    recognition.onresult = (event) => {
      const transcript = Array.from(event.results).map(r => r[0].transcript).join('');
      setInput(transcript);
      if (event.results[event.results.length - 1].isFinal) {
        setIsListening(false);
        sendMessage(transcript);
      }
    };
    recognition.onerror = () => { setIsListening(false); toast.error('Voice recognition failed. Please type instead.'); };
    recognition.onend = () => setIsListening(false);
    recognitionRef.current = recognition;
    recognition.start();
  };

  const stopVoice = () => { recognitionRef.current?.stop(); setIsListening(false); };
  const clearChat = () => { setMessages([WELCOME_MESSAGE]); toast.success('Chat cleared'); };

  return (
    <div className="flex h-[calc(100vh-7rem)] gap-4">
      {/* LEFT: Quick Questions Panel */}
      <div className="w-72 flex-shrink-0 flex flex-col gap-3 overflow-hidden">
        <div className="card p-4">
          <h3 className="font-outfit font-semibold text-text-primary text-sm flex items-center gap-2">
            🎯 <span>Suggested Questions</span>
          </h3>
        </div>

        <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 custom-scrollbar">
          {quickQuestions.slice(0, 12).map((q, i) => (
            <motion.button key={i} whileHover={{ x: 3 }} whileTap={{ scale: 0.98 }}
              onClick={() => { setInput(q.text); sendMessage(q.text); }}
              className="w-full text-left card p-3 hover:border-primary/30 hover:bg-primary/5 transition-all duration-200 cursor-pointer group">
              <div className="flex items-start gap-2">
                <span className="text-lg leading-tight flex-shrink-0">{q.icon}</span>
                <span className="text-xs text-text-secondary group-hover:text-text-primary transition-colors leading-relaxed">{q.text}</span>
                <ChevronRight className="w-3 h-3 text-text-secondary group-hover:text-primary ml-auto flex-shrink-0 mt-0.5 transition-colors" />
              </div>
            </motion.button>
          ))}
        </div>

        {/* Stats panel */}
        <div className="card p-4 space-y-3">
          <div className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">Live Database</div>
          <div className="space-y-2">
            {[
              { icon: <Users className="w-3.5 h-3.5" />, label: 'Teachers', color: 'text-primary' },
              { icon: <BookOpen className="w-3.5 h-3.5" />, label: 'Subjects', color: 'text-warning' },
              { icon: <Building2 className="w-3.5 h-3.5" />, label: 'Departments', color: 'text-success' },
            ].map(item => (
              <div key={item.label} className={`flex items-center gap-2 text-xs ${item.color}`}>
                {item.icon}
                <span className="text-text-secondary flex-1">{item.label}</span>
                <div className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
              </div>
            ))}
          </div>
          <div className="pt-1 border-t border-border/50">
            <span className="text-[9px] text-text-secondary font-bold uppercase tracking-widest flex items-center gap-1">
              <Database className="w-3 h-3" /> RAG-enabled • Live queries
            </span>
          </div>
        </div>
      </div>

      {/* RIGHT: Chat Window */}
      <div className="flex-1 flex flex-col card p-0 overflow-hidden">
        {/* Chat Header */}
        <div className="flex items-center gap-4 px-5 py-4 border-b border-border bg-surface/50">
          <div className="relative">
            <div className="w-10 h-10 rounded-full ai-orb pulse-ai flex-shrink-0" />
            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-success rounded-full border-2 border-surface" />
          </div>
          <div className="flex-1">
            <div className="font-outfit font-bold text-text-primary">TimetableBot</div>
            <div className="text-xs text-purple flex items-center gap-1">
              <Zap className="w-3 h-3" />
              Powered by Claude AI • RAG enabled • English
            </div>
          </div>
          <button onClick={clearChat} className="p-2 rounded-lg hover:bg-elevated text-text-secondary hover:text-danger transition-colors" title="Clear chat">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
          <AnimatePresence>
            {messages.map((msg, i) => (
              <ChatMessage key={i} message={msg} />
            ))}
          </AnimatePresence>

          {isLoading && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full ai-orb flex-shrink-0" />
              <div className="card px-4 py-3 inline-flex items-center gap-1.5">
                <div className="typing-dot w-2 h-2 bg-primary rounded-full" />
                <div className="typing-dot w-2 h-2 bg-primary rounded-full" />
                <div className="typing-dot w-2 h-2 bg-primary rounded-full" />
              </div>
            </motion.div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input area */}
        <div className="border-t border-border p-4 bg-surface/50">
          {isListening && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-2 mb-3 px-2">
              <div className="flex items-end gap-0.5 h-6">
                {[1,2,3,4,5].map(i => (
                  <div key={i} className="sound-bar w-1 bg-danger rounded-full" style={{ animationDelay: `${i * 0.1}s` }} />
                ))}
              </div>
              <span className="text-xs text-danger font-medium">Listening... speak now</span>
            </motion.div>
          )}

          <div className="flex items-end gap-3">
            <div className="flex-1">
              <textarea
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask anything about your timetable, teachers, rooms, or subjects..."
                rows={1}
                className="input-field resize-none min-h-[44px] max-h-28"
                style={{ height: 'auto' }}
                onInput={e => { e.target.style.height = 'auto'; e.target.style.height = Math.min(e.target.scrollHeight, 112) + 'px'; }}
                disabled={isLoading}
              />
            </div>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={isListening ? stopVoice : startVoice}
              className={`p-3 rounded-xl border transition-all flex-shrink-0 ${isListening ? 'bg-danger/20 border-danger text-danger pulse-ai' : 'bg-elevated border-border text-text-secondary hover:text-text-primary hover:border-white/20'}`}
            >
              {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => sendMessage()}
              disabled={!input.trim() || isLoading}
              className="p-3 rounded-xl bg-gradient-to-br from-primary to-purple text-white flex-shrink-0 disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-primary/20"
            >
              <Send className="w-5 h-5" />
            </motion.button>
          </div>
          <p className="text-[10px] text-text-secondary mt-2 px-1">Shift+Enter for new line • Click 🎤 to speak</p>
        </div>
      </div>
    </div>
  );
}
