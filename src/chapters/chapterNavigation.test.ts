import { describe, expect, it } from 'vitest';
import { findChapterContent, findChapterSection } from './chapterOutline';
import { getChapterNavigation } from './chapterNavigation';
import { findChapter } from './chapterRegistry';

function navigationFor(sectionSlug: string, pageSlug?: string) {
  const chapter = findChapter('changing-relations');
  if (!chapter) throw new Error('Chapter 1 must be in the curriculum.');
  const section = findChapterSection(chapter, sectionSlug);
  if (!section) throw new Error('The section must exist.');
  const page = pageSlug ? findChapterContent(chapter, sectionSlug, pageSlug) : undefined;
  if (pageSlug && !page) throw new Error('The page must be registered.');
  return getChapterNavigation(chapter, section, page);
}

describe('chapter page navigation', () => {
  it('returns to the overview before the first lecture', () => {
    expect(navigationFor('tutorial', 'lecture-1')).toEqual({
      previous: {
        to: '/labs/changing-relations', title: 'Changing Relations', label: 'Chapter overview',
      },
      next: { to: '/labs/changing-relations/tutorial/lecture-2', title: 'Lecture 2' },
    });
  });

  it('crosses the tutorial/exercise boundary in both directions', () => {
    expect(navigationFor('tutorial', 'lecture-2').next).toEqual({
      to: '/labs/changing-relations/exercises/exercise-1', title: 'Exercise 1',
    });
    expect(navigationFor('exercises', 'exercise-1').previous).toEqual({
      to: '/labs/changing-relations/tutorial/lecture-2', title: 'Lecture 2',
    });
  });

  it('returns to the chapter after the last exercise', () => {
    expect(navigationFor('exercises', 'exercise-1').next).toEqual({
      to: '/labs/changing-relations', title: 'Changing Relations', label: 'Back to chapter',
    });
  });

  it('starts a section overview at its own first page', () => {
    expect(navigationFor('exercises').next).toEqual({
      to: '/labs/changing-relations/exercises/exercise-1', title: 'Exercise 1',
    });
  });

  it('leaves an empty section with only a link to its chapter overview', () => {
    const emptyChapter = findChapter('views-indexes-materialized-views');
    if (!emptyChapter) throw new Error('Chapter 3 must be in the curriculum.');
    const section = findChapterSection(emptyChapter, 'tutorial');
    if (!section) throw new Error('Every chapter must have a tutorial section.');
    expect(getChapterNavigation(emptyChapter, section)).toEqual({
      previous: {
        to: '/labs/views-indexes-materialized-views', title: 'Views, Indexes & Materialized Views', label: 'Chapter overview',
      },
      next: undefined,
    });
  });
});
