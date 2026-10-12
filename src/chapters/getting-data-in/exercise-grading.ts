import { parseExerciseInteger, type ExerciseGrade } from '../../hooks/useExerciseStages';
import type { IngestionQuestion } from './exercise-scenarios';

export type ExercisePrediction = Readonly<Record<string, string | readonly string[]>>;

export function solutionForQuestion(question: IngestionQuestion): ExercisePrediction {
  return Object.fromEntries(question.groups.map((group) => [group.id,
    group.kind === 'count' ? String(group.expected) : group.kind === 'checkbox' ? [...group.expected] : group.expected]));
}

export function gradeIngestionPrediction(question: IngestionQuestion, prediction: ExercisePrediction): ExerciseGrade {
  const errors: Record<string, string> = {};
  for (const group of question.groups) {
    const answer = prediction[group.id];
    const correct = group.kind === 'count'
      ? typeof answer === 'string' && parseExerciseInteger(answer) === group.expected
      : group.kind === 'radio'
        ? answer === group.expected
        : Array.isArray(answer) && answer.length === group.expected.length
          && new Set(answer).size === answer.length && group.expected.every((id) => answer.includes(id));
    if (!correct) errors[group.id] = group.guidance;
  }
  const correct = Object.keys(errors).length === 0;
  return { correct, title: [correct ? 'Prediction accepted' : 'Recheck your prediction'],
    explanation: correct ? question.explanation : [Object.values(errors)[0]!], errors };
}
