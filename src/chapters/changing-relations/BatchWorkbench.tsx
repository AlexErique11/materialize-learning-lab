import { useState, type RefObject } from 'react';
import { PanelTabs } from '../../components/lab/PanelTabs';
import { ChangeLedger, CurrentRelation } from './RelationWorkbench';
import { batchHelp, lectureTwoBatches, lectureTwoLedger } from './lecture-two-scenario';
import { consolidateTimestamp, type RowMultiplicity } from './simulation';

export function BatchWorkbench({ relation, time, applied, previewTime, ledgerRef, relationRef, controlsDisabled, highlightCopies, onSelectTime, guidedPanel }: {
  guidedPanel?: 'ledger' | 'relation';
  relation: readonly RowMultiplicity[];
  time: number;
  applied: number;
  previewTime: number | null;
  ledgerRef: RefObject<HTMLElement | null>;
  relationRef: RefObject<HTMLElement | null>;
  controlsDisabled: boolean;
  highlightCopies: boolean;
  onSelectTime: (time: number) => void;
}) {
  const [selectedPanel, setSelectedPanel] = useState<'ledger' | 'relation'>('ledger');
  const activePanel = guidedPanel ?? selectedPanel;
  const current = lectureTwoBatches.find((entry) => entry.time === time);
  const affectedRows = current ? consolidateTimestamp(current.updates).filter((update) => update.diff !== 0).map((update) => update.row) : [];

  return <div data-walkthrough="lecture-workspace" className="relation-panels" data-selected-panel={activePanel}>
    <PanelTabs value={activePanel} onChange={setSelectedPanel} disabled={Boolean(guidedPanel)} />
    <ChangeLedger updates={lectureTwoLedger} time={time} applied={applied} previewTime={previewTime} ledgerRef={ledgerRef}
      controlsDisabled={controlsDisabled} onSelectTime={onSelectTime} help={batchHelp} timestampView highlightSelected={Boolean(guidedPanel)} />
    <CurrentRelation relation={relation} time={time} relationRef={relationRef} highlightCopies={highlightCopies} affectedRows={affectedRows} />
  </div>;
}
