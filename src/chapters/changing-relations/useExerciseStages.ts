import { useEffect, useReducer } from 'react';
import { rememberCompletedWork } from '../../components/walkthrough/walkthroughStorage';
import type { LessonTextContent } from './LessonText';

export interface ExerciseGrade {
  correct: boolean;
  title: LessonTextContent;
  explanation: LessonTextContent;
  errors: Readonly<Record<string, string>>;
}

export interface ExerciseStageState {
  stage: number;
  grade: ExerciseGrade | null;
  hintOpen: boolean;
}

export type ExerciseStageAction =
  | { type: 'check'; grade: ExerciseGrade }
  | { type: 'edit' | 'hint' | 'next' | 'reset' };

export const initialExerciseStage: ExerciseStageState = { stage: 0, grade: null, hintOpen: false };

export function exerciseStageReducer(state: ExerciseStageState, action: ExerciseStageAction, total: number): ExerciseStageState {
  if (action.type === 'reset') return initialExerciseStage;
  if (action.type === 'next') return state.grade?.correct && state.stage < total - 1
    ? { ...initialExerciseStage, stage: state.stage + 1 } : state;
  if (state.grade?.correct) return state;
  if (action.type === 'check') return { ...state, grade: action.grade, hintOpen: false };
  if (action.type === 'hint') return { ...state, grade: null, hintOpen: !state.hintOpen };
  return { ...state, grade: null };
}

export function useExerciseStages(total: number) {
  const [state, dispatch] = useReducer((previous: ExerciseStageState, action: ExerciseStageAction) => exerciseStageReducer(previous, action, total), initialExerciseStage);
  const accepted = state.grade?.correct ?? false;
  useEffect(() => { if (accepted) rememberCompletedWork(); }, [accepted]);
  return { ...state, total, accepted, completed: state.stage + Number(accepted),
    complete: accepted && state.stage === total - 1, dispatch };
}

export function parseExerciseInteger(value: string, signed = false): number | null {
  const normalized = value.trim().replace(/^−/, '-');
  if (!(signed ? /^[+-]?\d+$/ : /^\d+$/).test(normalized)) return null;
  const count = Number(normalized);
  return Number.isSafeInteger(count) ? count : null;
}
