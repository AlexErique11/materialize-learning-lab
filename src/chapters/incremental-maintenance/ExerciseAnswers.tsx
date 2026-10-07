import { Check, X } from 'lucide-react';
import type { ExerciseGrade } from '../changing-relations/useExerciseStages';
import type { Checkpoint, Prediction } from './exercise-scenarios';

export function ExerciseAnswers({ checkpoint, answer, grade, onEdit, accepted = false, reviewChoices = false }: {
 accepted?: boolean; reviewChoices?: boolean;
 checkpoint: Checkpoint;
 answer: Prediction;
 grade: ExerciseGrade | null;
 onEdit: (update: (previous: Prediction) => Prediction) => void;
}) {
 const selectOption = (questionIndex: number, option: string, checked: boolean) => {
  onEdit(previous => ({
   ...previous,
   selections: checkpoint.choices!.map((_, index) => {
    const selected = previous.selections[index] ?? [];
    if (index !== questionIndex) return selected;
    return checked ? [...selected, option] : selected.filter(value => value !== option);
   }),
  }));
 };
 return <>
  {checkpoint.choices?.map((choice, index) => <fieldset key={index} className="exercise-choice" aria-invalid={Boolean(grade?.errors[`choice${index}`])}>
   <legend>{choice.label}</legend>
   {choice.options.map(option => <label key={option} data-answer={reviewChoices && grade ? accepted && choice.expected.includes(option) ? 'correct' : !choice.expected.includes(option) && answer.selections[index]?.includes(option) ? 'incorrect' : undefined : undefined}>
    <input type="checkbox" disabled={accepted} checked={answer.selections[index]?.includes(option) ?? false}
     onChange={event => selectOption(index, option, event.target.checked)} />
    {option}
    {reviewChoices && <span className="exercise-choice-feedback">
     {grade && accepted && choice.expected.includes(option) && <Check size={14} aria-label="Correct answer" />}
     {grade && !choice.expected.includes(option) && answer.selections[index]?.includes(option) && <X size={14} aria-label="Incorrect answer" />}
    </span>}
   </label>)}
  </fieldset>)}
 </>;
}
