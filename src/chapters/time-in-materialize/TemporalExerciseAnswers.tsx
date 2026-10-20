import { useId, useState } from 'react';
import { Check, X } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { DiffBadge } from '../../components/lesson/DiffBadge';
import { LessonText } from '../../components/lesson/LessonText';
import type { ExerciseGrade } from '../../hooks/useExerciseStages';
import type { TemporalQuestion } from './exercise-scenarios';
import type { TemporalPrediction } from './exercise-grading';

export function TemporalExerciseAnswers({ question, prediction, grade, accepted, onEdit }: {
  question: TemporalQuestion; prediction: TemporalPrediction; grade: ExerciseGrade | null;
  accepted: boolean; onEdit: (answer: TemporalPrediction) => void;
}) {
  const prefix = useId();
  const [activeGroup, setActiveGroup] = useState(0);
  return <div className="temporal-answer-content temporal-lesson-text" tabIndex={-1}>
    {question.groups.length > 1 && <nav className="temporal-answer-tabs" aria-label="Answer groups">
      {question.groups.map((group, index) => <Button key={group.id} aria-pressed={activeGroup === index}
        onClick={() => setActiveGroup(index)}>{group.label}</Button>)}
    </nav>}
    <div className="temporal-answer-groups">{question.groups.map((group, index) => {
      const answer = prediction[group.id];
      const error = grade?.errors[group.id];
      return <fieldset key={group.id} className="temporal-answer-group" data-group={group.id} data-active={activeGroup === index}
        data-kind={group.kind} disabled={accepted} aria-invalid={Boolean(error)} aria-describedby={error ? `${prefix}-${group.id}-error` : undefined}>
        <legend>{group.label}</legend>
        <div className="temporal-answer-options">{group.kind === 'count'
          ? <input type="text" inputMode="numeric" autoComplete="off" aria-label={group.label}
            value={typeof answer === 'string' ? answer : ''} aria-invalid={Boolean(error)}
            aria-describedby={error ? `${prefix}-${group.id}-error` : undefined}
            onChange={(event) => onEdit({ ...prediction, [group.id]: event.target.value })} />
          : group.options.map((option) => {
            const checked = group.kind === 'radio' ? answer === option.id : Array.isArray(answer) && answer.includes(option.id);
            const expected = group.kind === 'radio' ? group.expected === option.id : group.expected.includes(option.id);
            const review = accepted && expected ? 'correct' : grade && checked && !expected ? 'incorrect' : undefined;
            return <label key={option.id} data-answer={review}>
              <input type={group.kind} name={`${prefix}-${group.id}`} data-option={option.id} value={option.id} checked={checked}
                onChange={(event) => {
                  const previous = Array.isArray(answer) ? answer : [];
                  onEdit({ ...prediction, [group.id]: group.kind === 'radio' ? option.id
                    : event.target.checked ? [...previous, option.id] : previous.filter((id) => id !== option.id) });
                }} />
              <span>{option.diff && <DiffBadge diff={option.diff} />}{option.code ? <code>{option.code}</code> : <span><LessonText content={option.content} /></span>}</span>
              <span className="temporal-answer-status">{review === 'correct' && <Check size={13} aria-label="Correct answer" />}
                {review === 'incorrect' && <X size={13} aria-label="Incorrect answer" />}</span>
            </label>;
          })}</div>
        {error && <span className="sr-only" id={`${prefix}-${group.id}-error`}>{error}</span>}
      </fieldset>;
    })}</div>
  </div>;
}
