import { lectureSteps, lectureUpdates } from './scenario';
import { useLectureRun as useSharedLectureRun, lectureRunReducer as sharedReducer, type LectureRunDefinition, type LectureRunState, type LectureRunAction } from '../../labs/useLectureRun';
export { PLAYBACK_INTERVAL_MS, initialRunState } from '../../labs/useLectureRun';
export type { LectureRunDefinition, LectureRunState, LectureRunAction } from '../../labs/useLectureRun';
const lectureOneRun: LectureRunDefinition = { totalChanges: lectureUpdates.length, steps: lectureSteps };
export function useLectureRun(definition: LectureRunDefinition = lectureOneRun) {
  return useSharedLectureRun(definition);
}
export function lectureRunReducer(state: LectureRunState, action: LectureRunAction, definition: LectureRunDefinition = lectureOneRun) {
  return sharedReducer(state, action, definition);
}
