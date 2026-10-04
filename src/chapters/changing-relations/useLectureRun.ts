import { useEffect, useReducer } from 'react';
import { lectureSteps, lectureUpdates } from './scenario';
import type { LessonTextContent } from './LessonText';

export const PLAYBACK_INTERVAL_MS = 2200;

// Both lectures use consecutive complete timestamps, starting from their own t = 0 state.
export interface LectureRunDefinition {
  readonly totalChanges: number;
  readonly steps: readonly { readonly time: number; readonly before?: LessonTextContent }[];
}

const lectureOneRun: LectureRunDefinition = { totalChanges: lectureUpdates.length, steps: lectureSteps };

export interface LectureRunState {
  readonly step: number;
  readonly applied: number;
  readonly selectedTime: number;
  readonly playing: boolean;
  readonly guided: boolean;
  readonly revealed: boolean;
}

export const initialRunState: LectureRunState = {
  step: 0, applied: 0, selectedTime: 0, playing: false, guided: false, revealed: true,
};

export type LectureRunAction =
  | { type: 'reset' | 'play' | 'tick' | 'start-guided' | 'close-guided' | 'previous-change' | 'next-change' | 'reveal' | 'next' | 'back' }
  | { type: 'select'; time: number };

function advanceChange(state: LectureRunState, totalChanges: number): LectureRunState {
  if (state.applied === totalChanges) return state;
  const applied = state.applied + 1;
  return { ...state, applied, selectedTime: applied,
    playing: state.playing && applied < totalChanges };
}

export function lectureRunReducer(state: LectureRunState, action: LectureRunAction, definition: LectureRunDefinition = lectureOneRun): LectureRunState {
  const { totalChanges, steps } = definition;
  switch (action.type) {
    case 'reset': return initialRunState;
    case 'start-guided': return { ...initialRunState, guided: true };
    case 'close-guided': return { ...state, guided: false, revealed: true };
    case 'select':
      return !state.playing && !state.guided && Number.isInteger(action.time) && action.time >= 0 && action.time <= state.applied
        ? { ...state, selectedTime: action.time } : state;
    case 'play':
      if (state.guided) return state;
      if (state.playing) return { ...state, playing: false };
      // Replaying data keeps completed tutorial progress separate from playback.
      if (state.applied === totalChanges) return { ...state, applied: 0, selectedTime: 0, playing: true };
      return { ...state, selectedTime: state.applied, playing: true };
    case 'tick': return state.playing && !state.guided ? advanceChange(state, totalChanges) : state;
    case 'previous-change':
      return state.guided || state.playing || state.selectedTime === 0
        ? state : { ...state, selectedTime: state.selectedTime - 1 };
    case 'next-change':
      if (state.guided || state.playing) return state;
      return state.selectedTime < state.applied
        ? { ...state, selectedTime: state.selectedTime + 1 } : advanceChange(state, totalChanges);
    case 'reveal': {
      if (!state.guided || state.revealed) return state;
      const time = steps[state.step]!.time;
      return { ...state, applied: time, selectedTime: time, revealed: true };
    }
    case 'next': {
      if (!state.guided || !state.revealed) return state;
      const step = state.step + 1;
      if (step === steps.length) return { ...state, step, guided: false };
      const lesson = steps[step]!;
      const revealed = !lesson.before;
      const time = revealed ? lesson.time : state.applied;
      return { ...state, step, revealed, applied: time, selectedTime: time };
    }
    case 'back': {
      if (!state.guided || state.step === 0) return state;
      const step = state.step - 1;
      const time = steps[step]!.time;
      return { ...state, step, applied: time, selectedTime: time, revealed: true };
    }
  }
}

export function useLectureRun(definition: LectureRunDefinition = lectureOneRun) {
  const [state, dispatch] = useReducer((current: LectureRunState, action: LectureRunAction) => lectureRunReducer(current, action, definition), initialRunState);
  useEffect(() => {
    if (!state.playing) return;
    const timeout = window.setTimeout(() => dispatch({ type: 'tick' }), PLAYBACK_INTERVAL_MS);
    return () => window.clearTimeout(timeout);
  }, [state.playing, state.applied]);
  return { state, dispatch };
}
