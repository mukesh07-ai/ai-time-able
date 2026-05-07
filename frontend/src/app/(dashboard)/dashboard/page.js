'use client';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { Users, BookOpen, Building2, Calendar, AlertTriangle, Sparkles, Upload, Settings2, MessageSquare, ArrowRight, Clock, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { dashboardApi } from '@/lib/api';
import useAuthStore from '@/lib/auth';

const STATUS_CONFIG = {
  draft: { label: 'Draft', cls: 'badge-draft' },
  generating: { label: 'Generating...', cls: 'badge-generating' },
  feasible: { label: 'Feasible ✓', cls: 'badge-feasible' },
  infeasible: { label: 'Infeasible ✗', cls: 'badge-infeasible' },
  published: { label: 'Published', cls: 'badge-published' },
};

export default function DashboardPage() {
  const { user } = useAuthStore();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    dashboardApi.getStats().then(setStats).catch(console.error).finally(() => setLoading(false));
  }, []);

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Subah ki Namaste';
    if (h < 17) return 'Namaskar';
    return 'Shubh Sandhya';
  };

  const statsCards = [
    { label: 'Teachers', value: stats?.teachers ?? '—', icon: Users, color: 'primary', bg: 'bg-primary/10' },
    { label: 'Subjects', value: stats?.subjects ?? '—', icon: BookOpen, color: 'success', bg: 'bg-success/10' },
    { label: 'Rooms', value: stats?.rooms ?? '—', icon: Building2, color: 'warning', bg: 'bg-warning/10' },
    { label: 'Timetables', value: stats?.timetables ?? '—', icon: Calendar, color: 'purple', bg: 'bg-purple/10' },
  ];

  const quickActions = [
    { href: '/upload', icon: Upload, label: 'Upload Data', desc: 'Import Excel/CSV', color: 'primary' },
    { href: '/constraints', icon: Settings2, label: 'Edit Constraints', desc: 'Teachers & Rooms', color: 'success' },
    { href: '/generate', icon: Sparkles, label: 'Generate Timetable', desc: 'AI-powered scheduling', color: 'purple' },
    { href: '/chatbot', icon: MessageSquare, label: 'Ask AI Chatbot', desc: 'Any timetable question', color: 'warning' },
  ];

  return (
    <div className="space-y-6">
      {/* Greeting */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex items-start justify-between">
        <div>
          <h1 className="font-outfit text-2xl font-bold text-text-primary">
            {greeting()}, {user?.name?.split(' ')[0]}! 🙏
          </h1>
          <p className="text-text-secondary text-sm mt-1">
            {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
        <div className="text-right">
          <div className="text-xs text-text-secondary">System Status</div>
          <div className="flex items-center gap-1.5 justify-end mt-1">
            <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
            <span className="text-xs text-success font-medium">All systems operational</span>
          </div>
        </div>
      </motion.div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statsCards.map((card, i) => (
          <motion.div key={card.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
            className="card hover:border-white/15 transition-all duration-300 group">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-text-secondary text-sm">{card.label}</p>
                <div className="text-3xl font-outfit font-bold text-text-primary mt-1">
                  {loading ? <div className="skeleton w-12 h-8 rounded" /> : card.value}
                </div>
              </div>
              <div className={`p-3 rounded-xl ${card.bg} group-hover:scale-110 transition-transform`}>
                <card.icon className={`w-5 h-5 text-${card.color}`} />
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick actions */}
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }} className="lg:col-span-1">
          <h2 className="font-outfit font-semibold text-text-primary mb-3 text-sm uppercase tracking-wide">Quick Actions</h2>
          <div className="space-y-2">
            {quickActions.map((action) => (
              <Link key={action.href} href={action.href}>
                <div className="card hover:border-white/15 hover:bg-elevated/80 transition-all duration-200 cursor-pointer flex items-center gap-4 p-4 group">
                  <div className={`p-2.5 rounded-xl bg-${action.color}/15 group-hover:scale-110 transition-transform flex-shrink-0`}>
                    <action.icon className={`w-4 h-4 text-${action.color}`} />
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-medium text-text-primary">{action.label}</div>
                    <div className="text-xs text-text-secondary">{action.desc}</div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-text-secondary group-hover:text-text-primary group-hover:translate-x-1 transition-all" />
                </div>
              </Link>
            ))}
          </div>
        </motion.div>

        {/* Recent timetables */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="lg:col-span-2">
          <h2 className="font-outfit font-semibold text-text-primary mb-3 text-sm uppercase tracking-wide">Recent Timetables</h2>
          <div className="card p-0 overflow-hidden">
            {loading ? (
              <div className="p-6 space-y-3">
                {[1, 2, 3].map(i => <div key={i} className="skeleton h-10 rounded" />)}
              </div>
            ) : !stats?.recentTimetables?.length ? (
              <div className="p-8 text-center">
                <Calendar className="w-10 h-10 text-text-secondary mx-auto mb-3 opacity-50" />
                <p className="text-text-secondary text-sm">No timetables yet</p>
                <Link href="/generate">
                  <button className="btn-primary mt-4 py-2 px-4 text-sm">Generate First Timetable</button>
                </Link>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {stats.recentTimetables.map((tt) => {
                  const cfg = STATUS_CONFIG[tt.status] || STATUS_CONFIG.draft;
                  return (
                    <Link key={tt.id} href={`/timetable/${tt.id}`}>
                      <div className="flex items-center gap-4 px-5 py-3 hover:bg-elevated/50 transition-colors cursor-pointer">
                        <div className="flex-1">
                          <div className="text-sm font-medium text-text-primary">{tt.name}</div>
                          <div className="text-xs text-text-secondary">{tt.academic_year} {tt.semester}</div>
                        </div>
                        <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${cfg.cls}`}>{cfg.label}</span>
                        <div className="text-xs text-text-secondary flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(tt.createdAt).toLocaleDateString('en-IN')}
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </motion.div>
      </div>

      {/* Conflict alerts */}
      {stats?.recentConflicts?.length > 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}>
          <h2 className="font-outfit font-semibold text-text-primary mb-3 text-sm uppercase tracking-wide">Unresolved Conflicts</h2>
          <div className="space-y-2">
            {stats.recentConflicts.map((c) => (
              <div key={c.id} className="card border-danger/20 flex items-center gap-4 py-3">
                <AlertTriangle className="w-5 h-5 text-danger flex-shrink-0" />
                <div className="flex-1 text-sm text-text-primary">{c.llm_explanation?.substring(0, 100) || 'Conflict detected'}...</div>
                <Link href="/generate">
                  <button className="text-xs text-primary hover:underline">Fix →</button>
                </Link>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}
