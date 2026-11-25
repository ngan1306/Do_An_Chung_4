import { useEffect, useRef } from 'react';
import { SCHEDULE_TICK_MS } from '../config/constants';
import type { Schedule } from '../types';

const pad2 = (value: number): string => value.toString().padStart(2, '0');

/**
 * Bộ chạy lịch hẹn giờ (mục 17).
 *
 * Mỗi phút quét một lần; một lịch chỉ kích hoạt đúng một lần trong phút đó
 * nhờ khoá `scheduleId|ngày|giờ`.
 */
export function useScheduleRunner(schedules: Schedule[], fire: (schedule: Schedule) => void): void {
  const firedKeys = useRef<Set<string>>(new Set());

  useEffect(() => {
    const runCheck = () => {
      const now = new Date();
      const today = now.getDay();
      const currentTime = `${pad2(now.getHours())}:${pad2(now.getMinutes())}`;
      const dayKey = `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`;

      if (firedKeys.current.size > 500) firedKeys.current.clear();

      schedules.forEach((schedule) => {
        if (!schedule.enabled) return;
        if (schedule.time !== currentTime) return;
        if (!schedule.weekdays.includes(today)) return;

        const fireKey = `${schedule.id}|${dayKey}|${currentTime}`;
        if (firedKeys.current.has(fireKey)) return;

        firedKeys.current.add(fireKey);
        fire(schedule);
      });
    };

    runCheck();
    const timer = window.setInterval(runCheck, SCHEDULE_TICK_MS);
    return () => window.clearInterval(timer);
  }, [schedules, fire]);
}
