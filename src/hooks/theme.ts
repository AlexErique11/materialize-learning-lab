export type Theme = 'light' | 'dark';
export const THEME_STORAGE_KEY = 'materialize-learning-lab-theme';

export function parseTheme(value: string | null): Theme {
  return value === 'dark' ? 'dark' : 'light';
}

export function readTheme(storage: Pick<Storage, 'getItem'>): Theme {
  try {
    return parseTheme(storage.getItem(THEME_STORAGE_KEY));
  } catch {
    return 'light';
  }
}

export function persistTheme(storage: Pick<Storage, 'setItem'>, theme: Theme): boolean {
  try {
    storage.setItem(THEME_STORAGE_KEY, theme);
    return true;
  } catch {
    return false;
  }
}
