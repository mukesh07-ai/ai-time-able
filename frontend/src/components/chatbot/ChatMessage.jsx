'use client';
import { motion } from 'framer-motion';
import { Bot, User, Clock, Calendar, BookOpen, Users, Building2, AlertCircle, CheckCircle, Zap } from 'lucide-react';

// ─── Intent config ────────────────────────────────────────────────────────────
const INTENT_CONFIG = {
  TEACHER_SCHEDULE: { label: 'Teacher Schedule', icon: Users, gradient: 'from-blue-500/20 to-primary/10', badge: 'bg-primary/15 text-primary border-primary/25' },
  ROOM_QUERY:       { label: 'Room Info',         icon: Building2, gradient: 'from-warning/20 to-amber-500/10', badge: 'bg-warning/15 text-warning border-warning/25' },
  CLASS_SCHEDULE:   { label: 'Class Schedule',    icon: Calendar, gradient: 'from-success/20 to-emerald-500/10', badge: 'bg-success/15 text-success border-success/25' },
  FREE_PERIOD:      { label: 'Availability',      icon: CheckCircle, gradient: 'from-teal-500/20 to-cyan-500/10', badge: 'bg-teal-500/15 text-teal-400 border-teal-500/25' },
  SUBJECT_QUERY:    { label: 'Subject Info',      icon: BookOpen, gradient: 'from-indigo-500/20 to-purple/10', badge: 'bg-indigo-500/15 text-indigo-400 border-indigo-500/25' },
  CONFLICT_QUERY:   { label: 'Conflicts',         icon: AlertCircle, gradient: 'from-danger/20 to-red-500/10', badge: 'bg-danger/15 text-danger border-danger/25' },
  IMPROVEMENT:      { label: 'Suggestions',       icon: Zap, gradient: 'from-purple/20 to-indigo-500/10', badge: 'bg-purple/15 text-purple border-purple/25' },
  GENERAL:          { label: 'Overview',          icon: Bot, gradient: 'from-white/5 to-white/2', badge: 'bg-white/10 text-text-secondary border-white/10' },
  welcome:          { label: 'Welcome',           icon: Zap, gradient: 'from-primary/10 to-purple/5', badge: 'bg-primary/10 text-primary border-primary/15' },
};

// ─── Inline formatter ─────────────────────────────────────────────────────────
function parseInline(text) {
  // Split on **bold** and *italic*
  const parts = text.split(/(\*\*.*?\*\*|\*.*?\*|`.*?`)/g);
  return parts.map((p, i) => {
    if (p.startsWith('**') && p.endsWith('**'))
      return <strong key={i} className="font-bold text-text-primary">{p.slice(2, -2)}</strong>;
    if (p.startsWith('*') && p.endsWith('*') && p.length > 2)
      return <em key={i} className="italic text-text-secondary">{p.slice(1, -1)}</em>;
    if (p.startsWith('`') && p.endsWith('`'))
      return <code key={i} className="font-mono text-[11px] px-1.5 py-0.5 bg-white/10 rounded text-primary">{p.slice(1, -1)}</code>;
    return p;
  });
}

