'use client';
import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Mic, MicOff, Zap, CheckCircle, Loader2, FileSpreadsheet, FileText, Lightbulb, Calendar, Building, Layers, BookOpen } from 'lucide-react';
import toast from 'react-hot-toast';
import { timetablesApi, chatbotApi, departmentsApi } from '@/lib/api';
import { useQuery } from '@tanstack/react-query';
import useAuthStore from '@/lib/auth';
import { getSocket } from '@/lib/socket';
import TimetableGrid from '@/components/timetable/TimetableGrid';
import ConflictPanel from '@/components/timetable/ConflictPanel';
import ImprovementPanel from '@/components/timetable/ImprovementPanel';
import Select from '@/components/ui/Select';

export default function GeneratePage() {
  const { user } = useAuthStore();
  const [tab, setTab] = useState('voice');
  const [nlInput, setNlInput] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    academic_year: '2024-25',
    department_id: '',
    course_id: '',
    semester_id: ''
  });

  const [isGenerating, setIsGenerating] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [currentSteps, setCurrentSteps] = useState([]);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState(null);
  const [gridData, setGridData] = useState(null);
  const [improvements, setImprovements] = useState(null);
  const [showImprovements, setShowImprovements] = useState(false);
  const [loadingImprovements, setLoadingImprovements] = useState(false);
  const [activeTimetableId, setActiveTimetableId] = useState(null);
  const recognitionRef = useRef(null);
  const socketRef = useRef(null);

  // Fetch Departments with courses+semesters
  const { data: depts } = useQuery({ queryKey: ['departments'], queryFn: () => departmentsApi.getAll() });

  const selectedDept = depts?.find(d => d.id === formData.department_id);
  const filteredCourses = selectedDept?.courses || [];
  const selectedCourse = filteredCourses?.find(c => c.id === formData.course_id);
  const filteredSemesters = selectedCourse?.semesters || [];

  // Auto-generate timetable name from selections
  useEffect(() => {
    if (formData.course_id && formData.semester_id) {
      const cName = selectedCourse?.name || '';
      const sName = filteredSemesters.find(s => s.id === formData.semester_id)?.name || '';
      const year = formData.academic_year || '2024-25';
      setFormData(prev => ({ ...prev, name: `${cName} - ${sName} (${year})` }));
    }
  }, [formData.course_id, formData.semester_id, formData.academic_year]);

  const setupSocket = (timetableId) => {
    const socket = getSocket();
    socketRef.current = socket;
    socket.connect();
    socket.emit('join_timetable', timetableId);

    socket.on('step', ({ step, message, progress: p }) => {
      setCurrentSteps(prev => [...prev, { step, message }]);
      setProgress(p || (step / 5) * 90);
    });

    socket.on('timetable_ready', ({ timetableId: ttId, entriesCount }) => {
      setProgress(100);
      setResult({ success: true, timetableId: ttId });
      setActiveTimetableId(ttId);
      toast.success(`Timetable generated! ${entriesCount} sessions scheduled. 🎉`);
      loadGrid(ttId);
      setIsGenerating(false);
    });

    socket.on('conflict_found', ({ explanation }) => {
      setProgress(100);
      setResult({ success: false, conflict: explanation });
      toast.error('Timetable conflict detected.');
      setIsGenerating(false);
    });

    socket.on('improvements_ready', ({ suggestions }) => setImprovements(suggestions));
    socket.on('error', ({ message: msg }) => { toast.error(msg); setIsGenerating(false); });
    return socket;
  };

  const loadGrid = async (timetableId) => {
    try { const data = await timetablesApi.getGrid(timetableId); setGridData(data); }
    catch (e) { console.error('Grid load error', e); }
  };

  const generate = async () => {
    if (tab === 'quick' && (!formData.course_id || !formData.semester_id)) {
      toast.error('Please select Course and Semester');
      return;
    }

    setIsGenerating(true);
    setCurrentSteps([]);
    setProgress(5);
    setResult(null);
    setGridData(null);
    setImprovements(null);

    try {
      const semester = filteredSemesters.find(s => s.id === formData.semester_id)?.name || 'Semester 1';
      const resp = await timetablesApi.generate({
        name: formData.name,
        academic_year: formData.academic_year,
        semester,
        department_id: formData.department_id || null,
        course_id: formData.course_id || null,
        semester_id: formData.semester_id || null,
        naturalLanguageInput: tab === 'voice' ? (nlInput.trim() || null) : null,
      });

      const { timetableId } = resp;
      setActiveTimetableId(timetableId);
      setupSocket(timetableId);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Generation failed');
      setIsGenerating(false);
    }
  };

  const handleSuggestImprovements = async () => {
    if (!activeTimetableId) return;
    setLoadingImprovements(true);
    setShowImprovements(true);
    try {
      const r = await chatbotApi.suggestImprovements({ timetableId: activeTimetableId, institutionId: user?.institution_id });
      setImprovements(r);
    } catch (e) { toast.error('Failed to get suggestions'); }
    finally { setLoadingImprovements(false); }
  };

  const startVoice = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { toast.error('Use Chrome for voice input'); return; }
    const rec = new SR();
    rec.lang = 'en-IN';
    rec.interimResults = true;
    rec.onstart = () => setIsListening(true);
    rec.onresult = (e) => setNlInput(Array.from(e.results).map(r => r[0].transcript).join(''));
    rec.onerror = () => { setIsListening(false); toast.error('Voice error'); };
    rec.onend = () => setIsListening(false);
    recognitionRef.current = rec;
    rec.start();
  };
  const stopVoice = () => { recognitionRef.current?.stop(); setIsListening(false); };

  const exportTimetable = async (format) => {
    if (!activeTimetableId) return;
    const token = localStorage.getItem('ps4_token');
    const url = `${process.env.NEXT_PUBLIC_API_URL}/timetables/${activeTimetableId}/export?format=${format}`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    const blob = await res.blob();
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `timetable.${format === 'pdf' ? 'pdf' : 'xlsx'}`;
    a.click();
    toast.success(`Exporting as ${format.toUpperCase()}...`);
  };

  // ── SCOPE SELECTORS (shared between both tabs) ────────────────────────────
  const ScopeSelectors = ({ required = false }) => (
    <div className="space-y-2">
      <div className="space-y-1.5">
        <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest flex items-center gap-1.5">
          <Building className="w-3 h-3" /> Department {!required && <span className="opacity-50 normal-case font-normal">(optional)</span>}
        </label>
        <Select
          options={depts?.map(d => ({ value: d.id, label: d.name }))}
          value={formData.department_id}
          onChange={(val) => setFormData(p => ({ ...p, department_id: val, course_id: '', semester_id: '' }))}
          placeholder={required ? "Select Department" : "All Departments (auto)"}
        />
      </div>
      <div className="space-y-1.5">
        <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest flex items-center gap-1.5">
          <Layers className="w-3 h-3" /> Course {!required && <span className="opacity-50 normal-case font-normal">(optional)</span>}
        </label>
        <Select
          disabled={!formData.department_id}
          options={filteredCourses.map(c => ({ value: c.id, label: c.name }))}
          value={formData.course_id}
          onChange={(val) => setFormData(p => ({ ...p, course_id: val, semester_id: '' }))}
          placeholder={required ? "Select Course" : "All Courses (auto)"}
        />
      </div>
      <div className="space-y-1.5">
        <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest flex items-center gap-1.5">
          <BookOpen className="w-3 h-3" /> Semester {!required && <span className="opacity-50 normal-case font-normal">(optional)</span>}
        </label>
        <Select
          disabled={!formData.course_id}
          options={filteredSemesters.map(s => ({ value: s.id, label: s.name }))}
          value={formData.semester_id}
          onChange={(val) => setFormData(p => ({ ...p, semester_id: val }))}
          placeholder={required ? "Select Semester" : "Auto-select"}
        />
      </div>
    </div>
  );

  return (
    <div className="flex gap-4 h-[calc(100vh-7rem)]">
      {/* LEFT: Control Panel */}
      <div className="w-80 flex-shrink-0 flex flex-col gap-3">
        <div className="card">
          <h2 className="font-outfit font-bold text-text-primary mb-1">🚀 Generate Timetable</h2>
          <p className="text-text-secondary text-xs">AI-powered conflict-free scheduling</p>
        </div>

        {/* Tab Switcher */}
        <div className="flex bg-surface rounded-xl p-1 border border-border">
          {[{ id: 'voice', label: '💬 AI Prompt' }, { id: 'quick', label: '📋 Quick Select' }].map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all ${tab === t.id ? 'bg-primary/20 text-primary' : 'text-text-secondary hover:text-text-primary'}`}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Panel content */}
        <div className="card flex-1 flex flex-col gap-4 overflow-y-auto custom-scrollbar">
          {tab === 'voice' ? (
            <>
              <div>
                <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest flex items-center gap-2 mb-1.5">
                  <Sparkles className="w-3 h-3 text-purple" /> AI Scheduling Prompt
                </label>
                <textarea
                  value={nlInput}
                  onChange={e => setNlInput(e.target.value)}
                  className="input-field resize-none min-h-[100px] text-sm leading-relaxed w-full"
                  placeholder={"Describe your scheduling requirements...\ne.g. 'Keep labs in last slots, no teacher more than 3 consecutive periods'"}
                />
                <div className="flex items-center gap-2 mt-2">
                  <motion.button whileHover={{ scale: 1.05 }} onClick={isListening ? stopVoice : startVoice}
                    className={`p-2.5 rounded-xl border transition-all ${isListening ? 'bg-danger/20 border-danger text-danger' : 'bg-elevated border-border text-text-secondary hover:text-text-primary'}`}>
                    {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                  </motion.button>
                  <span className="text-[10px] text-text-secondary">{isListening ? '🔵 Listening...' : 'Click mic to speak'}</span>
                </div>
              </div>

              <div className="border-t border-border/50 pt-3">
                <p className="text-[10px] font-bold text-text-secondary uppercase tracking-widest mb-3">
                  🎯 Target Scope <span className="font-normal opacity-50 normal-case">(leave blank = auto)</span>
                </p>
                <ScopeSelectors required={false} />
              </div>
            </>
          ) : (
            <>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest flex items-center gap-2">
                  <Calendar className="w-3 h-3" /> Academic Year
                </label>
                <input value={formData.academic_year} onChange={e => setFormData(p => ({ ...p, academic_year: e.target.value }))}
                  className="input-field py-2.5" placeholder="2024-25" />
              </div>
              <ScopeSelectors required={true} />
              {formData.name && (
                <div>
                  <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest mb-1.5 block">Auto-generated Name</label>
                  <input value={formData.name} onChange={e => setFormData(p => ({ ...p, name: e.target.value }))}
                    className="input-field py-2.5 text-xs font-bold text-primary bg-primary/5" placeholder="Timetable Name" />
                </div>
              )}
            </>
          )}
        </div>

        {/* Generate Button */}
        <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
          onClick={generate} disabled={isGenerating}
          className="btn-primary flex items-center justify-center gap-2 py-4 w-full shadow-xl shadow-primary/20">
          {isGenerating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Zap className="w-5 h-5" />}
          <span className="font-bold uppercase tracking-widest text-xs">
            {isGenerating ? 'Solving...' : 'Generate Schedule'}
          </span>
        </motion.button>

        {/* Progress Timeline */}
        {isGenerating && (
          <div className="card space-y-3 bg-elevated/50 border-primary/20">
            <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
              <motion.div initial={{ width: 0 }} animate={{ width: `${progress}%` }}
                className="h-full bg-gradient-to-r from-primary to-purple rounded-full" />
            </div>
            <div className="space-y-2">
              {currentSteps.map((s, i) => (
                <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                  className="flex items-center gap-2 text-[10px]">
                  <CheckCircle className="w-3 h-3 text-success" />
                  <span className="text-text-secondary font-medium">{s.message}</span>
                </motion.div>
              ))}
              <div className="flex items-center gap-2 text-[10px]">
                <Loader2 className="w-3 h-3 text-primary animate-spin" />
                <span className="text-text-primary animate-pulse">Running CP-SAT solver...</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* RIGHT: Output Panel */}
      <div className="flex-1 flex flex-col gap-3 overflow-hidden">
        {!result && !isGenerating && (
          <div className="flex-1 card flex flex-col items-center justify-center text-center">
            <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-primary/10 via-purple/10 to-indigo-500/10 flex items-center justify-center mb-6 border border-white/5">
              <Sparkles className="w-12 h-12 text-primary" />
            </div>
            <h3 className="font-outfit font-bold text-text-primary text-xl mb-2">Automated Scheduling Engine</h3>
            <p className="text-text-secondary text-sm max-w-md">
              Use <strong className="text-primary">AI Prompt</strong> to describe requirements in plain English, or <strong className="text-primary">Quick Select</strong> to pick a specific semester and generate instantly.
            </p>
            <div className="mt-6 grid grid-cols-2 gap-3 text-left max-w-sm w-full">
              {[
                { icon: '⚡', label: 'CP-SAT Solver', desc: 'Google OR-Tools optimization' },
                { icon: '🎯', label: 'Conflict-free', desc: 'Hard constraints enforced' },
                { icon: '🤖', label: 'NL Parsing', desc: 'Claude AI understands English' },
                { icon: '📊', label: 'Export Ready', desc: 'PDF & Excel download' },
              ].map(f => (
                <div key={f.label} className="card p-3 bg-elevated/50">
                  <div className="text-lg mb-1">{f.icon}</div>
                  <div className="text-xs font-bold text-text-primary">{f.label}</div>
                  <div className="text-[10px] text-text-secondary">{f.desc}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {isGenerating && !result && (
          <div className="flex-1 card flex flex-col items-center justify-center">
            <div className="w-20 h-20 ai-orb pulse-ai rounded-full mb-8" />
            <p className="text-text-primary font-bold text-lg mb-2">OR-Tools Solver Active</p>
            <p className="text-text-secondary text-xs font-medium tracking-widest uppercase opacity-50">Searching for optimal feasible solution...</p>
          </div>
        )}

        {result?.success && gridData && (
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="card py-3.5 px-5 flex items-center justify-between flex-shrink-0 bg-surface/80 backdrop-blur-md">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-success/10 border border-success/20">
                  <CheckCircle className="w-4 h-4 text-success" />
                </div>
                <div>
                  <h4 className="font-outfit font-bold text-text-primary text-sm">{gridData.timetable?.name}</h4>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[9px] font-bold text-success uppercase tracking-widest">Constraint Satisfied</span>
                    <span className="w-1 h-1 rounded-full bg-white/20" />
                    <span className="text-[9px] text-text-secondary font-bold">{gridData.entriesCount} Sessions</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <motion.button whileHover={{ scale: 1.05 }} onClick={handleSuggestImprovements}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl bg-primary/10 text-primary border border-primary/20 text-xs font-bold hover:bg-primary/20 transition-all">
                  <Lightbulb className="w-3.5 h-3.5" /> AI Insights
                </motion.button>
                <button onClick={() => exportTimetable('excel')} className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-text-secondary transition-all" title="Export Excel">
                  <FileSpreadsheet className="w-4 h-4" />
                </button>
                <button onClick={() => exportTimetable('pdf')} className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-text-secondary transition-all" title="Export PDF">
                  <FileText className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-hidden flex gap-3 mt-1">
              <div className="flex-1 overflow-auto custom-scrollbar">
                <TimetableGrid gridData={gridData} />
              </div>
              <AnimatePresence>
                {showImprovements && (
                  <motion.div initial={{ x: 300, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 300, opacity: 0 }} className="w-96 flex-shrink-0">
                    <ImprovementPanel improvements={improvements} loading={loadingImprovements} onClose={() => setShowImprovements(false)} />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        )}

        {result?.success === false && result?.conflict && (
          <div className="flex-1 overflow-auto custom-scrollbar">
            <ConflictPanel conflict={result.conflict} timetableId={activeTimetableId} onRetry={generate} />
          </div>
        )}
      </div>
    </div>
  );
}
