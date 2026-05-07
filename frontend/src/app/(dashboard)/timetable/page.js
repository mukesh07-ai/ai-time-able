'use client';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircle, AlertTriangle, Clock, RefreshCw, Trash2,
  Eye, FileSpreadsheet, FileText, Zap, Plus, ChevronRight,
  Calendar, BookOpen, Layers, XCircle, BarChart3
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { timetablesApi } from '@/lib/api';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import TimetableGrid from '@/components/timetable/TimetableGrid';
import { getSocket } from '@/lib/socket';
import useAuthStore from '@/lib/auth';

const STATUS_CONFIG = {
  feasible: { label: 'Feasible', icon: CheckCircle, color: 'text-success', bg: 'bg-success/10 border-success/25', dot: 'bg-success' },
  published: { label: 'Published', icon: Zap, color: 'text-primary', bg: 'bg-primary/10 border-primary/25', dot: 'bg-primary' },
  generating: { label: 'Generating', icon: RefreshCw, color: 'text-warning', bg: 'bg-warning/10 border-warning/25', dot: 'bg-warning animate-pulse' },
  infeasible: { label: 'Infeasible', icon: AlertTriangle, color: 'text-danger', bg: 'bg-danger/10 border-danger/25', dot: 'bg-danger' },
  draft: { label: 'Draft', icon: Clock, color: 'text-text-secondary', bg: 'bg-white/5 border-white/10', dot: 'bg-white/30' },
};

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.draft;
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border ${cfg.bg} ${cfg.color}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

