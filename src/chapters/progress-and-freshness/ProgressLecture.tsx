import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ArrowLeft, ArrowRight, CheckCircle2 } from 'lucide-react';
import type { ChapterDefinition } from '../chapterRegistry';
import { LectureScreen } from '../../labs/components/LectureScreen';
import { useLectureRun } from '../../labs/useLectureRun';
import { useWalkthrough } from '../../components/walkthrough/WalkthroughProvider';
import { Button } from '../../components/ui/Button';
import { Spotlight } from '../../components/ui/Spotlight';
import { LessonText } from '../../components/lesson/LessonText';
import { useGuidedFocus } from '../../components/lesson/useGuidedFocus';
import { progressText } from './lessonText';
import { ProgressLanes } from './ProgressLanes';
import { playbackExplanation, playbackFrames, progressLectures } from './lecture-scenarios';
import { referenceLinks, objective, progressSql } from './resources';
import type { LaneId } from './simulation';
import '../../styles/lesson.css';
import './chapter.css';

export function ProgressLecture({ chapter, navigation, lectureIndex }: { chapter: ChapterDefinition; navigation: ReactNode; lectureIndex: number }) {
  const lecture = progressLectures[lectureIndex]!;
  const definition = { totalChanges: lecture.lessons.length, steps: lecture.lessons.map((lesson, index) => ({ time: index + 1, before: lesson.before })) };
  const { state, dispatch } = useLectureRun(definition);
  const { open: helpOpen } = useWalkthrough();
  const [selected, setSelected] = useState<LaneId>(lectureIndex === 2 ? 'revenue' : 'orders');
  const refs = { axis: useRef<HTMLElement>(null), orders: useRef<HTMLElement>(null), payments: useRef<HTMLElement>(null), join: useRef<HTMLElement>(null), revenue: useRef<HTMLElement>(null), detail: useRef<HTMLElement>(null),
    metrics: useRef<HTMLDivElement>(null), lag: useRef<HTMLElement>(null), lanes: useRef<HTMLElement>(null) };
  const lesson = lecture.lessons[Math.min(state.step, lecture.lessons.length - 1)]!;
  const currentLesson = state.selectedTime > 0 ? lecture.lessons[state.selectedTime - 1]! : undefined;
  const frames = playbackFrames(lecture);
  const frame = frames.filter(item => item.time <= state.selectedTime).at(-1);
  const normalStep = frames.filter(item => item.time <= state.selectedTime).length;
  const action = frame?.lesson.action;
  const actionLane = action?.type === 'frontier' || action?.type === 'observe' ? action.lane
    : frame?.lesson.target === 'detail' || frame?.lesson.target === 'axis' || frame?.lesson.target === 'metrics' || frame?.lesson.target === 'lag' || frame?.lesson.target === 'lanes' ? 'revenue' : frame?.lesson.target;
  const current = currentLesson?.snapshot ?? lecture.initial;
  const caseStudy = currentLesson?.caseStudy ?? lecture.initialCase;
  const pending = state.guided && !state.revealed;
  const target = state.guided ? lesson.target : undefined;
  const primary = pending ? lesson.target : lesson.focus ?? lesson.target;
  const focus = useGuidedFocus(`${state.guided}:${state.step}:${state.revealed}`, [primary, ...(!pending ? lesson.related ?? [] : [])], refs,
    { axis: 'Logical-time axis', lanes: 'Aligned progress lanes', orders: 'Orders', payments: 'Payments', join: 'Paid orders', revenue: 'Revenue', detail: 'Current evidence', metrics: 'Progress overview', lag: 'Lag breakdown' });
  const lane = state.guided ? focus.id : target;
  const active = lane === 'orders' || lane === 'payments' || lane === 'join' || lane === 'revenue' ? lane
    : target === 'orders' || target === 'payments' || target === 'join' || target === 'revenue' ? target : selected;
  const guidedPrevious = !pending && lesson.action.type !== 'fixture' ? state.step > 0 ? lecture.lessons[state.step - 1]!.snapshot : lecture.initial : undefined;
  useEffect(() => { if (helpOpen) dispatch({ type: 'pause' }); }, [helpOpen, dispatch]);
  // Keep concept-only checkpoints in the guide, while normal playback shows actions.
  useEffect(() => {
    if (state.playing && lecture.lessons[state.applied]?.action.type === 'explain') dispatch({ type: 'tick' });
  }, [state.playing, state.applied, lecture, dispatch]);
  useEffect(() => { if (!state.guided && actionLane) setSelected(actionLane); }, [state.selectedTime, state.guided, actionLane]);
  const move = (forward: boolean) => {
    const destination = forward ? frames.find(item => item.time > state.selectedTime)?.time
      : frames.filter(item => item.time < (frame?.time ?? 0)).at(-1)?.time ?? 0;
    if (destination === undefined) return;
    for (let i = 0; i < Math.abs(destination - state.selectedTime); i++) dispatch({ type: forward ? 'next-change' : 'previous-change' });
  };
  const reset = () => { dispatch({ type: 'reset' }); setSelected(lectureIndex === 2 ? 'revenue' : 'orders'); };
  return <>
    <LectureScreen layout="without-tip" chapter={chapter} title={`Lecture ${lectureIndex + 1}`} description={lecture.description} navigation={navigation}
      regionLabel="Lecture content" className="lesson-page progress-chapter-page" guided={state.guided}
      reference={{ objective: `${lecture.title}. ${objective}`, sql: progressSql, documentationLinks: referenceLinks }}
      simulation={{ completed: state.guided ? state.step : normalStep + (caseStudy ? 1 : 0), total: state.guided ? lecture.lessons.length : frames.length + (caseStudy ? 1 : 0), progressLabel: state.guided ? 'Tutorial' : 'Steps', playing: state.playing,
        onReset: reset, onRun: () => { if (!state.playing && normalStep === frames.length) dispatch({ type: 'reset' }); dispatch({ type: 'play' }); }, onStartGuidedRun: () => { reset(); dispatch({ type: 'start-guided' }); } }}
      visualization={<ProgressLanes snapshot={current} selected={active} onSelect={setSelected} refs={refs}
        onInspect={() => dispatch({ type: 'pause' })}
        showLimit={currentLesson?.showLimit ?? lectureIndex === 2} upcoming={pending}
        caseLabel={caseStudy?.label}
        previous={state.guided ? guidedPrevious : action?.type === 'fixture' ? undefined : frame?.previous}
        activity={!state.guided && frame && actionLane ? { lane: actionLane, text: playbackExplanation(frame.lesson, frame.previous) } : undefined}
        caption={pending ? `Predict · ${lesson.title}` : caseStudy?.transition ?? (frame ? `Step ${normalStep}: ${frame.lesson.title}` : 'Next change / Run: arrivals and progress. Key explains symbols.')} />}
      playback={<div className="relation-playback-controls" aria-label="Scenario playback">
        {state.step === lecture.lessons.length && <span className="relation-tutorial-complete"><CheckCircle2 size={14} aria-hidden="true" />Tutorial completed</span>}
        <div>{state.selectedTime !== state.applied && <Button disabled={state.guided || state.playing} onClick={() => dispatch({ type: 'select', time: state.applied })}>Return to latest</Button>}
          <Button disabled={state.guided || state.playing || normalStep === 0} onClick={() => move(false)}><ArrowLeft size={14} aria-hidden="true" />{caseStudy ? 'Previous case' : 'Previous change'}</Button>
          <Button data-walkthrough="next-change" disabled={state.guided || state.playing || normalStep === frames.length} onClick={() => move(true)}>{caseStudy ? 'Next case' : 'Next change'}<ArrowRight size={14} aria-hidden="true" /></Button>
        </div>
      </div>} />
    <Spotlight open={state.guided} {...focus.props} step={Math.min(state.step + 1, lecture.lessons.length)} total={lecture.lessons.length}
      title={lesson.title} description={<span className="progress-lesson-text"><LessonText content={progressText(pending ? lesson.before! : lesson.explanation)} /></span>}
      phaseLabel={pending ? 'Predict the effect' : 'Explanation'} visual={null} onClose={() => dispatch({ type: 'close-guided' })}
      navigation={{ backDisabled: state.step === 0 && (!lesson.before || !state.revealed), onBack: () => dispatch({ type: 'back' }),
        onNext: () => dispatch({ type: pending ? 'reveal' : 'next' }),
        nextLabel: pending ? 'Show effect' : state.step === lecture.lessons.length - 1 ? 'Finish tutorial' : 'Next' }} />
  </>;
}
