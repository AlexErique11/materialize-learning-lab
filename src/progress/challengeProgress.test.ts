import { afterEach, describe, expect, it, vi } from 'vitest';
import { createRun, updateRun } from '../challenges/live-order-operations/run';

afterEach(() => { vi.unstubAllGlobals(); vi.resetModules(); });
describe('challenge persistence', () => {
  it('resumes valid drafts and recovers invalid runs while retaining valid achievements', async () => {
    const { parseChallengeProgress } = await import('./challengeProgress');
    const run = updateRun(createRun('saved'), { type: 'start' });
    expect(parseChallengeProgress(JSON.stringify({ version: 2, run, achievements: [] })).run).toEqual(run);
    const achievement = { runId: 'past', scenarioVersion: 2, assisted: false, hints: 1, durationMs: 1000, completedAt: 1 };
    const recovered = parseChallengeProgress(JSON.stringify({ version: 2, run: { ...run, scenarioVersion: 0 }, achievements: [achievement, null] }));
    expect(recovered).toMatchObject({ run: null, recovery: true, achievements: [achievement] });
    for (const input of ['broken', '[]', '{"version":2}', 'null']) expect(parseChallengeProgress(input).recovery).toBe(true);
  });
  it('saves changes and keeps the external-store snapshot stable between writes', async () => {
    const storage = new Map<string, string>();
    vi.stubGlobal('window', { localStorage: { getItem: (key: string) => storage.get(key) ?? null, setItem: (key: string, value: string) => storage.set(key, value) } });
    const { getChallengeProgress, saveChallengeRun } = await import('./challengeProgress');
    const run = createRun('saved');
    saveChallengeRun(run);
    expect(getChallengeProgress().run).toEqual(run);
    expect(getChallengeProgress()).toBe(getChallengeProgress());
    const achievement = { runId: run.id, scenarioVersion: 2, assisted: true, hints: 2, durationMs: 1000, completedAt: 1 };
    saveChallengeRun(run, achievement); saveChallengeRun(run, achievement);
    expect(getChallengeProgress().achievements).toHaveLength(1);
  });
  it('continues in memory on storage failure', async () => {
    vi.stubGlobal('window', { localStorage: { getItem: () => { throw new Error('blocked'); }, setItem: () => { throw new Error('blocked'); } } });
    const { getChallengeProgress, saveChallengeRun } = await import('./challengeProgress');
    saveChallengeRun(createRun('session'));
    expect(getChallengeProgress()).toMatchObject({ memoryOnly: true, run: { id: 'session' } });
  });
  it('resumes an old notebook save and omits its snapshots on the next save', async () => {
    const run = updateRun(createRun('existing'), { type: 'start' });
    const achievement = { runId: 'past', scenarioVersion: 2, assisted: false, hints: 0, durationMs: 1000, completedAt: 1 };
    const storage = new Map<string, string>([['materialize-learning-lab-challenge-v2', JSON.stringify({ version: 2, run: { ...run, observations: [{ label: 'Old pin' }] }, achievements: [achievement] })]]);
    vi.stubGlobal('window', { localStorage: { getItem: (key: string) => storage.get(key) ?? null, setItem: (key: string, value: string) => storage.set(key, value) } });
    const { getChallengeProgress, saveChallengeRun, CHALLENGE_PROGRESS_KEY } = await import('./challengeProgress');
    const resumed = getChallengeProgress();
    expect(resumed).toMatchObject({ run, achievements: [achievement], recovery: false });
    expect(resumed.run).not.toHaveProperty('observations');
    saveChallengeRun(resumed.run!);
    expect(JSON.parse(storage.get(CHALLENGE_PROGRESS_KEY)!)).toEqual({ version: 2, run, achievements: [achievement] });
  });
  it('does not change the chapter progress denominator', async () => {
    const { getLabChapterProgress } = await import('./labProgress');
    expect(getLabChapterProgress(['/challenge'])).toMatchObject({ completed: 0, total: 8 });
  });
});
