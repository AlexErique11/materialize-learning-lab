import { useId, useRef, type ReactNode } from 'react';
import { ArrowRight, CheckCircle2, Eye, Lightbulb } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { ProgressBar } from '../../components/ui/ProgressBar';
import { Table } from '../../components/ui/Table';
import { GuidedLabScreen } from '../../labs/components/GuidedLabScreen';
import type { ChapterDefinition } from '../chapterRegistry';
import { LessonText, type LessonTextContent } from './LessonText';
import { RelationHelp } from './RelationHelp';
import { CurrentRelation, DiffBadge, RelationMetrics } from './RelationWorkbench';
import { relationHelp } from './scenario';
import { rowKey, type ProductRow, type RowMultiplicity } from './simulation';
import type { useExerciseStages } from './useExerciseStages';
import './lecture-one.css';
import './exercises.css';

export function ExerciseInput({ label, labelContent, value, error, signed = false, inLedger = false, disabled, onChange }: {
  label: string; labelContent?: LessonTextContent; value: string; error?: string; signed?: boolean; inLedger?: boolean; disabled: boolean; onChange: (value: string) => void;
}) {
  const id = useId();
  return <label className={`exercise-answer-field${inLedger ? ' exercise-ledger-answer' : ''}`}><span className={inLedger ? 'sr-only' : undefined}><LessonText content={labelContent ?? [label]} /></span>
    <input aria-label={label} aria-invalid={Boolean(error)} aria-describedby={error ? `${id}-error` : undefined} type="text"
      inputMode={signed ? 'text' : 'numeric'} autoComplete="off" value={value} disabled={disabled} placeholder="?"
      onChange={(event) => onChange(event.target.value)} />
    {error && <span id={`${id}-error`} className="sr-only">{error}</span>}
  </label>;
}

export interface ExerciseLedgerRecord {
  row: ProductRow;
  time: number;
  diff: number | null;
  control?: ReactNode;
  pending?: boolean;
}

export function ExerciseLedger({ records, rows = 4, title = 'Change ledger', targetTime }: {
  records: readonly ExerciseLedgerRecord[]; rows?: number; title?: string; targetTime: number;
}) {
  return <section className="relation-panel exercise-ledger" aria-labelledby="exercise-ledger-heading">
    <h2 id="exercise-ledger-heading">{title}<RelationHelp label={title} text="These authored records affect full rows. The tinted batch is awaiting your prediction; the current relation changes only after a correct answer. Empty grid rows are placeholders." /><span className="relation-panel-time">{records.some((record) => record.pending) ? 'Upcoming' : 'Applied'} · t = {targetTime}</span></h2>
    <Table caption={title}>
      <thead><tr>{[relationHelp.time, relationHelp.diff, relationHelp.row].map((help, index) => <th key={help.label} scope="col"><span className="relation-column-label">{index === 0 ? 't' : help.label}<RelationHelp {...help} /></span></th>)}</tr></thead>
      <tbody>
        {records.map((record, index) => <tr key={`${record.time}:${rowKey(record.row)}:${index}`} className={record.pending ? 'relation-ledger-preview' : ''}>
          <td>{record.time}</td><td>{record.control ?? (record.diff === null ? '?' : <DiffBadge diff={record.diff} />)}</td>
          <td><span className="relation-row-value">{record.row.product}<span>${record.row.price}</span></span></td>
        </tr>)}
        {Array.from({ length: Math.max(0, rows - records.length) }, (_, index) => <tr key={`empty:${index}`} aria-hidden="true"><td /><td /><td /></tr>)}
      </tbody>
    </Table>
    <p className="relation-table-note">{records.some((record) => record.pending) ? 'Tinted rows are upcoming. Predict their effect before applying them.' : 'The complete timestamp has been applied.'}</p>
  </section>;
}

export function ExerciseLayout({ chapter, title, description, navigation, flow, relation, time, ledger, rows = 4,
  checkpointTitle, question, hint, answers, onCheck, onShowAnswer, onNext, onReset }: {
  chapter: ChapterDefinition; title: string; description: string; navigation: ReactNode;
  flow: ReturnType<typeof useExerciseStages>;
  relation: readonly RowMultiplicity[]; time: number; ledger: ReactNode; rows?: number;
  checkpointTitle: string; question: LessonTextContent; hint: LessonTextContent; answers: ReactNode;
  onCheck: () => void; onShowAnswer: () => void; onNext: () => void; onReset: () => void;
}) {
  const formId = useId();
  const metricsRef = useRef<HTMLDivElement>(null);
  const relationRef = useRef<HTMLElement>(null);
  return <GuidedLabScreen chapter={chapter} title={title} regionLabel="Exercise content" navigation={navigation}
    description={description} showTip={false} showReference={false} className="changing-relations-page staged-exercise-page"
    controls={{
      progress: <div className="guided-lab-progress"><div><span>Phases</span><strong>{flow.completed} / {flow.total}</strong></div>
        <ProgressBar value={flow.completed} total={flow.total} label="Exercise phases completed" /></div>,
      actions: <>
        <Button onClick={onReset}>Reset</Button>
        <Button disabled={flow.accepted} aria-expanded={flow.hintOpen} aria-controls={`${formId}-question`} onClick={() => flow.dispatch({ type: 'hint' })}><Lightbulb size={14} aria-hidden="true" />Hint</Button>
        <Button disabled={flow.accepted} onClick={onShowAnswer}><Eye size={14} aria-hidden="true" />Show Answer</Button>
        <Button variant="primary" type="submit" form={formId} disabled={flow.accepted}><CheckCircle2 size={14} aria-hidden="true" />Check Answer</Button>
      </>,
    }}
    workspace={<form id={formId} className="relation-workspace" noValidate onSubmit={(event) => { event.preventDefault(); if (!flow.accepted) onCheck(); }}>
      <RelationMetrics relation={relation} time={time} metricsRef={metricsRef} />
      <div className="relation-panels">{ledger}<CurrentRelation relation={relation} time={time} relationRef={relationRef} highlightCopies={false} minRows={rows} /></div>
      <section id={`${formId}-question`} className="exercise-question" data-result={flow.grade ? (flow.accepted ? 'correct' : 'incorrect') : 'ready'} aria-labelledby={`${formId}-heading`}>
        <div className="exercise-question-copy" aria-live="polite" aria-atomic="true">
          <h2 id={`${formId}-heading`}>{flow.accepted ? <CheckCircle2 size={18} aria-hidden="true" /> : <Lightbulb size={18} aria-hidden="true" />}<span><LessonText content={flow.grade?.title ?? [`Phase ${flow.stage + 1} of ${flow.total}: ${checkpointTitle}`]} /></span></h2>
          <p><LessonText content={flow.grade?.explanation ?? (flow.hintOpen ? hint : question)} /></p>
        </div>
        <div className="exercise-answers" aria-label="Your prediction">{answers}</div>
      </section>
      <div className="exercise-question-navigation">
        {flow.accepted && !flow.complete && <Button className="exercise-next-question" variant="primary" onClick={onNext}>Next question<ArrowRight size={14} aria-hidden="true" /></Button>}
      </div>
    </form>} />;
}
