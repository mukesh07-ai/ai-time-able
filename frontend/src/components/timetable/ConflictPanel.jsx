'use client';
import { motion } from 'framer-motion';
import { AlertTriangle, RefreshCw, CheckCircle } from 'lucide-react';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { timetablesApi } from '@/lib/api';

const DISRUPTION_CONFIG = {
  LOW: { color: 'success', label: 'Low Disruption', bg: 'bg-success/10 border-success/30' },
  MEDIUM: { color: 'warning', label: 'Med Disruption', bg: 'bg-warning/10 border-warning/30' },
  HIGH: { color: 'danger', label: 'High Disruption', bg: 'bg-danger/10 border-danger/30' },
};

export default function ConflictPanel({ conflict, timetableId, onRetry }) {
  const [applying, setApplying] = useState(false);
  const [selectedFix, setSelectedFix] = useState(null);

  if (!conflict) return null;

  const fixes = conflict.fixes || [];

  const applyFix = async (fixId) => {
    setApplying(true);
    setSelectedFix(fixId);
    try {
      await timetablesApi.applyFix(timetableId, { fixId });
      toast.success('Fix applied! Regenerating...');
      onRetry?.();
    } catch (e) {
      toast.error('Failed to apply fix');
    } finally {
      setApplying(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Warning header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
        className="card border-danger/30 bg-danger/5">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2.5 rounded-xl bg-danger/15">
            <AlertTriangle className="w-5 h-5 text-danger" />
          </div>
          <div>
            <h3 className="font-outfit font-bold text-text-primary">⚠️ Timetable Generate Nahi Ho Saka</h3>
            <p className="text-xs text-danger font-medium mt-0.5">{conflict.root_cause || 'Scheduling conflict detected'}</p>
          </div>
        </div>
        <p className="text-sm text-text-secondary leading-relaxed">{conflict.explanation || 'The timetable could not be generated due to conflicting constraints.'}</p>

        {/* Affected entities */}
        {conflict.affected_entities?.length > 0 && (
          <div className="flex gap-2 flex-wrap mt-3">
            {conflict.affected_entities.map((e, i) => (
              <span key={i} className="text-xs bg-danger/10 text-danger px-2 py-1 rounded-lg border border-danger/20">{e}</span>
            ))}
          </div>
        )}
      </motion.div>

      {/* Fix cards */}
      {fixes.length > 0 && (
        <div>
          <h4 className="font-outfit font-semibold text-text-primary text-sm mb-3">🔧 Suggested Fixes</h4>
          <div className="space-y-3">
            {fixes.map((fix, i) => {
              const cfg = DISRUPTION_CONFIG[fix.disruption_level] || DISRUPTION_CONFIG.MEDIUM;
              return (
                <motion.div key={fix.id || i} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.1 }}
                  className={`card border ${cfg.bg}`}>
                  <div className="flex items-start gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-semibold text-sm text-text-primary">{fix.title}</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium text-${cfg.color} bg-${cfg.color}/10`}>{cfg.label}</span>
                      </div>
                      <p className="text-xs text-text-secondary mb-1">{fix.description}</p>
                      {fix.trade_off && (
                        <p className="text-xs text-warning/80">⚠️ Trade-off: {fix.trade_off}</p>
                      )}
                    </div>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => applyFix(fix.id || `fix_${i + 1}`)}
                      disabled={applying}
                      className="btn-primary text-xs px-3 py-2 flex items-center gap-1 flex-shrink-0"
                    >
                      {applying && selectedFix === (fix.id || `fix_${i + 1}`) ? (
                        <RefreshCw className="w-3 h-3 animate-spin" />
                      ) : (
                        <CheckCircle className="w-3 h-3" />
                      )}
                      Apply Fix
                    </motion.button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}

      <button onClick={onRetry} className="btn-ghost w-full flex items-center justify-center gap-2">
        <RefreshCw className="w-4 h-4" />
        Retry Generation
      </button>
    </div>
  );
}
