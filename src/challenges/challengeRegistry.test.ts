import { describe, expect, it } from 'vitest';
import { coreChapters } from '../chapters/chapterRegistry';
import { challenge } from './challengeRegistry';

describe('challenge registry', () => {
  it('defines the single course challenge and its chapter prerequisite', () => {
    expect(challenge.title).toBe('Live Order Operations');
    expect(challenge.path).toBe('/challenge');
    expect(coreChapters.some(chapter => chapter.number === challenge.afterChapter)).toBe(true);
  });

  it('retains previous entry URLs as aliases without a catalog or planned challenge', () => {
    expect(challenge.legacyPaths).toEqual(['/challenges', '/challenges/live-order-operations']);
    expect(challenge.legacyPaths).not.toContain('/challenges/fresh-but-expensive');
  });
});
