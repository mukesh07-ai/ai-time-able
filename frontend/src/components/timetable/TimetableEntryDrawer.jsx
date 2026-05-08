'use client';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Save, User, Book, Building2, Trash2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { teachersApi, subjectsApi, roomsApi } from '@/lib/api';
import Select from '@/components/ui/Select';
import toast from 'react-hot-toast';

export default function TimetableEntryDrawer({ entry, timetableId, day, slot, group, onClose, onSave }) {
  const [selectedSubject, setSelectedSubject] = useState(entry?.subject?.id || '');
  const [selectedTeacher, setSelectedTeacher] = useState(entry?.teacher?.id || '');
  const [selectedRoom, setSelectedRoom] = useState(entry?.room?.id || '');
  const [saving, setSaving] = useState(false);

  const { data: teachers } = useQuery({ queryKey: ['teachers'], queryFn: () => teachersApi.getAll({ limit: 1000 }) });
  const { data: subjects } = useQuery({ queryKey: ['subjects'], queryFn: () => subjectsApi.getAll({ limit: 1000 }) });
  const { data: rooms } = useQuery({ queryKey: ['rooms'], queryFn: () => roomsApi.getAll({ limit: 1000 }) });

  const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave({
        day_of_week: day,
        slot_number: slot,
        student_group: group,
        subject_id: selectedSubject || null,
        teacher_id: selectedTeacher || null,
        room_id: selectedRoom || null
      });
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to save entry');
    } finally {
      setSaving(false);
    }
  };

  const handleClear = async () => {
    if (!confirm('Clear this slot?')) return;
    setSaving(true);
    try {
      await onSave({
        day_of_week: day,
        slot_number: slot,
        student_group: group,
        subject_id: null,
        teacher_id: null,
        room_id: null
      });
      onClose();
    } catch (err) {
      toast.error('Failed to clear slot');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      
      <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 25 }}
        className="relative w-[400px] bg-surface border-l border-border h-full flex flex-col shadow-2xl">
        
        <div className="flex items-center justify-between p-5 border-b border-border bg-elevated/50">
          <div>
            <h3 className="font-outfit font-bold text-text-primary">Edit Slot</h3>
            <p className="text-[10px] text-text-secondary font-bold uppercase tracking-widest">{DAYS[day]} • Slot {slot + 1} • {group}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full text-text-secondary hover:text-text-primary transition-colors"><X className="w-5 h-5" /></button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="space-y-4">
            <div>
              <label className="text-xs text-text-secondary mb-1.5 block ml-1 flex items-center gap-2">
                <Book className="w-3.5 h-3.5" /> Subject
              </label>
              <Select 
                options={subjects?.subjects?.map(s => ({ value: s.id, label: `${s.name} (${s.code})` })) || []}
                value={selectedSubject}
                onChange={setSelectedSubject}
                placeholder="Select Subject"
              />
            </div>

            <div>
              <label className="text-xs text-text-secondary mb-1.5 block ml-1 flex items-center gap-2">
                <User className="w-3.5 h-3.5" /> Faculty
              </label>
              <Select 
                options={teachers?.teachers?.map(t => ({ value: t.id, label: t.name })) || []}
                value={selectedTeacher}
                onChange={setSelectedTeacher}
                placeholder="Select Teacher"
              />
            </div>

            <div>
              <label className="text-xs text-text-secondary mb-1.5 block ml-1 flex items-center gap-2">
                <Building2 className="w-3.5 h-3.5" /> Classroom / Lab
              </label>
              <Select 
                options={rooms?.rooms?.map(r => ({ value: r.id, label: `${r.name} (${r.room_type})` })) || []}
                value={selectedRoom}
                onChange={setSelectedRoom}
                placeholder="Select Room"
              />
            </div>
          </div>

          <div className="pt-6 border-t border-border/50 flex flex-col gap-3">
            <button type="submit" disabled={saving} className="btn-primary w-full py-3 flex items-center justify-center gap-2 shadow-lg shadow-primary/20">
              <Save className="w-4 h-4" /> {saving ? 'Saving...' : 'Update Slot'}
            </button>
            {entry && (
              <button type="button" onClick={handleClear} disabled={saving} className="btn-ghost w-full py-3 flex items-center justify-center gap-2 text-danger hover:bg-danger/5 border-danger/20 hover:border-danger/40">
                <Trash2 className="w-4 h-4" /> Clear Slot
              </button>
            )}
          </div>
        </form>
      </motion.div>
    </div>
  );
}
