import { useEffect, useRef, type ReactNode } from 'react';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import type { ChapterDefinition } from '../chapterRegistry';
import { LectureScreen } from '../../labs/components/LectureScreen';
import { useLectureRun } from '../../labs/useLectureRun';
import { useWalkthrough } from '../../components/walkthrough/WalkthroughProvider';
import { ActivityCompletion } from '../../components/lab/ActivityCompletion';
import { Button } from '../../components/ui/Button';
import { Spotlight } from '../../components/ui/Spotlight';
import { LessonText } from '../../components/lesson/LessonText';
import { useGuidedFocus } from '../../components/lesson/useGuidedFocus';
import { SubscriptionCaption, TimestampTrays } from './TimestampTrays';
import { subscriptionFrames, subscriptionLectures } from './lecture-scenarios';
import { objective, referenceLinks, subscriptionSqlFor } from './resources';
import { subscriptionText } from './lessonText';
import '../../styles/lesson.css';
import './chapter.css';

export function SubscribeLecture({ chapter, lectureIndex, navigation }: { chapter: ChapterDefinition; lectureIndex: number; navigation: ReactNode }) {
  const lecture = subscriptionLectures[lectureIndex]!;
  const { state, dispatch, completed, finished } = useLectureRun({ totalChanges: lecture.lessons.length, steps: lecture.lessons.map((lesson, index) => ({ time: index + 1, before: lesson.before })) });
  const { open: helpOpen } = useWalkthrough();
  const refs = { subscription: useRef<HTMLElement>(null), trays: useRef<HTMLElement>(null), boundary: useRef<HTMLElement>(null), application: useRef<HTMLElement>(null) };
  const lesson = lecture.lessons[Math.min(state.step, lecture.lessons.length - 1)]!;
  const applied = state.selectedTime ? lecture.lessons[state.selectedTime - 1] : undefined;
  const frames = subscriptionFrames(lecture);
  const frame = frames.filter(item => item.time <= state.selectedTime).at(-1);
  const normalStep = frames.filter(item => item.time <= state.selectedTime).length;
  const current = (state.guided ? applied?.state : frame?.lesson.state) ?? lecture.initial;
  const focus = useGuidedFocus(`${state.step}:${state.revealed}`, [lesson.target], refs, { subscription: 'Subscription settings', trays: 'Timestamp trays', boundary: 'Completeness boundary', application: 'Published application' });
  const prediction = state.guided && !state.revealed;
  useEffect(() => { if (helpOpen) dispatch({ type: 'pause' }); }, [helpOpen, dispatch]);
  useEffect(() => {
    if (!state.playing) return;
    const next = frames.find(item => item.time > state.applied);
    const destination = next ? next.time - 1 : lecture.lessons.length;
    for (let time = state.applied; time < destination; time++) dispatch({ type: 'tick' });
  }, [state.playing, state.applied, lecture, dispatch]);
  const advance = (forward: boolean) => {
    const destination = forward ? frames.find(item => item.time > state.selectedTime)?.time : frames.filter(item => item.time < (frame?.time ?? 0)).at(-1)?.time ?? 0;
    if (destination === undefined) return;
    for (let time = 0; time < Math.abs(destination - state.selectedTime); time++) dispatch({ type: forward ? 'next-change' : 'previous-change' });
  };
  return <>
    <LectureScreen chapter={chapter} title={`Lecture ${lectureIndex + 1}`} description={lecture.description} navigation={navigation} activityCompleted={completed}
      layout="without-tip" className="lesson-page subscribe-chapter-page" regionLabel="Lecture content" guided={state.guided}
      reference={{ objective: `${lecture.title}. ${objective}`, sql: subscriptionSqlFor(current), documentationLinks: referenceLinks }}
      simulation={{ completed: state.guided ? state.step : normalStep, total: state.guided ? lecture.lessons.length : frames.length, progressLabel: state.guided ? 'Tutorial' : 'Changes', playing: state.playing,
        onReset: () => dispatch({ type: 'reset' }), onRun: () => { if (!state.playing && normalStep === frames.length) dispatch({ type: 'reset' }); dispatch({ type: 'play' }); }, onStartGuidedRun: () => dispatch({ type: 'start-guided' }) }}
      visualization={<><TimestampTrays state={current} refs={refs} disabled={state.guided || state.playing} onOpenKey={() => dispatch({ type: 'pause' })} /><SubscriptionCaption caption={prediction ? `Predict · ${lesson.title}` : (state.guided ? applied : frame?.lesson)?.title ?? 'Step through subscription delivery. Playback steps are not logical timestamps.'} /></>}
      playback={<div className="relation-playback-controls" aria-label="Scenario playback"><ActivityCompletion complete={finished} kind="tutorial" /><div>
        <Button aria-keyshortcuts="ArrowLeft" disabled={state.guided || state.playing || normalStep === 0} onClick={() => advance(false)}><ArrowLeft size={14} aria-hidden="true" />Previous change</Button>
        <Button data-walkthrough="next-change" aria-keyshortcuts="ArrowRight" disabled={state.guided || state.playing || normalStep === frames.length} onClick={() => advance(true)}>Next change<ArrowRight size={14} aria-hidden="true" /></Button>
      </div></div>} />
    <Spotlight open={state.guided} {...focus.props} step={Math.min(state.step + 1, lecture.lessons.length)} total={lecture.lessons.length} title={lesson.title}
      description={<span className="subscribe-lesson-text"><LessonText content={subscriptionText(prediction ? lesson.before! : lesson.explanation)} /></span>} phaseLabel={prediction ? 'Predict the effect' : 'Explanation'} visual={null}
      onClose={() => dispatch({ type: 'close-guided' })} navigation={{ backDisabled: state.step === 0 && (!lesson.before || !state.revealed), onBack: () => dispatch({ type: 'back' }),
        onNext: () => dispatch({ type: prediction ? 'reveal' : 'next' }), nextLabel: prediction ? 'Show effect' : state.step === lecture.lessons.length - 1 ? 'Finish tutorial' : 'Next' }} />
  </>;
}
