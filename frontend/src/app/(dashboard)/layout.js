'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import useAuthStore from '@/lib/auth';

export default function DashboardLayout({ children }) {
  const { user, token, isLoading, init } = useAuthStore();
  const router = useRouter();

  useEffect(() => { init(); }, []);

  useEffect(() => {
    if (!isLoading && !token) router.push('/login');
  }, [isLoading, token]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-2 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-4" />
          <p className="text-text-secondary text-sm">Loading PS4...</p>
        </div>
      </div>
    );
  }

  if (!token) return null;

  return (
    <div className="flex h-screen overflow-hidden bg-bg">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden ml-[220px]">
        <Header />
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
