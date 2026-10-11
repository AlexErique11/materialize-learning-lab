import type { ReactNode, RefObject } from 'react';
import { ArrowRight, Database, FileInput, GitCompareArrows, Layers, Table2 } from 'lucide-react';
import { RelationHelp } from '../../components/lesson/RelationHelp';
import { Button } from '../../components/ui/Button';
import { ProgressBar } from '../../components/ui/ProgressBar';
import { initialProducts, snapshotStages, type SnapshotStage } from './scenario';
import type { SnapshotState } from './simulation';
import { recordStages, type Envelope, type RecordStage } from './record-scenarios';

interface Stage {
  id: string;
  title: string;
  shortTitle?: string;
  sql: string;
  description: string;
}

function PanelHeading({ stage, icon }: { stage: Stage; icon: ReactNode }) {
  return <header className="ingestion-panel-heading">
    <h2 id={'ingestion-' + stage.id + '-heading'}>{icon}{stage.title}<RelationHelp label={stage.title} text={stage.description} /></h2>
    <code>{stage.sql}</code>
  </header>;
}

function PanelTabs({ stages, selected, onSelect, guided }: {
  stages: readonly Stage[]; selected: string; onSelect: (stage: string) => void; guided: boolean;
}) {
  return <nav className="ingestion-panel-tabs" aria-label="Workspace panels">
    {stages.map((stage, index) => <Button key={stage.id} aria-pressed={selected === stage.id}
      disabled={guided} onClick={() => onSelect(stage.id)}>{index + 1}. {stage.shortTitle ?? stage.title}</Button>)}
  </nav>;
}

interface WorkspaceProps<S extends string> {
  activeStage: string;
  setSelectedStage: (stage: string) => void;
  guided: boolean;
  panelRefs: Record<S, RefObject<HTMLElement | null>>;
  renderContent: (stage: S) => ReactNode;
}

export function SnapshotWorkspace({ activeStage, setSelectedStage, guided, panelRefs, renderContent, state }:
  WorkspaceProps<SnapshotStage> & { state: SnapshotState }) {
  const [source, ingestion, relation] = snapshotStages;
  return <>
    <PanelTabs stages={snapshotStages} selected={activeStage} onSelect={setSelectedStage} guided={guided} />
    <div className="ingestion-layout snapshot-layout" data-selected-stage={activeStage} data-guided={guided} data-walkthrough="lecture-workspace">
      <section ref={panelRefs.source} className="ingestion-panel snapshot-source" data-stage="source" data-active={guided && activeStage === 'source'} aria-labelledby="ingestion-source-heading">
        <PanelHeading stage={source} icon={<Database size={18} aria-hidden="true" />} />
        {renderContent('source')}
      </section>
      <div className="snapshot-bridge" aria-label="Snapshot to CDC flow">
        <span className="snapshot-bridge-line" aria-hidden="true"><ArrowRight size={18} /></span>
        <Layers size={24} aria-hidden="true" />
        <strong>{state.phase === 'Snapshotting' ? 'Atomic snapshot' : state.phase === 'Catch-up' ? 'Catch up' : 'Live CDC'}</strong>
        <span>{state.phase === 'Snapshotting' ? 'All starting rows commit together' : state.phase === 'Catch-up' ? 'Apply the queued changes' : 'Maintain the existing table'}</span>
      </div>
      <section ref={panelRefs.relation} className="ingestion-panel snapshot-destination" data-stage="relation" data-active={guided && activeStage === 'relation'} aria-labelledby="ingestion-relation-heading">
        <PanelHeading stage={relation} icon={<Table2 size={18} aria-hidden="true" />} />
        {renderContent('relation')}
      </section>
      <section ref={panelRefs.ingestion} className="ingestion-panel snapshot-ingestion" data-stage="ingestion" data-active={guided && activeStage === 'ingestion'} aria-labelledby="ingestion-ingestion-heading">
        <div className="snapshot-ingestion-summary">
          <PanelHeading stage={ingestion} icon={<Layers size={18} aria-hidden="true" />} />
          <section aria-label="Snapshot and CDC status">
            <p>{state.snapshotRowsRead} / {initialProducts.length} starting rows read.</p>
            <ProgressBar value={state.snapshotRowsRead} total={initialProducts.length} label="Initial snapshot rows read" />
            <p>{state.relation === null ? 'Waiting to commit the snapshot.' : 'Snapshot committed together.'}</p>
          </section>
        </div>
        {renderContent('ingestion')}
      </section>
    </div>
  </>;
}

export function RecordWorkspace({ activeStage, setSelectedStage, guided, panelRefs, renderContent, envelope }:
  WorkspaceProps<RecordStage> & { envelope: Envelope }) {
  const stages = recordStages(envelope);
  const icons = { record: <FileInput size={18} aria-hidden="true" />, changes: <GitCompareArrows size={18} aria-hidden="true" />, relation: <Table2 size={18} aria-hidden="true" /> };
  return <>
    <PanelTabs stages={stages} selected={activeStage} onSelect={setSelectedStage} guided={guided} />
    <div className="ingestion-layout record-layout" data-selected-stage={activeStage} data-guided={guided} data-walkthrough="lecture-workspace">
      {stages.map((stage) => <section key={stage.id} ref={panelRefs[stage.id]} className={'ingestion-panel record-' + stage.id}
        data-stage={stage.id} data-active={guided && activeStage === stage.id} aria-labelledby={'ingestion-' + stage.id + '-heading'}>
        <PanelHeading stage={stage} icon={icons[stage.id]} />
        {renderContent(stage.id)}
      </section>)}
    </div>
  </>;
}
