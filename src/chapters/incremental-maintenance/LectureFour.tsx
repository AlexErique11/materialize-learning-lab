import { ComparisonPanel } from './MaintenanceTables';
import type { ReactNode } from 'react';
import type { ChapterDefinition } from '../chapterRegistry';
import { MaintenanceLecture } from './MaintenanceLecture';
import { comparisonLessons, comparisonReference, comparisonRunDefinition, comparisonStages } from './comparison-scenario';
import { comparisonSnapshotAt } from './comparison-simulation';
import './lecture-four.css';

export function IncrementalLectureFour({ chapter, navigation }: { chapter: ChapterDefinition; navigation: ReactNode }) {
  return <MaintenanceLecture chapter={chapter} navigation={navigation} title="Lecture 4" timeTestId="comparison-time" layout="comparison"
    description="Compare rebuilding a query result with maintaining it as the inputs change."
    definition={comparisonRunDefinition} lessons={comparisonLessons} stages={comparisonStages} reference={comparisonReference}
    snapshot={comparisonSnapshotAt} renderRows={(stage, state) => <ComparisonPanel stage={stage} state={state} />} />;
}
