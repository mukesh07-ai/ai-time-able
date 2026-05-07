'use client';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { leaveApi } from '@/lib/api';
import toast from 'react-hot-toast';
import {
  CheckCircle, XCircle, Clock, Users, Calendar, FileText,
  ChevronDown, Filter, Trash2, BarChart3, AlertTriangle, Eye
} from 'lucide-react';

const STATUS_CFG = {
  pending: { label: 'Pending', icon: Clock, color: 'text-warning', bg: 'bg-warning/10 border-warning/25' },
  approved: { label: 'Approved', icon: CheckCircle, color: 'text-success', bg: 'bg-success/10 border-success/25' },
  rejected: { label: 'Rejected', icon: XCircle, color: 'text-danger', bg: 'bg-danger/10 border-danger/25' },
};
const TYPE_COLORS = { casual: 'bg-primary/10 text-primary', medical: 'bg-red-500/10 text-red-400', personal: 'bg-purple/10 text-purple', other: 'bg-white/10 text-text-secondary' };

function StatusBadge({ status }) {
  const cfg = STATUS_CFG[status] || STATUS_CFG.pending;
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border ${cfg.bg} ${cfg.color}`}>
      <Icon className="w-3 h-3" />{cfg.label}
    </span>
  );
}

function daysBetween(from, to) {
  const d = Math.ceil((new Date(to) - new Date(from)) / 86400000) + 1;
  return d === 1 ? '1 day' : `${d} days`;
}

export default function AdminLeavePage() {
  const qc = useQueryClient();
  const [filterStatus, setFilterStatus] = useState('');
  const [reviewModal, setReviewModal] = useState(null); // { leave, action }
  const [adminNote, setAdminNote] = useState('');
  const [activeTab, setActiveTab] = useState('requests'); // 'requests' | 'summary'

  const { data: leavesData, isLoading } = useQuery({
    queryKey: ['admin-leaves', filterStatus],
    queryFn: () => leaveApi.getAll(filterStatus ? { status: filterStatus } : {}),
    refetchInterval: 10000,
  });

  const { data: summaryData, isLoading: summaryLoading } = useQuery({
    queryKey: ['leave-summary'],
    queryFn: () => leaveApi.getSummary(),
    refetchInterval: 30000,
  });

  const reviewMutation = useMutation({
    mutationFn: ({ id, status, admin_note }) => leaveApi.review(id, { status, admin_note }),
    onSuccess: (_, vars) => {
      toast.success(`Leave ${vars.status} successfully.`);
      qc.invalidateQueries({ queryKey: ['admin-leaves'] });
      qc.invalidateQueries({ queryKey: ['leave-summary'] });
      setReviewModal(null);
      setAdminNote('');
    },
    onError: () => toast.error('Action failed. Please try again.'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => leaveApi.delete(id),
    onSuccess: () => {
      toast.success('Leave request deleted.');
      qc.invalidateQueries({ queryKey: ['admin-leaves'] });
      qc.invalidateQueries({ queryKey: ['leave-summary'] });
    },
  });

  const leaves = leavesData?.leaves || [];
  const summary = summaryData?.summary || [];
  const pending = leaves.filter(l => l.status === 'pending').length;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="card">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-outfit font-bold text-text-primary text-lg flex items-center gap-2">
              🏖️ Leave Management
              {pending > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-warning/20 text-warning text-xs font-bold border border-warning/30 animate-pulse">
                  {pending} pending
                </span>
              )}
            </h2>
            <p className="text-text-secondary text-xs mt-0.5">Review teacher leave requests and monitor leave activity</p>
          </div>
          {/* Tab switcher */}
          <div className="flex bg-surface rounded-xl p-1 border border-border">
            {[{ id: 'requests', label: '📋 Requests' }, { id: 'summary', label: '📊 Summary' }].map(t => (
              <button key={t.id} onClick={() => setActiveTab(t.id)}
                className={`px-4 py-2 rounded-lg text-xs font-medium transition-all ${activeTab === t.id ? 'bg-primary/20 text-primary' : 'text-text-secondary hover:text-text-primary'}`}>
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {/* ── REQUESTS TAB ── */}
        {activeTab === 'requests' && (
          <motion.div key="requests" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            {/* Filter bar */}
            <div className="flex items-center gap-2 mb-3">
              <Filter className="w-4 h-4 text-text-secondary" />
              {['', 'pending', 'approved', 'rejected'].map(s => (
                <button key={s} onClick={() => setFilterStatus(s)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${filterStatus === s ? 'bg-primary/20 text-primary border-primary/30' : 'bg-elevated border-border text-text-secondary hover:text-text-primary'}`}>
                  {s === '' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
                </button>
              ))}
              <span className="ml-auto text-xs text-text-secondary font-medium">{leaves.length} requests</span>
            </div>

            {isLoading && <div className="card flex justify-center py-12"><div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" /></div>}

            {!isLoading && leaves.length === 0 && (
              <div className="card flex flex-col items-center py-12 text-center">
                <div className="text-4xl mb-3">🎉</div>
                <p className="font-bold text-text-primary">No leave requests found</p>
                <p className="text-text-secondary text-xs mt-1">All teachers are present!</p>
              </div>
            )}

            <div className="space-y-2">
              {leaves.map((leave) => (
                <motion.div key={leave.id} layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                  className="card hover:border-white/15 transition-all">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                        <StatusBadge status={leave.status} />
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${TYPE_COLORS[leave.leave_type] || TYPE_COLORS.other}`}>
                          {leave.leave_type}
                        </span>
                        <span className="text-[10px] text-text-secondary bg-white/5 px-2 py-0.5 rounded-full">
                          {daysBetween(leave.from_date, leave.to_date)}
                        </span>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/20 to-purple/20 border border-primary/20 flex items-center justify-center flex-shrink-0">
                          <span className="text-xs font-bold text-primary">
                            {leave.teacher?.name?.charAt(0) || '?'}
                          </span>
                        </div>
                        <div>
                          <p className="font-bold text-text-primary text-sm">{leave.teacher?.name}</p>
                          <p className="text-[10px] text-text-secondary">{leave.teacher?.department?.name || 'No Dept'}</p>
                        </div>
                      </div>

                      <div className="mt-2 flex items-center gap-4 text-[11px] text-text-secondary">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(leave.from_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                          {' → '}
                          {new Date(leave.to_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                      </div>

                      <p className="mt-2 text-xs text-text-secondary bg-white/3 border border-white/5 rounded-lg px-3 py-2 leading-relaxed">
                        <span className="font-bold text-text-primary">Reason:</span> {leave.reason}
                      </p>

                      {leave.admin_note && (
                        <p className="mt-1 text-[11px] text-warning/80 bg-warning/5 border border-warning/10 rounded-lg px-3 py-1.5">
                          <span className="font-bold">Admin note:</span> {leave.admin_note}
                        </p>
                      )}
                    </div>

                    {/* Action buttons */}
                    <div className="flex flex-col gap-1.5 flex-shrink-0">
                      {leave.status === 'pending' && (
                        <>
                          <motion.button whileHover={{ scale: 1.05 }}
                            onClick={() => { setReviewModal({ leave, action: 'approved' }); setAdminNote(''); }}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-success/15 text-success border border-success/25 text-xs font-bold hover:bg-success/25 transition-all">
                            <CheckCircle className="w-3.5 h-3.5" /> Approve
                          </motion.button>
                          <motion.button whileHover={{ scale: 1.05 }}
                            onClick={() => { setReviewModal({ leave, action: 'rejected' }); setAdminNote(''); }}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-danger/15 text-danger border border-danger/25 text-xs font-bold hover:bg-danger/25 transition-all">
                            <XCircle className="w-3.5 h-3.5" /> Reject
                          </motion.button>
                        </>
                      )}
                      <button onClick={() => deleteMutation.mutate(leave.id)}
                        className="p-1.5 rounded-lg text-text-secondary hover:text-danger hover:bg-danger/10 transition-all self-end">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {/* ── SUMMARY TAB ── */}
        {activeTab === 'summary' && (
          <motion.div key="summary" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            {summaryLoading && <div className="card flex justify-center py-12"><div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" /></div>}

            {!summaryLoading && (
              <div className="space-y-2">
                {summary.length === 0 && (
                  <div className="card text-center py-10 text-text-secondary text-sm">No teachers registered yet.</div>
                )}
                {summary.map((t) => (
                  <motion.div key={t.teacher_id} layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                    className="card hover:border-white/15 transition-all">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/20 to-purple/20 border border-primary/20 flex items-center justify-center flex-shrink-0">
                        <span className="font-bold text-primary">{t.teacher_name?.charAt(0)}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-text-primary text-sm">{t.teacher_name}</p>
                          {t.has_active_leave && (
                            <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-warning/15 text-warning border border-warning/25 uppercase tracking-widest animate-pulse">
                              On Leave
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-text-secondary">{t.department}</p>
                      </div>

                      <div className="flex items-center gap-6 text-center">
                        <div>
                          <div className="text-base font-bold text-text-primary">{t.days_taken}</div>
                          <div className="text-[9px] text-text-secondary uppercase tracking-widest">Days Taken</div>
                        </div>
                        <div>
                          <div className="text-base font-bold text-warning">{t.pending_count}</div>
                          <div className="text-[9px] text-text-secondary uppercase tracking-widest">Pending</div>
                        </div>
                        <div>
                          <div className="text-base font-bold text-success">{t.approved_count}</div>
                          <div className="text-[9px] text-text-secondary uppercase tracking-widest">Approved</div>
                        </div>
                        <div>
                          <div className="text-base font-bold text-danger">{t.rejected_count}</div>
                          <div className="text-[9px] text-text-secondary uppercase tracking-widest">Rejected</div>
                        </div>
                        <div>
                          <div className="text-base font-bold text-text-primary">{t.total_requests}</div>
                          <div className="text-[9px] text-text-secondary uppercase tracking-widest">Total</div>
                        </div>
                      </div>
                    </div>

                    {/* Mini leave bar */}
                    {t.total_requests > 0 && (
                      <div className="mt-3 h-1.5 bg-white/5 rounded-full overflow-hidden flex">
                        <div className="bg-success h-full" style={{ width: `${(t.approved_count / t.total_requests) * 100}%` }} />
                        <div className="bg-warning h-full" style={{ width: `${(t.pending_count / t.total_requests) * 100}%` }} />
                        <div className="bg-danger h-full" style={{ width: `${(t.rejected_count / t.total_requests) * 100}%` }} />
                      </div>
                    )}
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Review Modal ── */}
      <AnimatePresence>
        {reviewModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="card max-w-md w-full space-y-4">
              <div className="flex items-center gap-3">
                {reviewModal.action === 'approved'
                  ? <CheckCircle className="w-6 h-6 text-success" />
                  : <XCircle className="w-6 h-6 text-danger" />}
                <h3 className="font-outfit font-bold text-text-primary text-base">
                  {reviewModal.action === 'approved' ? 'Approve' : 'Reject'} Leave Request
                </h3>
              </div>

              <div className="bg-elevated/60 rounded-xl p-3 text-xs space-y-1">
                <p><span className="text-text-secondary">Teacher:</span> <span className="font-bold text-text-primary">{reviewModal.leave.teacher?.name}</span></p>
                <p><span className="text-text-secondary">Period:</span> <span className="font-bold text-text-primary">
                  {new Date(reviewModal.leave.from_date).toLocaleDateString()} → {new Date(reviewModal.leave.to_date).toLocaleDateString()}
                </span></p>
                <p><span className="text-text-secondary">Reason:</span> <span className="text-text-primary">{reviewModal.leave.reason}</span></p>
              </div>

              <div>
                <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest mb-1.5 block">
                  Admin Note <span className="font-normal opacity-50 normal-case">(optional)</span>
                </label>
                <textarea value={adminNote} onChange={e => setAdminNote(e.target.value)}
                  className="input-field resize-none h-20 text-sm w-full"
                  placeholder={reviewModal.action === 'approved' ? 'e.g. Approved. Ensure handover before leaving.' : 'e.g. Insufficient notice period.'} />
              </div>

              <div className="flex gap-2">
                <button onClick={() => setReviewModal(null)}
                  className="flex-1 py-2.5 rounded-xl bg-elevated border border-border text-text-secondary text-sm font-bold hover:text-text-primary transition-all">
                  Cancel
                </button>
                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                  disabled={reviewMutation.isPending}
                  onClick={() => reviewMutation.mutate({ id: reviewModal.leave.id, status: reviewModal.action, admin_note: adminNote })}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${reviewModal.action === 'approved' ? 'bg-success/20 text-success border border-success/30 hover:bg-success/30' : 'bg-danger/20 text-danger border border-danger/30 hover:bg-danger/30'}`}>
                  {reviewMutation.isPending ? 'Processing...' : (reviewModal.action === 'approved' ? '✓ Confirm Approve' : '✗ Confirm Reject')}
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
