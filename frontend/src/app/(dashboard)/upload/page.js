'use client';
import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, File, CheckCircle, AlertTriangle, Download, ArrowRight, Loader2, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { uploadApi } from '@/lib/api';

export default function UploadPage() {
  const [step, setStep] = useState(1); // 1=upload, 2=processing, 3=preview, 4=done
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState(null);
  const [parsed, setParsed] = useState(null);
  const [activeTab, setActiveTab] = useState('teachers');
  const [confirming, setConfirming] = useState(false);
  const [result, setResult] = useState(null);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) handleFile(droppedFile);
  }, []);

  const handleFile = async (f) => {
    const allowed = ['.xlsx', '.xls', '.csv', '.json'];
    const ext = '.' + f.name.split('.').pop().toLowerCase();
    if (!allowed.includes(ext)) { toast.error(`Invalid file type. Allowed: ${allowed.join(', ')}`); return; }
    setFile(f);
    setStep(2);

    const formData = new FormData();
    formData.append('file', f);
    try {
      const result = await uploadApi.uploadFile(formData);
      setParsed(result.parsed);
      setStep(3);
    } catch (e) {
      toast.error(e.response?.data?.error || 'Parse failed');
      setStep(1);
    }
  };

  const confirmUpload = async () => {
    if (!parsed) return;
    setConfirming(true);
    try {
      const result = await uploadApi.confirmUpload({
        teachers: parsed.teachers || [],
        subjects: parsed.subjects || [],
        rooms: parsed.rooms || [],
      });
      setResult(result.created);
      setStep(4);
      toast.success('Data saved successfully!');
    } catch (e) {
      toast.error(e.response?.data?.error || 'Save failed');
    } finally {
      setConfirming(false);
    }
  };

  const downloadTemplate = () => {
    const token = localStorage.getItem('ps4_token');
    const url = uploadApi.templateUrl();
    fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.blob())
      .then(blob => {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'ps4-timetable-template.xlsx';
        a.click();
      });
  };

  const reset = () => { setStep(1); setFile(null); setParsed(null); setResult(null); };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-outfit text-2xl font-bold text-text-primary">Upload Data</h1>
          <p className="text-text-secondary text-sm mt-1">Import teachers, subjects, and rooms via Excel/CSV</p>
        </div>
        <button onClick={downloadTemplate} className="btn-ghost flex items-center gap-2 text-sm">
          <Download className="w-4 h-4" />Download Template
        </button>
      </div>

      {/* Step indicators */}
      <div className="flex items-center gap-2">
        {['Upload', 'AI Processing', 'Preview', 'Done'].map((s, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className={`flex items-center gap-1.5 text-xs font-medium ${step > i + 1 ? 'text-success' : step === i + 1 ? 'text-primary' : 'text-text-secondary'}`}>
              <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${step > i + 1 ? 'bg-success text-white' : step === i + 1 ? 'bg-primary text-white' : 'bg-elevated border border-border text-text-secondary'}`}>
                {step > i + 1 ? '✓' : i + 1}
              </div>
              {s}
            </div>
            {i < 3 && <div className={`h-px flex-1 w-8 ${step > i + 1 ? 'bg-success' : 'bg-border'}`} />}
          </div>
        ))}
      </div>

      {/* Step 1: Upload */}
      {step === 1 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className={`border-2 border-dashed rounded-2xl p-12 text-center transition-all duration-200 ${isDragging ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40'}`}
          onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
        >
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <Upload className="w-8 h-8 text-primary" />
          </div>
          <h3 className="font-outfit font-bold text-text-primary text-lg mb-2">Drop your file here</h3>
          <p className="text-text-secondary text-sm mb-4">Supports .xlsx, .xls, .csv, .json — Max 10MB</p>
          <p className="text-xs text-text-secondary mb-6">Excel should have sheets: Teachers | Subjects | Rooms</p>
          <label className="btn-primary cursor-pointer inline-flex items-center gap-2">
            <File className="w-4 h-4" />Browse File
            <input type="file" className="hidden" accept=".xlsx,.xls,.csv,.json" onChange={e => e.target.files[0] && handleFile(e.target.files[0])} />
          </label>
        </motion.div>
      )}

      {/* Step 2: Processing */}
      {step === 2 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="card text-center py-12">
          <div className="w-16 h-16 ai-orb rounded-full mx-auto mb-5 pulse-ai" />
          <h3 className="font-outfit font-bold text-text-primary text-lg mb-2">Claude AI analyzing your data...</h3>
          <p className="text-text-secondary text-sm">{file?.name}</p>
          <div className="mt-6 progress-bar w-48 mx-auto">
            <div className="progress-fill" style={{ width: '65%' }} />
          </div>
        </motion.div>
      )}

      {/* Step 3: Preview */}
      {step === 3 && parsed && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          {/* Confidence badge */}
          <div className="card flex items-center gap-4">
            <CheckCircle className="w-5 h-5 text-success" />
            <div className="flex-1">
              <span className="text-sm font-medium text-text-primary">AI parsed successfully</span>
              {parsed.confidence && <span className="text-xs text-text-secondary ml-2">Confidence: {Math.round(parsed.confidence * 100)}%</span>}
            </div>
            <span className="text-xs text-text-secondary">{file?.name}</span>
          </div>

          {/* Warnings */}
          {parsed.warnings?.length > 0 && (
            <div className="card border-warning/30 bg-warning/5 space-y-1">
              <div className="flex items-center gap-2 mb-2"><AlertTriangle className="w-4 h-4 text-warning" /><span className="text-sm font-medium text-warning">Data Warnings</span></div>
              {parsed.warnings.map((w, i) => <p key={i} className="text-xs text-text-secondary">• {w}</p>)}
            </div>
          )}

          {/* Tabs */}
          <div className="flex gap-1 bg-surface rounded-xl p-1 border border-border">
            {['teachers', 'subjects', 'rooms'].map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)}
                className={`flex-1 py-2 rounded-lg text-xs font-medium transition-colors ${activeTab === tab ? 'bg-primary/20 text-primary' : 'text-text-secondary'}`}>
                {tab.charAt(0).toUpperCase() + tab.slice(1)} ({parsed[tab]?.length || 0})
              </button>
            ))}
          </div>

          {/* Data table */}
          <div className="card p-0 overflow-auto max-h-80">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border">
                  {activeTab === 'teachers' && ['Name', 'Email', 'Department', 'Max/Day', 'Subjects'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-text-secondary font-medium">{h}</th>
                  ))}
                  {activeTab === 'subjects' && ['Name', 'Code', 'Periods/Week', 'Requires Lab', 'Group'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-text-secondary font-medium">{h}</th>
                  ))}
                  {activeTab === 'rooms' && ['Name', 'Capacity', 'Type', 'Floor', 'Building'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-text-secondary font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {activeTab === 'teachers' && (parsed.teachers || []).map((t, i) => (
                  <tr key={i} className="hover:bg-elevated/50">
                    <td className="px-4 py-2.5 text-text-primary font-medium">{t.name}</td>
                    <td className="px-4 py-2.5 text-text-secondary">{t.email || '—'}</td>
                    <td className="px-4 py-2.5 text-text-secondary">{t.department || '—'}</td>
                    <td className="px-4 py-2.5 text-text-secondary">{t.max_periods_per_day || 6}</td>
                    <td className="px-4 py-2.5 text-text-secondary">{(t.subjects || []).join(', ') || '—'}</td>
                  </tr>
                ))}
                {activeTab === 'subjects' && (parsed.subjects || []).map((s, i) => (
                  <tr key={i} className="hover:bg-elevated/50">
                    <td className="px-4 py-2.5 text-text-primary font-medium">{s.name}</td>
                    <td className="px-4 py-2.5 text-text-secondary">{s.code || '—'}</td>
                    <td className="px-4 py-2.5 text-text-secondary">{s.periods_per_week}</td>
                    <td className="px-4 py-2.5"><span className={`px-1.5 py-0.5 rounded text-[10px] ${s.requires_lab ? 'bg-purple/10 text-purple' : 'bg-success/10 text-success'}`}>{s.requires_lab ? 'Yes' : 'No'}</span></td>
                    <td className="px-4 py-2.5 text-text-secondary">{s.student_group || 'All'}</td>
                  </tr>
                ))}
                {activeTab === 'rooms' && (parsed.rooms || []).map((r, i) => (
                  <tr key={i} className="hover:bg-elevated/50">
                    <td className="px-4 py-2.5 text-text-primary font-medium">{r.name}</td>
                    <td className="px-4 py-2.5 text-text-secondary">{r.capacity || 40}</td>
                    <td className="px-4 py-2.5 text-text-secondary">{r.room_type || 'classroom'}</td>
                    <td className="px-4 py-2.5 text-text-secondary">{r.floor || '—'}</td>
                    <td className="px-4 py-2.5 text-text-secondary">{r.building || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex gap-3">
            <button onClick={reset} className="btn-ghost flex items-center gap-2">← Re-upload</button>
            <button onClick={confirmUpload} disabled={confirming} className="btn-primary flex-1 flex items-center justify-center gap-2">
              {confirming ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
              ✅ Save to Database
            </button>
          </div>
        </motion.div>
      )}

      {/* Step 4: Done */}
      {step === 4 && result && (
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="card text-center py-12">
          <div className="w-16 h-16 rounded-full bg-success/15 flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-success" />
          </div>
          <h3 className="font-outfit font-bold text-text-primary text-xl mb-2">Data saved successfully! 🎉</h3>
          <div className="flex justify-center gap-6 mt-4 mb-6">
            <div className="text-center"><div className="text-2xl font-bold text-primary">{result.teachers}</div><div className="text-xs text-text-secondary">Teachers</div></div>
            <div className="text-center"><div className="text-2xl font-bold text-success">{result.subjects}</div><div className="text-xs text-text-secondary">Subjects</div></div>
            <div className="text-center"><div className="text-2xl font-bold text-warning">{result.rooms}</div><div className="text-xs text-text-secondary">Rooms</div></div>
          </div>
          <div className="flex gap-3 justify-center">
            <button onClick={reset} className="btn-ghost">Upload More</button>
            <a href="/generate"><button className="btn-primary flex items-center gap-2">Go to Generate <ArrowRight className="w-4 h-4" /></button></a>
          </div>
        </motion.div>
      )}
    </div>
  );
}
