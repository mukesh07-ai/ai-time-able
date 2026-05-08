import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

const api = axios.create({ baseURL: API_URL, timeout: 60000 });

// Attach JWT token
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('ps4_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('ps4_token');
      localStorage.removeItem('ps4_user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

// ── Auth ──────────────────────────────────────────────────────────────────────
export const authApi = {
  login: (data) => api.post('/auth/login', data).then(r => r.data),
  register: (data) => api.post('/auth/register', data).then(r => r.data),
  me: () => api.get('/auth/me').then(r => r.data),
};

// ── Users ──────────────────────────────────────────────────────────────────────
export const usersApi = {
  getAll: () => api.get('/users').then(r => r.data),
  addTeacher: (data) => api.post('/users/add-teacher', data).then(r => r.data),
  addStudent: (data) => api.post('/users/add-student', data).then(r => r.data),
  delete: (id) => api.delete(`/users/${id}`).then(r => r.data),
};

// ── Teachers ──────────────────────────────────────────────────────────────────
export const teachersApi = {
  getAll: (params) => api.get('/teachers', { params }).then(r => r.data),
  getOne: (id) => api.get(`/teachers/${id}`).then(r => r.data),
  create: (data) => api.post('/teachers', data).then(r => r.data),
  update: (id, data) => api.put(`/teachers/${id}`, data).then(r => r.data),
  delete: (id) => api.delete(`/teachers/${id}`).then(r => r.data),
  updateAvailability: (id, data) => api.put(`/teachers/${id}/availability`, data).then(r => r.data),
  assignSubjects: (id, data) => api.post(`/teachers/${id}/subjects`, data).then(r => r.data),
};

// ── Subjects ──────────────────────────────────────────────────────────────────
export const subjectsApi = {
  getAll: (params) => api.get('/subjects', { params }).then(r => r.data),
  getOne: (id) => api.get(`/subjects/${id}`).then(r => r.data),
  create: (data) => api.post('/subjects', data).then(r => r.data),
  update: (id, data) => api.put(`/subjects/${id}`, data).then(r => r.data),
  delete: (id) => api.delete(`/subjects/${id}`).then(r => r.data),
};

// ── Rooms ──────────────────────────────────────────────────────────────────────
export const roomsApi = {
  getAll: (params) => api.get('/rooms', { params }).then(r => r.data),
  getOne: (id) => api.get(`/rooms/${id}`).then(r => r.data),
  create: (data) => api.post('/rooms', data).then(r => r.data),
  update: (id, data) => api.put(`/rooms/${id}`, data).then(r => r.data),
  delete: (id) => api.delete(`/rooms/${id}`).then(r => r.data),
};

// ── Timetables ────────────────────────────────────────────────────────────────
export const timetablesApi = {
  getAll: () => api.get('/timetables').then(r => r.data),
  getOne: (id) => api.get(`/timetables/${id}`).then(r => r.data),
  getGrid: (id) => api.get(`/timetables/${id}/grid`).then(r => r.data),
  create: (data) => api.post('/timetables', data).then(r => r.data),
  generate: (data) => api.post('/timetables/generate', data).then(r => r.data),
  regenerate: (id) => api.post(`/timetables/${id}/regenerate`).then(r => r.data),
  delete: (id) => api.delete(`/timetables/${id}`).then(r => r.data),
  applyFix: (id, data) => api.post(`/timetables/${id}/apply-fix`, data).then(r => r.data),
  publish: (id) => api.put(`/timetables/${id}/publish`).then(r => r.data),
  exportUrl: (id, format) => `${API_URL}/timetables/${id}/export?format=${format}`,
  updateEntry: (id, data) => api.post(`/timetables/${id}/entries`, data).then(r => r.data),
};

// ── Upload ────────────────────────────────────────────────────────────────────
export const uploadApi = {
  uploadFile: (formData) => api.post('/upload/file', formData, { headers: { 'Content-Type': 'multipart/form-data' } }).then(r => r.data),
  confirmUpload: (data) => api.post('/upload/confirm', data).then(r => r.data),
  templateUrl: () => `${API_URL}/upload/template`,
};

// ── Chatbot ───────────────────────────────────────────────────────────────────
export const chatbotApi = {
  ask: (data) => api.post('/chatbot/ask', data).then(r => r.data),
  suggestImprovements: (data) => api.post('/chatbot/suggest-improvements', data).then(r => r.data),
  getQuickQuestions: (institutionId) => api.get(`/chatbot/quick-questions/${institutionId}`).then(r => r.data),
};

// ── Departments ───────────────────────────────────────────────────────────────
export const departmentsApi = {
  getAll: () => api.get('/departments').then(r => r.data),
  setup: (data) => api.post('/departments/setup', data).then(r => r.data),
  update: (id, data) => api.put(`/departments/${id}`, data).then(r => r.data),
  delete: (id) => api.delete(`/departments/${id}`).then(r => r.data),
};

export const dashboardApi = {
  getStats: () => api.get('/dashboard/stats').then(r => r.data),
};

// ── Leave Management ──────────────────────────────────────────────────────────
export const leaveApi = {
  // Teacher
  submit: (data) => api.post('/leave/submit', data).then(r => r.data),
  getMyLeaves: () => api.get('/leave/my').then(r => r.data),
  getMyTimetable: () => api.get('/leave/my-timetable').then(r => r.data),
  // Admin
  getAll: (params) => api.get('/leave', { params }).then(r => r.data),
  getSummary: () => api.get('/leave/summary').then(r => r.data),
  review: (id, data) => api.put(`/leave/${id}/review`, data).then(r => r.data),
  delete: (id) => api.delete(`/leave/${id}`).then(r => r.data),
};

export default api;
