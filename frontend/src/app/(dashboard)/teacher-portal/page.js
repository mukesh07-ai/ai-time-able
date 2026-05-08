'use client';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { leaveApi } from '@/lib/api';
import useAuthStore from '@/lib/auth';
import toast from 'react-hot-toast';
import {
  Calendar, Clock, CheckCircle, XCircle, BookOpen,
  Plus, Send, AlertTriangle, Users, Layers
} from 'lucide-react';

const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const STATUS_CFG = {
  pending: { label: 'Pending', color: 'text-warning', bg: 'bg-warning/10 border-warning/25', icon: Clock },
  approved: { label: 'Approved', color: 'text-success', bg: 'bg-success/10 border-success/25', icon: CheckCircle },
  rejected: { label: 'Rejected', color: 'text-danger', bg: 'bg-danger/10 border-danger/25', icon: XCircle },
};

function StatusBadge({ status }) {
  const cfg = STATUS_CFG[status] || STATUS_CFG.pending;
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border ${cfg.bg} ${cfg.color}`}>
      <Icon className="w-3 h-3" />{cfg.label}
    </span>
  );
}

export default function TeacherPortalPage() {
  const { user } = useAuthStore();
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState('timetable');
  const [showLeaveForm, setShowLeaveForm] = useState(false);
  const [leaveForm, setLeaveForm] = useState({ 
    from_date: '', 
    to_date: '', 
    reason: '', 
    leave_type: 'casual',
    request_type: 'full_day',
    slots: [] 
  });

  const { data: timetableData, isLoading: ttLoading } = useQuery({
    queryKey: ['my-timetable'],
    queryFn: () => leaveApi.getMyTimetable(),
  });

  const { data: leaveData, isLoading: leaveLoading } = useQuery({
    queryKey: ['my-leaves'],
    queryFn: () => leaveApi.getMyLeaves(),
  });

  const submitMutation = useMutation({
    mutationFn: (data) => leaveApi.submit(data),
    onSuccess: () => {
      toast.success('Leave request submitted successfully!');
      qc.invalidateQueries({ queryKey: ['my-leaves'] });
      setShowLeaveForm(false);
      setLeaveForm({ 
        from_date: '', 
        to_date: '', 
        reason: '', 
        leave_type: 'casual',
        request_type: 'full_day',
        slots: []
      });
    },
    onError: (e) => toast.error(e.response?.data?.error || 'Submission failed'),
  });

  const entries = timetableData?.entries || [];
  const timetable = timetableData?.timetable;
  const leaves = leaveData?.leaves || [];

  // Group entries by day
  const byDay = {};
  entries.forEach(e => {
    if (!byDay[e.day_of_week]) byDay[e.day_of_week] = [];
    byDay[e.day_of_week].push(e);
  });

  const totalPeriods = entries.length;
  const pendingLeaves = leaves.filter(l => l.status === 'pending').length;
  const approvedLeaves = leaves.filter(l => l.status === 'approved').length;

  return (
    <div className="space-y-4">
      {/* Welcome header */}
      <div className="card bg-gradient-to-r from-primary/10 via-purple/5 to-transparent border-primary/20">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary/30 to-purple/30 border border-primary/30 flex items-center justify-center text-xl font-bold text-primary">
            {user?.name?.charAt(0) || 'T'}
          </div>
          <div className="flex-1">
            <h2 className="font-outfit font-bold text-text-primary text-lg">Welcome, {user?.name} 👋</h2>
            <p className="text-text-secondary text-xs">Teacher Portal — View your schedule and manage leaves</p>
          </div>
          <div className="flex items-center gap-4 text-center">
            <div>
              <div className="text-xl font-bold text-primary">{totalPeriods}</div>
              <div className="text-[9px] text-text-secondary uppercase tracking-widest">Periods/week</div>
            </div>
            <div>
              <div className="text-xl font-bold text-warning">{pendingLeaves}</div>
              <div className="text-[9px] text-text-secondary uppercase tracking-widest">Pending</div>
            </div>
            <div>
              <div className="text-xl font-bold text-success">{approvedLeaves}</div>
              <div className="text-[9px] text-text-secondary uppercase tracking-widest">Approved</div>
            </div>
          </div>
        </div>
      </div>

      {/* Tab switcher */}
      <div className="flex bg-surface rounded-xl p-1 border border-border w-fit">
        {[
          { id: 'timetable', label: '📅 My Timetable' },
          { id: 'leaves', label: '🏖️ My Leaves' },
        ].map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            className={`px-5 py-2 rounded-lg text-xs font-medium transition-all ${activeTab === t.id ? 'bg-primary/20 text-primary' : 'text-text-secondary hover:text-text-primary'}`}>
            {t.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {/* ── TIMETABLE TAB ── */}
        {activeTab === 'timetable' && (
          <motion.div key="tt" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            {ttLoading && <div className="card flex justify-center py-12"><div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" /></div>}

            {!ttLoading && !timetable && (
              <div className="card flex flex-col items-center py-12 text-center">
                <div className="text-4xl mb-3">📭</div>
                <p className="font-bold text-text-primary">No timetable available</p>
                <p className="text-text-secondary text-xs mt-1">Your schedule hasn't been generated yet. Contact admin.</p>
              </div>
            )}

            {!ttLoading && timetable && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-xs text-text-secondary">
                  <BookOpen className="w-4 h-4" />
                  <span>Active timetable: <strong className="text-text-primary">{timetable.name}</strong></span>
                </div>

                {DAY_NAMES.map((dayName, dayIdx) => {
                  const dayEntries = (byDay[dayIdx] || []).sort((a, b) => a.slot_number - b.slot_number);
                  if (dayEntries.length === 0) return null;
                  return (
                    <div key={dayIdx} className="card">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-1 h-5 bg-gradient-to-b from-primary to-purple rounded-full" />
                        <h3 className="font-outfit font-bold text-text-primary text-sm">{dayName}</h3>
                        <span className="text-[10px] text-text-secondary bg-white/5 px-2 py-0.5 rounded-full border border-white/8">
                          {dayEntries.length} {dayEntries.length === 1 ? 'period' : 'periods'}
                        </span>
                      </div>
                      <div className="space-y-2">
                        {dayEntries.map((entry, i) => (
                          <motion.div key={entry.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.05 }}
                            className="flex items-center gap-3 p-2.5 rounded-xl bg-primary/5 border border-primary/10 hover:border-primary/20 transition-all">
                            <div className="w-8 h-8 rounded-lg bg-primary/15 border border-primary/25 flex items-center justify-center flex-shrink-0">
                              <span className="text-xs font-bold text-primary">{entry.slot_number + 1}</span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-bold text-text-primary text-xs truncate">{entry.subject?.name || 'Unknown Subject'}</p>
                              <p className="text-[10px] text-text-secondary">{entry.subject?.type || 'theory'} · {entry.student_group || ''}</p>
                            </div>
                            <div className="text-right flex-shrink-0">
                              <p className="text-[11px] font-bold text-text-secondary">{entry.room?.name || 'No Room'}</p>
                              <p className="text-[10px] text-text-secondary opacity-60">{entry.room?.room_type || ''}</p>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  );
                })}

                {Object.keys(byDay).length === 0 && (
                  <div className="card text-center py-8 text-text-secondary text-sm">
                    No periods assigned in the current timetable.
                  </div>
                )}
              </div>
            )}
          </motion.div>
        )}

        {/* ── LEAVES TAB ── */}
        {activeTab === 'leaves' && (
          <motion.div key="leaves" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
            {/* Apply leave button */}
            <div className="flex justify-end">
              <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                onClick={() => setShowLeaveForm(v => !v)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary/15 text-primary border border-primary/25 text-xs font-bold hover:bg-primary/25 transition-all">
                <Plus className="w-3.5 h-3.5" />
                {showLeaveForm ? 'Cancel' : 'Apply for Leave'}
              </motion.button>
            </div>

            {/* Leave Form */}
            <AnimatePresence>
              {showLeaveForm && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden">
                  <div className="card border-primary/20 bg-primary/5 space-y-4">
                    <h3 className="font-outfit font-bold text-text-primary text-sm flex items-center gap-2">
                      <Send className="w-4 h-4 text-primary" /> New Leave Request
                    </h3>

                    {/* Leave Level Selector */}
                    <div>
                      <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest mb-2 block">Leave Level</label>
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          { id: 'full_day', label: 'Full Day', icon: Calendar },
                          { id: 'partial_day', label: 'Partial Day', icon: Clock },
                          { id: 'multi_day', label: 'Multi-Day', icon: Layers },
                        ].map(type => (
                          <button key={type.id} onClick={() => {
                            setLeaveForm(p => ({ 
                              ...p, 
                              request_type: type.id,
                              to_date: type.id !== 'multi_day' ? p.from_date : p.to_date,
                              slots: type.id === 'partial_day' ? p.slots : []
                            }));
                          }}
                            className={`flex flex-col items-center gap-1.5 p-2.5 rounded-xl border transition-all ${leaveForm.request_type === type.id ? 'bg-primary/20 border-primary/30 text-primary' : 'bg-surface/50 border-border text-text-secondary hover:border-white/20'}`}>
                            <type.icon className="w-4 h-4" />
                            <span className="text-[10px] font-bold">{type.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest mb-1.5 block">
                          {leaveForm.request_type === 'multi_day' ? 'Start Date *' : 'Date *'}
                        </label>
                        <input type="date" value={leaveForm.from_date}
                          onChange={e => {
                            const d = e.target.value;
                            setLeaveForm(p => ({ 
                              ...p, 
                              from_date: d, 
                              to_date: p.request_type !== 'multi_day' ? d : p.to_date 
                            }));
                          }}
                          className="input-field py-2.5 w-full" />
                      </div>
                      {leaveForm.request_type === 'multi_day' && (
                        <div>
                          <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest mb-1.5 block">End Date *</label>
                          <input type="date" value={leaveForm.to_date}
                            onChange={e => setLeaveForm(p => ({ ...p, to_date: e.target.value }))}
                            className="input-field py-2.5 w-full" />
                        </div>
                      )}
                      {leaveForm.request_type === 'partial_day' && (
                        <div className="col-span-2">
                          <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest mb-2 block">Select Period(s) *</label>
                          <div className="grid grid-cols-4 gap-2">
                            {Array.from({ length: 8 }, (_, i) => (
                              <button key={i} onClick={() => {
                                const newSlots = leaveForm.slots.includes(i)
                                  ? leaveForm.slots.filter(s => s !== i)
                                  : [...leaveForm.slots, i].sort((a,b) => a-b);
                                setLeaveForm(p => ({ ...p, slots: newSlots }));
                              }}
                                className={`py-1.5 rounded-lg border text-[10px] font-bold transition-all ${leaveForm.slots.includes(i) ? 'bg-primary text-white border-primary' : 'bg-surface border-border text-text-secondary hover:border-primary/50'}`}>
                                Period {i + 1}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="col-span-2">
                        <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest mb-1.5 block">Leave Type</label>
                        <select value={leaveForm.leave_type} onChange={e => setLeaveForm(p => ({ ...p, leave_type: e.target.value }))}
                          className="input-field py-2.5 w-full">
                          {['casual', 'medical', 'personal', 'other'].map(t => (
                            <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest mb-1.5 block">Reason *</label>
                      <textarea value={leaveForm.reason} onChange={e => setLeaveForm(p => ({ ...p, reason: e.target.value }))}
                        className="input-field resize-none h-20 w-full text-sm"
                        placeholder="Please describe the reason for your leave..." />
                    </div>
                    <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                      disabled={
                        !leaveForm.from_date || 
                        !leaveForm.to_date || 
                        !leaveForm.reason || 
                        (leaveForm.request_type === 'partial_day' && leaveForm.slots.length === 0) ||
                        submitMutation.isPending
                      }
                      onClick={() => submitMutation.mutate(leaveForm)}
                      className="btn-primary w-full flex items-center justify-center gap-2 py-3 disabled:opacity-40 disabled:cursor-not-allowed">
                      <Send className="w-4 h-4" />
                      {submitMutation.isPending ? 'Submitting...' : 'Submit Leave Request'}
                    </motion.button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Leave History */}
            {leaveLoading && <div className="card flex justify-center py-10"><div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" /></div>}

            {!leaveLoading && leaves.length === 0 && (
              <div className="card flex flex-col items-center py-12 text-center">
                <div className="text-4xl mb-3">✅</div>
                <p className="font-bold text-text-primary">No leave requests</p>
                <p className="text-text-secondary text-xs mt-1">You haven't applied for any leaves yet.</p>
              </div>
            )}

            {!leaveLoading && leaves.map((leave) => (
              <motion.div key={leave.id} layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                className="card hover:border-white/15 transition-all">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <StatusBadge status={leave.status} />
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                        {leave.request_type?.replace('_', ' ')}
                      </span>
                      <span className="text-[10px] text-text-secondary">
                        {new Date(leave.from_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                        {leave.request_type === 'multi_day' && ` → ${new Date(leave.to_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`}
                        {leave.request_type === 'partial_day' && leave.slots && (
                          <span className="ml-2 text-primary font-bold">
                            (Periods: {leave.slots.map(s => s + 1).join(', ')})
                          </span>
                        )}
                      </span>
                    </div>
                    <p className="text-xs text-text-secondary leading-relaxed">
                      <span className="font-bold text-text-primary">Reason:</span> {leave.reason}
                    </p>
                    {leave.admin_note && (
                      <div className={`flex items-start gap-2 text-xs px-3 py-2 rounded-xl border ${leave.status === 'approved' ? 'bg-success/5 border-success/15 text-success/80' : 'bg-danger/5 border-danger/15 text-danger/80'}`}>
                        {leave.status === 'approved' ? <CheckCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" /> : <XCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />}
                        <p><span className="font-bold">Admin note:</span> {leave.admin_note}</p>
                      </div>
                    )}
                  </div>
                  <div className="text-right text-[10px] text-text-secondary flex-shrink-0">
                    <p>{new Date(leave.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                    <p className="opacity-60">Applied</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
