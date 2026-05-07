'use client';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Edit2, Trash2, X, Save, BookOpen, Search, FlaskConical, Clock } from 'lucide-react';
import toast from 'react-hot-toast';
import { useForm } from 'react-hook-form';
import { subjectsApi } from '@/lib/api';

const SUBJECT_COLORS = [
  '#4F8EF7', '#10B981', '#F59E0B', '#8B5CF6', '#EF4444',
  '#06B6D4', '#F97316', '#84CC16', '#EC4899', '#6366F1',
];

function SubjectDrawer({ subject, onClose, onSave }) {
  const [selectedColor, setSelectedColor] = useState(subject?.color_hex || SUBJECT_COLORS[0]);
  const { register, handleSubmit, formState: { errors }, watch } = useForm({
    defaultValues: subject || {
      name: '', code: '', periods_per_week: 4, requires_lab: false,
      student_group: '', color_hex: SUBJECT_COLORS[0],
    },
  });

  const onSubmit = (data) => onSave({ ...data, color_hex: selectedColor, requires_lab: data.requires_lab === true || data.requires_lab === 'true' });

  return (
    <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 25 }}
      className="fixed right-0 top-0 h-full w-96 bg-surface border-l border-border shadow-2xl z-50 flex flex-col">
      <div className="flex items-center justify-between p-5 border-b border-border">
        <h3 className="font-outfit font-bold text-text-primary">{subject ? 'Edit Subject' : 'Add Subject'}</h3>
        <button onClick={onClose} className="text-text-secondary hover:text-text-primary"><X className="w-5 h-5" /></button>
      </div>
      <form onSubmit={handleSubmit(onSubmit)} className="flex-1 overflow-y-auto p-5 space-y-4">
        <div>
          <label className="text-xs text-text-secondary mb-1 block">Subject Name *</label>
          <input {...register('name', { required: 'Name is required' })} className="input-field" placeholder="e.g. Mathematics" />
          {errors.name && <p className="text-danger text-xs mt-1">{errors.name.message}</p>}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-text-secondary mb-1 block">Code</label>
            <input {...register('code')} className="input-field" placeholder="MATH" />
          </div>
          <div>
            <label className="text-xs text-text-secondary mb-1 block">Periods / Week *</label>
            <input {...register('periods_per_week', { required: true, min: 1, max: 30 })}
              type="number" min="1" max="30" className="input-field" />
          </div>
        </div>

        <div>
          <label className="text-xs text-text-secondary mb-1 block">Student Group / Class</label>
          <input {...register('student_group')} className="input-field" placeholder="e.g. Class 10A, Sem 3, All" />
          <p className="text-[10px] text-text-secondary mt-1">Leave blank for all groups</p>
        </div>

        <div>
          <label className="text-xs text-text-secondary mb-2 block">Requires Lab?</label>
          <div className="flex gap-3">
            {[{ val: false, label: 'No' }, { val: true, label: 'Yes (Lab needed)' }].map(opt => (
              <label key={String(opt.val)}
                className="flex items-center gap-2 p-3 rounded-xl border cursor-pointer flex-1 transition-all has-[:checked]:border-purple/50 has-[:checked]:bg-purple/5 border-border">
                <input {...register('requires_lab')} type="radio" value={String(opt.val)} className="accent-purple" defaultChecked={!subject?.requires_lab && opt.val === false} />
                <span className="text-sm text-text-secondary">{opt.label}</span>
              </label>
            ))}
          </div>
        </div>

        <div>
          <label className="text-xs text-text-secondary mb-2 block">Color Tag</label>
          <div className="flex flex-wrap gap-2">
            {SUBJECT_COLORS.map(color => (
              <button key={color} type="button" onClick={() => setSelectedColor(color)}
                className={`w-7 h-7 rounded-full border-2 transition-transform hover:scale-110 ${selectedColor === color ? 'border-white scale-110' : 'border-transparent'}`}
                style={{ backgroundColor: color }} />
            ))}
          </div>
          <div className="mt-2 flex items-center gap-2">
            <div className="w-4 h-4 rounded-full" style={{ backgroundColor: selectedColor }} />
            <span className="text-xs text-text-secondary">{selectedColor}</span>
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <button type="button" onClick={onClose} className="btn-ghost flex-1">Cancel</button>
          <button type="submit" className="btn-primary flex-1 flex items-center justify-center gap-2">
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
  const groups = [...new Set(subjects.map(s => s.student_group || 'All'))];

  const saveSubject = async (formData) => {
    try {
      if (drawer?.id) await subjectsApi.update(drawer.id, formData);
      else await subjectsApi.create(formData);
      toast.success('Subject saved!');
      queryClient.invalidateQueries({ queryKey: ['subjects'] });
      setDrawer(null);
    } catch (e) { toast.error(e.response?.data?.error || 'Save failed'); }
  };

  const deleteSubject = async (id) => {
    if (!confirm('Deactivate this subject?')) return;
    await subjectsApi.delete(id);
    toast.success('Subject deactivated');
    queryClient.invalidateQueries({ queryKey: ['subjects'] });
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-success/15">
            <BookOpen className="w-5 h-5 text-success" />
          </div>
          <div>
            <h1 className="font-outfit text-xl font-bold text-text-primary">Subjects</h1>
            <p className="text-text-secondary text-xs mt-0.5">{subjects.length} subjects • {groups.length} groups</p>
          </div>
        </div>
        <button onClick={() => setDrawer({})} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> Add Subject
        </button>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
        <input value={search} onChange={e => setSearch(e.target.value)}
          className="input-field pl-9" placeholder="Search subjects..." />
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Total Subjects', value: subjects.length, color: 'success' },
          { label: 'Lab Required', value: subjects.filter(s => s.requires_lab).length, color: 'purple' },
          { label: 'Total Periods/Week', value: subjects.reduce((sum, s) => sum + (s.periods_per_week || 0), 0), color: 'primary' },
        ].map(s => (
          <div key={s.label} className="card text-center py-3">
            <div className={`text-2xl font-outfit font-bold text-${s.color}`}>{s.value}</div>
            <div className="text-xs text-text-secondary mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Subjects grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {[1,2,3,4,5,6].map(i => <div key={i} className="skeleton h-28 rounded-xl" />)}
        </div>
      ) : subjects.length === 0 ? (
        <div className="card text-center py-16">
          <div className="w-16 h-16 rounded-2xl bg-success/10 flex items-center justify-center mx-auto mb-4">
            <BookOpen className="w-8 h-8 text-success opacity-50" />
          </div>
          <h3 className="font-outfit font-semibold text-text-primary mb-2">No subjects yet</h3>
          <p className="text-text-secondary text-sm mb-4">Add subjects that teachers will teach in the timetable</p>
          <button onClick={() => setDrawer({})} className="btn-primary inline-flex items-center gap-2 mx-auto">
            <Plus className="w-4 h-4" /> Add First Subject
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {subjects.map(subject => (
            <motion.div key={subject.id} whileHover={{ y: -2 }}
              className="card hover:border-white/15 transition-all group relative overflow-hidden">
              {/* Color strip */}
              <div className="absolute top-0 left-0 right-0 h-1 rounded-t-xl" style={{ backgroundColor: subject.color_hex || '#4F8EF7' }} />

              <div className="pt-2">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: (subject.color_hex || '#4F8EF7') + '25' }}>
                      <BookOpen className="w-4 h-4" style={{ color: subject.color_hex || '#4F8EF7' }} />
                    </div>
                    <div>
                      <div className="font-semibold text-sm text-text-primary">{subject.name}</div>
                      {subject.code && <div className="text-[10px] text-text-secondary">{subject.code}</div>}
                    </div>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => setDrawer(subject)} className="p-1.5 rounded-lg hover:bg-primary/10 text-text-secondary hover:text-primary">
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => deleteSubject(subject.id)} className="p-1.5 rounded-lg hover:bg-danger/10 text-text-secondary hover:text-danger">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-3 flex-wrap">
                  <div className="flex items-center gap-1 text-xs text-text-secondary">
                    <Clock className="w-3 h-3" />
                    <span>{subject.periods_per_week} periods/week</span>
                  </div>
                  {subject.requires_lab && (
                    <div className="flex items-center gap-1 text-xs text-purple">
                      <FlaskConical className="w-3 h-3" />
                      <span>Lab</span>
                    </div>
                  )}
                </div>

                {subject.student_group && (
                  <div className="mt-2">
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                      {subject.student_group}
                    </span>
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Drawer */}
      <AnimatePresence>
        {drawer !== null && (
          <>
            <div className="fixed inset-0 bg-black/50 z-40" onClick={() => setDrawer(null)} />
            <SubjectDrawer subject={drawer?.id ? drawer : null} onClose={() => setDrawer(null)} onSave={saveSubject} />
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
