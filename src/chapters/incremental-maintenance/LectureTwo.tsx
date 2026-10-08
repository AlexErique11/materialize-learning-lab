import { JoinTable } from './MaintenanceTables';
import type { ReactNode } from 'react';
import type { ChapterDefinition } from '../chapterRegistry';
import { joinLessons, joinReference, joinRunDefinition, joinStages } from './join-scenario';
import { joinSnapshotAt } from './join-simulation';
import { RowDiffs } from './RowDiffs';
import { MaintenanceLecture } from './MaintenanceLecture';
export function IncrementalLectureTwo({ chapter, navigation }: { chapter: ChapterDefinition; navigation: ReactNode }) {
  return <MaintenanceLecture chapter={chapter} navigation={navigation} title="Lecture 2" timeTestId="join-time"
    description="Follow changes through both sides of a join."
    definition={joinRunDefinition} lessons={joinLessons} stages={joinStages} reference={joinReference}
    snapshot={(time) => { const state = joinSnapshotAt(time); return { ...state, inputCount: state.orders.length + state.products.length }; }}
    renderRows={(id, state) => {
      const stage = joinStages.find((item) => item.id === id)!;
      const rows = { orders: state.orders, products: state.products, result: state.output };
      const diffs = { orders: state.orderDiffs, products: state.productDiffs, result: state.outputDiffs };
      return <><JoinTable rows={rows[stage.id]} stage={stage} affectedProductId={state.affectedProductId} affectedOrderIds={state.outputDiffs.map(({ row }) => row.orderId)} />
        <RowDiffs className="join-diffs" entries={diffs[stage.id]} label={stage.id === 'result' ? 'Result diffs' : stage.title + ' diffs'} /></>;
    }} />;
}
