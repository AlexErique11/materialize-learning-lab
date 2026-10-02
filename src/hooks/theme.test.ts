import { describe, expect, it, vi } from 'vitest';
import { parseTheme, persistTheme, readTheme, THEME_STORAGE_KEY } from './theme';

describe('theme preference', () => {
  it('defaults to light and accepts only explicit supported choices', () => {
    for (const value of [null, '', 'system', 'invalid', 'light'])
      expect(parseTheme(value)).toBe('light');
    expect(parseTheme('dark')).toBe('dark');
  });

  it('reads and writes the explicit preference under one stable key', () => {
    const getItem = vi.fn(() => 'dark');
    const setItem = vi.fn();
    expect(readTheme({ getItem })).toBe('dark');
    expect(getItem).toHaveBeenCalledWith(THEME_STORAGE_KEY);
    expect(persistTheme({ setItem }, 'light')).toBe(true);
    expect(setItem).toHaveBeenCalledWith(THEME_STORAGE_KEY, 'light');
  });

  it('remains usable when browser storage is unavailable', () => {
    const unavailable = () => {
      throw new Error('Storage unavailable');
    };
    expect(readTheme({ getItem: unavailable })).toBe('light');
    expect(persistTheme({ setItem: unavailable }, 'dark')).toBe(false);
  });
});
