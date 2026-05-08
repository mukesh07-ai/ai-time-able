'use client';
import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, UserPlus, Users, Search, X, Save, Shield, User as UserIcon, GraduationCap, Trash2, Info, BookOpen } from 'lucide-react';
import toast from 'react-hot-toast';
import { useForm } from 'react-hook-form';
import { usersApi, teachersApi, departmentsApi, subjectsApi } from '@/lib/api';
import useAuthStore from '@/lib/auth';
import Select from '@/components/ui/Select';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function UserDrawer({ mode, onClose, onSave }) {
  const [availability, setAvailability] = useState({});
  const generatePass = () => Math.random().toString(36).slice(-8) + Math.floor(Math.random() * 100);

  // Fetch Data
  const { data: depts } = useQuery({ 
    queryKey: ['departments'], 
    queryFn: () => departmentsApi.getAll(),
    enabled: mode === 'teacher'
  });

  const { register, handleSubmit, formState: { errors }, watch, setValue } = useForm({
    defaultValues: { 
      password: generatePass(),
      department_id: ''
    }
  });

  const selectedDeptId = watch('department_id');

  const toggleSlot = (d, s) => {
    const key = `${d}_${s}`;
    setAvailability(prev => ({ ...prev, [key]: prev[key] === false ? true : false }));
  };

  const onSubmit = (data) => {
    if (mode === 'teacher') {
      const availabilityArray = [];
      for (let d = 0; d < 6; d++) {
        for (let s = 0; s < 8; s++) {
          availabilityArray.push({ day_of_week: d, slot_number: s, is_available: availability[`${d}_${s}`] !== false });
        }
      }
      onSave({ ...data, availability: availabilityArray });
    } else {
      onSave(data);
    }
  };

  return (
    <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 25 }}
      className="fixed right-0 top-0 h-full w-[520px] bg-surface border-l border-border shadow-2xl z-50 flex flex-col">
      <div className="flex items-center justify-between p-5 border-b border-border bg-elevated/50">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <UserPlus className="w-5 h-5 text-primary" />
          </div>
          <h3 className="font-outfit font-bold text-text-primary">New {mode === 'teacher' ? 'Faculty Member' : 'Student Account'}</h3>
        </div>
        <button onClick={onClose} className="text-text-secondary hover:text-text-primary p-2 hover:bg-white/5 rounded-full"><X className="w-5 h-5" /></button>
      </div>
      <form onSubmit={handleSubmit(onSubmit)} className="flex-1 overflow-y-auto p-6 space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="text-xs text-text-secondary mb-1.5 block ml-1">Full Name *</label>
            <input {...register('name', { required: 'Name is required' })} className="input-field" placeholder="e.g. Dr. Mukesh Sharma" />
            {errors.name && <p className="text-danger text-[10px] mt-1 ml-1">{errors.name.message}</p>}
          </div>
          
          <div className="col-span-2">
            <label className="text-xs text-text-secondary mb-1.5 block ml-1">Email Address *</label>
            <input {...register('email', { required: 'Email is required' })} type="email" className="input-field" placeholder="mukesh@university.com" />
            {errors.email && <p className="text-danger text-[10px] mt-1 ml-1">{errors.email.message}</p>}
          </div>

          {mode === 'teacher' && (
            <div className="col-span-2">
              <label className="text-xs text-text-secondary mb-1.5 block ml-1">Primary Department *</label>
              <Select 
                options={depts?.map(d => ({ value: d.id, label: d.name }))}
                value={selectedDeptId}
                onChange={(val) => setValue('department_id', val)}
                placeholder="Assign Department"
              />
              <input type="hidden" {...register('department_id', { required: 'Department assignment is required' })} />
            </div>
          )}

          <div className="col-span-2 p-4 rounded-2xl bg-primary/5 border border-primary/10">
            <label className="text-[10px] font-bold text-primary mb-2 block uppercase tracking-widest flex items-center gap-2">
              <Shield className="w-3.5 h-3.5" /> Generated Credentials
            </label>
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="text-[10px] text-text-secondary mb-1 block">Login Password</label>
                <input {...register('password')} type="text" className="input-field py-2 text-sm" placeholder="Password" />
              </div>
              <button type="button" onClick={() => setValue('password', generatePass())} className="text-[9px] text-primary hover:underline mt-6">Reset</button>
            </div>
          </div>
        </div>

        {mode === 'teacher' && (
          <>


            {/* Teaching Availability */}
            <div className="space-y-4 pt-4 border-t border-border/50">
              <div className="flex items-center justify-between ml-1">
                <label className="text-xs font-bold text-text-secondary uppercase tracking-widest">Teaching Availability</label>
                <div className="flex gap-2">
                  <button type="button" onClick={() => {
                    const newAvail = {};
                    for(let d=0; d<6; d++) for(let s=0; s<8; s++) newAvail[`${d}_${s}`] = true;
                    setAvailability(newAvail);
                  }} className="text-[9px] font-bold px-2 py-1 rounded-lg border border-primary/30 text-primary hover:bg-primary/10 transition-all uppercase tracking-tighter">Full Day</button>
                  <button type="button" onClick={() => {
                    const newAvail = {};
                    for(let d=0; d<6; d++) for(let s=0; s<8; s++) newAvail[`${d}_${s}`] = s < 4;
                    setAvailability(newAvail);
                  }} className="text-[9px] font-bold px-2 py-1 rounded-lg border border-warning/30 text-warning hover:bg-warning/10 transition-all uppercase tracking-tighter">Half Day (M)</button>
                  <button type="button" onClick={() => {
                    const newAvail = {};
                    for(let d=0; d<6; d++) for(let s=0; s<8; s++) newAvail[`${d}_${s}`] = s >= 4;
                    setAvailability(newAvail);
                  }} className="text-[9px] font-bold px-2 py-1 rounded-lg border border-success/30 text-success hover:bg-success/10 transition-all uppercase tracking-tighter">Evening Shift</button>
                </div>
              </div>
              <div className="p-4 bg-elevated/50 rounded-2xl border border-border">
                <div className="overflow-x-auto">
                  <table className="text-[10px] w-full border-collapse">
                    <thead>
                      <tr>
                        <th className="text-text-secondary font-bold pb-2 text-left pr-3 opacity-50 uppercase tracking-tighter">Day</th>
                        {Array.from({length: 8}, (_, i) => <th key={i} className="text-text-secondary font-bold pb-2 px-1 text-center opacity-50">S{i+1}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {DAYS.map((day, d) => (
                        <tr key={d}>
                          <td className="text-text-primary font-bold pr-3 py-1.5">{day}</td>
                          {Array.from({length: 8}, (_, s) => {
                            const key = `${d}_${s}`;
                            const isUnavailable = availability[key] === false;
                            return (
                              <td key={s} className="py-1 px-1">
                                <button type="button" onClick={() => toggleSlot(d, s)}
                                  className={`w-8 h-8 rounded-lg border-2 transition-all flex items-center justify-center ${isUnavailable ? 'bg-danger/10 border-danger/30 text-danger hover:bg-danger/20' : 'bg-success/5 border-success/20 text-success hover:bg-success/10'}`}>
                                  {!isUnavailable && <div className="w-1.5 h-1.5 rounded-full bg-success/60" />}
                                </button>
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </>
        )}

        {mode === 'student' && (
          <div className="space-y-4 pt-4 border-t border-border/50">
            <label className="text-xs text-text-secondary mb-1.5 block ml-1">Target Student Group / Class *</label>
            <input {...register('student_group', { required: 'Student group is required' })} className="input-field" placeholder="e.g. Class 10-A or BCA 1st Sem" />
          </div>
        )}

        <div className="flex gap-4 pt-6 border-t border-border/50">
          <button type="button" onClick={onClose} className="btn-ghost flex-1 py-3 text-sm">Cancel</button>
          <button type="submit" className="btn-primary flex-1 flex items-center justify-center gap-2 py-3 shadow-lg shadow-primary/20">
            <Save className="w-4 h-4" /> Create Account
          </button>
        </div>
      </form>
    </motion.div>
  );
}

export default function UsersPage() {
  const queryClient = useQueryClient();
  const { user: authUser } = useAuthStore();
  const [drawer, setDrawer] = useState(null);
  const [search, setSearch] = useState('');

  const { data: users, isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () => usersApi.getAll(),
  });

  const saveUser = async (formData) => {
    try {
      if (drawer === 'teacher') {
        const { availability, ...userData } = formData;
        const result = await usersApi.addTeacher(userData);
        const teacherId = result.teacher?.id || result.user?.teacherProfile?.id;
        if (teacherId && availability) {
          await teachersApi.updateAvailability(teacherId, { availability });
        }
      } else {
        await usersApi.addStudent(formData);
      }
      toast.success('User added successfully!');
      queryClient.invalidateQueries({ queryKey: ['users', 'teachers'] });
      setDrawer(null);
    } catch (e) { toast.error(e.response?.data?.error || 'Save failed'); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Permanently delete this user and all associated records?')) return;
    try {
      await usersApi.delete(id);
      toast.success('User and profile deleted');
      queryClient.invalidateQueries({ queryKey: ['users', 'teachers'] });
    } catch (e) { toast.error(e.response?.data?.error || 'Delete failed'); }
  };

  const filteredUsers = users?.filter(u => 
    u.name.toLowerCase().includes(search.toLowerCase()) || 
    u.email.toLowerCase().includes(search.toLowerCase())
  ) || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-primary/10 border border-primary/20">
            <Users className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="font-outfit text-2xl font-bold text-text-primary">Identity Management</h1>
            <p className="text-text-secondary text-xs mt-0.5 font-bold uppercase tracking-widest text-[10px]">Administrative Access Control</p>
          </div>
        </div>
        <div className="flex gap-3">
          <button onClick={() => setDrawer('teacher')} className="btn-ghost text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 py-2.5 px-5 border-primary/30 text-primary hover:bg-primary/5">
            <UserPlus className="w-4 h-4" /> Add Faculty
          </button>
          <button onClick={() => setDrawer('student')} className="btn-primary text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 py-2.5 px-6 shadow-xl shadow-primary/20">
            <Plus className="w-4 h-4" /> Add Student
          </button>
        </div>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
        <input value={search} onChange={e => setSearch(e.target.value)} className="input-field pl-11 py-3" placeholder="Search accounts by name or email..." />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {isLoading ? (
          [1,2,3,4,5,6].map(i => <div key={i} className="skeleton h-36 rounded-[24px]" />)
        ) : filteredUsers.map(user => (
          <motion.div key={user.id} whileHover={{ y: -4 }} className="card group relative overflow-hidden bg-surface p-5 hover:border-primary/40 transition-all duration-300">
            <div className={`absolute top-0 left-0 w-1.5 h-full ${user.role === 'admin' ? 'bg-purple' : user.role === 'teacher' ? 'bg-primary' : 'bg-success'}`} />
            
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white font-bold shadow-lg ${user.role === 'admin' ? 'bg-gradient-to-br from-purple to-indigo-600' : user.role === 'teacher' ? 'bg-gradient-to-br from-primary to-blue-600' : 'bg-gradient-to-br from-success to-emerald-600'}`}>
                  {user.name.charAt(0)}
                </div>
                <div className="min-w-0">
                  <h4 className="font-outfit font-bold text-sm text-text-primary truncate" title={user.name}>{user.name}</h4>
                  <p className="text-[10px] text-text-secondary font-medium truncate">{user.email}</p>
                </div>
              </div>
              <div className="flex flex-col items-end gap-2">
                <span className={`text-[9px] font-bold px-2 py-1 rounded-lg uppercase tracking-widest border ${user.role === 'admin' ? 'bg-purple/10 text-purple border-purple/20' : user.role === 'teacher' ? 'bg-primary/10 text-primary border-primary/20' : 'bg-success/10 text-success border-success/20'}`}>
                  {user.role}
                </span>
                {user.id !== authUser?.id && (
                  <button onClick={() => handleDelete(user.id)} className="p-2 rounded-xl hover:bg-danger/10 text-text-secondary hover:text-danger transition-all group/del opacity-0 group-hover:opacity-100">
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            <div className="pt-3 border-t border-border/50 flex items-center justify-between">
              <div className="flex items-center gap-2 text-[10px] font-bold text-text-secondary uppercase tracking-tighter bg-white/5 px-3 py-1 rounded-lg">
                {user.role === 'admin' && <Shield className="w-3 h-3 text-purple" />}
                {user.role === 'teacher' && <UserIcon className="w-3 h-3 text-primary" />}
                {user.role === 'student' && <GraduationCap className="w-3 h-3 text-success" />}
                <span className="truncate">
                  {user.role === 'teacher' ? (user.teacherProfile?.department?.name || 'Unassigned Faculty') : 
                   user.role === 'student' ? (user.studentProfile?.student_group || 'Public Group') : 
                   'Primary Administrator'}
                </span>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <AnimatePresence>
        {drawer && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40" onClick={() => setDrawer(null)} />
            <UserDrawer mode={drawer} onClose={() => setDrawer(null)} onSave={saveUser} />
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
