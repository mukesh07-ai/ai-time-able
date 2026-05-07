'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { FileSpreadsheet, FileText, ArrowLeft, Sparkles, Globe } from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { timetablesApi, chatbotApi } from '@/lib/api';
import TimetableGrid from '@/components/timetable/TimetableGrid';
import ImprovementPanel from '@/components/timetable/ImprovementPanel';
import useAuthStore from '@/lib/auth';

const STATUS_CONFIG = {
  draft: { label: 'Draft', cls: 'badge-draft' },
  generating: { label: 'Generating...', cls: 'badge-generating' },
  feasible: { label: 'Feasible ✓', cls: 'badge-feasible' },
  infeasible: { label: 'Infeasible', cls: 'badge-infeasible' },
  published: { label: 'Published', cls: 'badge-published' },
};

export default function TimetablePage() {
  const { id } = useParams();
  const { user } = useAuthStore();
  const [gridData, setGridData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [improvements, setImprovements] = useState(null);
  const [showImprovements, setShowImprovements] = useState(false);
  const [loadingImpr, setLoadingImpr] = useState(false);
  const [publishing, setPublishing] = useState(false);

  useEffect(() => {
    timetablesApi.getGrid(id).then(setGridData).catch(console.error).finally(() => setLoading(false));
  }, [id]);

  const getImprovements = async () => {
    setShowImprovements(true);
    setLoadingImpr(true);
    try {
      const data = await chatbotApi.suggestImprovements({ timetableId: id, institutionId: user?.institution_id });
      setImprovements(data);
    } catch { toast.error('Failed to get suggestions'); }
    finally { setLoadingImpr(false); }
  };

  const exportFile = async (format) => {
    const token = localStorage.getItem('ps4_token');
    const url = `${process.env.NEXT_PUBLIC_API_URL}/timetables/${id}/export?format=${format}`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    const blob = await res.blob();
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `timetable.${format === 'pdf' ? 'pdf' : 'xlsx'}`;
    a.click();
  };

  const publish = async () => {
    setPublishing(true);
    try {
      await timetablesApi.publish(id);
      toast.success('Published! 🎉');
      const data = await timetablesApi.getGrid(id);
      setGridData(data);
    } catch { toast.error('Publish failed'); }
    finally { setPublishing(false); }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-10 h-10 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
    </div>
  );

  if (!gridData) return <div className="text-text-secondary text-center py-12">Timetable not found</div>;

  const tt = gridData.timetable;
  const cfg = STATUS_CONFIG[tt?.status] || STATUS_CONFIG.draft;

  return (
    <div className="flex flex-col h-[calc(100vh-7rem)] gap-4">
      {/* Header */}
      <div className="card py-3 px-5 flex items-center gap-4 flex-shrink-0">
        <Link href="/dashboard"><button className="p-2 rounded-lg hover:bg-elevated text-text-secondary hover:text-text-primary"><ArrowLeft className="w-4 h-4" /></button></Link>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="font-outfit font-bold text-text-primary">{tt?.name}</span>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cfg.cls}`}>{cfg.label}</span>
          </div>
          <p className="text-xs text-text-secondary">{tt?.academic_year} {tt?.semester} • {gridData.entriesCount} entries</p>
        </div>
        <div className="flex items-center gap-2">
          <motion.button whileHover={{ scale: 1.05 }} onClick={getImprovements}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple/15 text-purple border border-purple/30 text-xs font-medium hover:bg-purple/25">
            <Sparkles className="w-3.5 h-3.5" />AI Improvements
          </motion.button>
          {tt?.status === 'feasible' && (
            <button onClick={publish} disabled={publishing} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-success/10 text-success border border-success/20 text-xs font-medium hover:bg-success/20">
              <Globe className="w-3.5 h-3.5" />Publish
            </button>
          )}
          <button onClick={() => exportFile('excel')} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-success/10 text-success border border-success/20 text-xs">
            <FileSpreadsheet className="w-3.5 h-3.5" /> Excel
          </button>
          <button onClick={() => exportFile('pdf')} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-danger/10 text-danger border border-danger/20 text-xs">
            <FileText className="w-3.5 h-3.5" /> PDF
          </button>
        </div>
      </div>

      <div className="flex-1 flex gap-4 overflow-hidden">
        <div className="flex-1 overflow-auto">
          <TimetableGrid gridData={gridData} />
        </div>
        {showImprovements && (
          <div className="w-80 flex-shrink-0">
            <ImprovementPanel improvements={improvements} loading={loadingImpr} onClose={() => setShowImprovements(false)} />
          </div>
        )}
      </div>
    </div>
  );
}
