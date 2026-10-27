import { parseRun, type ChallengeRun } from '../challenges/live-order-operations/run';

export const CHALLENGE_PROGRESS_KEY = 'materialize-learning-lab-challenge-v2';
export const LEGACY_CHALLENGE_PROGRESS_KEY = 'materialize-learning-lab-challenges-v1';
export interface ChallengeAchievement { readonly runId: string; readonly scenarioVersion: number; readonly assisted: boolean; readonly hints: number; readonly durationMs: number; readonly completedAt: number }
export interface ChallengeProgress { readonly version: 2; readonly run: ChallengeRun | null; readonly achievements: readonly ChallengeAchievement[]; readonly recovery: boolean; readonly memoryOnly: boolean }
const empty: ChallengeProgress = { version: 2, run: null, achievements: [], recovery: false, memoryOnly: false };
let snapshot = empty;
let saved: string | null | undefined;
let legacySaved: string | null | undefined;
const listeners = new Set<() => void>();
const notify = () => { for (const listener of listeners) listener(); };
function achievements(value: unknown): ChallengeAchievement[] {
  return Array.isArray(value) ? value.filter((item): item is ChallengeAchievement => Boolean(item && typeof item === 'object' && typeof item.runId === 'string' && item.runId.length <= 100 && [1, 2].includes(item.scenarioVersion) && typeof item.assisted === 'boolean' && Number.isSafeInteger(item.hints) && item.hints >= 0 && item.hints <= 15 && Number.isSafeInteger(item.durationMs) && item.durationMs >= 0 && Number.isSafeInteger(item.completedAt) && item.completedAt >= 0)).slice(-20) : [];
}
export function parseChallengeProgress(value: string | null): ChallengeProgress {
  if (!value) return empty;
  try {
    const parsed = JSON.parse(value);
    if (!parsed || parsed.version !== 2 || !Array.isArray(parsed.achievements) || !('run' in parsed)) return { ...empty, recovery: true };
    const run = parsed.run === null ? null : parseRun(parsed.run);
    return { ...empty, achievements: achievements(parsed.achievements), run, recovery: parsed.run !== null && run === null };
  } catch { return { ...empty, recovery: true }; }
}
export function getChallengeProgress(): ChallengeProgress {
  if (typeof window === 'undefined' || snapshot.memoryOnly) return snapshot;
  try {
    const value = window.localStorage.getItem(CHALLENGE_PROGRESS_KEY);
    const legacy = window.localStorage.getItem(LEGACY_CHALLENGE_PROGRESS_KEY);
    if (value !== saved || legacy !== legacySaved) {
      saved = value; legacySaved = legacy; snapshot = parseChallengeProgress(value);
      try {
        const previous = legacy ? JSON.parse(legacy) : null;
        if (previous?.version === 1) {
          const merged = [...achievements(previous.achievements).filter(item => item.scenarioVersion === 1), ...snapshot.achievements];
          snapshot = { ...snapshot, achievements: merged.filter((item, index) => merged.findIndex(other => other.runId === item.runId && other.scenarioVersion === item.scenarioVersion) === index).slice(-20) };
        }
      } catch { /* An invalid old store cannot prevent a fresh investigation. */ }
    }
  } catch { snapshot = { ...snapshot, memoryOnly: true }; }
  return snapshot;
}
export function saveChallengeRun(run: ChallengeRun, achievement?: ChallengeAchievement) {
  const previous = getChallengeProgress();
  const history = achievement && !previous.achievements.some(item => item.runId === achievement.runId && item.scenarioVersion === achievement.scenarioVersion) ? [...previous.achievements, achievement].slice(-20) : previous.achievements;
  const next: ChallengeProgress = { version: 2, run, achievements: history, recovery: false, memoryOnly: previous.memoryOnly };
  const value = JSON.stringify({ version: 2, run, achievements: history });
  try { window.localStorage.setItem(CHALLENGE_PROGRESS_KEY, value); saved = value; snapshot = next; }
  catch { snapshot = { ...next, memoryOnly: true }; }
  notify();
}
function onStorage(event: StorageEvent) {
  if (event.key !== CHALLENGE_PROGRESS_KEY && event.key !== LEGACY_CHALLENGE_PROGRESS_KEY && event.key !== null) return;
  saved = undefined; snapshot = { ...snapshot, memoryOnly: false }; getChallengeProgress(); notify();
}
export function subscribeChallengeProgress(listener: () => void) {
  listeners.add(listener);
  if (listeners.size === 1) window.addEventListener('storage', onStorage);
  return () => { listeners.delete(listener); if (!listeners.size) window.removeEventListener('storage', onStorage); };
}
export function challengeActionLabel(progress: ChallengeProgress): string {
  return progress.run?.phase === 'completed' ? 'Review challenge' : progress.run && progress.run.phase !== 'briefing' ? 'Resume challenge' : 'Start challenge';
}
