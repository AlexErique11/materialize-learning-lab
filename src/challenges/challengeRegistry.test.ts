import { describe, expect, it } from 'vitest';
import { coreChapters } from '../chapters/chapterRegistry';
import { challenges, challengePath, findChallenge } from './challengeRegistry';

describe('challenge registry', () => {
  it('has three unique capstones with existing prerequisite chapters', () => {
    expect(challenges).toHaveLength(3);
    expect(new Set(challenges.map((challenge) => challenge.slug)).size).toBe(3);
    for (const challenge of challenges) {
      expect(challenge.slug).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
      expect(coreChapters.some((chapter) => chapter.number === challenge.afterChapter)).toBe(true);
    }
  });

  it('uses registry entries for valid paths and rejects unknown challenges', () => {
    for (const challenge of challenges) {
      expect(findChallenge(challenge.slug)).toBe(challenge);
      expect(challengePath(challenge)).toBe(`/challenges/${challenge.slug}`);
    }
    expect(findChallenge('unknown')).toBeUndefined();
    expect(findChallenge(undefined)).toBeUndefined();
  });
});
