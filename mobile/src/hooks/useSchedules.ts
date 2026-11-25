/** Hook quan ly hen gio bat/tat thiet bi, tu chay khi app mo. */
import { useCallback, useEffect, useRef, useState } from 'react';
import type { PowerState, Schedule } from '../types';

export type ScheduleDraft = Omit<Schedule, 'id' | 'enabled'>;

function nextRunInMs(time: string): number {
  const [h, m] = time.split(':').map(Number);
  const now = new Date();
  const target = new Date();
  target.setHours(h, m, 0, 0);
  if (target <= now) target.setDate(target.getDate() + 1);
  return target.getTime() - now.getTime();
}

export function useSchedules(onFire: (schedule: Schedule) => void) {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const counter = useRef(0);
  const onFireRef = useRef(onFire);
  onFireRef.current = onFire;

  useEffect(() => {
    const timers = schedules
      .filter((s) => s.enabled)
      .map((s) => setTimeout(() => onFireRef.current(s), nextRunInMs(s.time)));
    return () => timers.forEach(clearTimeout);
  }, [schedules]);

  const addSchedule = useCallback((draft: ScheduleDraft): string | null => {
    if (!draft.deviceId || !/^\d{2}:\d{2}$/.test(draft.time)) return null;
    const id = `sch-${Date.now()}-${counter.current++}`;
    setSchedules((prev) => [...prev, { ...draft, id, enabled: true }]);
    return id;
  }, []);

  const updateSchedule = useCallback((schedule: Schedule): string | null => {
    if (!/^\d{2}:\d{2}$/.test(schedule.time)) return null;
    setSchedules((prev) => prev.map((s) => (s.id === schedule.id ? schedule : s)));
    return schedule.id;
  }, []);

  const removeSchedule = useCallback((id: string) => {
    setSchedules((prev) => prev.filter((s) => s.id !== id));
  }, []);

  const toggleSchedule = useCallback((id: string) => {
    setSchedules((prev) =>
      prev.map((s) => (s.id === id ? { ...s, enabled: !s.enabled } : s)),
    );
  }, []);

  return { schedules, addSchedule, updateSchedule, removeSchedule, toggleSchedule };
}
