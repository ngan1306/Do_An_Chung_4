import { useEffect } from 'react';
import type { ThemeMode } from '../types';

const THEME_COLORS: Record<ThemeMode, string> = {
  dark: '#0B0F10',
  light: '#F3F5EF',
};

/**
 * Gắn theme hiện tại lên thẻ <html data-theme="..."> để CSS đổi biến màu (mục 14).
 * Đồng thời cập nhật màu thanh trình duyệt trên điện thoại.
 */
export function useThemeSync(theme: ThemeMode): void {
  useEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = theme;
    root.style.colorScheme = theme;

    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', THEME_COLORS[theme]);
  }, [theme]);
}
