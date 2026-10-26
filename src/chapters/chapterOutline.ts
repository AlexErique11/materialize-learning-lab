import { chapterPath, type ChapterDefinition } from './chapterRegistry';
import { recordLectures } from './getting-data-in/record-scenarios';
import { ingestionExercises } from './getting-data-in/exercise-scenarios';
import { temporalLectures } from './time-in-materialize/scenarios';
import { temporalExercises } from './time-in-materialize/exercise-scenarios';
import { progressLectures } from './progress-and-freshness/lecture-scenarios';
import { progressExercises } from './progress-and-freshness/exercise-scenarios';
import { readLectures } from './consistent-reads/lecture-scenarios';
import { readExercises } from './consistent-reads/exercise-scenarios';
import { subscriptionLectures } from './live-applications-subscribe/lecture-scenarios';
import { subscriptionExercises } from './live-applications-subscribe/exercise-scenarios';

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
  'live-applications-subscribe': {
    tutorial: subscriptionLectures.map((lecture, index) => ({ slug: `lecture-${index + 1}`, title: `Lecture ${index + 1}: ${lecture.title}`, description: lecture.description })),
    exercises: subscriptionExercises.map((exercise, index) => ({ slug: exercise.slug, title: `Exercise ${index + 1}: ${exercise.title}`, description: exercise.description, durationMinutes: [6, 7, 10][index] })),
  },
  'consistent-reads': {
    tutorial: readLectures.map((lecture, index) => ({ slug: `lecture-${index + 1}`, title: `Lecture ${index + 1}: ${lecture.title}`, description: lecture.description })),
    exercises: readExercises.map((exercise, index) => ({ slug: exercise.slug, title: `Exercise ${index + 1}: ${exercise.title}`, description: exercise.description, durationMinutes: [7, 8, 10][index] })),
  },
  'progress-and-freshness': {
    tutorial: progressLectures.map((lecture, index) => ({ slug: `lecture-${index + 1}`, title: `Lecture ${index + 1}: ${lecture.title}`, description: lecture.description })),
    exercises: progressExercises.map((exercise, index) => ({ slug: exercise.slug, title: `Exercise ${index + 1}: ${exercise.title}`, description: exercise.description, durationMinutes: [6, 7, 9][index] })),
  },
  'views-indexes-materialized-views': {
    tutorial: [
      { slug: 'lecture-1', title: 'Lecture 1: Where results live', description: 'Save a view, query it, add an index, then predict how input changes update maintained state.' },
      { slug: 'lecture-2', title: 'Lecture 2: Query across clusters', description: 'Trace queries through local indexes, view computation and durable output. Remove an index and inspect what remains.' },
      { slug: 'lecture-3', title: 'Lecture 3: Choose what to maintain', description: 'Keep SQL building blocks simple and design one maintained transformation for separate serving clusters.' },
    ],
    exercises: [
      { slug: 'exercise-1', title: 'Exercise 1: Choose and inspect objects', description: 'Choose objects, remove an index and move a query between clusters across four checkpoints.', durationMinutes: 7 },
      { slug: 'exercise-2', title: 'Exercise 2: Design shared serving', description: 'Choose intermediate and final objects, then complete a design for two serving clusters.', durationMinutes: 8 },
    ],
  },
  'getting-data-in': {
    tutorial: [{
      slug: 'lecture-1',
      title: 'Lecture 1: From snapshot to live changes',
      description: 'Follow an atomic initial snapshot, queued database changes, and live updates into a product table.',
    }, ...recordLectures.map((lecture) => ({
      slug: 'lecture-' + lecture.number,
      title: 'Lecture ' + lecture.number + ': ' + lecture.title,
      description: lecture.description,
    }))],
    exercises: ingestionExercises.map((exercise, index) => ({
      slug: exercise.slug,
      title: `Exercise ${index + 1}: ${exercise.title}`,
      description: exercise.description,
      durationMinutes: exercise.durationMinutes,
    })),
  },
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
        title: 'Exercise 1: Inventory changes',
        description: 'Work through a three-phase inventory timeline: calculate copy counts, write diffs for a price change and restock, then identify the final rows and totals.',
      },
    ],
  },
  'time-in-materialize': {
    tutorial: temporalLectures.map((lecture) => ({
      slug: 'lecture-' + lecture.number,
      title: 'Lecture ' + lecture.number + ': ' + lecture.title,
      description: lecture.description,
    })),
    exercises: temporalExercises.map((exercise, index) => ({
      slug: exercise.slug, title: `Exercise ${index + 1}: ${exercise.title}`,
      description: exercise.description, durationMinutes: exercise.durationMinutes,
    })),
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
