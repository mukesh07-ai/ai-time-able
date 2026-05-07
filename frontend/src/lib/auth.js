'use client';
import { create } from 'zustand';
import { authApi } from './api';

const useAuthStore = create((set) => ({
  user: null,
  institution: null,
  token: null,
  isLoading: true,

  init: async () => {
    if (typeof window === 'undefined') return;
    const token = localStorage.getItem('ps4_token');
    const userStr = localStorage.getItem('ps4_user');
    const instStr = localStorage.getItem('ps4_institution');
    if (token && userStr) {
      set({ token, user: JSON.parse(userStr), institution: instStr ? JSON.parse(instStr) : null, isLoading: false });
    } else {
      set({ isLoading: false });
    }
  },

  login: (token, user, institution) => {
    localStorage.setItem('ps4_token', token);
    localStorage.setItem('ps4_user', JSON.stringify(user));
    if (institution) localStorage.setItem('ps4_institution', JSON.stringify(institution));
    set({ token, user, institution });
  },

  logout: () => {
    localStorage.removeItem('ps4_token');
    localStorage.removeItem('ps4_user');
    localStorage.removeItem('ps4_institution');
    set({ token: null, user: null, institution: null });
  },
}));

export default useAuthStore;
