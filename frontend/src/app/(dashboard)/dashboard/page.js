'use client';
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { 
  Users, BookOpen, Building2, Calendar, AlertTriangle, Sparkles, 
  Upload, Settings2, MessageSquare, ArrowRight, Clock, Plus, X, Building, Layers, MapPin, Save, Book
} from 'lucide-react';
import { dashboardApi, roomsApi, departmentsApi } from '@/lib/api';
import useAuthStore from '@/lib/auth';
import toast from 'react-hot-toast';

const STATUS_CONFIG = {
  draft: { label: 'Draft', cls: 'badge-draft' },
  generating: { label: 'Generating...', cls: 'badge-generating' },
  feasible: { label: 'Feasible ✓', cls: 'badge-feasible' },
  infeasible: { label: 'Infeasible ✗', cls: 'badge-infeasible' },
  published: { label: 'Published', cls: 'badge-published' },
};

function DepartmentWizard({ onClose, onComplete }) {
  const [step, setStep] = useState(1);
  const [deptName, setDeptName] = useState('');
  const [courses, setCourses] = useState([{ name: '', semesters: [{ name: 'Semester 1', room_id: '' }] }]);
  const { data: roomsData } = useQuery({ queryKey: ['rooms'], queryFn: () => roomsApi.getAll() });
  const rooms = roomsData?.rooms || [];

  const handleAddCourse = () => setCourses([...courses, { name: '', semesters: [{ name: 'Semester 1', room_id: '' }] }]);
  const handleRemoveCourse = (idx) => setCourses(courses.filter((_, i) => i !== idx));
  const handleCourseNameChange = (idx, val) => {
    const newCourses = [...courses];
    newCourses[idx].name = val;
    setCourses(newCourses);
  };

  const handleAddSemester = (cIdx) => {
    const newCourses = [...courses];
    newCourses[cIdx].semesters.push({ name: `Semester ${newCourses[cIdx].semesters.length + 1}`, room_id: '' });
    setCourses(newCourses);
  };

  const handleRemoveSemester = (cIdx, sIdx) => {
    const newCourses = [...courses];
    newCourses[cIdx].semesters = newCourses[cIdx].semesters.filter((_, i) => i !== sIdx);
    setCourses(newCourses);
  };

  const handleSemChange = (cIdx, sIdx, field, value) => {
    const newCourses = [...courses];
    newCourses[cIdx].semesters[sIdx][field] = value;
    setCourses(newCourses);
  };

  const handleSubmit = async () => {
    try {
      await departmentsApi.setup({ departmentName: deptName, courses });
      toast.success('University structure created successfully!');
      onComplete();
      onClose();
    } catch (e) { 
      const msg = e.response?.data?.error || e.message || 'Setup failed';
      toast.error(`Setup Failed: ${msg}`); 
      console.error('Setup Error:', e);
    }
  };

  return (
    <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 25 }}
      className="fixed right-0 top-0 h-full w-[500px] bg-surface border-l border-border shadow-2xl z-50 flex flex-col">
      <div className="flex items-center justify-between p-5 border-b border-border">
        <div>
          <h3 className="font-outfit font-bold text-text-primary text-lg">Institutional Setup</h3>
          <p className="text-text-secondary text-[10px] uppercase tracking-widest mt-0.5">Step {step} of 4</p>
        </div>
        <button onClick={onClose} className="text-text-secondary hover:text-text-primary"><X className="w-5 h-5" /></button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {step === 1 && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            <div className="p-4 rounded-2xl bg-primary/10 border border-primary/20 flex items-center gap-3">
              <Building className="w-6 h-6 text-primary" />
              <div>
                <p className="text-sm text-text-primary font-bold">Step 1: Department Name</p>
                <p className="text-[10px] text-text-secondary">e.g. Computer Science and Applications</p>
              </div>
            </div>
            <div>
              <label className="text-xs text-text-secondary mb-1.5 block ml-1">Name *</label>
              <input value={deptName} onChange={e => setDeptName(e.target.value)} className="input-field py-3 text-sm" placeholder="e.g. Dept. of Computer Science" />
            </div>
            <button disabled={!deptName} onClick={() => setStep(2)} className="btn-primary w-full py-3 flex items-center justify-center gap-2">
              Next Step <ArrowRight className="w-4 h-4" />
            </button>
          </motion.div>
        )}

        {step === 2 && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            <div className="p-4 rounded-2xl bg-purple/10 border border-purple/20 flex items-center gap-3">
              <Book className="w-6 h-6 text-purple" />
              <div>
                <p className="text-sm text-text-primary font-bold">Step 2: Courses in {deptName}</p>
                <p className="text-[10px] text-text-secondary">Register courses like BCA, MCA, B.Tech</p>
              </div>
            </div>
            <div className="space-y-3">
              {courses.map((course, idx) => (
                <div key={idx} className="flex gap-2">
                  <input value={course.name} onChange={e => handleCourseNameChange(idx, e.target.value)} className="input-field flex-1 text-sm" placeholder="Course Name (e.g. BCA)" />
                  {courses.length > 1 && (
                    <button onClick={() => handleRemoveCourse(idx)} className="p-2.5 rounded-xl hover:bg-danger/10 text-danger border border-transparent hover:border-danger/20 transition-all">
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
              <button onClick={handleAddCourse} className="w-full py-2 border-2 border-dashed border-border rounded-xl text-text-secondary text-xs hover:border-primary/50 hover:text-primary transition-all flex items-center justify-center gap-2">
                <Plus className="w-3 h-3" /> Add Another Course
              </button>
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setStep(1)} className="btn-ghost flex-1">Back</button>
              <button disabled={courses.some(c => !c.name)} onClick={() => setStep(3)} className="btn-primary flex-1 flex items-center justify-center gap-2">
                Next Step <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}

        {step === 3 && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <div className="p-4 rounded-2xl bg-success/10 border border-success/20 flex items-center gap-3">
              <Layers className="w-6 h-6 text-success" />
              <div>
                <p className="text-sm text-text-primary font-bold">Step 3: Define Semesters</p>
                <p className="text-[10px] text-text-secondary">Assign semesters to each course</p>
              </div>
            </div>
            {courses.map((course, cIdx) => (
              <div key={cIdx} className="p-4 rounded-2xl bg-elevated border border-border space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-primary uppercase tracking-widest">{course.name}</h4>
                  <span className="text-[10px] text-text-secondary">{course.semesters.length} Semesters</span>
                </div>
                <div className="space-y-2">
                  {course.semesters.map((sem, sIdx) => (
                    <div key={sIdx} className="flex gap-2">
                      <input value={sem.name} onChange={e => handleSemChange(cIdx, sIdx, 'name', e.target.value)} className="input-field py-2 text-xs" placeholder="Sem Name" />
                      {course.semesters.length > 1 && (
                        <button onClick={() => handleRemoveSemester(cIdx, sIdx)} className="p-2 rounded-lg hover:bg-danger/10 text-danger transition-all">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                  <button onClick={() => handleAddSemester(cIdx)} className="text-[10px] text-primary hover:underline flex items-center gap-1 mt-1">
                    <Plus className="w-3 h-3" /> Add Semester to {course.name}
                  </button>
                </div>
              </div>
            ))}
            <div className="flex gap-3 pt-2">
              <button onClick={() => setStep(2)} className="btn-ghost flex-1">Back</button>
              <button onClick={() => setStep(4)} className="btn-primary flex-1 flex items-center justify-center gap-2">
                Next Step <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}

        {step === 4 && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <div className="p-4 rounded-2xl bg-warning/10 border border-warning/20 flex items-center gap-3">
              <MapPin className="w-6 h-6 text-warning" />
              <div>
                <p className="text-sm text-text-primary font-bold">Step 4: Final Classroom Check</p>
                <p className="text-[10px] text-text-secondary">Assign primary rooms for each semester</p>
              </div>
            </div>
            <div className="space-y-6 max-h-[450px] overflow-y-auto pr-2">
              {courses.map((course, cIdx) => (
                <div key={cIdx} className="space-y-3">
                  <h4 className="text-xs font-bold text-text-primary flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary" /> {course.name}
                  </h4>
                  <div className="grid grid-cols-1 gap-2">
                    {course.semesters.map((sem, sIdx) => (
                      <div key={sIdx} className="p-3 rounded-xl bg-elevated border border-border flex items-center justify-between gap-4">
                        <span className="text-xs font-medium text-text-secondary whitespace-nowrap min-w-[100px]">{sem.name}</span>
                        <select value={sem.room_id} onChange={e => handleSemChange(cIdx, sIdx, 'room_id', e.target.value)} className="input-field text-[11px] py-1.5 h-auto cursor-pointer">
                          <option value="">No Primary Classroom</option>
                          {rooms.map(r => <option key={r.id} value={r.id}>{r.name} ({r.room_type})</option>)}
                        </select>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div className="flex gap-3 pt-4 border-t border-border/50">
              <button onClick={() => setStep(3)} className="btn-ghost flex-1">Back</button>
              <button onClick={handleSubmit} className="btn-primary flex-1 flex items-center justify-center gap-2 py-3 shadow-lg shadow-primary/20">
                <Save className="w-4 h-4" /> Finish Registration
              </button>
            </div>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}

export default function DashboardPage() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showWizard, setShowWizard] = useState(false);

  const fetchStats = () => {
    setLoading(true);
    dashboardApi.getStats().then(setStats).catch(console.error).finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchStats();
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
    { href: '/upload', icon: Upload, label: 'Upload Data', desc: 'Import Excel/CSV', color: 'primary', roles: ['admin'] },
    { href: '/constraints', icon: Settings2, label: 'Edit Constraints', desc: 'Teachers & Rooms', color: 'success', roles: ['admin'] },
    { onClick: () => setShowWizard(true), icon: Building, label: 'Add Department', desc: 'Setup Courses & Semesters', color: 'primary', roles: ['admin'] },
    { href: '/generate', icon: Sparkles, label: 'Generate Timetable', desc: 'AI-powered scheduling', color: 'purple', roles: ['admin'] },
    { href: '/subjects', icon: BookOpen, label: 'Manage Subjects', desc: 'Curriculum data', color: 'success', roles: ['admin', 'teacher'] },
    { href: '/chatbot', icon: MessageSquare, label: 'Ask AI Chatbot', desc: 'Any timetable question', color: 'warning', roles: ['admin', 'teacher', 'student'] },
  ];

  const visibleActions = quickActions.filter(a => a.roles.includes(user?.role));

  return (
    <div className="space-y-6">
      {/* Greeting */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex items-start justify-between">
        <div>
          <h1 className="font-outfit text-2xl font-bold text-text-primary">
            {greeting()}, {user?.name?.split(' ')[0]}! 🙏
          </h1>
          <p className="text-text-secondary text-sm mt-1 uppercase tracking-widest text-[10px] font-bold">
            {user?.role} • {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
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
            {visibleActions.map((action, idx) => (
              action.href ? (
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
              ) : (
                <div key={idx} onClick={action.onClick} className="card hover:border-white/15 hover:bg-elevated/80 transition-all duration-200 cursor-pointer flex items-center gap-4 p-4 group">
                  <div className={`p-2.5 rounded-xl bg-${action.color}/15 group-hover:scale-110 transition-transform flex-shrink-0`}>
                    <action.icon className={`w-4 h-4 text-${action.color}`} />
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-medium text-text-primary">{action.label}</div>
                    <div className="text-xs text-text-secondary">{action.desc}</div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-text-secondary group-hover:text-text-primary group-hover:translate-x-1 transition-all" />
                </div>
              )
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
                {user?.role === 'admin' && (
                  <Link href="/generate">
                    <button className="btn-primary mt-4 py-2 px-4 text-sm">Generate First Timetable</button>
                  </Link>
                )}
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

      <AnimatePresence>
        {showWizard && (
          <>
            <div className="fixed inset-0 bg-black/50 z-40" onClick={() => setShowWizard(false)} />
            <DepartmentWizard onClose={() => setShowWizard(false)} onComplete={fetchStats} />
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
