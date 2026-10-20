import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => { vi.unstubAllGlobals(); vi.resetModules(); });

describe('saved lab progress', () => {
  it('accepts only unique, authored activity paths and the current storage format', async () => {
    const { parseLabProgress, labActivityPaths } = await import('./labProgress');
    const path = labActivityPaths[0]!;
    expect(parseLabProgress(JSON.stringify({ version: 1, completed: [path, path, null, '/labs/changing-relations', '/labs/consistent-reads/tutorial/lecture-1'] }))).toEqual([path]);
    for (const value of [null, 'invalid JSON', 'null', '[]', '{"version":2,"completed":[]}', '{"version":1,"completed":null}']) {
      expect(parseLabProgress(value)).toEqual([]);
    }
  });

  it('counts existing activities, excluding empty chapters and duplicate legacy routes', async () => {
    const { labActivityPaths } = await import('./labProgress');
    expect(labActivityPaths).toHaveLength(34);
    expect(new Set(labActivityPaths).size).toBe(34);
    expect(labActivityPaths).toContain('/labs/incremental-maintenance/exercises/exercise-3');
    expect(labActivityPaths).not.toContain('/labs/incremental-maintenance/exercises/exercise-2');
    expect(labActivityPaths.some(path => path.includes('/consistent-reads/'))).toBe(false);
  });

  it('counts a chapter only after every tutorial and exercise is complete', async () => {
    const { getLabChapterProgress, labActivityPaths } = await import('./labProgress');
    const chapter = labActivityPaths.filter(path => path.startsWith('/labs/changing-relations/'));
    const tutorials = chapter.filter(path => path.includes('/tutorial/'));
    const exercises = chapter.filter(path => path.includes('/exercises/'));
    expect(getLabChapterProgress([])).toEqual({ completedChapterSlugs: [], completed: 0, total: 12 });
    expect(getLabChapterProgress(tutorials).completed).toBe(0);
    expect(getLabChapterProgress(exercises).completed).toBe(0);
    expect(getLabChapterProgress([...chapter, ...chapter, '/labs/unknown/tutorial/lecture-1']))
      .toEqual({ completedChapterSlugs: ['changing-relations'], completed: 1, total: 12 });
    expect(getLabChapterProgress(labActivityPaths)).toMatchObject({ completed: 6, total: 12 });
    expect(getLabChapterProgress(tutorials).completedChapterSlugs).toEqual([]);
    expect(getLabChapterProgress(exercises).completedChapterSlugs).toEqual([]);
  });

  it('saves completion once and restores it in a fresh session', async () => {
    const values = new Map<string, string>();
    vi.stubGlobal('window', {
      localStorage: { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => values.set(key, value) },
      addEventListener: vi.fn(), removeEventListener: vi.fn(),
    });
    const store = await import('./labProgress');
    const listener = vi.fn();
    const unsubscribe = store.subscribeLabProgress(listener);
    const path = store.labActivityPaths[0]!;
    store.completeLabActivity(path);
    store.completeLabActivity(path);
    store.completeLabActivity('/labs/unknown/tutorial/lecture-1');
    expect(store.getLabProgress()).toEqual([path]);
    expect(store.getLabProgress()).toBe(store.getLabProgress());
    expect(listener).toHaveBeenCalledTimes(1);
    unsubscribe();
    vi.resetModules();
    expect((await import('./labProgress')).getLabProgress()).toEqual([path]);
  });

  it('keeps session progress if browser storage cannot be written', async () => {
    vi.stubGlobal('window', { localStorage: { getItem: () => null, setItem: () => { throw new Error('Storage unavailable'); } } });
    const store = await import('./labProgress');
    const paths = store.labActivityPaths.slice(0, 2);
    for (const path of paths) store.completeLabActivity(path);
    expect(store.getLabProgress()).toEqual(paths);
  });
});
