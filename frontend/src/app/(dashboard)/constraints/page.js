'use client';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Edit2, Trash2, X, Save, Users, Building2, Search, Toggle } from 'lucide-react';
import toast from 'react-hot-toast';
import { useForm } from 'react-hook-form';
import { teachersApi, subjectsApi, roomsApi } from '@/lib/api';
import useAuthStore from '@/lib/auth';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function TeacherDrawer({ teacher, subjects, onClose, onSave }) {
  const [availability, setAvailability] = useState(
    teacher?.availability?.reduce((acc, a) => {
      if (!a.is_available) { acc[`${a.day_of_week}_${a.slot_number}`] = false; }
      return acc;
    }, {}) || {}
  );
  const [selectedSubjects, setSelectedSubjects] = useState(teacher?.subjects?.map(s => s.id) || []);
  const { register, handleSubmit, formState: { errors } } = useForm({ defaultValues: teacher || { max_periods_per_day: 6, max_periods_per_week: 30 } });

  const onSubmit = async (data) => {
    const availabilityArray = [];
    for (let d = 0; d < 6; d++) {
      for (let s = 0; s < 8; s++) {
        availabilityArray.push({ day_of_week: d, slot_number: s, is_available: availability[`${d}_${s}`] !== false });
      }
    }
    await onSave({ ...data, subject_ids: selectedSubjects, availability: availabilityArray });
  };

  const toggleSlot = (d, s) => {
    const key = `${d}_${s}`;
    setAvailability(prev => ({ ...prev, [key]: prev[key] === false ? true : false }));
  };

  return (
    <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 25 }}
      className="fixed right-0 top-0 h-full w-[480px] bg-surface border-l border-border shadow-2xl z-50 flex flex-col">
      <div className="flex items-center justify-between p-5 border-b border-border">
        <h3 className="font-outfit font-bold text-text-primary">{teacher ? 'Edit Teacher' : 'Add Teacher'}</h3>
        <button onClick={onClose} className="text-text-secondary hover:text-text-primary"><X className="w-5 h-5" /></button>
      </div>
      <form onSubmit={handleSubmit(onSubmit)} className="flex-1 overflow-y-auto p-5 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-text-secondary mb-1 block">Name *</label>
            <input {...register('name', { required: true })} className="input-field" placeholder="Full name" />
            {errors.name && <p className="text-danger text-xs mt-1">Required</p>}
          </div>
          <div>
            <label className="text-xs text-text-secondary mb-1 block">Department</label>
            <input {...register('department')} className="input-field" placeholder="Math, Science..." />
          </div>
          <div>
            <label className="text-xs text-text-secondary mb-1 block">Email</label>
            <input {...register('email')} type="email" className="input-field" placeholder="email@school.com" />
          </div>
          <div>
            <label className="text-xs text-text-secondary mb-1 block">Employee Code</label>
            <input {...register('employee_code')} className="input-field" placeholder="T001" />
          </div>
          <div>
            <label className="text-xs text-text-secondary mb-1 block">Max Periods/Day</label>
            <input {...register('max_periods_per_day')} type="number" min="1" max="10" className="input-field" />
          </div>
          <div>
            <label className="text-xs text-text-secondary mb-1 block">Max Periods/Week</label>
            <input {...register('max_periods_per_week')} type="number" min="1" max="50" className="input-field" />
          </div>
        </div>

        {/* Subject assignment */}
        <div>
          <label className="text-xs text-text-secondary mb-2 block">Subjects</label>
          <div className="flex flex-wrap gap-2 p-3 bg-elevated rounded-xl border border-border min-h-[60px]">
            {subjects?.map(s => (
              <button key={s.id} type="button"
                onClick={() => setSelectedSubjects(prev => prev.includes(s.id) ? prev.filter(x => x !== s.id) : [...prev, s.id])}
                className={`text-xs px-2.5 py-1 rounded-lg border transition-all ${selectedSubjects.includes(s.id) ? 'bg-primary/20 border-primary/50 text-primary' : 'bg-surface border-border text-text-secondary hover:border-white/20'}`}>
                {s.name}
              </button>
            ))}
          </div>
        </div>

        {/* Availability grid */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs text-text-secondary">Availability Grid</label>
            <div className="flex gap-2 text-[10px]">
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-success/30 border border-success/50 inline-block" />Available</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-danger/20 border border-danger/30 inline-block" />Unavailable</span>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="text-xs w-full border-collapse">
              <thead>
                <tr>
                  <th className="text-text-secondary font-medium pb-1 text-left pr-2">Day</th>
                  {Array.from({length: 8}, (_, i) => <th key={i} className="text-text-secondary font-medium pb-1 px-1">{i+1}</th>)}
                </tr>
              </thead>
              <tbody>
                {DAYS.slice(0, 5).map((day, d) => (
                  <tr key={d}>
                    <td className="text-text-secondary pr-2 py-0.5">{day}</td>
                    {Array.from({length: 8}, (_, s) => {
                      const key = `${d}_${s}`;
                      const isUnavailable = availability[key] === false;
                      return (
                        <td key={s} className="py-0.5 px-0.5">
                          <button type="button" onClick={() => toggleSlot(d, s)}
                            className={`w-6 h-6 rounded border transition-all ${isUnavailable ? 'bg-danger/20 border-danger/30 hover:bg-danger/30' : 'bg-success/10 border-success/20 hover:bg-success/20'}`} />
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <button type="button" onClick={onClose} className="btn-ghost flex-1">Cancel</button>
          <button type="submit" className="btn-primary flex-1 flex items-center justify-center gap-2">
            <Save className="w-4 h-4" />Save
          </button>
        </div>
      </form>
    </motion.div>
  );
}

function RoomDrawer({ room, onClose, onSave }) {
  const { register, handleSubmit, formState: { errors } } = useForm({ defaultValues: room || { capacity: 40, room_type: 'classroom', is_available: true } });

  return (
    <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 25 }}
      className="fixed right-0 top-0 h-full w-96 bg-surface border-l border-border shadow-2xl z-50 flex flex-col">
      <div className="flex items-center justify-between p-5 border-b border-border">
        <h3 className="font-outfit font-bold text-text-primary">{room ? 'Edit Room' : 'Add Room'}</h3>
        <button onClick={onClose} className="text-text-secondary hover:text-text-primary"><X className="w-5 h-5" /></button>
      </div>
      <form onSubmit={handleSubmit(onSave)} className="flex-1 overflow-y-auto p-5 space-y-4">
        <div>
          <label className="text-xs text-text-secondary mb-1 block">Room Name *</label>
          <input {...register('name', { required: true })} className="input-field" placeholder="Room 101" />
          {errors.name && <p className="text-danger text-xs mt-1">Required</p>}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-text-secondary mb-1 block">Capacity</label>
            <input {...register('capacity')} type="number" className="input-field" placeholder="40" />
          </div>
          <div>
            <label className="text-xs text-text-secondary mb-1 block">Floor</label>
            <input {...register('floor')} type="number" className="input-field" placeholder="1" />
          </div>
        </div>
        <div>
          <label className="text-xs text-text-secondary mb-1 block">Building</label>
          <input {...register('building')} className="input-field" placeholder="Main Block" />
        </div>
        <div>
          <label className="text-xs text-text-secondary mb-2 block">Room Type</label>
          <div className="grid grid-cols-2 gap-2">
            {['classroom', 'lab', 'auditorium', 'seminar_hall'].map(type => (
              <label key={type} className="flex items-center gap-2 p-2.5 rounded-xl border border-border cursor-pointer hover:border-primary/30 transition-colors has-[:checked]:border-primary/50 has-[:checked]:bg-primary/5">
                <input {...register('room_type')} type="radio" value={type} className="accent-primary" />
                <span className="text-xs capitalize text-text-secondary">{type.replace('_', ' ')}</span>
              </label>
            ))}
          </div>
        </div>
        <div className="flex gap-3 pt-2">
          <button type="button" onClick={onClose} className="btn-ghost flex-1">Cancel</button>
          <button type="submit" className="btn-primary flex-1 flex items-center justify-center gap-2">
            <Save className="w-4 h-4" />Save
          </button>
        </div>
      </form>
    </motion.div>
  );
}

export default function ConstraintsPage() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [teacherDrawer, setTeacherDrawer] = useState(null);
  const [roomDrawer, setRoomDrawer] = useState(null);
  const [teacherSearch, setTeacherSearch] = useState('');
  const [roomSearch, setRoomSearch] = useState('');

  const { data: teachersData, isLoading: teachersLoading } = useQuery({
    queryKey: ['teachers', teacherSearch],
    queryFn: () => teachersApi.getAll({ search: teacherSearch, limit: 50 }),
  });

  const { data: subjectsData } = useQuery({
    queryKey: ['subjects'],
    queryFn: () => subjectsApi.getAll({ limit: 100 }),
  });

  const { data: roomsData, isLoading: roomsLoading } = useQuery({
    queryKey: ['rooms'],
    queryFn: () => roomsApi.getAll({ limit: 100 }),
  });

  const saveTeacher = async (data) => {
    try {
      const { availability, ...teacherData } = data;
      if (teacherDrawer?.id) {
        await teachersApi.update(teacherDrawer.id, teacherData);
        await teachersApi.updateAvailability(teacherDrawer.id, { availability });
      } else {
        const created = await teachersApi.create(teacherData);
        if (availability) await teachersApi.updateAvailability(created.id, { availability });
      }
      toast.success('Teacher saved ✓');
      queryClient.invalidateQueries({ queryKey: ['teachers'] });
      setTeacherDrawer(null);
    } catch (e) { toast.error(e.response?.data?.error || 'Save failed'); }
  };

  const deleteTeacher = async (id) => {
    if (!confirm('Deactivate this teacher?')) return;
    await teachersApi.delete(id);
    toast.success('Teacher deactivated');
    queryClient.invalidateQueries({ queryKey: ['teachers'] });
  };

  const saveRoom = async (data) => {
    try {
      if (roomDrawer?.id) await roomsApi.update(roomDrawer.id, data);
      else await roomsApi.create(data);
      toast.success('Room saved ✓');
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
      setRoomDrawer(null);
    } catch (e) { toast.error(e.response?.data?.error || 'Save failed'); }
  };

  const deleteRoom = async (id) => {
    if (!confirm('Mark room unavailable?')) return;
    await roomsApi.delete(id);
    toast.success('Room updated');
    queryClient.invalidateQueries({ queryKey: ['rooms'] });
  };

  const teachers = teachersData?.teachers || [];
  const rooms = roomsData?.rooms || [];
  const subjects = subjectsData?.subjects || [];
  const filteredRooms = rooms.filter(r => r.name.toLowerCase().includes(roomSearch.toLowerCase()));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Teachers Section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary/15"><Users className="w-5 h-5 text-primary" /></div>
            <div>
              <h2 className="font-outfit font-bold text-text-primary">Teachers</h2>
              <p className="text-xs text-text-secondary">{teachers.length} active</p>
            </div>
          </div>
          <button onClick={() => setTeacherDrawer({})} className="btn-primary text-sm flex items-center gap-1.5 py-2 px-3">
            <Plus className="w-4 h-4" />Add
          </button>
        </div>

        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
          <input value={teacherSearch} onChange={e => setTeacherSearch(e.target.value)} className="input-field pl-9" placeholder="Search teachers..." />
        </div>

        <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
          {teachersLoading ? (
            [1,2,3].map(i => <div key={i} className="skeleton h-20 rounded-xl" />)
          ) : teachers.map(teacher => (
            <motion.div key={teacher.id} whileHover={{ scale: 1.01 }}
              className="card hover:border-white/15 transition-all">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary/30 to-purple/30 flex items-center justify-center text-xs font-bold text-primary">
                      {teacher.name.charAt(0)}
                    </div>
                    <span className="font-medium text-sm text-text-primary">{teacher.name}</span>
                    {teacher.department && <span className="text-xs text-text-secondary">• {teacher.department}</span>}
                  </div>
                  <div className="flex flex-wrap gap-1 mb-2">
                    {teacher.subjects?.slice(0, 3).map(s => (
                      <span key={s.id} className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">{s.name}</span>
                    ))}
                    {teacher.subjects?.length > 3 && <span className="text-[10px] text-text-secondary">+{teacher.subjects.length - 3}</span>}
                  </div>
                  <div className="flex items-center gap-3 text-[10px] text-text-secondary">
                    <span>Max {teacher.max_periods_per_day}/day</span>
                    <span>•</span>
                    <span>Max {teacher.max_periods_per_week}/week</span>
                  </div>
                </div>
                <div className="flex gap-1 ml-2">
                  <button onClick={() => setTeacherDrawer(teacher)} className="p-1.5 rounded-lg hover:bg-primary/10 text-text-secondary hover:text-primary">
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => deleteTeacher(teacher.id)} className="p-1.5 rounded-lg hover:bg-danger/10 text-text-secondary hover:text-danger">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
          {!teachersLoading && teachers.length === 0 && (
            <div className="card text-center py-8">
              <Users className="w-10 h-10 text-text-secondary mx-auto mb-2 opacity-50" />
              <p className="text-text-secondary text-sm">No teachers yet</p>
              <button onClick={() => setTeacherDrawer({})} className="btn-primary text-xs mt-3 py-1.5 px-3">Add First Teacher</button>
            </div>
          )}
        </div>
      </div>

      {/* Rooms Section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-warning/15"><Building2 className="w-5 h-5 text-warning" /></div>
            <div>
              <h2 className="font-outfit font-bold text-text-primary">Rooms</h2>
              <p className="text-xs text-text-secondary">{rooms.length} available</p>
            </div>
          </div>
          <button onClick={() => setRoomDrawer({})} className="btn-primary text-sm flex items-center gap-1.5 py-2 px-3">
            <Plus className="w-4 h-4" />Add
          </button>
        </div>

        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
          <input value={roomSearch} onChange={e => setRoomSearch(e.target.value)} className="input-field pl-9" placeholder="Search rooms..." />
        </div>

        <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
          {roomsLoading ? (
            [1,2,3].map(i => <div key={i} className="skeleton h-16 rounded-xl" />)
          ) : filteredRooms.map(room => (
            <motion.div key={room.id} whileHover={{ scale: 1.01 }}
              className="card hover:border-white/15 transition-all">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-sm text-text-primary">{room.name}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded ${room.room_type === 'lab' ? 'bg-purple/10 text-purple border border-purple/20' : 'bg-success/10 text-success border border-success/20'}`}>
                      {room.room_type}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-text-secondary">
                    <span>Capacity: {room.capacity}</span>
                    {room.floor && <span>• Floor {room.floor}</span>}
                    {room.building && <span>• {room.building}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-1 ml-2">
                  <span className={`text-[10px] px-2 py-0.5 rounded-full ${room.is_available ? 'text-success bg-success/10' : 'text-danger bg-danger/10'}`}>
                    {room.is_available ? 'Available' : 'Unavailable'}
                  </span>
                  <button onClick={() => setRoomDrawer(room)} className="p-1.5 rounded-lg hover:bg-primary/10 text-text-secondary hover:text-primary">
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => deleteRoom(room.id)} className="p-1.5 rounded-lg hover:bg-danger/10 text-text-secondary hover:text-danger">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
          {!roomsLoading && filteredRooms.length === 0 && (
            <div className="card text-center py-8">
              <Building2 className="w-10 h-10 text-text-secondary mx-auto mb-2 opacity-50" />
              <p className="text-text-secondary text-sm">No rooms yet</p>
              <button onClick={() => setRoomDrawer({})} className="btn-primary text-xs mt-3 py-1.5 px-3">Add First Room</button>
            </div>
          )}
        </div>
      </div>

      {/* Drawers */}
      <AnimatePresence>
        {teacherDrawer !== null && (
          <>
            <div className="fixed inset-0 bg-black/50 z-40" onClick={() => setTeacherDrawer(null)} />
            <TeacherDrawer teacher={teacherDrawer?.id ? teacherDrawer : null} subjects={subjects}
              onClose={() => setTeacherDrawer(null)} onSave={saveTeacher} />
          </>
        )}
        {roomDrawer !== null && (
          <>
            <div className="fixed inset-0 bg-black/50 z-40" onClick={() => setRoomDrawer(null)} />
            <RoomDrawer room={roomDrawer?.id ? roomDrawer : null}
              onClose={() => setRoomDrawer(null)} onSave={saveRoom} />
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
