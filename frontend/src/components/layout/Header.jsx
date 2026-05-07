'use client';
import { Bell, Search } from 'lucide-react';
import useAuthStore from '@/lib/auth';

export default function Header() {
  const { user } = useAuthStore();
  const now = new Date();
  const timeStr = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  const dateStr = now.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });

  return (
    <header className="h-14 border-b border-border bg-surface/80 backdrop-blur-sm flex items-center px-6 gap-4 sticky top-0 z-30">
      <div className="flex-1 flex items-center gap-3">
        <div className="relative max-w-xs hidden md:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
          <input
            className="bg-elevated border border-border rounded-lg pl-9 pr-4 py-1.5 text-sm text-text-primary placeholder-text-secondary focus:outline-none focus:border-primary w-64"
            placeholder="Search teachers, rooms..."
          />
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="text-right hidden md:block">
          <div className="text-xs text-text-secondary">{dateStr}</div>
          <div className="text-sm font-medium text-text-primary">{timeStr}</div>
        </div>

        <button className="relative p-2 rounded-lg hover:bg-elevated text-text-secondary hover:text-text-primary transition-colors">
          <Bell className="w-4 h-4" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-primary rounded-full" />
        </button>

        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-purple flex items-center justify-center text-white font-bold text-sm">
            {user?.name?.charAt(0)?.toUpperCase() || 'U'}
          </div>
          <span className="text-sm font-medium text-text-primary hidden md:block">{user?.name}</span>
        </div>
      </div>
    </header>
  );
}