function TimetableCard({ tt, onView, onRegenerate, onDelete, onExport }) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const date = new Date(tt.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  const solverMs = tt.solver_time_ms ? `${(tt.solver_time_ms / 1000).toFixed(1)}s` : null;
  const entries = tt.generation_log?.entries_count || 0;
  const canView = tt.status === 'feasible' || tt.status === 'published';

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="card hover:border-primary/30 transition-all duration-200 group p-0 overflow-hidden"
    >
      {/* ── Top color accent strip based on status ── */}
      <div className={`h-0.5 w-full ${tt.status === 'feasible' || tt.status === 'published' ? 'bg-gradient-to-r from-success to-emerald-400' :
          tt.status === 'generating' ? 'bg-gradient-to-r from-warning to-amber-400' :
            tt.status === 'infeasible' ? 'bg-gradient-to-r from-danger to-red-400' :
              'bg-white/10'
        }`} />

      <div className="p-4 space-y-3">
        {/* ── Row 1: Status + solver time ── */}
        <div className="flex items-center gap-2">
          <StatusBadge status={tt.status} />
          {solverMs && (
            <span className="text-[10px] text-text-secondary flex items-center gap-1 bg-white/5 px-2 py-0.5 rounded-full border border-white/8">
              <BarChart3 className="w-2.5 h-2.5" /> {solverMs}
            </span>
          )}
        </div>

        {/* ── Row 2: Title ── */}
        <div>
          <h3 className="font-outfit font-bold text-text-primary text-sm leading-snug group-hover:text-primary transition-colors break-words">
            {tt.name}
          </h3>
        </div>

        {/* ── Row 3: Metadata pills ── */}
        <div className="flex flex-wrap gap-1.5">
          {tt.academic_year && (
            <span className="flex items-center gap-1 text-[10px] text-text-secondary bg-white/5 px-2 py-0.5 rounded-full border border-white/8">
              <Calendar className="w-2.5 h-2.5" />{tt.academic_year}
            </span>
          )}
          {tt.semester && (
            <span className="flex items-center gap-1 text-[10px] text-text-secondary bg-white/5 px-2 py-0.5 rounded-full border border-white/8">
              <Layers className="w-2.5 h-2.5" />{tt.semester}
            </span>
          )}
          {entries > 0 && (
            <span className="flex items-center gap-1 text-[10px] text-text-secondary bg-white/5 px-2 py-0.5 rounded-full border border-white/8">
              <BookOpen className="w-2.5 h-2.5" />{entries} sessions
            </span>
          )}
          <span className="flex items-center gap-1 text-[10px] text-text-secondary bg-white/5 px-2 py-0.5 rounded-full border border-white/8">
            <Clock className="w-2.5 h-2.5" />{date}
          </span>
        </div>

        {/* ── Conflict hint ── */}
        {tt.status === 'infeasible' && tt.conflictLog && (
          <div className="flex items-start gap-2 bg-danger/5 border border-danger/15 rounded-xl px-3 py-2">
            <AlertTriangle className="w-3.5 h-3.5 text-danger flex-shrink-0 mt-0.5" />
            <p className="text-[10px] text-danger/80 leading-relaxed line-clamp-2">
              {tt.conflictLog.llm_explanation || 'Infeasible. Try regenerating with different constraints.'}
            </p>
          </div>
        )}

        {/* ── Row 4: Action toolbar ── */}
        <div className="flex items-center gap-2 pt-1 border-t border-border/40">
          {/* View — primary CTA */}
          {canView && (
            <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
              onClick={() => onView(tt.id)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary/15 text-primary border border-primary/25 text-xs font-bold hover:bg-primary/25 transition-all">
              <Eye className="w-3.5 h-3.5" /> View Grid
            </motion.button>
          )}

          <div className="flex items-center gap-1 ml-auto">
            {/* Export Excel */}
            {canView && (
              <button onClick={() => onExport(tt.id, 'excel')} title="Export Excel"
                className="p-2 rounded-lg text-text-secondary hover:text-success hover:bg-success/10 transition-all">
                <FileSpreadsheet className="w-3.5 h-3.5" />
              </button>
            )}
            {/* Export PDF */}
            {canView && (
              <button onClick={() => onExport(tt.id, 'pdf')} title="Export PDF"
                className="p-2 rounded-lg text-text-secondary hover:text-warning hover:bg-warning/10 transition-all">
                <FileText className="w-3.5 h-3.5" />
              </button>
            )}
            {/* Regenerate */}
            <button onClick={() => onRegenerate(tt.id)} title="Regenerate"
              className="p-2 rounded-lg text-text-secondary hover:text-primary hover:bg-primary/10 transition-all">
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
            {/* Delete */}
            {!confirmDelete ? (
              <button onClick={() => setConfirmDelete(true)} title="Delete"
                className="p-2 rounded-lg text-text-secondary hover:text-danger hover:bg-danger/10 transition-all">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            ) : (
              <div className="flex items-center gap-1 bg-danger/10 border border-danger/30 rounded-xl px-2 py-1">
                <span className="text-[10px] text-danger font-bold">Delete?</span>
                <button onClick={() => onDelete(tt.id)}
                  className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-danger text-white hover:bg-danger/80 transition-all">
                  Yes
                </button>
                <button onClick={() => setConfirmDelete(false)}
                  className="text-[10px] text-text-secondary hover:text-text-primary px-1 transition-all">
                  No
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export default function ViewTimetablePage() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const router = useRouter();
  const [selectedId, setSelectedId] = useState(null);
  const [gridData, setGridData] = useState(null);
  const [loadingGrid, setLoadingGrid] = useState(false);
  const [regeneratingId, setRegeneratingId] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['timetables'],
    queryFn: () => timetablesApi.getAll(),
    refetchInterval: 5000, // poll every 5s while generating
  });

  const timetables = data?.timetables || [];

  const deleteMutation = useMutation({
    mutationFn: (id) => timetablesApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['timetables'] });
      if (selectedId) { setSelectedId(null); setGridData(null); }
      toast.success('Timetable deleted.');
    },
    onError: () => toast.error('Delete failed.'),
  });

  const handleView = async (id) => {
    setSelectedId(id);
    setGridData(null);
    setLoadingGrid(true);
    try {
      const data = await timetablesApi.getGrid(id);
      setGridData(data);
    } catch (e) {
      toast.error('Failed to load timetable grid.');
    } finally {
      setLoadingGrid(false);
    }
  };

  const handleRegenerate = async (id) => {
    setRegeneratingId(id);
    try {
      await timetablesApi.regenerate(id);
      toast.success('Regeneration started. Progress will update automatically.');
      // Connect socket for live progress
      const socket = getSocket();
      socket.connect();
      socket.emit('join_timetable', id);
      socket.on('timetable_ready', () => {
        queryClient.invalidateQueries({ queryKey: ['timetables'] });
        handleView(id);
        setRegeneratingId(null);
        socket.disconnect();
      });
      socket.on('conflict_found', () => {
        queryClient.invalidateQueries({ queryKey: ['timetables'] });
        setRegeneratingId(null);
        socket.disconnect();
      });
      socket.on('error', () => { setRegeneratingId(null); socket.disconnect(); });
      queryClient.invalidateQueries({ queryKey: ['timetables'] });
    } catch (e) {
      toast.error('Regeneration failed.');
      setRegeneratingId(null);
    }
  };

  const handleExport = async (id, format) => {
    const token = localStorage.getItem('ps4_token');
    const url = `${process.env.NEXT_PUBLIC_API_URL}/timetables/${id}/export?format=${format}`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    const blob = await res.blob();
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    const tt = timetables.find(t => t.id === id);
    a.download = `${tt?.name || 'timetable'}.${format === 'pdf' ? 'pdf' : 'xlsx'}`;
    a.click();
    toast.success(`Exporting as ${format.toUpperCase()}`);
  };

  const counts = {
    total: timetables.length,
    feasible: timetables.filter(t => t.status === 'feasible' || t.status === 'published').length,
    generating: timetables.filter(t => t.status === 'generating').length,
    infeasible: timetables.filter(t => t.status === 'infeasible').length,
  };

  return (
    <div className="flex h-[calc(100vh-7rem)] gap-4 overflow-hidden">
      {/* LEFT: Timetable List */}
      <div className="w-[380px] flex-shrink-0 flex flex-col gap-3 overflow-hidden">
        {/* Header */}
        <div className="card flex-shrink-0">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-outfit font-bold text-text-primary">📋 All Timetables</h2>
            <motion.button whileHover={{ scale: 1.05 }} onClick={() => router.push('/generate')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary/15 text-primary border border-primary/25 text-xs font-bold hover:bg-primary/25 transition-all">
              <Plus className="w-3.5 h-3.5" /> New
            </motion.button>
          </div>
          {/* Stats row */}
          <div className="grid grid-cols-4 gap-2">
            {[
              { label: 'Total', value: counts.total, color: 'text-text-primary' },
              { label: 'Ready', value: counts.feasible, color: 'text-success' },
              { label: 'Active', value: counts.generating, color: 'text-warning' },
              { label: 'Failed', value: counts.infeasible, color: 'text-danger' },
            ].map(s => (
              <div key={s.label} className="text-center p-2 rounded-xl bg-elevated/50">
                <div className={`text-base font-bold ${s.color}`}>{s.value}</div>
                <div className="text-[9px] text-text-secondary uppercase tracking-widest">{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto space-y-2 custom-scrollbar pr-0.5">
          {isLoading && (
            <div className="flex items-center justify-center h-40">
              <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            </div>
          )}
          {!isLoading && timetables.length === 0 && (
            <div className="card flex flex-col items-center justify-center py-12 text-center">
              <div className="text-4xl mb-3">📭</div>
              <p className="text-text-primary font-bold text-sm mb-1">No timetables yet</p>
              <p className="text-text-secondary text-xs mb-4">Generate your first one from the Generate page.</p>
              <button onClick={() => router.push('/generate')}
                className="btn-primary px-4 py-2 text-xs">
                Generate Now
              </button>
            </div>
          )}
          <AnimatePresence mode="popLayout">
            {timetables.map((tt) => (
              <div key={tt.id} onClick={() => (tt.status === 'feasible' || tt.status === 'published') && handleView(tt.id)}
                className={selectedId === tt.id ? 'ring-2 ring-primary/50 rounded-xl' : ''}>
                <TimetableCard
                  tt={tt}
                  onView={handleView}
                  onRegenerate={() => handleRegenerate(tt.id)}
                  onDelete={(id) => deleteMutation.mutate(id)}
                  onExport={handleExport}
                />
                {regeneratingId === tt.id && (
                  <div className="flex items-center gap-2 px-4 py-2 bg-warning/5 border border-warning/20 rounded-xl mt-1">
                    <RefreshCw className="w-3.5 h-3.5 text-warning animate-spin" />
                    <span className="text-xs text-warning font-medium">Regenerating...</span>
                  </div>
                )}
              </div>
            ))}
          </AnimatePresence>
        </div>
      </div>

      {/* RIGHT: Grid View */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {!selectedId && (
          <div className="flex-1 card flex flex-col items-center justify-center text-center">
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-primary/10 to-purple/5 flex items-center justify-center mb-5 border border-white/5">
              <Eye className="w-10 h-10 text-primary/50" />
            </div>
            <h3 className="font-outfit font-bold text-text-primary text-lg mb-2">Select a Timetable</h3>
            <p className="text-text-secondary text-sm max-w-xs">
              Click <strong className="text-primary">View</strong> on any feasible timetable to see the full schedule grid here.
            </p>
          </div>
        )}

        {selectedId && loadingGrid && (
          <div className="flex-1 card flex items-center justify-center">
            <div className="w-10 h-10 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          </div>
        )}

        {selectedId && !loadingGrid && gridData && (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Grid toolbar */}
            <div className="card py-3 px-4 flex items-center justify-between flex-shrink-0 mb-2">
              <div className="flex items-center gap-3">
                <div className="p-1.5 rounded-lg bg-success/10 border border-success/20">
                  <CheckCircle className="w-4 h-4 text-success" />
                </div>
                <div>
                  <p className="font-outfit font-bold text-text-primary text-sm">{gridData.timetable?.name}</p>
                  <p className="text-[10px] text-text-secondary">
                    {gridData.entriesCount} sessions · {gridData.timetable?.academic_year}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => handleRegenerate(selectedId)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-warning/10 text-warning border border-warning/20 text-xs font-bold hover:bg-warning/20 transition-all">
                  <RefreshCw className="w-3.5 h-3.5" /> Regenerate
                </button>
                <button onClick={() => handleExport(selectedId, 'excel')}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-success/10 text-success border border-success/20 text-xs font-bold hover:bg-success/20 transition-all">
                  <FileSpreadsheet className="w-3.5 h-3.5" /> Excel
                </button>
                <button onClick={() => handleExport(selectedId, 'pdf')}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary/10 text-primary border border-primary/20 text-xs font-bold hover:bg-primary/20 transition-all">
                  <FileText className="w-3.5 h-3.5" /> PDF
                </button>
                <button onClick={() => { setSelectedId(null); setGridData(null); }}
                  className="p-2 rounded-xl text-text-secondary hover:text-danger transition-colors">
                  <XCircle className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Grid */}
            <div className="flex-1 overflow-auto custom-scrollbar card p-0">
              <TimetableGrid gridData={gridData} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
