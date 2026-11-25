import { useCallback, useEffect, useState } from 'react';
import { loadSchedules, saveSchedules } from '../services/storageService';
import * as databaseApi from '../services/databaseApi';
import type { Schedule, ScheduleAction } from '../types';
import { validateSchedule } from '../utils/validation';

export interface ScheduleDraft {
  deviceId: string;
  time: string;
  action: ScheduleAction;
  weekdays: number[];
  enabled: boolean;
}

/** Quản lý danh sách hẹn giờ: thêm / sửa / xoá / bật-tắt, tự lưu localStorage (mục 17). */
export function useSchedules() {
  const [schedules, setSchedules] = useState<Schedule[]>(() => loadSchedules());

  useEffect(() => {
    saveSchedules(schedules);
  }, [schedules]);

  useEffect(() => {
    let active = true;
    void databaseApi.loadSchedules().then((saved) => {
      if (active && saved) setSchedules(saved);
    });
    return () => { active = false; };
  }, []);

  const addSchedule = useCallback((draft: ScheduleDraft): string | null => {
    const candidate: Schedule = {
      ...draft,
      id: `schedule-${Date.now()}-${Math.random().toString(16).slice(2, 6)}`,
    };

    const error = validateSchedule(candidate);
    if (error) return error;

    setSchedules((current) => [...current, candidate]);
    void databaseApi.createSchedule(candidate);
    return null;
  }, []);

  const updateSchedule = useCallback((schedule: Schedule): string | null => {
    const error = validateSchedule(schedule);
    if (error) return error;

    setSchedules((current) => current.map((item) => (item.id === schedule.id ? schedule : item)));
    void databaseApi.updateSchedule(schedule);
    return null;
  }, []);

  const removeSchedule = useCallback((id: string) => {
    setSchedules((current) => current.filter((item) => item.id !== id));
    void databaseApi.deleteSchedule(id);
  }, []);

  const toggleSchedule = useCallback((id: string) => {
    setSchedules((current) => {
      const schedule = current.find((item) => item.id === id);
      if (!schedule) return current;
      const updated = { ...schedule, enabled: !schedule.enabled };
      void databaseApi.updateSchedule(updated);
      return current.map((item) => (item.id === id ? updated : item));
    });
  }, []);

  return { schedules, addSchedule, updateSchedule, removeSchedule, toggleSchedule };
}
