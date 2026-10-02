import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  advancedChapters,
  chapterPath,
  chapters,
  coreChapters,
  findChapter,
  formatChapterNumber,
} from './chapterRegistry';

describe('chapter registry', () => {
  it('has unique, URL-safe slugs and sequential chapter numbers', () => {
    expect(new Set(chapters.map((chapter) => chapter.slug)).size).toBe(chapters.length);
    expect(chapters.map((chapter) => chapter.number)).toEqual(
      Array.from({ length: chapters.length }, (_, index) => index + 1),
    );
    for (const chapter of chapters) expect(chapter.slug).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
  });

  it('keeps twelve core chapters separate from optional advanced chapter thirteen', () => {
    expect(coreChapters).toHaveLength(12);
    expect(coreChapters.every((chapter) => !chapter.optional)).toBe(true);
    expect(advancedChapters).toHaveLength(1);
    expect(advancedChapters[0]).toMatchObject({ number: 13, optional: true });
  });

  it('matches the source-of-truth curriculum titles and order', () => {
    const curriculum = readFileSync(new URL('../../CURRICULUM.md', import.meta.url), 'utf8');
    const definitions = Array.from(
      curriculum.matchAll(/^## (Optional )?Chapter (\d+): (.+)$/gm),
      (match) => ({
        number: Number(match[2]),
        title: match[3]?.replaceAll('`', '').trim(),
        optional: Boolean(match[1]),
      }),
    );
    expect(
      chapters.map(({ number, title, optional }) => ({
        number,
        title,
        optional: Boolean(optional),
      })),
    ).toEqual(definitions);
  });

  it('looks up exact chapter slugs and rejects missing or invalid ones', () => {
    const first = chapters[0];
    expect(first).toBeDefined();
    expect(findChapter(first?.slug)).toBe(first);
    expect(findChapter('unknown-chapter')).toBeUndefined();
    expect(findChapter(undefined)).toBeUndefined();
  });

  it('builds chapter paths and formats chapter numbers', () => {
    const first = chapters[0];
    if (!first) throw new Error('The curriculum must contain a chapter.');
    expect(chapterPath(first)).toBe(`/labs/${first.slug}`);
    expect(formatChapterNumber(1)).toBe('01');
    expect(formatChapterNumber(13)).toBe('13');
  });
});
