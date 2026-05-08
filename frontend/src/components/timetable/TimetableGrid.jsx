'use client';
import { useState } from 'react';
import { motion } from 'framer-motion';

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function generateSlotTimings(startTime, duration, count) {
  const timings = [];
  const [h, m] = startTime.split(':').map(Number);
  let totalMins = h * 60 + m;
  for (let i = 0; i < count; i++) {
    const sh = Math.floor(totalMins / 60).toString().padStart(2, '0');
    const sm = (totalMins % 60).toString().padStart(2, '0');
    timings.push(`${sh}:${sm}`);
    totalMins += duration;
  }
  return timings;
}

function TimetableCell({ entry, isLunch, onClick }) {
  const [hovered, setHovered] = useState(false);

  if (isLunch) {
    return (
      <td className="px-2 py-2 text-center border border-border/30 bg-warning/5">
        <span className="text-[10px] text-warning font-medium">LUNCH</span>
      </td>
    );
  }

  if (!entry) {
    return (
      <td className="px-1 py-1 border border-border/20 cursor-pointer group" onClick={onClick}>
        <div className="h-14 rounded-lg border border-dashed border-white/10 group-hover:border-primary/40 group-hover:bg-primary/5 transition-all flex items-center justify-center">
          <div className="w-1.5 h-1.5 rounded-full bg-white/5 group-hover:bg-primary/20" />
        </div>
      </td>
    );
  }

  const color = entry.subject?.color_hex || '#4F8EF7';
  const bgStyle = { backgroundColor: color + '25', borderLeft: `3px solid ${color}` };

  return (
    <td className="px-1 py-1 border border-border/20" onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)} onClick={onClick}>
      <motion.div
        animate={{ scale: hovered ? 1.02 : 1 }}
        className="rounded-lg px-2 py-1.5 h-14 cursor-pointer transition-shadow relative overflow-hidden"
        style={bgStyle}
      >
        <p className="text-[11px] font-semibold text-text-primary leading-tight truncate">{entry.subject?.name || 'Unknown'}</p>
        <p className="text-[10px] text-text-secondary truncate mt-0.5">{entry.teacher?.name || ''}</p>
        <p className="text-[9px] text-text-secondary/70 truncate">{entry.room?.name || ''}</p>
        {hovered && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="absolute inset-0 bg-surface/95 p-2 rounded-lg z-10 flex flex-col justify-center">
            <p className="text-xs font-bold text-text-primary">{entry.subject?.name}</p>
            <p className="text-[10px] text-text-secondary">{entry.teacher?.name}</p>
            <p className="text-[10px] text-text-secondary">{entry.room?.name}</p>
            <p className="text-[10px] text-primary mt-1">{entry.student_group}</p>
          </motion.div>
        )}
      </motion.div>
    </td>
  );
}

import TimetableEntryDrawer from './TimetableEntryDrawer';
import { AnimatePresence } from 'framer-motion';
import { timetablesApi } from '@/lib/api';
import toast from 'react-hot-toast';

export default function TimetableGrid({ gridData, onUpdate }) {
  const [activeGroup, setActiveGroup] = useState(null);
  const [editSlot, setEditSlot] = useState(null);

  if (!gridData) return null;

  const { grid, groups, institution } = gridData;
  const currentGroup = activeGroup || groups[0];
  const groupGrid = grid[currentGroup] || {};
  const slotTimings = generateSlotTimings(
    institution?.day_start_time || '08:00',
    institution?.slot_duration_minutes || 45,
    institution?.slots_per_day || 8
  );
  const workingDays = institution?.working_days || 5;
  const slotsPerDay = institution?.slots_per_day || 8;
  const lunchSlot = institution?.lunch_slot || 4;

  return (
    <div className="card p-0 overflow-hidden h-full flex flex-col">
      {/* Group tabs */}
      {groups.length > 1 && (
        <div className="flex gap-1 p-3 border-b border-border overflow-x-auto flex-shrink-0">
          {groups.map(g => (
            <button key={g} onClick={() => setActiveGroup(g)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${currentGroup === g ? 'bg-primary/20 text-primary' : 'text-text-secondary hover:text-text-primary hover:bg-elevated'}`}>
              {g}
            </button>
          ))}
        </div>
      )}

      {/* Grid */}
      <div className="overflow-auto flex-1 p-3">
        <table className="w-full border-collapse min-w-[600px]">
          <thead>
            <tr>
              <th className="text-left px-3 py-2 text-xs text-text-secondary font-medium w-20 sticky left-0 bg-surface z-10">Time</th>
              {DAY_NAMES.slice(0, workingDays).map(d => (
                <th key={d} className="px-2 py-2 text-xs text-text-secondary font-medium text-center">{d}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: slotsPerDay }, (_, sl) => (
              <tr key={sl} className="hover:bg-elevated/30 transition-colors">
                <td className="px-3 py-1 sticky left-0 bg-surface z-10">
                  <span className={`text-[10px] font-medium ${sl === lunchSlot ? 'text-warning' : 'text-text-secondary'}`}>
                    {sl === lunchSlot ? '🍽️' : slotTimings[sl] || `S${sl + 1}`}
                  </span>
                </td>
                {Array.from({ length: workingDays }, (_, d) => (
                  <TimetableCell key={d} entry={groupGrid[d]?.[sl]} isLunch={sl === lunchSlot} 
                    onClick={() => sl !== lunchSlot && setEditSlot({ day: d, slot: sl, entry: groupGrid[d]?.[sl] })} />
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <AnimatePresence>
        {editSlot && (
          <TimetableEntryDrawer 
            entry={editSlot.entry}
            timetableId={gridData.timetable.id}
            day={editSlot.day}
            slot={editSlot.slot}
            group={currentGroup}
            onClose={() => setEditSlot(null)}
            onSave={async (data) => {
              await timetablesApi.updateEntry(gridData.timetable.id, data);
              toast.success('Timetable updated');
              if (onUpdate) onUpdate();
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
