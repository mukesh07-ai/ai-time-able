'use client';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { 
  Plus, Edit2, Trash2, X, Save, BookOpen, Search, FlaskConical, Clock, 
  Building, Book, Layers, User, Hash, Info
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useForm } from 'react-hook-form';
import { subjectsApi, departmentsApi, teachersApi } from '@/lib/api';
import Select from '@/components/ui/Select';

const SUBJECT_COLORS = [
  '#4F8EF7', '#10B981', '#F59E0B', '#8B5CF6', '#EF4444',
  '#06B6D4', '#F97316', '#84CC16', '#EC4899', '#6366F1',
];

function SubjectDrawer({ subject, onClose, onSave }) {
  const [selectedColor, setSelectedColor] = useState(subject?.color_hex || SUBJECT_COLORS[0]);
  
  // Data for dropdowns
  const { data: depts } = useQuery({ queryKey: ['departments'], queryFn: () => departmentsApi.getAll() });
  const { data: teachersData } = useQuery({ queryKey: ['teachers'], queryFn: () => teachersApi.getAll({ limit: 100 }) });
  const teachers = teachersData?.teachers || [];

  const { register, handleSubmit, formState: { errors }, watch, setValue } = useForm({
    defaultValues: subject || {
      name: '', code: '', credits: 4, type: 'theory',
      department_id: '', course_id: '', semester_id: '',
      teacher_id: '',
      color_hex: SUBJECT_COLORS[0],
    },
  });

  const selectedDeptId = watch('department_id');
  const selectedCourseId = watch('course_id');
  const selectedSemId = watch('semester_id');
  const selectedTeacherId = watch('teacher_id');

  // Filtered Options
  const selectedDept = depts?.find(d => d.id === selectedDeptId);
  const filteredCourses = selectedDept?.courses || [];
  const selectedCourse = filteredCourses?.find(c => c.id === selectedCourseId);
  const filteredSemesters = selectedCourse?.semesters || [];

  const onSubmit = (data) => onSave({ ...data, color_hex: selectedColor });

  return (
    <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 25 }}
      className="fixed right-0 top-0 h-full w-[450px] bg-surface border-l border-border shadow-2xl z-50 flex flex-col">
      <div className="flex items-center justify-between p-5 border-b border-border bg-elevated/50">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <BookOpen className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="font-outfit font-bold text-text-primary text-base">{subject ? 'Edit Subject' : 'Register New Subject'}</h3>
            <p className="text-[10px] text-text-secondary uppercase tracking-widest">MCU Bhopal Curriculum</p>
          </div>
        </div>
        <button onClick={onClose} className="text-text-secondary hover:text-text-primary p-2 hover:bg-white/5 rounded-full"><X className="w-5 h-5" /></button>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Institutional Selection */}
        <div className="space-y-4 p-4 rounded-2xl bg-elevated/50 border border-border/50">
          <div className="flex items-center gap-2 mb-2">
            <Building className="w-3.5 h-3.5 text-text-secondary" />
            <span className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">Institutional Context</span>
          </div>
          
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="text-xs text-text-secondary mb-1.5 block ml-1">Department</label>
              <Select 
                options={depts?.map(d => ({ value: d.id, label: d.name }))}
                value={selectedDeptId}
                onChange={(val) => {
                  setValue('department_id', val);
                  setValue('course_id', '');
                  setValue('semester_id', '');
                }}
                placeholder="Select Department"
              />
              <input type="hidden" {...register('department_id', { required: true })} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-text-secondary mb-1.5 block ml-1">Course</label>
                <Select 
                  disabled={!selectedDeptId}
                  options={filteredCourses.map(c => ({ value: c.id, label: c.name }))}
                  value={selectedCourseId}
                  onChange={(val) => {
                    setValue('course_id', val);
                    setValue('semester_id', '');
                  }}
                  placeholder="Select Course"
                />
                <input type="hidden" {...register('course_id', { required: true })} />
              </div>
              <div>
                <label className="text-xs text-text-secondary mb-1.5 block ml-1">Semester</label>
                <Select 
                  disabled={!selectedCourseId}
                  options={filteredSemesters.map(s => ({ value: s.id, label: s.name }))}
                  value={selectedSemId}
                  onChange={(val) => setValue('semester_id', val)}
                  placeholder="Select Semester"
                />
                <input type="hidden" {...register('semester_id', { required: true })} />
              </div>
            </div>
          </div>
        </div>

        {/* Subject Details */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <Hash className="w-3.5 h-3.5 text-text-secondary" />
            <span className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">Subject Details</span>
          </div>

          <div>
            <label className="text-xs text-text-secondary mb-1.5 block ml-1">Subject Name *</label>
            <input {...register('name', { required: 'Name is required' })} className="input-field" placeholder="e.g. Data Structures & Algorithms" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-text-secondary mb-1.5 block ml-1">Subject Code</label>
              <input {...register('code')} className="input-field" placeholder="CS-301" />
            </div>
            <div>
              <label className="text-xs text-text-secondary mb-1.5 block ml-1">Credit Value (Weekly Classes)</label>
              <input type="number" {...register('credits', { required: true, min: 1 })} className="input-field" min="1" max="10" />
            </div>
          </div>

          <div>
            <label className="text-xs text-text-secondary mb-2 block ml-1">Subject Type</label>
            <div className="flex gap-3">
              {[
                { id: 'theory', label: 'Theory' },
                { id: 'lab', label: 'Lab' },
                { id: 'both', label: 'Theory + Lab' }
              ].map(type => (
                <label key={type.id} className="flex items-center gap-2 p-3 rounded-xl border cursor-pointer flex-1 transition-all has-[:checked]:border-primary/50 has-[:checked]:bg-primary/5 border-border">
                  <input {...register('type')} type="radio" value={type.id} className="accent-primary" />
                  <span className="text-xs text-text-primary capitalize">{type.label}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Teacher Assignment */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <User className="w-3.5 h-3.5 text-text-secondary" />
            <span className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">Faculty Assignment</span>
          </div>

          <div>
            <label className="text-xs text-text-secondary mb-1.5 block ml-1">Assigned Teacher</label>
            <Select 
              options={teachers.map(t => ({ value: t.id, label: t.name }))}
              value={selectedTeacherId}
              onChange={(val) => setValue('teacher_id', val)}
              placeholder="Select Teacher (Optional)"
            />
            <input type="hidden" {...register('teacher_id')} />
            <p className="text-[10px] text-text-secondary mt-2 flex items-center gap-1.5 ml-1">
              <Info className="w-3 h-3" /> Link a teacher now to prevent scheduling conflicts later.
            </p>
          </div>
        </div>

        {/* Color selection */}
        <div>
          <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest mb-3 block ml-1">Visual Identifier (Color Tag)</label>
          <div className="flex flex-wrap gap-2.5">
            {SUBJECT_COLORS.map(color => (
              <button key={color} type="button" onClick={() => setSelectedColor(color)}
                className={`w-8 h-8 rounded-full border-2 transition-all hover:scale-110 shadow-sm ${selectedColor === color ? 'border-white scale-110 ring-2 ring-primary/20' : 'border-transparent opacity-60 hover:opacity-100'}`}
                style={{ backgroundColor: color }} />
            ))}
          </div>
        </div>

        <div className="flex gap-3 pt-4 border-t border-border/50">
          <button type="button" onClick={onClose} className="btn-ghost flex-1 py-3 text-sm">Cancel</button>
          <button type="submit" className="btn-primary flex-1 flex items-center justify-center gap-2 py-3 shadow-lg shadow-primary/20">
            <Save className="w-4 h-4" /> Save Subject
          </button>
        </div>
      </form>
    </motion.div>
  );
}

export default function SubjectsPage() {
  const queryClient = useQueryClient();
  const [drawer, setDrawer] = useState(null);
  const [search, setSearch] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['subjects', search],
    queryFn: () => subjectsApi.getAll({ search, limit: 100 }),
  });

  const subjects = data?.subjects || [];

  const saveSubject = async (formData) => {
    try {
      if (drawer?.id) await subjectsApi.update(drawer.id, formData);
      else await subjectsApi.create(formData);
      toast.success('Subject registered successfully!');
      queryClient.invalidateQueries({ queryKey: ['subjects'] });
      setDrawer(null);
    } catch (e) { toast.error(e.response?.data?.error || 'Registration failed'); }
  };

  const deleteSubject = async (id) => {
    if (!confirm('Are you sure you want to permanently remove this subject?')) return;
    try {
      await subjectsApi.delete(id);
      toast.success('Subject removed');
      queryClient.invalidateQueries({ queryKey: ['subjects'] });
    } catch (e) { toast.error('Failed to remove subject'); }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-primary/10 border border-primary/20">
            <BookOpen className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="font-outfit text-2xl font-bold text-text-primary">Curriculum Subjects</h1>
            <p className="text-text-secondary text-xs mt-0.5 tracking-wide uppercase font-bold text-[10px]">
              Manage courses and credit hours
            </p>
          </div>
        </div>
        <button onClick={() => setDrawer({})} className="btn-primary flex items-center gap-2.5 py-3 px-6 shadow-xl shadow-primary/10">
          <Plus className="w-5 h-5" /> Register Subject
        </button>
      </div>

      {/* Search & Filters */}
      <div className="flex gap-4 items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            className="input-field pl-11 py-3" placeholder="Search subjects or codes..." />
        </div>
      </div>

      {/* Subjects list */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1,2,3,4,5,6].map(i => <div key={i} className="skeleton h-48 rounded-3xl" />)}
        </div>
      ) : subjects.length === 0 ? (
        <div className="card text-center py-20 bg-elevated/20 border-dashed border-2">
          <div className="w-20 h-20 rounded-3xl bg-primary/5 flex items-center justify-center mx-auto mb-6">
            <BookOpen className="w-10 h-10 text-primary opacity-20" />
          </div>
          <h3 className="font-outfit font-bold text-text-primary text-xl mb-2">Registry is empty</h3>
          <p className="text-text-secondary text-sm mb-6 max-w-xs mx-auto">Start by registering your first subject.</p>
          <button onClick={() => setDrawer({})} className="btn-primary inline-flex items-center gap-2 mx-auto py-3 px-8">
            <Plus className="w-4 h-4" /> Start Registration
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {subjects.map(subject => (
            <motion.div key={subject.id} whileHover={{ y: -4 }}
              className="card p-0 group relative overflow-hidden bg-surface hover:border-primary/40 transition-all duration-300">
              
              {/* Header color accent */}
              <div className="h-1.5 w-full" style={{ backgroundColor: subject.color_hex }} />
              
              <div className="p-5">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-outfit font-bold text-text-primary text-base truncate pr-2" title={subject.name}>{subject.name}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] font-bold text-primary uppercase tracking-tighter bg-primary/5 px-1.5 py-0.5 rounded-md border border-primary/10">
                        {subject.code || 'NO-CODE'}
                      </span>
                      <span className="text-[10px] text-text-secondary flex items-center gap-1 font-medium">
                        <Clock className="w-3 h-3" /> {subject.credits} Credits
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity translate-y-[-2px]">
                    <button onClick={() => setDrawer(subject)} className="p-2 rounded-xl bg-primary/5 hover:bg-primary/20 text-primary transition-all">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => deleteSubject(subject.id)} className="p-2 rounded-xl bg-danger/5 hover:bg-danger/20 text-danger transition-all">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Assignment Info */}
                <div className="space-y-3 pt-3 border-t border-border/50">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-elevated border border-border flex items-center justify-center text-text-secondary">
                      <Building className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[10px] text-text-secondary uppercase tracking-widest font-bold leading-none mb-1">Context</div>
                      <div className="text-xs text-text-primary font-medium truncate">
                        {subject.department?.name || 'Global'} • {subject.course?.name || 'N/A'} • {subject.semester?.name || 'N/A'}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-primary/5 border border-primary/10 flex items-center justify-center text-primary">
                      <User className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[10px] text-text-secondary uppercase tracking-widest font-bold leading-none mb-1">Faculty</div>
                      <div className="text-xs text-text-primary font-medium truncate">
                        {subject.assignedTeacher?.name || (
                          <span className="text-text-secondary italic">No teacher assigned</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Type Badge */}
                <div className="absolute bottom-4 right-4">
                  <div className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-widest border ${
                    subject.type === 'both' ? 'bg-primary/10 text-primary border-primary/20' : 
                    subject.type === 'lab' ? 'bg-purple/10 text-purple border-purple/20' : 
                    'bg-success/10 text-success border-success/20'
                  }`}>
                    {subject.type === 'both' ? 'Theory + Lab' : subject.type}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Drawer */}
      <AnimatePresence>
        {drawer !== null && (
          <>
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40" onClick={() => setDrawer(null)} />
            <SubjectDrawer subject={drawer?.id ? drawer : null} onClose={() => setDrawer(null)} onSave={saveSubject} />
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
