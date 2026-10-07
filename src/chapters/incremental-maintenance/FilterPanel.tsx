import { OrderTable } from './MaintenanceTables';
import { RowDiffs } from './RowDiffs';
import type { snapshotAt } from './simulation';

export function FilterPanel({ stage, state }: { stage: string; state: ReturnType<typeof snapshotAt> }) {

      if (stage === 'projection') return <><OrderTable rows={state.output} caption="Maintained output" />
        <div className="maintenance-output-diffs">
          <RowDiffs entries={state.projectedDiffs} label="Before consolidation" />
          <RowDiffs entries={state.outputDiffs} label="Net output diffs"
            emptyReason={state.projectedDiffs.length > 0 && state.outputDiffs.length === 0 ? 'note excluded' : undefined} />
        </div></>;
      const source = stage === 'source';
      return <><OrderTable rows={source ? state.source : state.filtered} caption={source ? 'Input orders' : 'Filtered orders'} />
        <RowDiffs entries={source ? state.sourceDiffs : state.filterDiffs} label={source ? 'Input diffs' : 'Diffs passing the filter'} /></>;

}
