import './globals.css';
import { Outfit, DM_Sans } from 'next/font/google';
import { Toaster } from 'react-hot-toast';
import QueryProvider from '@/components/providers/QueryProvider';

const outfit = Outfit({ subsets: ['latin'], variable: '--font-outfit', display: 'swap', weight: ['400', '500', '600', '700'] });
const dmSans = DM_Sans({ subsets: ['latin'], variable: '--font-dm', display: 'swap', weight: ['400', '500'] });

export const metadata = {
  title: 'PS4 AI Timetable Scheduler',
  description: 'AI-Powered Timetable Scheduler with Claude AI, OR-Tools CP-SAT, and RAG Chatbot',
  keywords: 'timetable, scheduler, AI, school, college, scheduling',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${outfit.variable} ${dmSans.variable}`}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
      </head>
      <body className="bg-bg text-text-primary font-dm antialiased">
        <QueryProvider>
          {children}
          <Toaster
            position="top-right"
            toastOptions={{
              style: { background: '#161C2E', color: '#E8EDF5', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '10px' },
              success: { iconTheme: { primary: '#10B981', secondary: '#161C2E' } },
              error: { iconTheme: { primary: '#EF4444', secondary: '#161C2E' } },
            }}
          />
        </QueryProvider>
      </body>
    </html>
  );
}
