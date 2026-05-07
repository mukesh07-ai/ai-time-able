'use client';
import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Send, Mic, MicOff, Zap, CheckCircle, Loader2, AlertTriangle, Download, FileSpreadsheet, FileText, Lightbulb, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import { timetablesApi, chatbotApi } from '@/lib/api';
import useAuthStore from '@/lib/auth';
import { getSocket } from '@/lib/socket';
import TimetableGrid from '@/components/timetable/TimetableGrid';
import ConflictPanel from '@/components/timetable/ConflictPanel';
import ImprovementPanel from '@/components/timetable/ImprovementPanel';

const STEPS = [
  { step: 1, label: 'AI parsing input...' },
  { step: 2, label: 'Loading schedule data...' },
  { step: 3, label: 'Running OR-Tools CP-SAT solver...' },
  { step: 4, label: 'Saving timetable...' },
  { step: 5, label: 'Done! ✅' },
];

export default function GeneratePage() {
  const { user } = useAuthStore();
  const [tab, setTab] = useState('voice');
  const [nlInput, setNlInput] = useState('');
  const [formData, setFormData] = useState({ name: '', academic_year: '2024-25', semester: 'Semester 1' });
  const [isGenerating, setIsGenerating] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [currentSteps, setCurrentSteps] = useState([]);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState(null); // { success, timetableId, entries, conflict, improvements }
  const [gridData, setGridData] = useState(null);
  const [improvements, setImprovements] = useState(null);
  const [showImprovements, setShowImprovements] = useState(false);
  const [loadingImprovements, setLoadingImprovements] = useState(false);
  const [activeTimetableId, setActiveTimetableId] = useState(null);
  const recognitionRef = useRef(null);
  const socketRef = useRef(null);

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
      toast.success(`Timetable generated! ${entriesCount} entries created. 🎉`);
      loadGrid(ttId);
    });

    socket.on('conflict_found', ({ explanation }) => {
      setProgress(100);
      setResult({ success: false, conflict: explanation });
      toast.error('Timetable conflict detected. Check the conflict panel.');
    });

    socket.on('improvements_ready', ({ suggestions }) => {
      setImprovements(suggestions);
    });

    socket.on('error', ({ message: msg }) => {
      toast.error(msg);
      setIsGenerating(false);
    });

    return socket;
  };

  const loadGrid = async (timetableId) => {
    try {
      const data = await timetablesApi.getGrid(timetableId);
      setGridData(data);
    } catch (e) { console.error('Grid load error', e); }
  };

  const generate = async () => {
    setIsGenerating(true);
    setCurrentSteps([]);
    setProgress(5);
    setResult(null);
    setGridData(null);
    setImprovements(null);

    try {
      const resp = await timetablesApi.generate({
        name: formData.name || `Timetable ${new Date().toLocaleDateString('en-IN')}`,
        academic_year: formData.academic_year,
        semester: formData.semester,
        naturalLanguageInput: nlInput.trim() || null,
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
      const result = await chatbotApi.suggestImprovements({ timetableId: activeTimetableId, institutionId: user?.institution_id });
      setImprovements(result);
    } catch (e) { toast.error('Failed to get suggestions'); }
    finally { setLoadingImprovements(false); }
  };

  const startVoice = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { toast.error('Use Chrome for voice input'); return; }
    const rec = new SR();
    rec.lang = 'hi-IN';
    rec.interimResults = true;
    rec.onstart = () => setIsListening(true);
    rec.onresult = (e) => { setNlInput(Array.from(e.results).map(r => r[0].transcript).join('')); };
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

  return (
    <div className="flex gap-4 h-[calc(100vh-7rem)]">
      {/* LEFT: Input Panel */}
      <div className="w-80 flex-shrink-0 flex flex-col gap-3">
        <div className="card">
          <h2 className="font-outfit font-bold text-text-primary mb-1">🚀 Generate Timetable</h2>
          <p className="text-text-secondary text-xs">Use AI to generate a conflict-free schedule</p>
        </div>

        {/* Tab switcher */}
        <div className="flex bg-surface rounded-xl p-1 border border-border">
          {[{ id: 'voice', label: '💬 Text/Voice' }, { id: 'quick', label: '📋 Quick' }].map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all ${tab === t.id ? 'bg-primary/20 text-primary' : 'text-text-secondary hover:text-text-primary'}`}>
              {t.label}
            </button>
          ))}
        </div>

        {tab === 'voice' ? (
          <div className="card flex-1 flex flex-col">
            <p className="text-xs text-text-secondary mb-3">Apni scheduling requirements batayein. Hindi ya English mein.</p>
            <textarea
              value={nlInput}
              onChange={e => setNlInput(e.target.value)}
              className="input-field flex-1 resize-none min-h-[120px] text-sm"
              placeholder="e.g. Sharma Sir Monday available nahi hai, Math ke 5 periods chahiye Class 10A ke liye..."
            />
            <div className="flex items-center gap-2 mt-3">
              <motion.button
                whileHover={{ scale: 1.05 }}
                onClick={isListening ? stopVoice : startVoice}
                className={`p-2.5 rounded-xl border transition-all ${isListening ? 'bg-danger/20 border-danger text-danger' : 'bg-elevated border-border text-text-secondary hover:text-text-primary'}`}
              >
                {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </motion.button>
              <span className="text-xs text-text-secondary flex-1">{isListening ? '🔴 Listening...' : 'Click mic to speak'}</span>
            </div>
          </div>
        ) : (
          <div className="card flex-1 space-y-3">
            <div>
              <label className="text-xs text-text-secondary mb-1 block">Timetable Name</label>
              <input value={formData.name} onChange={e => setFormData(p => ({ ...p, name: e.target.value }))}
                className="input-field" placeholder="e.g. 2024-25 Semester 1" />
            </div>
            <div>
              <label className="text-xs text-text-secondary mb-1 block">Academic Year</label>
              <input value={formData.academic_year} onChange={e => setFormData(p => ({ ...p, academic_year: e.target.value }))}
                className="input-field" placeholder="2024-25" />
            </div>
            <div>
              <label className="text-xs text-text-secondary mb-1 block">Semester</label>
              <input value={formData.semester} onChange={e => setFormData(p => ({ ...p, semester: e.target.value }))}
                className="input-field" placeholder="Semester 1" />
            </div>
          </div>
        )}

        {/* Generate button */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={generate}
          disabled={isGenerating}
          className="btn-primary flex items-center justify-center gap-2 py-3 w-full"
        >
          {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
          {isGenerating ? 'Generating...' : '🚀 Generate Timetable'}
        </motion.button>

        {/* Progress timeline */}
        {isGenerating && (
          <div className="card space-y-2">
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${progress}%` }} />
            </div>
            {currentSteps.map((s, i) => (
              <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                className="flex items-center gap-2 text-xs">
                <CheckCircle className="w-3 h-3 text-success flex-shrink-0" />
                <span className="text-text-secondary">{s.message}</span>
              </motion.div>
            ))}
            {currentSteps.length < 5 && (
              <div className="flex items-center gap-2 text-xs">
                <Loader2 className="w-3 h-3 text-primary animate-spin flex-shrink-0" />
                <span className="text-text-secondary">Processing...</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* RIGHT: Output Area */}
      <div className="flex-1 flex flex-col gap-3 overflow-hidden">
        {!result && !isGenerating && (
          <div className="flex-1 card flex flex-col items-center justify-center text-center">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary/20 to-purple/20 flex items-center justify-center mb-4">
              <Sparkles className="w-10 h-10 text-purple" />
            </div>
            <h3 className="font-outfit font-bold text-text-primary text-lg mb-2">Aapka AI timetable yahan aayega</h3>
            <p className="text-text-secondary text-sm">Enter constraints on the left to begin</p>
          </div>
        )}

        {isGenerating && !result && (
          <div className="flex-1 card flex flex-col items-center justify-center">
            <div className="w-16 h-16 ai-orb pulse-ai rounded-full mb-6" />
            <p className="text-text-primary font-medium mb-2">OR-Tools CP-SAT solver running...</p>
            <p className="text-text-secondary text-sm">This may take up to 60 seconds</p>
          </div>
        )}

        {result?.success && gridData && (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Toolbar */}
            <div className="card py-3 px-4 flex items-center gap-3 flex-shrink-0">
              <div className="flex-1">
                <span className="font-outfit font-semibold text-text-primary text-sm">{gridData.timetable?.name}</span>
                <span className="ml-2 text-xs badge-feasible px-2 py-0.5 rounded-full">✓ Feasible</span>
              </div>
              <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                onClick={handleSuggestImprovements}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple/15 text-purple border border-purple/30 text-xs font-medium hover:bg-purple/25 transition-colors">
                <Lightbulb className="w-3.5 h-3.5" />
                AI Improvements
              </motion.button>
              <div className="flex items-center gap-1">
                <button onClick={() => exportTimetable('excel')} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-success/10 text-success border border-success/20 text-xs hover:bg-success/20">
                  <FileSpreadsheet className="w-3.5 h-3.5" /> Excel
                </button>
                <button onClick={() => exportTimetable('pdf')} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-danger/10 text-danger border border-danger/20 text-xs hover:bg-danger/20">
                  <FileText className="w-3.5 h-3.5" /> PDF
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-hidden flex gap-3">
              <div className={`flex-1 overflow-auto ${showImprovements ? 'w-1/2' : 'w-full'}`}>
                <TimetableGrid gridData={gridData} />
              </div>
              {showImprovements && (
                <div className="w-80 flex-shrink-0">
                  <ImprovementPanel improvements={improvements} loading={loadingImprovements} onClose={() => setShowImprovements(false)} />
                </div>
              )}
            </div>
          </div>
        )}

        {result?.success === false && result?.conflict && (
          <div className="flex-1 overflow-auto">
            <ConflictPanel conflict={result.conflict} timetableId={activeTimetableId} onRetry={generate} />
          </div>
        )}
      </div>
    </div>
  );
}
