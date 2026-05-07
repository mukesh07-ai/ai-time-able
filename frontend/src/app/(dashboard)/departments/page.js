'use client';
import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Building, Book, Layers, MapPin, Plus, Search,
  ChevronRight, ChevronDown, Trash2, Edit2, X, ArrowRight, Save, AlertCircle, Info
} from 'lucide-react';
import { departmentsApi, roomsApi } from '@/lib/api';
import toast from 'react-hot-toast';
import Select from '@/components/ui/Select';

function DepartmentWizard({ dept, onClose, onComplete }) {
  const [step, setStep] = useState(dept ? 2 : 1); // Start at step 2 if editing
  const [deptName, setDeptName] = useState(dept?.name || '');
  const [courses, setCourses] = useState(
    dept?.courses?.map(c => ({
      id: c.id,
      name: c.name,
      semesters: c.semesters?.map(s => ({
        id: s.id,
        name: s.name,
        room_id: s.room_id || ''
      })) || [{ name: 'Semester 1', room_id: '' }]
    })) || [{ name: '', semesters: [{ name: 'Semester 1', room_id: '' }] }]
  );

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
      if (dept) {
        // Full Update Mode
        await departmentsApi.setup({ departmentId: dept.id, departmentName: deptName, courses });
        toast.success('Department updated successfully');
      } else {
        // Setup Mode
        await departmentsApi.setup({ departmentName: deptName, courses });
        toast.success('Department created!');
      }
      onComplete();
      onClose();
    } catch (e) {
      toast.error(`Error: ${e.response?.data?.error || e.message}`);
    }
  };

  return (
    <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 25 }}
      className="fixed right-0 top-0 h-full w-[520px] bg-surface border-l border-border shadow-2xl z-50 flex flex-col">
      <div className="p-6 border-b border-border flex justify-between items-center bg-elevated/50">
        <div>
          <h3 className="font-outfit font-bold text-xl text-text-primary">{dept ? 'Refine Department' : 'Configure New Department'}</h3>
          <p className="text-[10px] text-text-secondary uppercase tracking-widest font-bold mt-0.5">
            {dept ? `Editing structure for ${deptName}` : `Step ${step} of 4 • Progressive Setup`}
          </p>
        </div>
        <button onClick={onClose} className="text-text-secondary hover:text-text-primary p-2 hover:bg-white/5 rounded-full transition-colors"><X className="w-5 h-5" /></button>
      </div>

      <div className="flex-1 overflow-y-auto p-8 space-y-8">
        {step === 1 && (
          <div className="space-y-6">
            <div className="p-4 rounded-2xl bg-primary/5 border border-primary/10 flex gap-3">
              <Info className="w-5 h-5 text-primary shrink-0 mt-0.5" />
              <p className="text-xs text-text-secondary leading-relaxed">The department name serves as the primary identifier. Once set, it can only be changed via the rename tool.</p>
            </div>
            <div>
              <label className="text-xs text-text-secondary mb-2 block ml-1 font-bold uppercase tracking-tighter">Department Title</label>
              <input value={deptName} onChange={e => setDeptName(e.target.value)} disabled={!!dept}
                className={`input-field py-4 ${dept ? 'opacity-60 cursor-not-allowed' : ''}`} placeholder="e.g. Faculty of Engineering" />
            </div>
            <button disabled={!deptName} onClick={() => setStep(2)} className="btn-primary w-full py-4 flex items-center justify-center gap-2 shadow-xl shadow-primary/20">
              Proceed to Courses <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <label className="text-xs text-text-secondary font-bold uppercase tracking-tighter ml-1">Academic Courses</label>
              <span className="text-[10px] text-primary font-bold">{courses.length} Active</span>
            </div>
            <div className="space-y-3">
              {courses.map((c, i) => (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} key={i} className="flex gap-3 items-center group">
                  <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-[10px] font-bold text-text-secondary border border-white/5">{i + 1}</div>
                  <input value={c.name} onChange={e => handleCourseNameChange(i, e.target.value)} className="input-field flex-1" placeholder="Course Name (e.g. BCA)" />
                  {courses.length > 1 && (
                    <button onClick={() => handleRemoveCourse(i)} className="text-text-secondary hover:text-danger p-2 hover:bg-danger/5 rounded-xl transition-all">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </motion.div>
              ))}
            </div>
            <button onClick={handleAddCourse} className="btn-ghost w-full py-3 border-dashed flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-widest text-primary hover:bg-primary/5">
              <Plus className="w-4 h-4" /> Add Another Course
            </button>
            <div className="flex gap-4 pt-4">
              {!dept && <button onClick={() => setStep(1)} className="btn-ghost flex-1 py-3 text-sm">Back</button>}
              <button onClick={() => setStep(3)} className="btn-primary flex-1 py-3 text-sm shadow-lg shadow-primary/10">Configure Semesters</button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-8">
            {courses.map((c, ci) => (
              <div key={ci} className="space-y-4 p-6 bg-elevated/40 rounded-3xl border border-white/5 shadow-sm">
                <div className="flex items-center justify-between px-1">
                  <h4 className="font-bold text-sm text-text-primary flex items-center gap-2">
                    <Book className="w-4 h-4 text-primary" /> {c.name || 'Untitled Course'}
                  </h4>
                  <span className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">{c.semesters.length} Semesters</span>
                </div>
                <div className="space-y-2">
                  {c.semesters.map((s, si) => (
                    <motion.div initial={{ opacity: 0, x: -5 }} animate={{ opacity: 1, x: 0 }} key={si} className="flex gap-2">
                      <input value={s.name} onChange={e => handleSemChange(ci, si, 'name', e.target.value)} className="input-field py-2.5 text-sm" placeholder="Semester Name" />
                      {c.semesters.length > 1 && (
                        <button onClick={() => handleRemoveSemester(ci, si)} className="text-text-secondary hover:text-danger p-2 hover:bg-danger/5 rounded-xl transition-all">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </motion.div>
                  ))}
                </div>
                <button onClick={() => handleAddSemester(ci)} className="text-[10px] text-primary font-bold flex items-center gap-1.5 p-2 hover:bg-primary/5 rounded-lg transition-all">
                  <Plus className="w-3.5 h-3.5" /> New Semester
                </button>
              </div>
            ))}
            <div className="flex gap-4 pt-4 border-t border-white/5">
              <button onClick={() => setStep(2)} className="btn-ghost flex-1 py-3 text-sm">Back</button>
              <button onClick={() => setStep(4)} className="btn-primary flex-1 py-3 text-sm shadow-lg shadow-primary/10">Finalize Assignments</button>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-8">
            {courses.map((c, ci) => (
              <div key={ci} className="space-y-5 p-6 bg-elevated/40 rounded-3xl border border-white/5 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
                    <Book className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-text-primary">{c.name || 'Untitled Course'}</h4>
                    <p className="text-[9px] text-text-secondary uppercase tracking-widest font-bold">Room Allocation</p>
                  </div>
                </div>
                <div className="space-y-4">
                  {c.semesters.map((s, si) => (
                    <div key={si} className="space-y-2">
                      <div className="flex items-center justify-between px-1">
                        <span className="text-[10px] font-bold text-text-secondary uppercase tracking-tighter flex items-center gap-2">
                          <Layers className="w-3 h-3" /> {s.name}
                        </span>
                      </div>
                      <Select
                        options={rooms.map(r => ({ value: r.id, label: r.name }))}
                        value={s.room_id}
                        onChange={(val) => handleSemChange(ci, si, 'room_id', val)}
                        placeholder="Assign Dedicated Room"
                      />
                    </div>
                  ))}
                </div>
              </div>
            ))}
            <div className="flex gap-4 pt-6 border-t border-white/5">
              <button onClick={() => setStep(3)} className="btn-ghost flex-1 py-3 text-sm">Back</button>
              <button onClick={handleSubmit} className="btn-primary flex-1 flex items-center justify-center gap-2 py-3.5 shadow-xl shadow-primary/20">
                <Save className="w-4 h-4" /> {dept ? 'Update Hierarchy' : 'Finish Setup'}
              </button>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}

export default function DepartmentsPage() {
  const queryClient = useQueryClient();
  const [showWizard, setShowWizard] = useState(false);
  const [expandedDept, setExpandedDept] = useState(null);
  const [editingDept, setEditingDept] = useState(null);
  const [deletingDept, setDeletingDept] = useState(null);
  const [renamingDept, setRenamingDept] = useState(null);
  const [newName, setNewName] = useState('');

  const { data: depts, isLoading, refetch } = useQuery({ queryKey: ['departments'], queryFn: () => departmentsApi.getAll() });

  const handleDelete = async () => {
    try {
      await departmentsApi.delete(deletingDept.id);
      toast.success('Department deleted successfully');
      setDeletingDept(null);
      refetch();
    } catch (e) { toast.error('Failed to delete department'); }
  };

  const handleRename = async () => {
    try {
      await departmentsApi.update(renamingDept.id, { name: newName });
      toast.success('Department renamed');
      setRenamingDept(null);
      refetch();
    } catch (e) { toast.error('Failed to rename department'); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-primary/10 border border-primary/20">
            <Building className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="font-outfit text-2xl font-bold text-text-primary">Institutional Hierarchy</h1>
            <p className="text-text-secondary text-xs mt-0.5 tracking-wide uppercase font-bold text-[10px]">
              Manage Departments, Courses, and Semesters
            </p>
          </div>
        </div>
        <button onClick={() => setShowWizard(true)} className="btn-primary py-3 px-6 flex items-center gap-2.5 shadow-xl shadow-primary/10 transition-all active:scale-95">
          <Plus className="w-5 h-5" /> Add Department
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {isLoading ? (
          [1, 2, 3].map(i => <div key={i} className="skeleton h-24 rounded-3xl" />)
        ) : !depts?.length ? (
          <div className="card p-20 text-center bg-elevated/20 border-dashed border-2">
            <Building className="w-16 h-16 text-text-secondary mx-auto mb-6 opacity-20" />
            <h3 className="font-outfit font-bold text-text-primary text-xl mb-2">Registry is Empty</h3>
            <p className="text-text-secondary text-sm mb-6 max-w-xs mx-auto">Establish your academic structure to begin generating automated timetables.</p>
            <button onClick={() => setShowWizard(true)} className="btn-primary py-3 px-8 mx-auto">Create First Department</button>
          </div>
        ) : (
          depts.map((dept) => (
            <motion.div key={dept.id} layout className="card p-0 overflow-hidden border-border/60 hover:border-primary/40 transition-all duration-300">
              <div className="p-5 flex items-center justify-between group/row">
                <div className="flex items-center gap-5 cursor-pointer flex-1" onClick={() => setExpandedDept(expandedDept === dept.id ? null : dept.id)}>
                  <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20 group-hover/row:scale-110 transition-transform">
                    <Building className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-outfit font-bold text-text-primary text-lg">{dept.name}</h3>
                    <div className="flex items-center gap-4 mt-1">
                      <span className="text-[10px] text-text-secondary uppercase tracking-widest font-bold flex items-center gap-1.5 bg-white/5 px-2 py-0.5 rounded-md">
                        <Book className="w-3 h-3" /> {dept.courses?.length || 0} Courses
                      </span>
                      <span className="text-[10px] text-text-secondary uppercase tracking-widest font-bold flex items-center gap-1.5 bg-white/5 px-2 py-0.5 rounded-md">
                        <Layers className="w-3 h-3" /> {dept.courses?.reduce((acc, c) => acc + (c.semesters?.length || 0), 0)} Semesters
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 opacity-0 group-hover/row:opacity-100 transition-opacity mr-6">
                  <button onClick={(e) => { e.stopPropagation(); setEditingDept(dept); }}
                    title="Update Hierarchy"
                    className="p-2.5 rounded-xl bg-primary/5 hover:bg-primary/20 text-primary transition-all">
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); setRenamingDept(dept); setNewName(dept.name); }}
                    title="Rename"
                    className="p-2.5 rounded-xl bg-warning/5 hover:bg-warning/20 text-warning transition-all">
                    <Info className="w-4 h-4" />
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); setDeletingDept(dept); }}
                    title="Delete"
                    className="p-2.5 rounded-xl bg-danger/5 hover:bg-danger/20 text-danger transition-all">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex items-center gap-4 cursor-pointer" onClick={() => setExpandedDept(expandedDept === dept.id ? null : dept.id)}>
                  <div className="hidden sm:flex -space-x-3">
                    {dept.courses?.slice(0, 3).map((c, i) => (
                      <div key={i} className="w-8 h-8 rounded-full bg-elevated border-2 border-surface flex items-center justify-center text-[10px] font-bold text-primary shadow-lg" title={c.name}>
                        {c.name.substring(0, 2).toUpperCase()}
                      </div>
                    ))}
                  </div>
                  <div className={`p-2 rounded-full bg-white/5 transition-transform duration-300 ${expandedDept === dept.id ? 'rotate-180' : ''}`}>
                    <ChevronDown className="w-5 h-5 text-text-secondary" />
                  </div>
                </div>
              </div>

              <AnimatePresence>
                {expandedDept === dept.id && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="border-t border-border/50 bg-elevated/30">
                    <div className="p-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                      {dept.courses?.map((course) => (
                        <div key={course.id} className="space-y-4">
                          <h4 className="text-sm font-bold text-text-primary flex items-center gap-2.5 p-2 bg-primary/5 rounded-xl border border-primary/10">
                            <Book className="w-4 h-4 text-primary" /> {course.name}
                          </h4>
                          <div className="space-y-2.5">
                            {course.semesters?.map((sem) => (
                              <div key={sem.id} className="p-3.5 rounded-2xl bg-surface border border-border/50 flex items-center justify-between group/sem hover:border-primary/30 transition-all shadow-sm hover:shadow-md">
                                <div className="flex items-center gap-3">
                                  <Layers className="w-3.5 h-3.5 text-text-secondary" />
                                  <span className="text-xs text-text-primary font-bold">{sem.name}</span>
                                </div>
                                {sem.room && (
                                  <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-success bg-success/10 px-3 py-1 rounded-lg border border-success/20">
                                    <MapPin className="w-3 h-3" /> {sem.room.name}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))
        )}
      </div>

      {/* Rename Modal */}
      <AnimatePresence>
        {renamingDept && (
          <>
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]" onClick={() => setRenamingDept(null)} />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-surface p-8 rounded-[32px] border border-white/10 shadow-2xl z-[110]">
              <h3 className="font-outfit font-bold text-xl text-text-primary mb-2">Rename Department</h3>
              <p className="text-xs text-text-secondary mb-6">Updating the name will reflect across all assigned subjects and timetables.</p>
              <input value={newName} onChange={e => setNewName(e.target.value)} className="input-field py-4 mb-8" placeholder="Department Name" autoFocus />
              <div className="flex gap-4">
                <button onClick={() => setRenamingDept(null)} className="btn-ghost flex-1 py-3.5">Cancel</button>
                <button onClick={handleRename} className="btn-primary flex-1 py-3.5 shadow-lg shadow-primary/20">Save Name</button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {deletingDept && (
          <>
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]" onClick={() => setDeletingDept(null)} />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-surface p-8 rounded-[32px] border border-white/10 shadow-2xl z-[110]">
              <div className="w-16 h-16 rounded-full bg-danger/10 flex items-center justify-center mb-6 mx-auto">
                <AlertCircle className="w-8 h-8 text-danger" />
              </div>
              <h3 className="font-outfit font-bold text-xl text-text-primary mb-2 text-center">Confirm Deletion</h3>
              <p className="text-sm text-text-secondary mb-8 text-center px-4">
                Are you sure you want to delete <span className="font-bold text-text-primary">"{deletingDept.name}"</span>?
                This will purge all associated courses and semesters. This action is irreversible.
              </p>
              <div className="flex gap-4">
                <button onClick={() => setDeletingDept(null)} className="btn-ghost flex-1 py-3.5">Cancel</button>
                <button onClick={handleDelete} className="btn-primary bg-danger hover:bg-danger/80 border-none flex-1 py-3.5 shadow-lg shadow-danger/20">Delete Forever</button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {(showWizard || editingDept) && (
          <>
            <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-40" onClick={() => { setShowWizard(false); setEditingDept(null); }} />
            <DepartmentWizard
              dept={editingDept}
              onClose={() => { setShowWizard(false); setEditingDept(null); }}
              onComplete={refetch}
            />
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

