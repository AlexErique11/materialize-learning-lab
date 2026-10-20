import { useRef, useState } from 'react';
import { Clock3, Database, Table2 } from 'lucide-react';
import { WorkspaceMetric } from '../../components/lab/WorkspaceMetric';
import { RelationHelp } from '../../components/lesson/RelationHelp';
import { Button } from '../../components/ui/Button';
import { Dialog } from '../../components/ui/Dialog';
import { TemporalWorkspace } from './TemporalWorkspace';
import { formatTemporalTime } from './simulation';
import { temporalQuestionState, type TemporalExercise, type TemporalQuestion } from './exercise-scenarios';
import type { TemporalStage } from './scenarios';

export function TemporalExerciseWorkspace({ exercise, question, accepted, activeStage, onSelectStage }: {
  exercise: TemporalExercise; question: TemporalQuestion; accepted: boolean;
  activeStage: TemporalStage; onSelectStage: (stage: TemporalStage) => void;
}) {
  const refs = { source: useRef<HTMLElement>(null), timeline: useRef<HTMLElement>(null), result: useRef<HTMLElement>(null) };
  const clockRef = useRef<HTMLDivElement>(null);
  const diffRef = useRef<HTMLElement>(null);
  const [metricsOpen, setMetricsOpen] = useState(false);
  const state = temporalQuestionState(question, accepted);
  const upcoming = !accepted && question.after > question.before ? question.actions[question.before] : undefined;
  return <>
    <div className="relation-metrics temporal-status-bar" aria-label="Temporal metrics">
      <WorkspaceMetric icon={<Database size={17} aria-hidden="true" />} label={<>Source rows<RelationHelp label="Source rows" text="The currently known input. Expiration does not delete source rows." /></>}
        value={<span data-testid="exercise-source-count">{state.sourceRows.length}</span>} />
      <WorkspaceMetric icon={<Table2 size={17} aria-hidden="true" />} label={<>Result rows<RelationHelp label="Result rows" text="The current result, before the pending action until your prediction is accepted." /></>}
        value={<span data-testid="exercise-result-count">{state.resultRows.length}</span>} />
      <WorkspaceMetric icon={<Clock3 size={17} aria-hidden="true" />} label={<>Current logical time<RelationHelp label="Current logical time" text="Seconds after 2026-01-01 12:00:00 UTC, expressed with millisecond precision. The question identifies the pending action or target time." /></>}
        value={<span className="relation-time" data-testid="exercise-logical-time">{formatTemporalTime(state.logicalTimeMs)}</span>} />
    </div>
    <div className="temporal-exercise-reference" aria-label="Reference panels">
      <Button className="temporal-exercise-metrics-button" onClick={() => setMetricsOpen(true)}>Metrics</Button>
      <TemporalWorkspace state={state} activeStage={activeStage} onSelectStage={onSelectStage} guided={false}
        highlight={accepted} hasClocks={exercise.hasClocks} refs={refs} clockRef={clockRef} diffRef={diffRef}
        upcoming={upcoming} initial={!accepted && question.before === 0}
        concealPredicate={Boolean(question.concealPredicate && !accepted)} />
    </div>
    <Dialog open={metricsOpen} onClose={() => setMetricsOpen(false)} title="Current state">
      <dl className="temporal-exercise-metrics-detail"><dt>Source rows</dt><dd>{state.sourceRows.length}</dd>
        <dt>Result rows</dt><dd>{state.resultRows.length}</dd><dt>Current logical time</dt><dd>{formatTemporalTime(state.logicalTimeMs)}</dd></dl>
    </Dialog>
  </>;
}
