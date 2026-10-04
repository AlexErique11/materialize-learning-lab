import type { DocumentationLink } from '../app/resources';

export interface ChapterDefinition {
  readonly number: number;
  readonly slug: string;
  readonly title: string;
  readonly shortTitle: string;
  readonly description: string;
  readonly introduction?: string;
  readonly overviewImage?: string;
  readonly documentationLinks?: readonly DocumentationLink[];
  readonly optional?: boolean;
}

// Chapter boundaries and order come from CURRICULUM.md; content slots live in chapterOutline.ts.
export const chapters: readonly ChapterDefinition[] = [
  {
    number: 1,
    slug: 'changing-relations',
    title: 'Changing Relations — Rows, Updates, and Diffs',
    shortTitle: 'Changing Relations',
    description: 'Reconstruct a changing relation from additions, retractions, and updates.',
    introduction: 'Learn how signed changes reconstruct a relation over logical time. Follow additions, retractions, and updates in two tutorials, then practice reading and writing diffs in a three-phase inventory exercise.',
    overviewImage: '/changing-relations-overview.png',
    documentationLinks: [
      { title: 'SUBSCRIBE: logical timestamps and signed diffs', href: 'https://materialize.com/docs/sql/subscribe/#output' },
      { title: 'SUBSCRIBE: snapshots and initial state', href: 'https://materialize.com/docs/sql/subscribe/#snapshot' },
      { title: 'SUBSCRIBE: old and new rows in an update', href: 'https://materialize.com/docs/sql/subscribe/#mapping-rows-to-their-updates' },
      { title: 'SELECT: duplicate rows and grouping', href: 'https://materialize.com/docs/sql/select/' },
      { title: 'COUNT: counting row copies', href: 'https://materialize.com/docs/sql/functions/#aggregate-functions' },
      { title: 'INSERT: adding rows', href: 'https://materialize.com/docs/sql/insert/' },
      { title: 'UPDATE: changing matching rows', href: 'https://materialize.com/docs/sql/update/' },
      { title: 'DELETE: removing rows', href: 'https://materialize.com/docs/sql/delete/' },
    ],
  },
  {
    number: 2,
    slug: 'incremental-maintenance',
    title: 'Incremental Maintenance — How One Change Travels Through SQL',
    shortTitle: 'Incremental Maintenance',
    description: 'Trace one input change through filters, joins, and aggregates.',
  },
  {
    number: 3,
    slug: 'views-indexes-materialized-views',
    title: 'Views, Indexes, and Materialized Views',
    shortTitle: 'Views, Indexes & Materialized Views',
    description: 'Choose where to save SQL, maintain results in memory, or persist them.',
  },
  {
    number: 4,
    slug: 'getting-data-in',
    title: 'Getting Data In — Sources, Snapshots, and CDC',
    shortTitle: 'Getting Data In',
    description: 'Follow initial snapshots and incoming changes into a source relation.',
  },
  {
    number: 5,
    slug: 'time-in-materialize',
    title: 'Time in Materialize — Temporal Filters',
    shortTitle: 'Time in Materialize',
    description: 'Explore logical time and how maintained results change without new input.',
    introduction: 'Learn how time and updates flow through Materialize. In this chapter you will explore logical time, order lifecycles, and how Materialize processes and maintains up-to-date results in real time.',
    documentationLinks: [
      { title: 'Temporal filters (time windows)', href: 'https://materialize.com/docs/transform-data/patterns/temporal-filters/' },
      { title: 'now() and mz_now() functions', href: 'https://materialize.com/docs/sql/functions/now_and_mz_now/' },
    ],
  },
  {
    number: 6,
    slug: 'progress-and-freshness',
    title: 'Progress and Freshness — Why Is the System Behind?',
    shortTitle: 'Progress and Freshness',
    description: 'Trace progress and distinguish ingestion lag from computation lag.',
  },
  {
    number: 7,
    slug: 'consistent-reads',
    title: 'Consistent Reads — Which Moment Does a Query See?',
    shortTitle: 'Consistent Reads',
    description: 'Choose a readable moment and weigh freshness against waiting.',
  },
  {
    number: 8,
    slug: 'maintained-state',
    title: 'Maintained State — Why Small Results Can Be Expensive',
    shortTitle: 'Maintained State',
    description: 'Identify the input and intermediate state behind a small query result.',
  },
  {
    number: 9,
    slug: 'query-optimization',
    title: 'Query Optimization — Change the Plan, Preserve the Answer',
    shortTitle: 'Query Optimization',
    description: 'Explore query shapes, index choices, and plans while preserving the answer.',
  },
  {
    number: 10,
    slug: 'clusters-replicas-recovery',
    title: 'Clusters, Replicas, and Recovery',
    shortTitle: 'Clusters, Replicas & Recovery',
    description: 'Place workloads and follow a replica through hydration and catch-up.',
  },
  {
    number: 11,
    slug: 'live-applications-subscribe',
    title: 'Building Live Applications with SUBSCRIBE',
    shortTitle: 'Live Applications with SUBSCRIBE',
    description: 'Explore snapshots, result changes, and progress in a live application.',
  },
  {
    number: 12,
    slug: 'sinks-downstream-delivery',
    title: 'Sinks and Reliable Downstream Delivery',
    shortTitle: 'Sinks & Downstream Delivery',
    description: 'Follow changing results downstream and reason about reliable delivery.',
  },
  {
    number: 13,
    slug: 'recursive-queries',
    title: 'Recursive Queries and Changing Graphs',
    shortTitle: 'Recursive Queries',
    description: 'Explore fixed points and recursive results as graph edges change.',
    optional: true,
  },
];

export const coreChapters = chapters.filter((chapter) => !chapter.optional);
export const advancedChapters = chapters.filter((chapter) => chapter.optional);

export function findChapter(slug: string | undefined) {
  return chapters.find((chapter) => chapter.slug === slug);
}

export function formatChapterNumber(number: number) {
  return String(number).padStart(2, '0');
}

export function chapterPath(chapter: ChapterDefinition) {
  return `/labs/${chapter.slug}`;
}
