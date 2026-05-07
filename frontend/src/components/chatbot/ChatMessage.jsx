'use client';
import { motion } from 'framer-motion';
import { Bot, User, ExternalLink, Clock } from 'lucide-react';

function formatContent(content) {
  // Convert markdown-like syntax to JSX
  const lines = content.split('\n');
  return lines.map((line, i) => {
    if (line.startsWith('**') && line.endsWith('**')) {
      return <p key={i} className="font-semibold text-text-primary">{line.slice(2, -2)}</p>;
    }
    if (line.startsWith('• ') || line.startsWith('- ')) {
      return <p key={i} className="flex items-start gap-2"><span className="text-primary mt-0.5 flex-shrink-0">•</span><span>{formatInline(line.slice(2))}</span></p>;
    }
    if (line.trim() === '') return <br key={i} />;
    return <p key={i}>{formatInline(line)}</p>;
  });
}

function formatInline(text) {
  // Handle **bold** inline
  const parts = text.split(/\*\*(.*?)\*\*/g);
  return parts.map((part, i) => i % 2 === 1 ? <strong key={i} className="text-text-primary font-semibold">{part}</strong> : part);
}

const INTENT_LABELS = {
  TEACHER_SCHEDULE: { label: 'Teacher Info', color: 'primary' },
  ROOM_QUERY: { label: 'Room Info', color: 'warning' },
  CLASS_SCHEDULE: { label: 'Class Schedule', color: 'success' },
  FREE_PERIOD: { label: 'Availability', color: 'purple' },
  SUBJECT_QUERY: { label: 'Subject Info', color: 'primary' },
  CONFLICT_QUERY: { label: 'Conflicts', color: 'danger' },
  IMPROVEMENT: { label: 'Improvements', color: 'purple' },
  GENERAL: { label: 'General', color: 'text-secondary' },
};

export default function ChatMessage({ message }) {
  const isUser = message.role === 'user';
  const time = message.timestamp ? new Date(message.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '';
  const intentInfo = message.intent ? INTENT_LABELS[message.intent] : null;

  if (isUser) {
    return (
      <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="flex justify-end items-end gap-2">
        <div className="max-w-[75%]">
          <div className="bg-gradient-to-br from-primary to-indigo-600 text-white rounded-2xl rounded-br-sm px-4 py-3 shadow-lg shadow-primary/20">
            <p className="text-sm leading-relaxed">{message.content}</p>
          </div>
          <p className="text-[10px] text-text-secondary mt-1 text-right flex items-center justify-end gap-1">
            <Clock className="w-2.5 h-2.5" />{time}
          </p>
        </div>
        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary/30 to-purple/30 border border-primary/30 flex items-center justify-center flex-shrink-0 mb-4">
          <User className="w-3.5 h-3.5 text-primary" />
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="flex items-end gap-2">
      <div className="w-8 h-8 rounded-full ai-orb flex-shrink-0 mb-4" />
      <div className="max-w-[80%]">
        <div className={`rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm ${message.error ? 'bg-danger/10 border border-danger/20' : 'bg-elevated border border-border'}`}>
          <div className="text-sm leading-relaxed text-text-primary space-y-1">
            {formatContent(message.content)}
          </div>
        </div>

        {/* Sources badge */}
        <div className="flex items-center gap-2 mt-1">
          {intentInfo && (
            <span className={`text-[10px] px-2 py-0.5 rounded-full bg-${intentInfo.color}/10 text-${intentInfo.color} border border-${intentInfo.color}/20 font-medium`}>
              {intentInfo.label}
            </span>
          )}
          <p className="text-[10px] text-text-secondary flex items-center gap-1">
            <Clock className="w-2.5 h-2.5" />{time}
          </p>
          {!message.error && message.intent !== 'welcome' && (
            <span className="text-[10px] text-text-secondary">• DB + Claude AI</span>
          )}
        </div>
      </div>
    </motion.div>
  );
}
