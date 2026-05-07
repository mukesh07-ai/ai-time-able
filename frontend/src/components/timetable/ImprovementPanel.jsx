'use client';
import { motion } from 'framer-motion';
import { X, TrendingUp, AlertTriangle, CheckCircle, Zap, Loader2 } from 'lucide-react';

const PRIORITY_CONFIG = {
  HIGH: { color: 'danger', bg: 'bg-danger/10 border-danger/30', label: 'HIGH' },
  MEDIUM: { color: 'warning', bg: 'bg-warning/10 border-warning/30', label: 'MED' },
  LOW: { color: 'success', bg: 'bg-success/10 border-success/30', label: 'LOW' },
};

export default function ImprovementPanel({ improvements, loading, onClose }) {
  return (
    <motion.div initial={{ x: 40, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 40, opacity: 0 }}
      className="card h-full flex flex-col overflow-hidden">
      <div className="flex items-center gap-3 pb-3 border-b border-border flex-shrink-0">
        <div className="p-2 rounded-xl bg-purple/15">
          <Zap className="w-4 h-4 text-purple" />
        </div>
        <div className="flex-1">
          <div className="font-outfit font-semibold text-text-primary text-sm">AI Improvements</div>
          <div className="text-xs text-purple">Powered by Claude</div>
        </div>
        <button onClick={onClose} className="text-text-secondary hover:text-text-primary">
          <X className="w-4 h-4" />
        </button>
      </div>

      {loading && (
        <div className="flex-1 flex flex-col items-center justify-center gap-3">
          <div className="w-10 h-10 ai-orb rounded-full" />
          <p className="text-text-secondary text-sm">Claude is analyzing your timetable...</p>
        </div>
      )}

      {!loading && improvements && (
        <div className="flex-1 overflow-y-auto space-y-3 pt-3">
          {/* Score */}
          <div className="flex items-center gap-4 p-3 bg-elevated rounded-xl">
            <div className="text-3xl font-outfit font-bold text-primary">{improvements.overall_score}</div>
            <div>
              <div className="font-semibold text-text-primary">{improvements.grade}</div>
              <div className="text-xs text-text-secondary">Overall Score</div>
            </div>
          </div>

          {/* Summary */}
          {improvements.summary && (
            <p className="text-xs text-text-secondary leading-relaxed">{improvements.summary}</p>
          )}

          {/* Improvements */}
          <div className="space-y-2">
            {(improvements.improvements || []).slice(0, 5).map((imp, i) => {
              const cfg = PRIORITY_CONFIG[imp.priority] || PRIORITY_CONFIG.LOW;
              return (
                <div key={i} className={`rounded-xl p-3 border ${cfg.bg}`}>
                  <div className="flex items-start gap-2 mb-1">
                    <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold text-${cfg.color} bg-${cfg.color}/10 flex-shrink-0`}>{cfg.label}</span>
                    <p className="text-xs font-medium text-text-primary leading-tight">{imp.title}</p>
                  </div>
                  <p className="text-[10px] text-text-secondary mt-1">{imp.issue}</p>
                  <p className="text-[10px] text-primary mt-1 font-medium">→ {imp.suggestion}</p>
                  {imp.affected?.length > 0 && (
                    <div className="flex gap-1 flex-wrap mt-1">
                      {imp.affected.map((a, j) => (
                        <span key={j} className="text-[9px] bg-elevated px-1.5 py-0.5 rounded text-text-secondary">{a}</span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Quick wins */}
          {improvements.quick_wins?.length > 0 && (
            <div>
              <div className="text-xs font-medium text-text-secondary uppercase tracking-wide mb-2">⚡ Quick Wins</div>
              {improvements.quick_wins.map((win, i) => (
                <div key={i} className="flex items-start gap-2 text-xs text-text-secondary mb-1.5">
                  <CheckCircle className="w-3 h-3 text-success flex-shrink-0 mt-0.5" />
                  <span>{win}</span>
                </div>
              ))}
            </div>
          )}

          {/* Strengths */}
          {improvements.strengths?.length > 0 && (
            <div>
              <div className="text-xs font-medium text-text-secondary uppercase tracking-wide mb-2">✅ Strengths</div>
              {improvements.strengths.map((s, i) => (
                <div key={i} className="flex items-start gap-2 text-xs text-success mb-1">
                  <CheckCircle className="w-3 h-3 flex-shrink-0 mt-0.5" />
                  <span>{s}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
}
