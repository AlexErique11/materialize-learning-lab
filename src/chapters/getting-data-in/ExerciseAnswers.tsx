import { useId, useState } from 'react';
import { Check, X } from 'lucide-react';
import { DiffBadge } from '../../components/lesson/DiffBadge';
import { LessonText } from '../../components/lesson/LessonText';
import type { ExerciseGrade } from '../../hooks/useExerciseStages';
import { ProductTuple } from './ProductTable';
import { Button } from '../../components/ui/Button';
import type { IngestionQuestion } from './exercise-scenarios';
import type { ExercisePrediction } from './exercise-grading';

export function ExerciseAnswers({ question, prediction, grade, accepted, onEdit }: {
  question: IngestionQuestion; prediction: ExercisePrediction; grade: ExerciseGrade | null;
  accepted: boolean; onEdit: (prediction: ExercisePrediction) => void;
}) {
  const prefix = useId();
  const [activeGroup, setActiveGroup] = useState(0);
  return <div className="ingestion-exercise-answer-content" tabIndex={-1}>
    {question.groups.length > 1 && <nav className="ingestion-exercise-group-controls" aria-label="Answer groups">
      {question.groups.map((group, index) => <Button key={group.id} aria-pressed={activeGroup === index}
        onClick={() => setActiveGroup(index)}>{group.label}</Button>)}
    </nav>}
    <div className="ingestion-exercise-answer-groups">
      {question.groups.map((group, index) => {
        const error = grade?.errors[group.id];
        const answer = prediction[group.id];
        return <fieldset key={group.id} className="ingestion-exercise-answer-group" disabled={accepted} data-kind={group.kind}
          data-active={activeGroup === index}
          aria-invalid={Boolean(error)} aria-describedby={error ? `${prefix}-${group.id}-error` : undefined}>
          <legend>{group.label}</legend>
          <div className="ingestion-exercise-options">
            {group.kind === 'count' ? <input type="text" inputMode="numeric" autoComplete="off"
              aria-label={group.label} value={typeof answer === 'string' ? answer : ''}
              aria-invalid={Boolean(error)} aria-describedby={error ? `${prefix}-${group.id}-error` : undefined}
              onChange={(event) => onEdit({ ...prediction, [group.id]: event.target.value })} />
              : group.options.map((option) => {
                const checked = group.kind === 'radio' ? answer === option.id : Array.isArray(answer) && answer.includes(option.id);
                const expected = group.kind === 'radio' ? group.expected === option.id : group.expected.includes(option.id);
                const review = accepted && expected ? 'correct' : grade && checked && !expected ? 'incorrect' : undefined;
                return <label key={option.id} data-answer={review}>
                  <input type={group.kind} name={`${prefix}-${group.id}`} value={option.id} checked={checked}
                    onChange={(event) => {
                      const previous = Array.isArray(answer) ? answer : [];
                      onEdit({ ...prediction, [group.id]: group.kind === 'radio' ? option.id
                        : event.target.checked ? [...previous, option.id] : previous.filter((id) => id !== option.id) });
                    }} />
                  <span>{'row' in option ? <>{option.diff && <DiffBadge diff={option.diff} />}<ProductTuple row={option.row} /></>
                    : <LessonText content={[option.label]} />}</span>
                  <span className="ingestion-exercise-choice-status">
                    {review === 'correct' && <Check size={13} aria-label="Correct answer" />}
                    {review === 'incorrect' && <X size={13} aria-label="Incorrect answer" />}
                  </span>
                </label>;
              })}
          </div>
          {error && <span id={`${prefix}-${group.id}-error`} className="sr-only">{error}</span>}
        </fieldset>;
      })}
    </div>
  </div>;
}
