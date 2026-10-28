import { useCallback, useEffect, useState } from 'react';
import { useChallengeProgress } from '../../hooks/useChallengeProgress';
import { getChallengeProgress, saveChallengeRun } from '../../progress/challengeProgress';
import { assistedRun, createRun, updateRun, type ChallengeRun, type RunAction } from './run';
function newRun() { return createRun(crypto.randomUUID()); }
function persistRun(run: ChallengeRun) {
  saveChallengeRun(run, run.phase === 'completed' ? { runId: run.id, scenarioVersion: 2, assisted: assistedRun(run), hints: Object.values(run.hints).reduce((total, count) => total + (count ?? 0), 0), durationMs: run.activeDurationMs, completedAt: Date.now() } : undefined);
}
export function useChallengeRun(paused: boolean) {
  const progress = useChallengeProgress();
  const [initialRun] = useState(newRun);
  const run = progress.run ?? initialRun;
  const dispatch = useCallback((action: RunAction) => {
    const current = getChallengeProgress().run ?? initialRun;
    const next = updateRun(current, action);
    if (next !== current) persistRun(next);
  }, [initialRun]);
  const restart = () => { persistRun(newRun()); };
  useEffect(() => {
    if (run.phase !== 'investigating' || paused) return;
    let last = performance.now();
    const flush = () => {
      const now = performance.now();
      if (!document.hidden && getChallengeProgress().run?.id === run.id) dispatch({ type: 'time', milliseconds: Math.min(60000, Math.round(now - last)) });
      last = now;
    };
    const timer = setInterval(flush, 10000);
    const visibility = () => { last = performance.now(); };
    document.addEventListener('visibilitychange', visibility);
    return () => { clearInterval(timer); document.removeEventListener('visibilitychange', visibility); flush(); };
  }, [run.id, run.phase, paused, dispatch]);
  return { run, dispatch, restart, progress };
}
