import { chapterPath, type ChapterDefinition } from './chapterRegistry';

export type ChapterSectionSlug = 'tutorial' | 'exercises';

interface ContentPageDefinition {
  readonly slug: string;
  readonly title: string;
  readonly description?: string;
  readonly durationMinutes?: number;
}

export interface ChapterSectionDefinition {
  readonly slug: ChapterSectionSlug;
  readonly title: string;
  readonly listTitle: string;
  readonly description: string;
  readonly itemLabel: string;
  readonly pages: readonly ContentPageDefinition[];
}

export interface ChapterContentDefinition extends ContentPageDefinition {
  readonly sectionSlug: ChapterSectionSlug;
}

type ChapterOutline = Readonly<Record<ChapterSectionSlug, readonly ContentPageDefinition[]>>;

const sectionDefinitions: readonly Omit<ChapterSectionDefinition, 'pages'>[] = [
  {
    slug: 'tutorial',
    title: 'Tutorial',
    listTitle: 'Tutorials',
    description: 'Step-by-step guided tutorials to learn the core concepts of this chapter.',
    itemLabel: 'tutorial',
  },
  {
    slug: 'exercises',
    title: 'Exercises',
    listTitle: 'Exercises',
    description: 'Hands-on exercises to test your understanding.',
    itemLabel: 'exercise',
  },
];

// Navigation and overview summaries. Actual chapter content lives beside its chapter.
const chapterOutlines: Readonly<Partial<Record<string, ChapterOutline>>> = {
  'incremental-maintenance': {
    tutorial: [{
      slug: 'lecture-1',
      title: 'Lecture 1: Filters and projections',
      description: 'Trace order changes through WHERE and SELECT. See when result rows appear, disappear, change, or stay the same.',
    }, {
      slug: 'lecture-2',
      title: 'Lecture 2: Joins',
      description: 'Match Orders and Products. See late matches, one-to-many updates, and product deletions maintain the joined result.',
    }, {
      slug: 'lecture-3',
      title: 'Lecture 3: Aggregations',
      description: 'Maintain grouped counts and revenue. Replace result rows, move orders between groups, and remove empty groups.',
    }, {
      slug: 'lecture-4',
      title: 'Lecture 4: Recompute or maintain',
      description: 'Compare rebuilding grouped revenue with maintaining retained state. See identical results and different illustrative work.',
    }],
    exercises: [
      { slug: 'exercise-1', title: 'Exercise 1: Matches through the filter', description: 'Combine JOIN and WHERE across three checkpoints with retained matches and filtered fan-out.', durationMinutes: 6 },
      { slug: 'exercise-3', title: 'Exercise 2: Maintain revenue by region', description: 'Combine retained joins, grouped revenue and incremental updates across three checkpoints.', durationMinutes: 7 },
    ],
  },
  'changing-relations': {
    tutorial: [
      {
        slug: 'lecture-1',
        title: 'Lecture 1: Signed changes',
        description: 'Follow signed additions and retractions, distinguish row copies from distinct full rows, and see why a row disappears when its copy count reaches zero.',
      },
      {
        slug: 'lecture-2',
        title: 'Lecture 2: Updates and batches',
        description: 'Explore price updates as paired retractions and additions. Apply complete timestamp batches, combine matching diffs, and compare cancellation with replacement.',
      },
    ],
    exercises: [
      {
        slug: 'exercise-1',
        title: 'Exercise 1',
        description: 'Work through a three-phase inventory timeline: calculate copy counts, write diffs for a price change and restock, then identify the final rows and totals.',
      },
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
  return sectionDefinitions.map((section) => ({
    ...section,
    pages: outline?.[section.slug] ?? [],
  }));
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
