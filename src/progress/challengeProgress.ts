import { parseRun, type ChallengeRun } from '../challenges/live-order-operations/run';

export const CHALLENGE_PROGRESS_KEY = 'materialize-learning-lab-challenges-v1';
export interface ChallengeAchievement { readonly runId: string; readonly scenarioVersion: number; readonly assisted: boolean; readonly hints: number; readonly durationMs: number; readonly completedAt: number }
export interface ChallengeProgress {
  readonly version: 1;
  readonly run: ChallengeRun | null;
  readonly achievements: readonly ChallengeAchievement[];
  readonly recovery: boolean;
  readonly memoryOnly: boolean;
}
const empty: ChallengeProgress = { version: 1, run: null, achievements: [], recovery: false, memoryOnly: false };
let snapshot = empty;
let saved: string | null | undefined;
const listeners = new Set<() => void>();
const notify = () => { for (const listener of listeners) listener(); };

export function parseChallengeProgress(value: string | null): ChallengeProgress {
  if (!value) return empty;
  try {
    const parsed: unknown = JSON.parse(value);
    if (!parsed || typeof parsed !== 'object' || !('version' in parsed) || parsed.version !== 1 || !('run' in parsed) || !('achievements' in parsed) || !Array.isArray(parsed.achievements)) return { ...empty, recovery: true };
    const achievements = parsed.achievements.filter((item): item is ChallengeAchievement => Boolean(item && typeof item === 'object'
      && typeof item.runId === 'string' && item.runId.length <= 100 && Number.isSafeInteger(item.scenarioVersion) && item.scenarioVersion > 0
      && typeof item.assisted === 'boolean' && Number.isSafeInteger(item.hints) && item.hints >= 0 && item.hints <= 12
      && Number.isSafeInteger(item.durationMs) && item.durationMs >= 0 && Number.isSafeInteger(item.completedAt) && item.completedAt >= 0)).slice(-20);
    const run = parsed.run === null ? null : parseRun(parsed.run);
    return { ...empty, achievements, run, recovery: parsed.run !== null && run === null };
  } catch { return { ...empty, recovery: true }; }
}

export function getChallengeProgress(): ChallengeProgress {
  if (typeof window === 'undefined' || snapshot.memoryOnly) return snapshot;
  try {
    const value = window.localStorage.getItem(CHALLENGE_PROGRESS_KEY);
    if (value !== saved) { saved = value; snapshot = parseChallengeProgress(value); }
  } catch { snapshot = { ...snapshot, memoryOnly: true }; }
  return snapshot;
}

export function saveChallengeRun(run: ChallengeRun, achievement?: ChallengeAchievement) {
  const previous = getChallengeProgress();
  const achievements = achievement && !previous.achievements.some(item => item.runId === achievement.runId)
    ? [...previous.achievements, achievement].slice(-20) : previous.achievements;
  const next: ChallengeProgress = { version: 1, run, achievements, recovery: false, memoryOnly: previous.memoryOnly };
  const value = JSON.stringify({ version: 1, run, achievements });
  try { window.localStorage.setItem(CHALLENGE_PROGRESS_KEY, value); saved = value; snapshot = next; }
  catch { snapshot = { ...next, memoryOnly: true }; }
  notify();
}
function onStorage(event: StorageEvent) {
  if (event.key !== CHALLENGE_PROGRESS_KEY && event.key !== null) return;
  saved = undefined;
  snapshot = { ...snapshot, memoryOnly: false };
  getChallengeProgress(); notify();
}
export function subscribeChallengeProgress(listener: () => void) {
  listeners.add(listener);
  if (listeners.size === 1) window.addEventListener('storage', onStorage);
  return () => { listeners.delete(listener); if (!listeners.size) window.removeEventListener('storage', onStorage); };
}

export function challengeActionLabel(progress: ChallengeProgress): string {
  if (progress.run && progress.run.phase !== 'briefing' && progress.run.phase !== 'completed') return 'Resume challenge';
  if (progress.run?.phase === 'completed') return 'Review challenge';
  return 'Start challenge';
}
