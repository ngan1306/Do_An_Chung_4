import { WEEKDAY_LABELS } from '../config/constants';
import type { Schedule } from '../types';

const pad2 = (value: number): string => value.toString().padStart(2, '0');

/** "14:07:32" — dùng cho khung giờ cập nhật dữ liệu. */
export function formatClock(timestamp: number | null): string {
  if (!timestamp) return '--:--:--';
  const date = new Date(timestamp);
  return `${pad2(date.getHours())}:${pad2(date.getMinutes())}:${pad2(date.getSeconds())}`;
}

/** Ngày dạng "18/11/2026". */
export function formatDate(timestamp: number | null): string {
  if (!timestamp) return '--/--/----';
  const date = new Date(timestamp);
  return `${pad2(date.getDate())}/${pad2(date.getMonth() + 1)}/${date.getFullYear()}`;
}

/**
 * Khoảng thời gian tương đối so với hiện tại: "vừa xong", "12 giây trước"...
 * Dùng cho nhãn "cập nhật lần cuối" (mục 5).
 */
export function formatRelative(timestamp: number | null, now: number): string {
  if (!timestamp) return 'chưa có dữ liệu';

  const seconds = Math.max(0, Math.floor((now - timestamp) / 1000));
  if (seconds < 2) return 'vừa xong';
  if (seconds < 60) return `${seconds} giây trước`;

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} phút trước`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} giờ trước`;

  const days = Math.floor(hours / 24);
  return `${days} ngày trước`;
}

/** Số đo kèm chữ số thập phân cố định. */
export function formatDecimal(value: number, digits = 1): string {
  return value.toFixed(digits);
}

/** Mô tả ngắn gọn một lịch hẹn giờ để hiển thị trong danh sách. */
export function formatScheduleSummary(schedule: Schedule): string {
  const dayLabel =
    schedule.weekdays.length === 7
      ? 'Hằng ngày'
      : [...schedule.weekdays]
          .sort((a, b) => a - b)
          .map((day) => WEEKDAY_LABELS[day])
          .join(', ');

  return `${dayLabel} · ${schedule.time}`;
}

/** Đổi phút-trong-ngày thành "HH:mm". */
export function minutesToTimeOfDay(minutes: number): string {
  const normalized = ((minutes % 1440) + 1440) % 1440;
  return `${pad2(Math.floor(normalized / 60))}:${pad2(normalized % 60)}`;
}

/** Đổi "HH:mm" thành số phút-trong-ngày, trả về null nếu sai định dạng. */
export function timeOfDayToMinutes(time: string): number | null {
  const match = /^(\d{2}):(\d{2})$/.exec(time);
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}
