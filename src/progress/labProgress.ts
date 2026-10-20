import { chapterContentPath, getChapterPages } from '../chapters/chapterOutline';
import { coreChapters } from '../chapters/chapterRegistry';

export const LAB_PROGRESS_KEY = 'materialize-learning-lab-progress-v1';
const chapterActivities = coreChapters.map(chapter =>
  getChapterPages(chapter).map(page => chapterContentPath(chapter, page)));
export const labActivityPaths = chapterActivities.flat();
const knownPaths = new Set(labActivityPaths);
const listeners = new Set<() => void>();
let completed: readonly string[] = [];
let savedValue: string | null | undefined;
let memoryOnly = false;

export function getLabChapterProgress(completedPaths: readonly string[]) {
  const paths = new Set(completedPaths);
  return {
    completed: chapterActivities.filter(activities =>
      activities.length > 0 && activities.every(path => paths.has(path))).length,
    total: coreChapters.length,
  };
}

export function parseLabProgress(value: string | null): readonly string[] {
  try {
    const data: unknown = value ? JSON.parse(value) : null;
    if (!data || typeof data !== 'object' || !('version' in data) || data.version !== 1
      || !('completed' in data) || !Array.isArray(data.completed)) return [];
    return [...new Set(data.completed.filter((path): path is string => typeof path === 'string' && knownPaths.has(path)))];
  } catch { return []; }
}

export function getLabProgress() {
  if (memoryOnly || typeof window === 'undefined') return completed;
  try {
    const value = window.localStorage.getItem(LAB_PROGRESS_KEY);
    if (value !== savedValue) {
      savedValue = value;
      completed = parseLabProgress(value);
    }
  } catch { /* Keep progress usable for this session when storage is unavailable. */ }
  return completed;
}

function notify() { for (const listener of listeners) listener(); }
function onStorage(event: StorageEvent) {
  if (event.key !== LAB_PROGRESS_KEY && event.key !== null) return;
  savedValue = undefined;
  memoryOnly = false;
  notify();
}

export function subscribeLabProgress(listener: () => void) {
  listeners.add(listener);
  if (listeners.size === 1) window.addEventListener('storage', onStorage);
  return () => {
    listeners.delete(listener);
    if (!listeners.size) window.removeEventListener('storage', onStorage);
  };
}

export function completeLabActivity(path: string) {
  if (!knownPaths.has(path) || getLabProgress().includes(path)) return;
  completed = [...completed, path];
  const value = JSON.stringify({ version: 1, completed });
  try {
    window.localStorage.setItem(LAB_PROGRESS_KEY, value);
    savedValue = value;
  } catch { memoryOnly = true; }
  notify();
}
