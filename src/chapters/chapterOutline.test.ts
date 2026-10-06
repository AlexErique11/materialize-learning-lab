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
      { sectionSlug: 'tutorial', slug: 'lecture-1', title: 'Lecture 1' },
      { sectionSlug: 'tutorial', slug: 'lecture-2', title: 'Lecture 2' },
      { sectionSlug: 'exercises', slug: 'exercise-1', title: 'Exercise 1' },
    ]);
    const paths = getChapterPages(chapter).map((page) => chapterContentPath(chapter, page));
    expect(new Set(paths).size).toBe(paths.length);
  });

  it('leaves chapters without defined content empty', () => {
    for (const other of chapters.filter((item) => ![chapter.slug, 'incremental-maintenance', 'time-in-materialize'].includes(item.slug))) {
      expect(getChapterSections(other).map((section) => section.slug)).toEqual([
        'tutorial',
        'exercises',
      ]);
      expect(getChapterPages(other)).toEqual([]);
    }
  });

  it('routes the Time in Materialize overview items into the tutorial and exercise sequence', () => {
    const time = findChapter('time-in-materialize');
    if (!time) throw new Error('Time in Materialize must be in the curriculum.');
    const pages = getChapterPages(time);
    expect(pages.map((page) => page.title)).toEqual([
      'Order lifecycles', 'Working with logical time',
      'Query order timelines', 'Build a real-time dashboard',
    ]);
    expect(pages.map((page) => page.sectionSlug)).toEqual([
      'tutorial', 'tutorial', 'exercises', 'exercises',
    ]);
    for (const page of pages) {
      expect(findChapterContent(time, page.sectionSlug, page.slug)).toEqual(page);
      expect(chapterContentPath(time, page)).toBe(`/labs/time-in-materialize/${page.sectionSlug}/${page.slug}`);
    }
  });

  it('validates pages within their section and chapter', () => {
    expect(findChapterSection(chapter, 'tutorial')?.title).toBe('Tutorial');
    expect(findChapterSection(chapter, 'workspace')).toBeUndefined();
    expect(findChapterContent(chapter, 'tutorial', 'lecture-1')?.title).toBe('Lecture 1');
    expect(findChapterContent(chapter, 'exercises', 'lecture-1')).toBeUndefined();
    expect(findChapterContent(chapter, 'tutorial', 'lecture-3')).toBeUndefined();
    expect(findChapterContent(chapter, undefined, undefined)).toBeUndefined();
    const other = chapters[1];
    if (!other) throw new Error('The curriculum must contain a second chapter.');
    expect(findChapterContent(other, 'tutorial', 'lecture-1')?.title).toBe('Lecture 1: Filters and projections');
    expect(findChapterContent(other, 'tutorial', 'lecture-2')?.title).toBe('Lecture 2: Joins');
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
});
