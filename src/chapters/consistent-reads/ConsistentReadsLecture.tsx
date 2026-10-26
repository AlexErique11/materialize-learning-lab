import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import type { ChapterDefinition } from '../chapterRegistry';
import { LectureScreen } from '../../labs/components/LectureScreen';
import { useLectureRun } from '../../labs/useLectureRun';
import { ActivityCompletion } from '../../components/lab/ActivityCompletion';
import { Button } from '../../components/ui/Button';
import { Spotlight } from '../../components/ui/Spotlight';
import { LessonText } from '../../components/lesson/LessonText';
import { useGuidedFocus } from '../../components/lesson/useGuidedFocus';
import { useWalkthrough } from '../../components/walkthrough/WalkthroughProvider';
import { ReadableWindow } from './ReadableWindow';
import { readLectures, readPlaybackFrames } from './lecture-scenarios';
import { applyRead, type ReadSnapshot } from './simulation';
import { referenceLinks, objective, readSql } from './resources';
import { readText } from './lessonText';
import '../../styles/lesson.css';
import './chapter.css';

export function ConsistentReadsLecture({ chapter, lectureIndex, navigation }: { chapter: ChapterDefinition; lectureIndex: number; navigation: ReactNode }) {
  const lecture = readLectures[lectureIndex]!;
  const definition = { totalChanges: lecture.lessons.length, steps: lecture.lessons.map((lesson, index) => ({ time: index + 1, before: lesson.before })) };
  const { state, dispatch, completed, finished } = useLectureRun(definition);
  const { open: helpOpen } = useWalkthrough();
  const [exploration, setExploration] = useState<ReadSnapshot | null>(null);
  const refs = { query: useRef<HTMLElement>(null), axis: useRef<HTMLDivElement>(null), windows: useRef<HTMLElement>(null), result: useRef<HTMLElement>(null) };
  const lesson = lecture.lessons[Math.min(state.step, lecture.lessons.length - 1)]!;
  const pending = state.guided && !state.revealed;
  const applied = state.selectedTime ? lecture.lessons[state.selectedTime - 1]! : undefined;
  const frames = readPlaybackFrames(lecture);
  const frame = frames.filter(item => item.time <= state.selectedTime).at(-1);
  const normalStep = frames.filter(item => item.time <= state.selectedTime).length;
  const current = exploration ?? (state.guided ? applied?.snapshot : frame?.lesson.snapshot) ?? lecture.initial;
  const focus = useGuidedFocus(`${state.guided}:${state.step}:${state.revealed}`, [lesson.target, ...(!pending ? lesson.related ?? [] : [])], refs, { query: 'Query settings', axis: 'Logical-time axis', windows: 'Retained and complete windows', result: 'Query outcome' });
  useEffect(() => { if (helpOpen) dispatch({ type: 'pause' }); }, [helpOpen, dispatch]);
  useEffect(() => { setExploration(null); }, [state.selectedTime, state.guided, state.revealed]);
  useEffect(() => {
    if (!state.playing) return;
    const next = readPlaybackFrames(lecture).find(item => item.time > state.applied);
    const destination = next ? next.time - 1 : lecture.lessons.length;
    // Explanations belong to guidance; they must not consume a playback interval.
    for (let time = state.applied; time < destination; time++) dispatch({ type: 'tick' });
  }, [state.playing, state.applied, lecture, dispatch]);
  const reset = () => { setExploration(null); dispatch({ type: 'reset' }); };
  const advance = (forward: boolean) => {
    const destination = forward ? frames.find(item => item.time > state.selectedTime)?.time
      : frames.filter(item => item.time < (frame?.time ?? 0)).at(-1)?.time ?? 0;
    if (destination === undefined) return;
    setExploration(null);
    for (let time = 0; time < Math.abs(destination - state.selectedTime); time++) dispatch({ type: forward ? 'next-change' : 'previous-change' });
  };
  return <>
    <LectureScreen activityCompleted={completed} layout="without-tip" chapter={chapter} title={`Lecture ${lectureIndex + 1}`} description={lecture.description} navigation={navigation}
      className="lesson-page read-chapter-page" regionLabel="Lecture content" guided={state.guided}
      reference={{ objective: `${lecture.title}. ${objective}`, sql: readSql, documentationLinks: referenceLinks }}
      simulation={{ completed: state.guided ? state.step : normalStep, total: state.guided ? lecture.lessons.length : frames.length, progressLabel: state.guided ? 'Tutorial' : 'Changes', playing: state.playing,
        onReset: reset, onRun: () => { setExploration(null); if (!state.playing && normalStep === frames.length) dispatch({ type: 'reset' }); dispatch({ type: 'play' }); }, onStartGuidedRun: () => { setExploration(null); dispatch({ type: 'start-guided' }); } }}
      visualization={<ReadableWindow snapshot={current} refs={refs} caption={pending ? `Predict · ${lesson.title}` : (state.guided ? applied : frame?.lesson)?.title ?? 'Select a time or step through the scenario.'} disabled={state.guided || state.playing}
        onInspect={() => dispatch({ type: 'pause' })}
        onSelectTime={timestamp => { dispatch({ type: 'pause' }); setExploration(applyRead(current, { type: 'request', request: { policy: 'timestamp', timestamp } })); }} />}
      playback={<div className="relation-playback-controls" aria-label="Scenario playback"><ActivityCompletion complete={finished} kind="tutorial" /><div>
        <Button aria-keyshortcuts="ArrowLeft" disabled={state.guided || state.playing || normalStep === 0} onClick={() => advance(false)}><ArrowLeft size={14} aria-hidden="true" />Previous change</Button>
        <Button data-walkthrough="next-change" aria-keyshortcuts="ArrowRight" disabled={state.guided || state.playing || normalStep === frames.length} onClick={() => advance(true)}>Next change<ArrowRight size={14} aria-hidden="true" /></Button>
      </div></div>} />
    <Spotlight open={state.guided} {...focus.props} step={Math.min(state.step + 1, lecture.lessons.length)} total={lecture.lessons.length} title={lesson.title}
      description={<span className="read-lesson-text"><LessonText content={readText(pending ? lesson.before! : lesson.explanation)} /></span>} phaseLabel={pending ? 'Predict the effect' : 'Explanation'} visual={null}
      onClose={() => dispatch({ type: 'close-guided' })} navigation={{ backDisabled: state.step === 0 && (!lesson.before || !state.revealed), onBack: () => dispatch({ type: 'back' }),
        onNext: () => dispatch({ type: pending ? 'reveal' : 'next' }), nextLabel: pending ? 'Show effect' : state.step === lecture.lessons.length - 1 ? 'Finish tutorial' : 'Next' }} />
  </>;
}
