import { DiffBadge } from '../../components/lesson/DiffBadge';
import { ExerciseFrame } from '../../components/lab/ExerciseFrame';
import { useId, useRef, useState, type ComponentProps, type ReactNode } from 'react';
import { PanelTabs } from '../../components/lab/PanelTabs';
import { Button } from '../../components/ui/Button';
import { Table } from '../../components/ui/Table';
import { LessonText, type LessonTextContent } from '../../components/lesson/LessonText';
import { RelationHelp } from '../../components/lesson/RelationHelp';
import { CurrentRelation, RelationMetrics } from './RelationWorkbench';
import { relationHelp } from './scenario';
import { rowKey, type ProductRow, type RowMultiplicity } from './simulation';
import './lecture-one.css';
import './exercises.css';

export function ExerciseInput({
  label,
  labelContent,
  value,
  error,
  signed = false,
  numeric = true,
  inLedger = false,
  disabled,
  onChange,
}: {
  label: string;
  labelContent?: LessonTextContent;
  value: string;
  error?: string;
  signed?: boolean;
  numeric?: boolean;
  inLedger?: boolean;
  disabled: boolean;
  onChange: (value: string) => void;
}) {
  const id = useId();
  return (
    <label className={`exercise-answer-field${inLedger ? ' exercise-ledger-answer' : ''}`}>
      <span className={inLedger ? 'sr-only' : undefined}>
        <LessonText content={labelContent ?? [label]} />
      </span>

      <input
        aria-label={label}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : undefined}
        type="text"
        inputMode={signed || !numeric ? 'text' : 'numeric'}
        autoComplete="off"
        value={value}
        disabled={disabled}
        placeholder="?"
        onChange={(event) => onChange(event.target.value)}
      />
      {error && (
        <span id={`${id}-error`} className="sr-only">
          {error}
        </span>
      )}
    </label>
  );
}

export interface ExerciseLedgerRecord {
  row: ProductRow;

  time: number;

  diff: number | null;

  control?: ReactNode;

  pending?: boolean;
}

export function ExerciseLedger({
  records,
  rows = 4,
  title = 'Change ledger',
  targetTime,
  highlightPending = true,
}: {
  records: readonly ExerciseLedgerRecord[];
  rows?: number;
  title?: string;
  targetTime: number;
  highlightPending?: boolean;
}) {
  return (
    <section className="relation-panel exercise-ledger" aria-labelledby="exercise-ledger-heading">
      <h2 id="exercise-ledger-heading">
        {title}
        <RelationHelp
          label={title}
          text={`These authored records affect full rows. The ${highlightPending ? 'tinted ' : ''}batch is awaiting your prediction; the current relation changes only after a correct answer. Empty grid rows are placeholders.`}
        />
        <span className="relation-panel-time">
          {records.some((record) => record.pending) ? 'Upcoming' : 'Applied'} · t = {targetTime}
        </span>
      </h2>

      <Table caption={title}>
        <thead>
          <tr>
            {[relationHelp.diff, relationHelp.row].map((help, index) => (
              <th
                key={help.label}
                scope="col"
                style={index === 0 ? { width: '38%' } : { textAlign: 'left' }}
              >
                <span className="relation-column-label">
                  {help.label}
                  <RelationHelp {...help} />
                </span>
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {records.map((record, index) => (
            <tr
              key={`${record.time}:${rowKey(record.row)}:${index}`}
              className={highlightPending && record.pending ? 'relation-ledger-preview' : ''}
            >
              <td>
                <span className="relation-ledger-cell">
                  {record.control ??
                    (record.diff === null ? '?' : <DiffBadge diff={record.diff} />)}
                </span>
              </td>

              <td style={{ textAlign: 'start' }}>
                <span className="relation-row-value">
                  {record.row.product}
                  <span>${record.row.price}</span>
                </span>
              </td>
            </tr>
          ))}
          {Array.from({ length: Math.max(0, rows - records.length) }, (_, index) => (
            <tr key={`empty:${index}`} aria-hidden="true">
              <td>
                <span className="relation-ledger-cell" />
              </td>
              <td />
            </tr>
          ))}
        </tbody>
      </Table>

      <p className="relation-table-note">
        {records.some((record) => record.pending)
          ? `${highlightPending ? 'Tinted rows' : 'These changes'} are upcoming. Predict their effect before applying them.`
          : 'The complete timestamp has been applied.'}
      </p>
    </section>
  );
}

export function ExerciseLayout(
  props: Omit<ComponentProps<typeof ExerciseFrame>, 'visualization' | 'pageClass'> & {
    relation: readonly RowMultiplicity[];
    time: number;
    ledger: ReactNode;
    rows?: number;
  }
) {
  const [selectedPanel, setSelectedPanel] = useState<'ledger' | 'relation'>('ledger');
  const metricsRef = useRef<HTMLDivElement>(null);
  const relationRef = useRef<HTMLElement>(null);
  return (
    <ExerciseFrame
      {...props}
      pageClass="lesson-page changing-relations-page changing-relations-exercise-page staged-exercise-page"
      mobilePanel={selectedPanel}
      visualization={(questionOpen, setQuestionOpen) => (
        <>
          <RelationMetrics relation={props.relation} time={props.time} metricsRef={metricsRef} />

          <div className="relation-panels" data-selected-panel={selectedPanel}>
            <PanelTabs
              value={questionOpen ? undefined : selectedPanel}
              onChange={(panel) => {
                setQuestionOpen(false);
                setSelectedPanel(panel);
              }}
            >
              <Button aria-pressed={questionOpen} onClick={() => setQuestionOpen(true)}>
                Question
              </Button>
            </PanelTabs>
            {props.ledger}
            <CurrentRelation
              relation={props.relation}
              time={props.time}
              relationRef={relationRef}
              highlightCopies={false}
              minRows={props.rows ?? 4}
            />
          </div>
        </>
      )}
    />
  );
}
