import { useRef, useState } from 'react';
import { Database, FileInput, FileText, ListTodo, Clock3, Table2 } from 'lucide-react';
import { WorkspaceMetric } from '../../components/lab/WorkspaceMetric';
import { Button } from '../../components/ui/Button';
import { Dialog } from '../../components/ui/Dialog';
import { SnapshotWorkspace, RecordWorkspace } from './IngestionLayouts';
import { SnapshotPanelContent } from './SnapshotPanels';
import { RecordPanelContent } from './RecordPanels';
import { stateForQuestion, type IngestionQuestion } from './exercise-scenarios';

export function ExerciseWorkspace({ question, accepted, activeStage, onSelectStage }: {
  question: IngestionQuestion; accepted: boolean; activeStage: string;
  onSelectStage: (stage: string) => void;
}) {
  const sourceRef = useRef<HTMLElement>(null);
  const ingestionRef = useRef<HTMLElement>(null);
  const recordRef = useRef<HTMLElement>(null);
  const changesRef = useRef<HTMLElement>(null);
  const relationRef = useRef<HTMLElement>(null);
  const current = stateForQuestion(question, accepted);
  const [metricsOpen, setMetricsOpen] = useState(false);
  return <>
    <div className="relation-metrics ingestion-status-bar">
      <div className="ingestion-status-metrics" aria-label="Exercise metrics">
        {current.kind === 'snapshot' && question.kind === 'snapshot' ? <>
          <WorkspaceMetric icon={<Database size={17} aria-hidden="true" />} label="Snapshot rows read"
            value={<span data-testid="exercise-snapshot-read">{current.state.snapshotRowsRead} / {question.fixture.initial.length}</span>} />
          <WorkspaceMetric icon={<ListTodo size={17} aria-hidden="true" />} label="Pending CDC"
            value={<span data-testid="exercise-pending-cdc">{current.state.pendingCount}</span>} />
          <WorkspaceMetric icon={<Clock3 size={17} aria-hidden="true" />} label="Phase"
            value={<span data-testid="exercise-phase">{current.state.phase}</span>} />
        </> : current.kind === 'record' && question.kind === 'record' && <>
          <WorkspaceMetric icon={<FileInput size={17} aria-hidden="true" />} label="Records read"
            value={<span data-testid="exercise-records-read">{current.state.recordsRead}</span>} />
          <WorkspaceMetric icon={<Table2 size={17} aria-hidden="true" />} label="Current row copies"
            value={<span data-testid="exercise-row-copies">{current.state.relation?.length ?? '—'}</span>} />
          <WorkspaceMetric icon={<FileText size={17} aria-hidden="true" />} label="Envelope"
            value={<span data-testid="exercise-envelope">{question.chooseEnvelope && !accepted ? 'Choose' : current.state.fixture.envelope}</span>} />
        </>}
      </div>
      <span className="ingestion-checkpoint">{accepted ? 'Prediction accepted' : 'Current state'}</span>
    </div>
    <div className="ingestion-exercise-visualization" role="group" aria-label={question.actionLabel}>
      <Button className="ingestion-exercise-metrics-button" onClick={() => setMetricsOpen(true)}>Metrics</Button>
      {current.kind === 'snapshot' && question.kind === 'snapshot' ? <SnapshotWorkspace
        activeStage={activeStage} setSelectedStage={onSelectStage} guided={false}
        state={current.state} snapshotRowTotal={question.fixture.initial.length}
        predictAvailability={Boolean(question.maskAvailability && !accepted)}
        panelRefs={{ source: sourceRef, ingestion: ingestionRef, relation: relationRef }}
        renderContent={(stage) => <SnapshotPanelContent stage={stage} state={current.state} highlight={false}
          predictAvailability={Boolean(question.maskAvailability && !accepted)} appliedLabel="Most recent applied change" />} />
        : current.kind === 'record' && question.kind === 'record' && <RecordWorkspace
          activeStage={activeStage} setSelectedStage={onSelectStage} guided={false} envelope={current.state.fixture.envelope}
          chooseEnvelope={Boolean(question.chooseEnvelope && !accepted)}
          panelRefs={{ record: recordRef, changes: changesRef, relation: relationRef }}
          renderContent={(stage) => <RecordPanelContent stage={stage} state={current.state} record={question.record}
            upcoming={!accepted} pending={!accepted} highlight={false} neutralIdentity={Boolean(question.chooseEnvelope && !accepted)} />} />}
    </div>
    <Dialog open={metricsOpen} onClose={() => setMetricsOpen(false)} title="Current state">
      <dl className="ingestion-exercise-metrics-detail">
        {current.kind === 'snapshot' && question.kind === 'snapshot' ? <>
          <dt>Snapshot rows read</dt><dd>{current.state.snapshotRowsRead} / {question.fixture.initial.length}</dd>
          <dt>Pending CDC</dt><dd>{current.state.pendingCount}</dd><dt>Phase</dt><dd>{current.state.phase}</dd>
        </> : current.kind === 'record' && question.kind === 'record' && <>
          <dt>Records read</dt><dd>{current.state.recordsRead}</dd><dt>Current row copies</dt><dd>{current.state.relation?.length ?? '—'}</dd>
          <dt>Envelope</dt><dd>{question.chooseEnvelope && !accepted ? 'Choose' : current.state.fixture.envelope}</dd>
        </>}
      </dl>
    </Dialog>
  </>;
}
