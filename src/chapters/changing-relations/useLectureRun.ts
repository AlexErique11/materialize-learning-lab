import { useEffect, useReducer } from 'react';
import { lectureSteps, lectureUpdates } from './scenario';

export const PLAYBACK_INTERVAL_MS = 2200;

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

function advanceChange(state: LectureRunState): LectureRunState {
  if (state.applied === lectureUpdates.length) return state;
  const applied = state.applied + 1;
  return { ...state, applied, selectedTime: lectureUpdates[applied - 1]!.time,
    playing: state.playing && applied < lectureUpdates.length };
}

export function lectureRunReducer(state: LectureRunState, action: LectureRunAction): LectureRunState {
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
      if (state.applied === lectureUpdates.length) return { ...state, applied: 0, selectedTime: 0, playing: true };
      return { ...state, selectedTime: state.applied, playing: true };
    case 'tick': return state.playing && !state.guided ? advanceChange(state) : state;
    case 'previous-change':
      return state.guided || state.playing || state.selectedTime === 0
        ? state : { ...state, selectedTime: state.selectedTime - 1 };
    case 'next-change':
      if (state.guided || state.playing) return state;
      return state.selectedTime < state.applied
        ? { ...state, selectedTime: state.selectedTime + 1 } : advanceChange(state);
    case 'reveal': {
      if (!state.guided || state.revealed) return state;
      const time = lectureSteps[state.step]!.time;
      return { ...state, applied: time, selectedTime: time, revealed: true };
    }
    case 'next': {
      if (!state.guided || !state.revealed) return state;
      const step = state.step + 1;
      if (step === lectureSteps.length) return { ...state, step, guided: false };
      const lesson = lectureSteps[step]!;
      const revealed = !lesson.before;
      const time = revealed ? lesson.time : state.applied;
      return { ...state, step, revealed, applied: time, selectedTime: time };
    }
    case 'back': {
      if (!state.guided || state.step === 0) return state;
      const step = state.step - 1;
      const time = lectureSteps[step]!.time;
      return { ...state, step, applied: time, selectedTime: time, revealed: true };
    }
  }
}

export function useLectureRun() {
  const [state, dispatch] = useReducer(lectureRunReducer, initialRunState);
  useEffect(() => {
    if (!state.playing) return;
    const timeout = window.setTimeout(() => dispatch({ type: 'tick' }), PLAYBACK_INTERVAL_MS);
    return () => window.clearTimeout(timeout);
  }, [state.playing, state.applied]);
  return { state, dispatch };
}
