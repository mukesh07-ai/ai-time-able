'use client';
import { useEffect, useState } from 'react';
import { timetablesApi } from '@/lib/api';
import { useRouter } from 'next/navigation';

export default function TimetableIndexPage() {
  const router = useRouter();
  useEffect(() => {
    timetablesApi.getAll().then(data => {
      const latest = data.timetables?.find(t => t.status === 'feasible' || t.status === 'published');
      if (latest) router.push(`/timetable/${latest.id}`);
      else router.push('/generate');
    }).catch(() => router.push('/generate'));
  }, []);

  return (
    <div className="flex items-center justify-center h-64">
      <div className="w-10 h-10 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
    </div>
  );
}
