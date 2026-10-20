import { describe, expect, it } from 'vitest';
import { chapters, findChapter } from './chapterRegistry';
import {
  chapterContentPath,
  chapterSectionPath,
  findChapterContent,
  findChapterSection,
  getChapterPages,
  getChapterSections,
} from './chapterOutline';

const chapter = findChapter('changing-relations');
if (!chapter) throw new Error('Chapter 1 must be in the curriculum.');

describe('chapter navigation outline', () => {
  it('orders lectures before exercises in one continuous sequence', () => {
    expect(getChapterPages(chapter).map(({ sectionSlug, slug, title }) => ({ sectionSlug, slug, title }))).toEqual([
      { sectionSlug: 'tutorial', slug: 'lecture-1', title: 'Lecture 1: Signed changes' },
      { sectionSlug: 'tutorial', slug: 'lecture-2', title: 'Lecture 2: Updates and batches' },
      { sectionSlug: 'exercises', slug: 'exercise-1', title: 'Exercise 1: Inventory changes' },
    ]);
    const paths = getChapterPages(chapter).map((page) => chapterContentPath(chapter, page));
    expect(new Set(paths).size).toBe(paths.length);
  });

  it('leaves chapters without defined content empty', () => {
    for (const other of chapters.filter((item) => ![chapter.slug, 'incremental-maintenance', 'views-indexes-materialized-views', 'getting-data-in', 'time-in-materialize'].includes(item.slug))) {
      expect(getChapterSections(other).map((section) => section.slug)).toEqual([
        'tutorial',
        'exercises',
      ]);
      expect(getChapterPages(other)).toEqual([]);
    }
  });

  it('registers Chapter 3 alongside Chapter 4 with lectures before exercises', () => {
    const objects = findChapter('views-indexes-materialized-views')!;
    const pages = getChapterPages(objects);
    expect(pages.map(({ sectionSlug, slug }) => ({ sectionSlug, slug }))).toEqual([
      { sectionSlug: 'tutorial', slug: 'lecture-1' },
      { sectionSlug: 'tutorial', slug: 'lecture-2' },
      { sectionSlug: 'tutorial', slug: 'lecture-3' },
      { sectionSlug: 'exercises', slug: 'exercise-1' },
      { sectionSlug: 'exercises', slug: 'exercise-2' },
    ]);
    for (const page of pages) {
      expect(findChapterContent(objects, page.sectionSlug, page.slug)).toEqual(page);
      expect(chapterContentPath(objects, page)).toBe(`/labs/views-indexes-materialized-views/${page.sectionSlug}/${page.slug}`);
    }
  });

  it('registers Chapter 4 exercises after all four lectures', () => {
    const ingestion = findChapter('getting-data-in')!;
    const pages = getChapterPages(ingestion);
    expect(pages.map(({ sectionSlug, slug, title }) => ({ sectionSlug, slug, title }))).toEqual([
      { sectionSlug: 'tutorial', slug: 'lecture-1', title: 'Lecture 1: From snapshot to live changes' },
      { sectionSlug: 'tutorial', slug: 'lecture-2', title: 'Lecture 2: Events and current values' },
      { sectionSlug: 'tutorial', slug: 'lecture-3', title: 'Lecture 3: Keys, renames, and deletions' },
      { sectionSlug: 'tutorial', slug: 'lecture-4', title: 'Lecture 4: CDC with before and after' },
      { sectionSlug: 'exercises', slug: 'exercise-1', title: 'Exercise 1: Finish the initial load' },
      { sectionSlug: 'exercises', slug: 'exercise-2', title: 'Exercise 2: Interpret the producer’s message' },
      { sectionSlug: 'exercises', slug: 'exercise-3', title: 'Exercise 3: Repair the product catalog' },
    ]);
    expect(chapterContentPath(ingestion, pages[0]!)).toBe('/labs/getting-data-in/tutorial/lecture-1');
    expect(findChapterContent(ingestion, 'tutorial', 'lecture-5')).toBeUndefined();
    expect(findChapterSection(ingestion, 'exercises')?.pages.map((page) => page.slug)).toEqual(['exercise-1', 'exercise-2', 'exercise-3']);
    expect(chapterContentPath(ingestion, pages[4]!)).toBe('/labs/getting-data-in/exercises/exercise-1');
  });

  it('routes the Time in Materialize overview items into the tutorial and exercise sequence', () => {
    const time = findChapter('time-in-materialize');
    if (!time) throw new Error('Time in Materialize must be in the curriculum.');
    const pages = getChapterPages(time);
    expect(pages.map((page) => page.title)).toEqual([
      'Lecture 1: Time can change the result', 'Lecture 2: When should a row become visible?',
      'Lecture 3: When events arrive late', 'Lecture 4: Changing a row’s lifetime',
      'Exercise 1: Read clocks and boundaries', 'Exercise 2: Keep changing deadlines correct',
      'Exercise 3: Build a reliable recent-events view',
    ]);
    expect(pages.map((page) => page.sectionSlug)).toEqual([
      'tutorial', 'tutorial', 'tutorial', 'tutorial', 'exercises', 'exercises', 'exercises',
    ]);
    for (const page of pages) {
      expect(findChapterContent(time, page.sectionSlug, page.slug)).toEqual(page);
      expect(chapterContentPath(time, page)).toBe(`/labs/time-in-materialize/${page.sectionSlug}/${page.slug}`);
    }
  });

  it('validates pages within their section and chapter', () => {
    expect(findChapterSection(chapter, 'tutorial')?.title).toBe('Tutorial');
    expect(findChapterSection(chapter, 'workspace')).toBeUndefined();
    expect(findChapterContent(chapter, 'tutorial', 'lecture-1')?.title).toBe('Lecture 1: Signed changes');
    expect(findChapterContent(chapter, 'exercises', 'lecture-1')).toBeUndefined();
    expect(findChapterContent(chapter, 'tutorial', 'lecture-3')).toBeUndefined();
    expect(findChapterContent(chapter, undefined, undefined)).toBeUndefined();
    const other = chapters[1];
    if (!other) throw new Error('The curriculum must contain a second chapter.');
    expect(findChapterContent(other, 'tutorial', 'lecture-1')?.title).toBe('Lecture 1: Filters and projections');
    expect(findChapterContent(other, 'tutorial', 'lecture-2')?.title).toBe('Lecture 2: Joins');
    expect(findChapterContent(other, 'tutorial', 'lecture-4')?.title).toBe('Lecture 4: Recompute or maintain');
  });

  it('builds section and page URLs with encoded page slugs', () => {
    expect(chapterSectionPath(chapter, 'tutorial')).toBe('/labs/changing-relations/tutorial');
    expect(
      chapterContentPath(chapter, {
        sectionSlug: 'exercises',
        slug: 'future/page',
        title: 'Future page',
      }),
    ).toBe('/labs/changing-relations/exercises/future%2Fpage');
  });
  it('registers Chapter 2 exercises after the four lectures', () => {
    const maintenance = findChapter('incremental-maintenance')!;
    const pages = getChapterPages(maintenance);
    expect(pages.map(page => page.slug)).toEqual([
      'lecture-1', 'lecture-2', 'lecture-3', 'lecture-4',
      'exercise-1', 'exercise-3',
    ]);
    for (const page of pages.filter(page => page.sectionSlug === 'exercises')) {
      expect(chapterContentPath(maintenance, page)).toBe(`/labs/incremental-maintenance/exercises/${page.slug}`);
      expect(page.description).toBeTruthy();
    }
  });
});
