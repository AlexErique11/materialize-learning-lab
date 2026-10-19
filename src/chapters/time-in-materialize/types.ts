/** All fixture times are integer millisecond offsets from this fixed UTC origin. */
export const TEMPORAL_TIME_ORIGIN = '2026-01-01T12:00:00.000Z';

export type PredicateMode = 'exclusive-window' | 'inclusive-window' | 'bounded-window' | 'explicit-deadline';

export interface TemporalRow {
  readonly eventId: number;
  readonly eventTimeMs: number;
  readonly expiresAtMs?: number;
}

export interface TemporalFixture {
  readonly id: string;
  readonly label: string;
  readonly logicalTimeMs: number;
  readonly rows: readonly TemporalRow[];
  readonly predicate: PredicateMode;
  readonly windowMs?: number;
  /** Initial rows are already applied; this is provenance, not their event time. */
  readonly appliedAtMs?: number;
}

export type TemporalAction =
  | { readonly kind: 'advance'; readonly timeMs: number }
  | { readonly kind: 'insert' | 'update'; readonly timeMs: number; readonly row: TemporalRow }
  | { readonly kind: 'delete'; readonly timeMs: number; readonly eventId: number }
  | { readonly kind: 'switch-fixture'; readonly fixture: TemporalFixture };

export interface TemporalDiff {
  readonly row: TemporalRow;
  readonly diff: -1 | 1;
  readonly timeMs: number;
}

export interface TemporalEligibility {
  readonly eventId: number;
  readonly entryAtMs: number | null;
  readonly exitAtMs: number;
  readonly exitInclusive: boolean;
  /** First millisecond excluded at the upper boundary. */
  readonly transitionAtMs: number;
}

export interface TemporalApplication {
  readonly eventId: number;
  readonly appliedAtMs: number;
  readonly lastChangedAtMs: number;
}

export interface TemporalVisibilitySegment {
  readonly startMs: number;
  readonly endMs: number | null;
  readonly row: TemporalRow;
}

export interface TemporalTimelineRow {
  readonly eventId: number;
  readonly row: TemporalRow;
  readonly appliedAtMs: number;
  readonly deletedAtMs?: number;
  readonly segments: readonly TemporalVisibilitySegment[];
}

export interface CanceledTemporalDeadline {
  readonly eventId: number;
  readonly deadlineMs: number;
  readonly canceledAtMs: number;
  readonly reason: 'updated' | 'deleted';
}

export interface TemporalChangeBatch {
  readonly timeMs: number;
  readonly diffs: readonly TemporalDiff[];
}

export interface TemporalSnapshot {
  readonly fixtureId: string;
  readonly fixtureLabel: string;
  readonly predicate: PredicateMode;
  readonly windowMs: number;
  readonly logicalTimeMs: number;
  readonly sourceRows: readonly TemporalRow[];
  readonly resultRows: readonly TemporalRow[];
  /** Changes at the latest transition reached by this action, not a fixture reset. */
  readonly resultDiffs: readonly TemporalDiff[];
  readonly sourceDiffs: readonly TemporalDiff[];
  readonly applications: readonly TemporalApplication[];
  readonly timeline: readonly TemporalTimelineRow[];
  readonly eligibility: readonly TemporalEligibility[];
  readonly canceledDeadlines: readonly CanceledTemporalDeadline[];
  /** Complete logical change history since this fixture's initial baseline. */
  readonly changes: readonly TemporalChangeBatch[];
  readonly fixtureReset: boolean;
}
