'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  LayoutDashboard, Settings2, Upload, Sparkles, MessageSquare,
  CalendarDays, Brain, LogOut, BookOpen,
} from 'lucide-react';
import useAuthStore from '@/lib/auth';

const NAV_ITEMS = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/constraints', icon: Settings2, label: 'Teachers & Rooms' },
  { href: '/subjects', icon: BookOpen, label: 'Subjects' },
  { href: '/upload', icon: Upload, label: 'Upload Data' },
  { href: '/generate', icon: Sparkles, label: 'Generate' },
  { href: '/chatbot', icon: MessageSquare, label: 'AI Chatbot', highlight: true },
  { href: '/timetable', icon: CalendarDays, label: 'View Timetable' },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, institution, logout } = useAuthStore();

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  return (
    <div className="fixed left-0 top-0 h-full w-[220px] bg-[#0C1020] border-r border-border flex flex-col z-40">
      {/* Logo */}
      <div className="p-5 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-purple flex items-center justify-center shadow-lg shadow-primary/20">
            <Brain className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="font-outfit font-bold text-text-primary text-sm leading-tight">PS4 AI</div>
            <div className="text-text-secondary text-[10px]">Timetable Scheduler</div>
          </div>
        </div>
      </div>

      {/* Institution badge */}
      {institution && (
        <div className="px-3 py-2 border-b border-border">
          <div className="text-[10px] text-text-secondary uppercase tracking-wide mb-1">Institution</div>
          <div className="text-xs text-text-primary font-medium truncate">{institution.name}</div>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
          return (
            <Link key={item.href} href={item.href}>
              <motion.div
                whileHover={{ x: 2 }}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 cursor-pointer relative group ${
                  isActive
                    ? 'bg-primary/15 text-primary border-l-2 border-primary pl-3'
                    : item.highlight
                    ? 'text-text-secondary hover:bg-purple/10 hover:text-purple'
                    : 'text-text-secondary hover:bg-white/4 hover:text-text-primary'
                }`}
              >
                {isActive && (
                  <div className="absolute inset-0 bg-primary/5 rounded-xl" />
                )}
                <item.icon className={`w-4 h-4 flex-shrink-0 ${item.highlight && !isActive ? 'text-purple/70' : ''}`} />
                <span className="text-sm font-medium">{item.label}</span>
                {item.highlight && !isActive && (
                  <span className="ml-auto text-[9px] bg-purple/20 text-purple px-1.5 py-0.5 rounded-full font-medium">AI</span>
                )}
              </motion.div>
            </Link>
          );
        })}
      </nav>

      {/* User section */}
      <div className="p-3 border-t border-border">
        <div className="flex items-center gap-3 px-2 py-2 rounded-xl">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-purple flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
            {user?.name?.charAt(0)?.toUpperCase() || 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-medium text-text-primary truncate">{user?.name || 'User'}</div>
            <div className="text-[10px] text-text-secondary capitalize">{user?.role || 'admin'}</div>
          </div>
          <button onClick={handleLogout} className="text-text-secondary hover:text-danger transition-colors p-1 rounded-lg hover:bg-danger/10" title="Logout">
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
