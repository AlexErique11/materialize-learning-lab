import { chapterPath, type ChapterDefinition } from './chapterRegistry';

export type ChapterSectionSlug = 'tutorial' | 'exercises';

interface ContentPageDefinition {
  slug: string;
  title: string;
  description?: string;
  durationMinutes?: number;
}

export interface ChapterSectionDefinition {
  slug: ChapterSectionSlug;
  title: string;
  pages: readonly ContentPageDefinition[];
}

export interface ChapterContentDefinition extends ContentPageDefinition {
  sectionSlug: ChapterSectionSlug;
}

type ChapterOutline = Readonly<Record<ChapterSectionSlug, readonly ContentPageDefinition[]>>;

// Navigation slots only. Actual chapter content will live beside its chapter.
const chapterOutlines: Readonly<Partial<Record<string, ChapterOutline>>> = {
  'changing-relations': {
    tutorial: [
      { slug: 'lecture-1', title: 'Lecture 1' },
      { slug: 'lecture-2', title: 'Lecture 2' },
    ],
    exercises: [
      { slug: 'exercise-1', title: 'Exercise 1' },
      { slug: 'exercise-2', title: 'Exercise 2' },
    ],
  },
  'time-in-materialize': {
    tutorial: [
      {
        slug: 'order-lifecycles',
        title: 'Order lifecycles',
        description: 'Explore how time and updates flow through Materialize with a real-time order example.',
        durationMinutes: 15,
      },
      {
        slug: 'working-with-logical-time',
        title: 'Working with logical time',
        description: 'Learn how to query and reason about logical time in Materialize.',
        durationMinutes: 20,
      },
    ],
    exercises: [
      {
        slug: 'query-order-timelines',
        title: 'Query order timelines',
        description: 'Write queries to inspect the timeline of orders and their state changes.',
      },
      {
        slug: 'build-a-real-time-dashboard',
        title: 'Build a real-time dashboard',
        description: 'Create a live view that tracks orders and their lifecycle using Materialize.',
      },
    ],
  },
};

export function getChapterSections(
  chapter: ChapterDefinition,
): readonly ChapterSectionDefinition[] {
  const outline = chapterOutlines[chapter.slug];
  return [
    { slug: 'tutorial', title: 'Tutorial', pages: outline?.tutorial ?? [] },
    { slug: 'exercises', title: 'Exercises', pages: outline?.exercises ?? [] },
  ];
}

export function getChapterPages(chapter: ChapterDefinition): readonly ChapterContentDefinition[] {
  return getChapterSections(chapter).flatMap((section) =>
    section.pages.map((page) => ({ ...page, sectionSlug: section.slug })),
  );
}

export function findChapterSection(chapter: ChapterDefinition, slug: string | undefined) {
  return getChapterSections(chapter).find((section) => section.slug === slug);
}

export function findChapterContent(
  chapter: ChapterDefinition,
  sectionSlug: string | undefined,
  pageSlug: string | undefined,
) {
  return getChapterPages(chapter).find(
    (page) => page.sectionSlug === sectionSlug && page.slug === pageSlug,
  );
}

export function chapterSectionPath(chapter: ChapterDefinition, sectionSlug: ChapterSectionSlug) {
  return `${chapterPath(chapter)}/${sectionSlug}`;
}

export function chapterContentPath(chapter: ChapterDefinition, page: ChapterContentDefinition) {
  return `${chapterSectionPath(chapter, page.sectionSlug)}/${encodeURIComponent(page.slug)}`;
}
