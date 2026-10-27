import { useId, useRef } from 'react';
import { Link } from 'react-router';
import { ArrowRight, BookOpen, CheckCircle2, Eye, Lightbulb, RotateCcw } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Panel } from '../../components/ui/Panel';
import { STAGE_IDS, stageDefinition } from './scenario';
import { assessmentAt, type ChallengeRun, type RunAction } from './run';
import type { RepairGrade } from './grading';
import { useChangeMotion } from '../../motion/useChangeMotion';

export function ChallengeDecisions({ run, grade, onTest, onWorked, dispatch }: {
  run: ChallengeRun; grade: RepairGrade | null; onTest: () => void; onWorked: () => void;
  dispatch: (action: RunAction) => void;
}) {
  const formId = useId();
  const stageId = STAGE_IDS[run.stage]!;
  const stage = stageDefinition(stageId);
  const answers = run.drafts[stageId] ?? {};
  const assessment = assessmentAt(run, stageId);
  const feedbackRef = useRef<HTMLDivElement>(null);
  useChangeMotion(feedbackRef, `${stageId}-${JSON.stringify(grade)}-${assessment.hints}-${assessment.workedRepair}`, true, 'feedback');
  const applied = run.commits.length > run.stage;
  const simulationReady = (stageId !== 'reads' || run.exploration.readStep === 3) && (stageId !== 'client' || (run.exploration.deliveries === 8 && !run.exploration.disconnected));
  return <Panel className="relation-panel capstone-task" aria-label="Incident decisions">
    <div className="capstone-task-intro"><h2>Choose your repair</h2><p>{stage.goal}</p></div>
    <form id={formId} noValidate onSubmit={event => { event.preventDefault(); onTest(); }}>
      <div className="capstone-fields">{stage.fields.map(field => {
        const id = `${formId}-${field.id}`;
        const error = grade?.errors[field.id];
        return <fieldset key={field.id} className="capstone-field" aria-describedby={error ? `${id}-error` : undefined}>
          <legend>{field.label}</legend>
          {field.kind === 'number' ? <><label className="sr-only" htmlFor={id}>{field.label}</label><input id={id} type="text" inputMode="decimal" autoComplete="off" maxLength={32} placeholder="e.g. 620.001" value={answers[field.id] ?? ''} aria-invalid={Boolean(error)} aria-describedby={error ? `${id}-error` : undefined} onChange={event => dispatch({ type: 'edit', field: field.id, value: event.target.value })} /></>
            : field.kind === 'select' ? <><label className="sr-only" htmlFor={id}>{field.label}</label><select id={id} value={answers[field.id] ?? ''} aria-invalid={Boolean(error)} aria-describedby={error ? `${id}-error` : undefined} onChange={event => dispatch({ type: 'edit', field: field.id, value: event.target.value })}><option value="">Choose an option</option>{field.options?.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></>
              : <div className="capstone-options">{field.options?.map(([value, label]) => <label key={value} data-selected={answers[field.id] === value}><input type="radio" name={id} value={value} checked={answers[field.id] === value} aria-invalid={Boolean(error)} onChange={() => dispatch({ type: 'edit', field: field.id, value })} /><span>{label}</span></label>)}</div>}
          {error && <p id={`${id}-error`} className="capstone-field-error">{error}</p>}
        </fieldset>;
      })}</div>
      <div ref={feedbackRef}>
        <div className="capstone-feedback" role="status" aria-live="polite" data-tone={grade?.correct || applied ? 'success' : grade ? 'warning' : undefined}>
          {applied ? <><strong>Repair applied</strong><p>This checkpoint is committed. Editing a decision reopens it and invalidates later repairs in this replay.</p></> : grade && <><strong>{grade.title}</strong><p>{grade.explanation}</p></>}
        </div>
        {assessment.hints > 0 && <div className="capstone-hint" role="status"><Lightbulb size={16} aria-hidden="true" /><p>{stage.hints[assessment.hints - 1]} <span>Hint {assessment.hints} of 2</span></p></div>}
      </div>
      {assessment.workedRepair && <p className="capstone-caption">Worked repair used. This run’s handover will record walkthrough assistance.</p>}
      {!simulationReady && <p className="capstone-caption">{stageId === 'reads' ? 'Use the evidence controls to test the normal policy, finish catch-up, and issue a new read before applying.' : 'Inspect all eight deliveries on the reference client before applying. Replay if you used the optional disconnect probe.'}</p>}
      <div className="capstone-task-actions"><Button type="submit" variant="primary" data-challenge-action="test" aria-keyshortcuts="Enter"><CheckCircle2 size={15} aria-hidden="true" />Test repair</Button><Button data-challenge-action="hint" aria-keyshortcuts="H" onClick={() => dispatch({ type: 'hint' })} disabled={assessment.hints === 2}><Lightbulb size={15} aria-hidden="true" />Hint</Button><Button data-challenge-action="worked" aria-keyshortcuts="Control+Enter" onClick={onWorked} variant="ghost"><Eye size={15} aria-hidden="true" />Show worked repair</Button></div>
      <Button className="capstone-apply" data-challenge-action="apply" aria-keyshortcuts="ArrowRight" variant={grade?.correct || applied ? 'primary' : 'secondary'} disabled={!applied && (!grade?.correct || !simulationReady)} onClick={() => dispatch({ type: 'apply' })}>{run.stage === 5 ? 'Continue to handover' : 'Apply and continue'}<ArrowRight size={16} aria-hidden="true" /></Button>
    </form>
    <div className="capstone-task-footer"><Button data-challenge-action="retry" aria-keyshortcuts="R" variant="ghost" onClick={() => dispatch({ type: 'retry' })}><RotateCcw size={14} aria-hidden="true" />Retry checkpoint</Button><Link to={stage.lessonPath} target="_blank" rel="noopener noreferrer" className="text-link capstone-review-link"><BookOpen size={14} aria-hidden="true" />{stage.lesson} (opens a new tab)</Link></div>
  </Panel>;
}
