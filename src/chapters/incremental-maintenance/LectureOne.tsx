import { FilterPanel } from './FilterPanel';
import type { ReactNode } from 'react';
import type { ChapterDefinition } from '../chapterRegistry';
import { lessons, lectureReference, runDefinition, stages } from './scenario';
import { snapshotAt } from './simulation';
import { MaintenanceLecture } from './MaintenanceLecture';
export function IncrementalLectureOne({ chapter, navigation }: { chapter: ChapterDefinition; navigation: ReactNode }) {
  return <MaintenanceLecture chapter={chapter} navigation={navigation} title="Lecture 1" timeTestId="maintenance-time"
    description="Follow an order change through filtering and projection."
    definition={runDefinition} lessons={lessons} stages={stages} reference={lectureReference}
    snapshot={(time) => { const state = snapshotAt(time); return { ...state, inputCount: state.source.length }; }}
    renderRows={(stage, state) => <FilterPanel stage={stage} state={state} />} />;
}
