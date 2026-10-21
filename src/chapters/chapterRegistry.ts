import type { DocumentationLink } from '../app/resources';
import { objectDocumentationLinks } from './views-indexes-materialized-views/resources';
import { documentationLinks as progressDocumentationLinks } from './progress-and-freshness/resources';

export interface ChapterDefinition {
  readonly number: number;
  readonly slug: string;
  readonly title: string;
  readonly shortTitle: string;
  readonly description: string;
  readonly introduction?: string;
  readonly overviewImage?: string;
  readonly overviewImageFit?: 'cover' | 'contain';
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
    introduction: 'Explore how input changes travel through SQL filters, joins, and grouped aggregates. Follow inserts, updates, and deletions through four interactive tutorials, compare incremental maintenance with full recomputation, then practice predicting which result rows change in two exercises.',
    overviewImage: '/incremental-maintenance-overview.png',
    overviewImageFit: 'contain',
    documentationLinks: [
      { title: 'SELECT: projections, WHERE filters, and GROUP BY', href: 'https://materialize.com/docs/sql/select/' },
      { title: 'JOIN: inner joins, matching keys, and multiple matches', href: 'https://materialize.com/docs/sql/select/join/#inner-join' },
      { title: 'Aggregate functions: COUNT and SUM', href: 'https://materialize.com/docs/sql/functions/#aggregate-functions' },
      { title: 'Arrangements: incremental dataflows and retained state', href: 'https://materialize.com/docs/fundamentals/concepts/arrangements/' },
      { title: 'Views: maintaining query results as inputs change', href: 'https://materialize.com/docs/fundamentals/concepts/views/' },
      { title: 'SUBSCRIBE: logical timestamps and signed result changes', href: 'https://materialize.com/docs/sql/subscribe/#output' },
      { title: 'SUBSCRIBE: initial snapshots and subsequent changes', href: 'https://materialize.com/docs/sql/subscribe/#snapshot' },
      { title: 'SUBSCRIBE: old and new rows in an update', href: 'https://materialize.com/docs/sql/subscribe/#mapping-rows-to-their-updates' },
      { title: 'INSERT: adding input rows', href: 'https://materialize.com/docs/sql/insert/' },
      { title: 'UPDATE: changing amounts, join keys, and group keys', href: 'https://materialize.com/docs/sql/update/' },
      { title: 'DELETE: removing input rows and their contributions', href: 'https://materialize.com/docs/sql/delete/' },
    ],
  },
  {
    number: 3,
    slug: 'views-indexes-materialized-views',
    title: 'Views, Indexes, and Materialized Views',
    shortTitle: 'Views, Indexes & Materialized Views',
    description: 'Choose where to save SQL, maintain results in memory, or persist them.',
    introduction: 'Build a mental model of saved SQL, cluster-local indexes and durable materialized output. Follow one evolving diagram through three tutorials, predict object and query behavior in two exercises, then design one transformation for two independently scaled serving clusters.',
    documentationLinks: objectDocumentationLinks,
  },
  {
    number: 4,
    slug: 'getting-data-in',
    title: 'Getting Data In — Sources, Snapshots, and CDC',
    shortTitle: 'Getting Data In',
    description: 'Follow initial snapshots and incoming changes into a source relation.',
    introduction: 'Follow data from an upstream system into Materialize. Explore initial snapshots and change data capture, then see how records become table changes with NONE, UPSERT, and DEBEZIUM envelopes. Work through four interactive tutorials and three exercises covering keys, updates, tombstones, and input errors.',
    overviewImage: '/getting-data-in-overview.png',
    overviewImageFit: 'contain',
    documentationLinks: [
      { title: 'Snapshotting: atomic initial loads and waiting queries', href: 'https://materialize.com/docs/fundamentals/concepts/snapshotting/' },
      { title: 'CREATE CONNECTION: reusable access to upstream systems', href: 'https://materialize.com/docs/sql/create-connection/' },
      { title: 'PostgreSQL sources: native change data capture', href: 'https://materialize.com/docs/sql/create-source/postgres-v2/' },
      { title: 'PostgreSQL tables: ingesting data from a source', href: 'https://materialize.com/docs/sql/create-table/postgres/' },
      { title: 'Kafka sources: connections and topics', href: 'https://materialize.com/docs/sql/create-source/kafka-v2/' },
      { title: 'Kafka tables: formats and the NONE envelope', href: 'https://materialize.com/docs/sql/create-table/kafka/' },
      { title: 'UPSERT: keys, replacements, tombstones, and errors', href: 'https://materialize.com/docs/sql/create-table/kafka/#upsert-envelope' },
      { title: 'DEBEZIUM: before and after records', href: 'https://materialize.com/docs/sql/create-table/kafka/#debezium-envelope' },
    ],
  },
  {
    number: 5,
    slug: 'time-in-materialize',
    title: 'Time in Materialize — Temporal Filters',
    shortTitle: 'Time in Materialize',
    description: 'Explore logical time and how maintained results change without new input.',
    introduction: 'Explore how logical time changes maintained results, even without new input. Follow expiration boundaries, future events, late arrivals, and changing deadlines through four interactive tutorials and three prediction exercises.',
    documentationLinks: [
      { title: 'now() and mz_now(): system time and query logical time', href: 'https://materialize.com/docs/sql/functions/now_and_mz_now/' },
      { title: 'Temporal filters: valid comparisons and materialization restrictions', href: 'https://materialize.com/docs/transform-data/patterns/temporal-filters/#mz_now-requirements-and-restrictions' },
      { title: 'Sliding windows: entry and expiration bounds', href: 'https://materialize.com/docs/transform-data/patterns/temporal-filters/#sliding-window' },
      { title: 'Time-to-Live (TTL): per-row expiration deadlines', href: 'https://materialize.com/docs/transform-data/patterns/temporal-filters/#time-to-live-ttl' },
      { title: 'Late arrivals: remaining lifetime and grace periods', href: 'https://materialize.com/docs/transform-data/patterns/temporal-filters/#late-arriving-events' },
      { title: 'mz_timestamp: millisecond timestamps and valid casts', href: 'https://materialize.com/docs/sql/types/mz_timestamp/' },
      { title: 'CREATE MATERIALIZED VIEW: maintain a temporal query', href: 'https://materialize.com/docs/sql/create-materialized-view/' },
      { title: 'SUBSCRIBE: logical timestamps and signed result changes', href: 'https://materialize.com/docs/sql/subscribe/#output' },
      { title: 'INSERT: add timestamped events', href: 'https://materialize.com/docs/sql/insert/' },
      { title: 'UPDATE: change a row’s deadline', href: 'https://materialize.com/docs/sql/update/' },
      { title: 'DELETE: remove source rows', href: 'https://materialize.com/docs/sql/delete/' },
    ],
  },
  {
    number: 6,
    slug: 'progress-and-freshness',
    title: 'Progress and Freshness — Why Is the System Behind?',
    shortTitle: 'Progress and Freshness',
    description: 'Trace progress and distinguish ingestion lag from computation lag.',
    introduction: 'Read write frontiers, follow two inputs into a maintained join, and distinguish the progress inputs permit from actual completion. Three guided tutorials and three exercises teach quiet-source evidence, limiting dependencies, local and inherited delay, and the difference between stale data and slow queries.',
    documentationLinks: progressDocumentationLinks,
  },
  {
    number: 7,
    slug: 'consistent-reads',
    title: 'Consistent Reads — Which Moment Does a Query See?',
    shortTitle: 'Consistent Reads',
    description: 'Choose a readable moment and weigh freshness against waiting.',
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

// In-lab links skip the empty /labs entry redirect so page transitions stay intact.
export const guidedLabsHomePath = chapterPath(coreChapters[0]!);