// ─── Block-level renderer ─────────────────────────────────────────────────────
function renderBlocks(content) {
  const lines = content.split('\n');
  const blocks = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Code block
    if (line.trim().startsWith('```')) {
      const codeLines = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      blocks.push(
        <div key={i} className="my-3 rounded-xl bg-black/30 border border-white/10 overflow-hidden">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-white/5 border-b border-white/5">
            <div className="w-2 h-2 rounded-full bg-danger/60" />
            <div className="w-2 h-2 rounded-full bg-warning/60" />
            <div className="w-2 h-2 rounded-full bg-success/60" />
            <span className="text-[9px] text-text-secondary ml-1 uppercase tracking-widest font-bold">Database Result</span>
          </div>
          <pre className="p-3 text-[11px] text-text-secondary leading-relaxed overflow-x-auto whitespace-pre-wrap font-mono">
            {codeLines.join('\n')}
          </pre>
        </div>
      );
      i++;
      continue;
    }

    // Blockquote (> Note: ...)
    if (line.trim().startsWith('> ')) {
      blocks.push(
        <div key={i} className="my-2 pl-3 border-l-2 border-primary/40 bg-primary/5 rounded-r-lg py-2 pr-3">
          <p className="text-[11px] text-text-secondary italic leading-relaxed">{parseInline(line.slice(2))}</p>
        </div>
      );
      i++;
      continue;
    }

    // H1 heading (#)
    if (line.startsWith('# ')) {
      blocks.push(<h2 key={i} className="font-outfit font-bold text-base text-text-primary mt-3 mb-1">{parseInline(line.slice(2))}</h2>);
      i++;
      continue;
    }

    // H2 heading (##)
    if (line.startsWith('## ')) {
      blocks.push(<h3 key={i} className="font-outfit font-semibold text-sm text-text-primary mt-2 mb-0.5 flex items-center gap-2">
        <span className="w-1 h-4 bg-primary rounded-full inline-block" />
        {parseInline(line.slice(3))}
      </h3>);
      i++;
      continue;
    }

    // Bullet list item (• or - or *)
    if (/^[•\-\*] /.test(line.trim())) {
      const listItems = [];
      while (i < lines.length && /^[•\-\*] /.test(lines[i].trim())) {
        listItems.push(lines[i].trim().slice(2));
        i++;
      }
      blocks.push(
        <ul key={i} className="space-y-1 my-1.5">
          {listItems.map((item, j) => (
            <li key={j} className="flex items-start gap-2 text-sm text-text-secondary leading-relaxed">
              <span className="w-1.5 h-1.5 rounded-full bg-primary/60 flex-shrink-0 mt-2" />
              <span>{parseInline(item)}</span>
            </li>
          ))}
        </ul>
      );
      continue;
    }

    // Schedule row (e.g. "Monday Slot 2: Math — Prof. Smith — Room 101")
    if (/^(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday|Mon|Tue|Wed|Thu|Fri|Sat)\s+Slot\s+\d/i.test(line.trim()) ||
        /^Slot\s+\d.*:/.test(line.trim())) {
      const scheduleRows = [];
      while (i < lines.length && (
        /^(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday|Mon|Tue|Wed|Thu|Fri|Sat)\s+Slot\s+\d/i.test(lines[i].trim()) ||
        /^Slot\s+\d.*:/.test(lines[i].trim())
      )) {
        scheduleRows.push(lines[i].trim());
        i++;
      }
      blocks.push(
        <div key={i} className="my-2 space-y-1">
          {scheduleRows.map((row, j) => {
            const parts = row.split(/[:\—\-]+/).map(s => s.trim()).filter(Boolean);
            const isLunch = row.toLowerCase().includes('lunch');
            const isFree = row.toLowerCase().includes('free');
            return (
              <div key={j} className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs ${
                isLunch ? 'bg-warning/10 border border-warning/20 text-warning' :
                isFree ? 'bg-white/3 border border-white/5 text-text-secondary' :
                'bg-primary/5 border border-primary/10 text-text-primary'
              }`}>
                {isLunch ? '🍽️' : isFree ? '⬜' : '📚'}
                <span className="font-bold text-[10px] uppercase tracking-tighter min-w-[80px] flex-shrink-0 opacity-60">{parts[0]}</span>
                {parts.slice(1).map((p, pi) => (
                  <span key={pi} className={`${pi === 0 ? 'font-semibold' : 'opacity-60'} ${pi > 0 ? 'text-[10px]' : ''}`}>
                    {pi > 0 && <span className="mx-1 opacity-30">·</span>}
                    {p}
                  </span>
                ))}
              </div>
            );
          })}
        </div>
      );
      continue;
    }

    // Day header (e.g. "MONDAY:" or "Monday:")
    if (/^[A-Z][a-z]+day:$/.test(line.trim()) || /^[A-Z]+DAY:$/.test(line.trim()) || /^[A-Z]+ SCHEDULE:$/.test(line.trim())) {
      blocks.push(
        <div key={i} className="mt-3 mb-1 flex items-center gap-2">
          <span className="text-[10px] font-bold text-primary uppercase tracking-widest">{line.replace(':', '').trim()}</span>
          <div className="flex-1 h-px bg-primary/15" />
        </div>
      );
      i++;
      continue;
    }

    // Labeled field (KEY: value)
    if (/^[A-Z][A-Z /]+:\s+.+/.test(line.trim())) {
      const colonIdx = line.indexOf(':');
      const key = line.slice(0, colonIdx).trim();
      const val = line.slice(colonIdx + 1).trim();
      if (key && val && key.length < 40) {
        blocks.push(
          <div key={i} className="flex items-start gap-2 text-xs py-0.5">
            <span className="text-[10px] font-bold text-text-secondary uppercase tracking-tighter flex-shrink-0 min-w-[120px]">{key}</span>
            <span className="text-text-primary font-medium">{parseInline(val)}</span>
          </div>
        );
        i++;
        continue;
      }
    }

    // Section header (ALL CAPS lines ending in :)
    if (/^[A-Z][A-Z\s]+:$/.test(line.trim())) {
      blocks.push(
        <div key={i} className="flex items-center gap-2 mt-3 mb-1.5">
          <div className="w-1 h-3.5 bg-primary rounded-full" />
          <span className="text-[10px] font-bold text-primary uppercase tracking-widest">{line.replace(':', '').trim()}</span>
        </div>
      );
      i++;
      continue;
    }

    // Empty line
    if (line.trim() === '') {
      blocks.push(<div key={i} className="h-2" />);
      i++;
      continue;
    }

    // Default paragraph
    blocks.push(
      <p key={i} className="text-sm leading-relaxed text-text-secondary">
        {parseInline(line)}
      </p>
    );
    i++;
  }

  return blocks;
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function ChatMessage({ message }) {
  const isUser = message.role === 'user';
  const time = message.timestamp
    ? new Date(message.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
    : '';
  const intentCfg = message.intent ? INTENT_CONFIG[message.intent] : INTENT_CONFIG.GENERAL;
  const IntentIcon = intentCfg?.icon || Bot;

  // ── User message ────────────────────────────────────────────────────────────
  if (isUser) {
    return (
      <motion.div
        initial={{ opacity: 0, x: 20, scale: 0.97 }}
        animate={{ opacity: 1, x: 0, scale: 1 }}
        transition={{ type: 'spring', damping: 20 }}
        className="flex justify-end items-end gap-2.5"
      >
        <div className="max-w-[72%]">
          <div className="bg-gradient-to-br from-primary to-indigo-600 text-white rounded-2xl rounded-br-sm px-4 py-3 shadow-xl shadow-primary/20">
            <p className="text-sm leading-relaxed font-medium">{message.content}</p>
          </div>
          <p className="text-[10px] text-text-secondary mt-1.5 text-right flex items-center justify-end gap-1 opacity-60">
            <Clock className="w-2.5 h-2.5" />{time}
          </p>
        </div>
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/30 to-purple/30 border border-primary/30 flex items-center justify-center flex-shrink-0 mb-5 shadow-lg">
          <User className="w-3.5 h-3.5 text-primary" />
        </div>
      </motion.div>
    );
  }

  // ── Assistant message ───────────────────────────────────────────────────────
  return (
    <motion.div
      initial={{ opacity: 0, x: -20, scale: 0.97 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      transition={{ type: 'spring', damping: 20 }}
      className="flex items-end gap-2.5"
    >
      {/* Avatar */}
      <div className="w-8 h-8 rounded-full ai-orb flex-shrink-0 mb-5 shadow-lg" />

      <div className="max-w-[82%] min-w-[120px]">
        {/* Message bubble */}
        <div className={`rounded-2xl rounded-bl-sm shadow-sm border overflow-hidden ${
          message.error
            ? 'bg-danger/5 border-danger/20'
            : 'bg-elevated border-border/60'
        }`}>
          {/* Intent header strip (for non-welcome, non-error messages) */}
          {intentCfg && message.intent && message.intent !== 'welcome' && !message.error && (
            <div className={`flex items-center gap-2 px-4 py-2 border-b border-white/5 bg-gradient-to-r ${intentCfg.gradient}`}>
              <IntentIcon className="w-3 h-3 opacity-70" />
              <span className="text-[10px] font-bold uppercase tracking-widest opacity-70">{intentCfg.label}</span>
            </div>
          )}

          {/* Content */}
          <div className={`px-4 py-3 ${message.error ? 'text-danger/80' : ''}`}>
            {message.error ? (
              <div className="flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-danger flex-shrink-0 mt-0.5" />
                <p className="text-sm text-danger/80 leading-relaxed">{message.content}</p>
              </div>
            ) : (
              <div className="space-y-0.5">
                {renderBlocks(message.content)}
              </div>
            )}
          </div>
        </div>

        {/* Footer metadata */}
        <div className="flex items-center gap-2 mt-1.5 px-1">
          {intentCfg && message.intent && message.intent !== 'welcome' && !message.error && (
            <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${intentCfg.badge}`}>
              {intentCfg.label}
            </span>
          )}
          <span className="text-[10px] text-text-secondary flex items-center gap-1 opacity-50">
            <Clock className="w-2.5 h-2.5" />{time}
          </span>
          {!message.error && message.intent && message.intent !== 'welcome' && (
            <span className="text-[9px] text-text-secondary opacity-40 font-medium">• DB + Claude AI</span>
          )}
        </div>
      </div>
    </motion.div>
  );
}
