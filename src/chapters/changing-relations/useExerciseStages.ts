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
  grades?: Readonly<Record<number, ExerciseGrade | null>>;
}

export type ExerciseStageAction =
  | { type: 'check'; grade: ExerciseGrade }
  | { type: 'edit' | 'hint' | 'next' | 'previous' | 'reset' }
  | { type: 'navigate'; stage: number };

export const initialExerciseStage: ExerciseStageState = { stage: 0, grade: null, hintOpen: false };

export function exerciseStageReducer(state: ExerciseStageState, action: ExerciseStageAction, total: number, allowNavigation = false): ExerciseStageState {
  if (action.type === 'reset') return initialExerciseStage;
  if (allowNavigation && ['next', 'previous', 'navigate'].includes(action.type)) {
    const stage = action.type === 'navigate' ? action.stage : state.stage + (action.type === 'next' ? 1 : -1);
    if (!Number.isInteger(stage) || stage < 0 || stage >= total) return state;
    return { ...state, stage, grade: state.grades?.[stage] ?? null, hintOpen: false };
  }
  if (action.type === 'previous' || action.type === 'navigate') return state;
  if (action.type === 'next') return state.grade?.correct && state.stage < total - 1
    ? { ...initialExerciseStage, stage: state.stage + 1 } : state;
  if (state.grade?.correct) return state;
  if (action.type === 'check') return { ...state, grade: action.grade, hintOpen: false, ...(allowNavigation ? { grades: { ...state.grades, [state.stage]: action.grade } } : {}) };
  const editable = allowNavigation ? { ...state, grades: { ...state.grades, [state.stage]: null } } : state;
  if (action.type === 'hint') return { ...editable, grade: null, hintOpen: !state.hintOpen };
  return { ...editable, grade: null };
}

export function useExerciseStages(total: number, allowNavigation = false) {
  const [state, dispatch] = useReducer((previous: ExerciseStageState, action: ExerciseStageAction) => exerciseStageReducer(previous, action, total, allowNavigation), initialExerciseStage);
  const accepted = state.grade?.correct ?? false;
  useEffect(() => { if (accepted) rememberCompletedWork(); }, [accepted]);
  const completed = allowNavigation ? Object.values(state.grades ?? {}).filter(grade => grade?.correct).length : state.stage + Number(accepted);
  return { ...state, total, accepted, completed,
    complete: allowNavigation ? completed === total : accepted && state.stage === total - 1, dispatch };
}

export function parseExerciseInteger(value: string, signed = false): number | null {
  const normalized = value.trim().replace(/^−/, '-');
  if (!(signed ? /^[+-]?\d+$/ : /^\d+$/).test(normalized)) return null;
  const count = Number(normalized);
  return Number.isSafeInteger(count) ? count : null;
}
