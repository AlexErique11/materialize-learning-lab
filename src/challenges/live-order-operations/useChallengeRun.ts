import { useCallback, useEffect, useState } from 'react';
import { useChallengeProgress } from '../../hooks/useChallengeProgress';
import { getChallengeProgress, saveChallengeRun } from '../../progress/challengeProgress';
import { assistedRun, createRun, updateRun, type ChallengeRun, type RunAction } from './run';

function newRun() { return createRun(crypto.randomUUID()); }

function persistRun(run: ChallengeRun) {
  saveChallengeRun(run, run.phase === 'completed' ? {
    runId: run.id, scenarioVersion: run.scenarioVersion, assisted: assistedRun(run),
    hints: Object.values(run.assessments).reduce((total, item) => total + (item?.hints ?? 0), 0),
    durationMs: run.activeDurationMs, completedAt: Date.now(),
  } : undefined);
}

export function useChallengeRun(paused: boolean) {
  const progress = useChallengeProgress();
  const [initialRun] = useState(newRun);
  const run = progress.run ?? initialRun;
  const [isPaused, setIsPaused] = useState(false);
  const dispatch = useCallback((action: RunAction) => {
    const current = getChallengeProgress().run ?? initialRun;
    const next = updateRun(current, action);
    if (next !== current) persistRun(next);
  }, [initialRun]);
  const restart = () => { persistRun(newRun()); setIsPaused(false); };
  useEffect(() => {
    if (run.phase !== 'active' || paused || isPaused) return;
    let last = performance.now();
    const flush = () => {
      const now = performance.now();
      if (!document.hidden && getChallengeProgress().run?.id === run.id) dispatch({ type: 'time', milliseconds: Math.min(60000, Math.round(now - last)) });
      last = now;
    };
    const visibility = () => { last = performance.now(); };
    const timer = window.setInterval(flush, 10000);
    document.addEventListener('visibilitychange', visibility);
    return () => { window.clearInterval(timer); document.removeEventListener('visibilitychange', visibility); flush(); };
  }, [run.id, run.phase, paused, isPaused, dispatch]);
  return { run, dispatch, restart, progress, isPaused, setIsPaused };
}
