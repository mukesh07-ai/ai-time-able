'use client';
import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Edit2, Trash2, X, Save, Users, Building2, Search, Info, Clock, BookOpen, Layers, Book } from 'lucide-react';
import toast from 'react-hot-toast';
import { useForm } from 'react-hook-form';
import { teachersApi, subjectsApi, roomsApi, usersApi, departmentsApi } from '@/lib/api';
import useAuthStore from '@/lib/auth';
import Select from '@/components/ui/Select';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function TeacherDrawer({ teacher, subjects, onClose, onSave }) {
  const generatePass = () => Math.random().toString(36).slice(-8) + Math.floor(Math.random() * 100);
  const [availability, setAvailability] = useState(
    teacher?.availability?.reduce((acc, a) => {
      if (!a.is_available) { acc[`${a.day_of_week}_${a.slot_number}`] = false; }
      return acc;
    }, {}) || {}
  );
  const [selectedSubjects, setSelectedSubjects] = useState(teacher?.subjects?.map(s => s.id) || []);
  
  // Cascading Filter State for Subject Selection
  const [filterDept, setFilterDept] = useState('');
  const [filterCourse, setFilterCourse] = useState('');
  const [filterSem, setFilterSem] = useState('');

  // Fetch Departments for dropdowns
  const { data: depts } = useQuery({ queryKey: ['departments'], queryFn: () => departmentsApi.getAll() });
  
  const { register, handleSubmit, formState: { errors }, watch, setValue } = useForm({ 
    defaultValues: teacher || { 
      max_periods_per_day: 6, 
      max_periods_per_week: 30,
      password: generatePass(),
      department_id: ''
    } 
  });

  const selectedDeptId = watch('department_id');

  // Logic for filtered options
  const deptData = depts?.find(d => d.id === filterDept);
  const filteredCourses = deptData?.courses || [];
  const courseData = filteredCourses?.find(c => c.id === filterCourse);
  const filteredSems = courseData?.semesters || [];

  // Filtered Subjects based on selection
  const displayedSubjects = useMemo(() => {
    if (!filterDept && !filterCourse && !filterSem) return subjects;
    return subjects.filter(s => {
      const matchDept = !filterDept || s.department_id === filterDept;
      const matchCourse = !filterCourse || s.course_id === filterCourse;
      const matchSem = !filterSem || s.semester_id === filterSem;
      return matchDept && matchCourse && matchSem;
    });
  }, [subjects, filterDept, filterCourse, filterSem]);

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
      className="fixed right-0 top-0 h-full w-[520px] bg-surface border-l border-border shadow-2xl z-50 flex flex-col">
      <div className="flex items-center justify-between p-5 border-b border-border bg-elevated/50">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Users className="w-5 h-5 text-primary" />
          </div>
          <h3 className="font-outfit font-bold text-text-primary">{teacher ? 'Edit Teacher Profile' : 'Register Teacher'}</h3>
        </div>
        <button onClick={onClose} className="text-text-secondary hover:text-text-primary p-2 hover:bg-white/5 rounded-full"><X className="w-5 h-5" /></button>
      </div>
      <form onSubmit={handleSubmit(onSubmit)} className="flex-1 overflow-y-auto p-6 space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="text-xs text-text-secondary mb-1.5 block ml-1">Full Name *</label>
            <input {...register('name', { required: true })} className="input-field" placeholder="Full name" />
            {errors.name && <p className="text-danger text-[10px] mt-1 ml-1">Name is required</p>}
          </div>

          <div className="col-span-2">
            <label className="text-xs text-text-secondary mb-1.5 block ml-1">Primary Department</label>
            <Select 
              options={depts?.map(d => ({ value: d.id, label: d.name }))}
              value={selectedDeptId}
              onChange={(val) => setValue('department_id', val)}
              placeholder="Select Department"
            />
            <input type="hidden" {...register('department_id', { required: 'Department is required' })} />
          </div>

          <div>
            <label className="text-xs text-text-secondary mb-1.5 block ml-1">Login Email *</label>
            <input {...register('email', { required: true })} type="email" className="input-field" placeholder="teacher@school.com" />
            {errors.email && <p className="text-danger text-[10px] mt-1 ml-1">Email is required</p>}
          </div>
          <div>
            <label className="text-xs text-text-secondary mb-1.5 block ml-1">
              Login Password {teacher ? <span className="font-normal opacity-50">(leave blank to keep current)</span> : '*'}
            </label>
            <input {...register('password', { required: !teacher })} type="password" className="input-field" 
              placeholder={teacher ? "••••••••" : "Set login password"} autoComplete="new-password" />
            {errors.password && <p className="text-danger text-[10px] mt-1 ml-1">Password is required</p>}
          </div>
          <div className="col-span-2">
            <label className="text-xs text-text-secondary mb-1.5 block ml-1">Employee Code</label>
            <input {...register('employee_code')} className="input-field" placeholder="T001" />
          </div>

          {/* Login credentials notice */}
          <div className="col-span-2 flex items-start gap-2.5 bg-primary/5 border border-primary/15 rounded-xl px-4 py-3">
            <Info className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
            <p className="text-[11px] text-text-secondary leading-relaxed">
              The <strong className="text-primary">email + password</strong> above will be used as the teacher's login credentials. 
              They can log in at <strong className="text-primary">/login</strong> to access their personal portal — 
              view their assigned timetable and manage leave requests.
            </p>
          </div>
        </div>

        {/* Subject Assignment Section with Cascading Dropdowns */}
        <div className="space-y-4 p-5 rounded-[24px] bg-primary/5 border border-primary/10">
          <div className="flex items-center gap-2 mb-2">
            <BookOpen className="w-4 h-4 text-primary" />
            <span className="text-[10px] font-bold text-primary uppercase tracking-widest">Assign Subjects (Filtered Selection)</span>
          </div>

          <div className="grid grid-cols-1 gap-3">
            <div>
              <label className="text-[9px] font-bold text-text-secondary uppercase tracking-tighter mb-1 block ml-1">Filter by Department</label>
              <Select 
                options={depts?.map(d => ({ value: d.id, label: d.name }))}
                value={filterDept}
                onChange={(val) => { setFilterDept(val); setFilterCourse(''); setFilterSem(''); }}
                placeholder="Choose Department"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[9px] font-bold text-text-secondary uppercase tracking-tighter mb-1 block ml-1">Filter by Course</label>
                <Select 
                  disabled={!filterDept}
                  options={filteredCourses.map(c => ({ value: c.id, label: c.name }))}
                  value={filterCourse}
                  onChange={(val) => { setFilterCourse(val); setFilterSem(''); }}
                  placeholder="Choose Course"
                />
              </div>
              <div>
                <label className="text-[9px] font-bold text-text-secondary uppercase tracking-tighter mb-1 block ml-1">Filter by Semester</label>
                <Select 
                  disabled={!filterCourse}
                  options={filteredSems.map(s => ({ value: s.id, label: s.name }))}
                  value={filterSem}
                  onChange={(val) => setFilterSem(val)}
                  placeholder="Choose Semester"
                />
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-primary/10">
            <label className="text-[9px] font-bold text-text-secondary uppercase tracking-tighter mb-3 block ml-1">Available Subjects</label>
            <div className="flex flex-wrap gap-2 min-h-[60px]">
              {displayedSubjects.length === 0 ? (
                <p className="text-[10px] text-text-secondary italic text-center w-full py-4 bg-white/5 rounded-xl border border-dashed border-white/10">
                  No subjects match your current filters.
                </p>
              ) : (
                displayedSubjects.map(s => (
                  <button key={s.id} type="button"
                    onClick={() => setSelectedSubjects(prev => prev.includes(s.id) ? prev.filter(x => x !== s.id) : [...prev, s.id])}
                    className={`text-[10px] font-bold px-3 py-1.5 rounded-xl border transition-all ${selectedSubjects.includes(s.id) ? 'bg-primary/20 border-primary/40 text-primary shadow-lg shadow-primary/10' : 'bg-surface border-border text-text-secondary hover:border-white/20'}`}>
                    {s.name}
                  </button>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Selected Subjects Overview */}
        {selectedSubjects.length > 0 && (
          <div className="p-4 rounded-2xl bg-success/5 border border-success/10">
            <label className="text-[10px] font-bold text-success uppercase tracking-widest mb-2 block">Teacher's Load ({selectedSubjects.length} Subjects)</label>
            <div className="flex flex-wrap gap-2">
              {selectedSubjects.map(sid => {
                const s = subjects.find(x => x.id === sid);
                return (
                  <div key={sid} className="flex items-center gap-2 bg-success/10 text-success text-[10px] font-bold px-2 py-1 rounded-lg border border-success/20">
                    {s?.name || 'Loading...'}
                    <button type="button" onClick={() => setSelectedSubjects(prev => prev.filter(x => x !== sid))} className="hover:text-white transition-colors">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Availability grid */}
        <div className="space-y-4">
          <div className="flex items-center justify-between ml-1">
            <label className="text-xs font-bold text-text-secondary uppercase tracking-widest">Availability Timeline</label>
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
                    <th className="text-text-secondary font-bold pb-2 text-left pr-4 uppercase tracking-tighter opacity-50">Day</th>
                    {Array.from({length: 8}, (_, i) => <th key={i} className="text-text-secondary font-bold pb-2 px-1 text-center opacity-50">Slot {i+1}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {DAYS.slice(0, 5).map((day, d) => (
                    <tr key={d}>
                      <td className="text-text-primary font-bold pr-4 py-1.5">{day}</td>
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

        <div className="flex gap-3 pt-4 border-t border-border/50">
          <button type="button" onClick={onClose} className="btn-ghost flex-1 py-3 text-sm">Cancel</button>
          <button type="submit" className="btn-primary flex-1 flex items-center justify-center gap-2 py-3 shadow-lg shadow-primary/20">
            <Save className="w-4 h-4" /> Save Teacher
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
      className="fixed right-0 top-0 h-full w-[420px] bg-surface border-l border-border shadow-2xl z-50 flex flex-col">
      <div className="flex items-center justify-between p-5 border-b border-border bg-elevated/50">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-warning/10">
            <Building2 className="w-5 h-5 text-warning" />
          </div>
          <h3 className="font-outfit font-bold text-text-primary">{room ? 'Edit Classroom' : 'Add New Room'}</h3>
        </div>
        <button onClick={onClose} className="text-text-secondary hover:text-text-primary p-2 hover:bg-white/5 rounded-full"><X className="w-5 h-5" /></button>
      </div>
      <form onSubmit={handleSubmit(onSave)} className="flex-1 overflow-y-auto p-6 space-y-6">
        <div>
          <label className="text-xs text-text-secondary mb-1.5 block ml-1">Room Name / Number *</label>
          <input {...register('name', { required: true })} className="input-field" placeholder="e.g. Lab 102 or Hall A" />
          {errors.name && <p className="text-danger text-[10px] mt-1 ml-1">Required</p>}
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-text-secondary mb-1.5 block ml-1">Seating Capacity</label>
            <input {...register('capacity')} type="number" className="input-field" placeholder="40" />
          </div>
          <div>
            <label className="text-xs text-text-secondary mb-1.5 block ml-1">Floor Level</label>
            <input {...register('floor')} type="number" className="input-field" placeholder="1" />
          </div>
        </div>
        <div>
          <label className="text-xs text-text-secondary mb-1.5 block ml-1">Building / Block Name</label>
          <input {...register('building')} className="input-field" placeholder="e.g. Science Block" />
        </div>
        <div>
          <label className="text-xs font-bold text-text-secondary mb-3 block uppercase tracking-widest ml-1">Room Category</label>
          <div className="grid grid-cols-2 gap-3">
            {['classroom', 'lab', 'auditorium', 'seminar_hall'].map(type => (
              <label key={type} className="flex items-center gap-3 p-3 rounded-2xl border border-border cursor-pointer hover:border-primary/30 transition-all has-[:checked]:border-primary/50 has-[:checked]:bg-primary/5 shadow-sm">
                <input {...register('room_type')} type="radio" value={type} className="accent-primary" />
                <span className="text-xs capitalize font-medium text-text-primary">{type.replace('_', ' ')}</span>
              </label>
            ))}
          </div>
        </div>
        <div className="flex gap-3 pt-4 border-t border-border/50">
          <button type="button" onClick={onClose} className="btn-ghost flex-1 py-3 text-sm">Cancel</button>
          <button type="submit" className="btn-primary flex-1 flex items-center justify-center gap-2 py-3 shadow-lg shadow-primary/20">
            <Save className="w-4 h-4" /> Save Classroom
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
    queryFn: () => roomsApi.getAll({ limit: 2000 }),
  });

  const saveTeacher = async (data) => {
    try {
      const { availability, ...teacherData } = data;
      if (teacherDrawer?.id) {
        await teachersApi.update(teacherDrawer.id, teacherData);
        if (availability) await teachersApi.updateAvailability(teacherDrawer.id, { availability });
      } else {
        const result = await usersApi.addTeacher(teacherData);
        const teacherId = result.teacher?.id || result.user?.teacherProfile?.id;
        if (teacherId && availability) {
          await teachersApi.updateAvailability(teacherId, { availability });
        }
      }
      toast.success('Teacher registration complete ✓');
      queryClient.invalidateQueries({ queryKey: ['teachers'] });
      setTeacherDrawer(null);
    } catch (e) { toast.error(e.response?.data?.error || 'Registration failed'); }
  };

  const deleteTeacher = async (id) => {
    if (!confirm('Are you sure you want to permanently remove this teacher and their login account?')) return;
    try {
      await teachersApi.delete(id);
      toast.success('Teacher removed');
      queryClient.invalidateQueries({ queryKey: ['teachers'] });
    } catch (e) { toast.error('Failed to remove teacher'); }
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
    if (!confirm('Permanently delete this classroom?')) return;
    try {
      await roomsApi.delete(id);
      toast.success('Room deleted');
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
    } catch (e) { toast.error('Failed to delete room'); }
  };

  const teachers = teachersData?.teachers || [];
  const rooms = roomsData?.rooms || [];
  const subjects = subjectsData?.subjects || [];
  const filteredRooms = rooms.filter(r => r.name.toLowerCase().includes(roomSearch.toLowerCase()));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* Teachers Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-primary/10 border border-primary/20"><Users className="w-6 h-6 text-primary" /></div>
            <div>
              <h2 className="font-outfit text-xl font-bold text-text-primary">Teaching Staff</h2>
              <p className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">{teachers.length} Professionals Registered</p>
            </div>
          </div>
          <button onClick={() => setTeacherDrawer({})} className="btn-primary text-sm flex items-center gap-2 py-2.5 px-5 shadow-lg shadow-primary/10">
            <Plus className="w-4 h-4" /> Add Teacher
          </button>
        </div>

        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
          <input value={teacherSearch} onChange={e => setTeacherSearch(e.target.value)} className="input-field pl-11 py-3" placeholder="Search by name or email..." />
        </div>

        <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
          {teachersLoading ? (
            [1,2,3].map(i => <div key={i} className="skeleton h-24 rounded-2xl" />)
          ) : teachers.map(teacher => (
            <motion.div key={teacher.id} whileHover={{ y: -2 }}
              className="card p-4 hover:border-primary/30 transition-all bg-surface/50">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-purple flex items-center justify-center text-sm font-bold text-white shadow-md">
                      {teacher.name.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <div className="font-bold text-sm text-text-primary truncate">{teacher.name}</div>
                      <div className="text-[10px] text-primary font-bold uppercase tracking-tighter">
                        {teacher.department?.name || 'Unassigned Department'}
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {teacher.subjects?.map(s => (
                      <span key={s.id} className="text-[9px] font-bold px-2 py-0.5 rounded-lg bg-primary/5 text-primary border border-primary/10 uppercase tracking-tighter">{s.name}</span>
                    ))}
                    {teacher.subjects?.length === 0 && <span className="text-[9px] text-text-secondary italic">No subjects assigned</span>}
                  </div>
                  <div className="flex items-center gap-4 text-[10px] font-medium text-text-secondary bg-white/5 w-fit px-3 py-1 rounded-full">
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3 opacity-50" /> {teacher.max_periods_per_day}/Day</span>
                    <span className="w-1 h-1 rounded-full bg-white/20" />
                    <span>{teacher.max_periods_per_week}/Week</span>
                  </div>
                </div>
                <div className="flex gap-1.5 ml-3">
                  <button onClick={() => setTeacherDrawer(teacher)} className="p-2 rounded-xl bg-primary/5 hover:bg-primary/20 text-primary transition-all">
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => deleteTeacher(teacher.id)} className="p-2 rounded-xl bg-danger/5 hover:bg-danger/20 text-danger transition-all">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
          {!teachersLoading && teachers.length === 0 && (
            <div className="card text-center py-12 bg-elevated/20 border-dashed border-2">
              <Users className="w-12 h-12 text-text-secondary mx-auto mb-4 opacity-20" />
              <p className="text-text-secondary text-sm font-medium">No teaching staff registered</p>
              <button onClick={() => setTeacherDrawer({})} className="btn-primary text-xs mt-4 py-2 px-6">Add First Teacher</button>
            </div>
          )}
        </div>
      </div>

      {/* Rooms Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-warning/10 border border-warning/20"><Building2 className="w-6 h-6 text-warning" /></div>
            <div>
              <h2 className="font-outfit text-xl font-bold text-text-primary">Facilities / Rooms</h2>
              <p className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">{rooms.length} Active Spaces</p>
            </div>
          </div>
          <button onClick={() => setRoomDrawer({})} className="btn-primary text-sm flex items-center gap-2 py-2.5 px-5 shadow-lg shadow-warning/10 border-none bg-warning hover:bg-warning/80">
            <Plus className="w-4 h-4" /> Add Room
          </button>
        </div>

        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
          <input value={roomSearch} onChange={e => setRoomSearch(e.target.value)} className="input-field pl-11 py-3" placeholder="Filter rooms by name or block..." />
        </div>

        <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
          {roomsLoading ? (
            [1,2,3].map(i => <div key={i} className="skeleton h-24 rounded-2xl" />)
          ) : filteredRooms.map(room => (
            <motion.div key={room.id} whileHover={{ y: -2 }}
              className="card p-4 hover:border-warning/30 transition-all bg-surface/50">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold border ${room.room_type === 'lab' ? 'bg-purple/10 border-purple/20 text-purple' : 'bg-success/10 border-success/20 text-success'}`}>
                      {room.room_type === 'lab' ? 'LB' : 'CR'}
                    </div>
                    <div className="min-w-0">
                      <div className="font-bold text-sm text-text-primary truncate">{room.name}</div>
                      <div className="text-[9px] font-bold text-text-secondary uppercase tracking-widest">
                        {room.room_type.replace('_', ' ')} • Capacity: {room.capacity}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-[10px] font-medium text-text-secondary ml-12">
                    {room.building && <span className="flex items-center gap-1"><Building2 className="w-3 h-3 opacity-50" /> {room.building}</span>}
                    {room.floor && <span className="flex items-center gap-1">Level {room.floor}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-2 ml-4">
                  <div className={`px-2.5 py-1 rounded-lg text-[9px] font-bold uppercase tracking-tighter ${room.is_available ? 'text-success bg-success/10 border border-success/20' : 'text-danger bg-danger/10 border border-danger/20'}`}>
                    {room.is_available ? 'Online' : 'Offline'}
                  </div>
                  <button onClick={() => setRoomDrawer(room)} className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-text-secondary transition-all">
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => deleteRoom(room.id)} className="p-2 rounded-xl bg-danger/5 hover:bg-danger/20 text-danger transition-all">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
          {!roomsLoading && filteredRooms.length === 0 && (
            <div className="card text-center py-12 bg-elevated/20 border-dashed border-2">
              <Building2 className="w-12 h-12 text-text-secondary mx-auto mb-4 opacity-20" />
              <p className="text-text-secondary text-sm font-medium">No classrooms matching search</p>
            </div>
          )}
        </div>
      </div>

      {/* Drawers */}
      <AnimatePresence mode="wait">
        {teacherDrawer !== null && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40" onClick={() => setTeacherDrawer(null)} />
            <TeacherDrawer teacher={teacherDrawer?.id ? teacherDrawer : null} subjects={subjects}
              onClose={() => setTeacherDrawer(null)} onSave={saveTeacher} />
          </>
        )}
        {roomDrawer !== null && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40" onClick={() => setRoomDrawer(null)} />
            <RoomDrawer room={roomDrawer?.id ? roomDrawer : null}
              onClose={() => setRoomDrawer(null)} onSave={saveRoom} />
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
