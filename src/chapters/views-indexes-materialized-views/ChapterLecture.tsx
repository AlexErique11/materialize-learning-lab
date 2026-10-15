import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ArrowLeft, ArrowRight, CheckCircle2 } from 'lucide-react';
import type { ChapterDefinition } from '../chapterRegistry';
import { LectureScreen } from '../../labs/components/LectureScreen';
import { useLectureRun } from '../../labs/useLectureRun';
import { useWalkthrough } from '../../components/walkthrough/WalkthroughProvider';
import { Button } from '../../components/ui/Button';
import { Spotlight } from '../../components/ui/Spotlight';
import { LessonText } from '../../components/lesson/LessonText';
import { FlowGraph } from './FlowGraph';
import { ObjectQueryControls } from './ObjectQueryControls';
import { documentationLinks, objectLectures } from './scenario';
import { querySnapshot, type DiagramPanel, type QueryObservation, type RevenueObject, type ServingCluster } from './simulation';
import '../../styles/lesson.css';
import './chapter.css';

export function ObjectChapterLecture({ chapter, navigation, lectureIndex }: { chapter: ChapterDefinition; navigation: ReactNode; lectureIndex: number }) {
  const lecture = objectLectures[lectureIndex]!;
  const { state, dispatch } = useLectureRun({ totalChanges: lecture.lessons.length, steps: lecture.lessons.map((lesson, index) => ({ time: index + 1, before: lesson.before })) });
  const { open: helpOpen } = useWalkthrough();
  const [introductionIndex, setIntroductionIndex] = useState<number | null>(null);
  const [selectedPanel, setSelectedPanel] = useState<DiagramPanel>('input');
  const [queryObject, setQueryObject] = useState<RevenueObject>('revenue_v');
  const [queryCluster, setQueryCluster] = useState<ServingCluster>('a');
  const [exploredQuery, setExploredQuery] = useState<{ step: number; observation: QueryObservation } | null>(null);
  const inputRef = useRef<HTMLElement>(null);
  const definitionsRef = useRef<HTMLElement>(null);
  const transformRef = useRef<HTMLElement>(null);
  const aRef = useRef<HTMLElement>(null);
  const durableRef = useRef<HTMLElement>(null);
  const bRef = useRef<HTMLElement>(null);
  const refs = { definitions: definitionsRef, input: inputRef, a: aRef, transform: transformRef, durable: durableRef, b: bRef };
  const lesson = lecture.lessons[Math.min(state.step, lecture.lessons.length - 1)]!;
  const introduction = introductionIndex === null ? undefined : lecture.introductions[introductionIndex];
  const guided = Boolean(introduction) || state.guided;
  const current = state.selectedTime === 0 ? lecture.initial : lecture.lessons[state.selectedTime - 1]!.snapshot;
  const pending = state.guided && !state.revealed;
  useEffect(() => { if (helpOpen) dispatch({ type: 'pause' }); }, [helpOpen, dispatch]);
  useEffect(() => {
    if (state.selectedTime > 0) setSelectedPanel(lecture.lessons[state.selectedTime - 1]!.target);
  }, [state.selectedTime, lecture]);
  const activePanel = introduction?.target ?? (state.guided ? lesson.target : selectedPanel);
  const query = !guided && exploredQuery?.step === state.selectedTime ? exploredQuery.observation : current.query;
  const reset = () => { dispatch({ type: 'reset' }); setIntroductionIndex(null); setExploredQuery(null); setSelectedPanel('input'); setQueryObject('revenue_v'); setQueryCluster('a'); };
  const nextIntroduction = () => {
    if (introductionIndex === lecture.introductions.length - 1) {
      setIntroductionIndex(null);
      dispatch({ type: 'start-guided' });
    } else setIntroductionIndex(index => (index ?? 0) + 1);
  };
  return <>
    <LectureScreen layout="without-tip" chapter={chapter} title={lecture.title} description={lecture.description} navigation={navigation}
      className="lesson-page object-chapter-page" regionLabel="Lecture content" guided={guided}
      reference={{ objective: lecture.objective, sql: lecture.sql, documentationLinks }}
      simulation={{ completed: introductionIndex ?? (state.guided ? lecture.introductions.length + state.step : state.selectedTime), total: guided ? lecture.introductions.length + lecture.lessons.length : lecture.lessons.length, progressLabel: guided ? 'Tutorial' : 'Steps', playing: state.playing,
        onReset: reset, onRun: () => { setExploredQuery(null); dispatch({ type: 'play' }); }, onStartGuidedRun: () => { reset(); setIntroductionIndex(0); } }}
      visualization={<>
        <nav className="object-step-sequence" aria-label="Scenario steps">{lecture.lessons.map((step, index) => <Button key={step.shortTitle} aria-current={state.selectedTime === index + 1 ? 'step' : undefined}
          disabled={guided || state.playing || index + 1 > state.applied} onClick={() => { setExploredQuery(null); dispatch({ type: 'select', time: index + 1 }); }}><span>{index + 1}</span>{step.shortTitle}</Button>)}</nav>
        <ObjectQueryControls controls={lecture.explore ? { object: queryObject, cluster: queryCluster, disabled: guided || state.playing,
          onObjectChange: setQueryObject, onClusterChange: setQueryCluster,
          onRun: () => { setExploredQuery({ step: state.selectedTime, observation: querySnapshot(current, queryObject, queryCluster) }); setSelectedPanel(queryCluster); } } : undefined} />
        <FlowGraph snapshot={current} query={query} showClusterB={lecture.showClusterB} selectedPanel={activePanel} onSelectPanel={setSelectedPanel} panelRefs={refs} pending={pending} />
        <p className="object-step-explanation" aria-live="polite"><LessonText content={[state.selectedTime === 0 ? 'Start a guided run to learn the objects, then predict their effects.' : `Step ${state.selectedTime}: ${lecture.lessons[state.selectedTime - 1]!.title}`]} /></p>
      </>}
      playback={<div className="relation-playback-controls object-playback" aria-label="Scenario playback">
        {state.step === lecture.lessons.length && <span className="relation-tutorial-complete"><CheckCircle2 size={14} aria-hidden="true" />Tutorial completed</span>}
        <div>{state.selectedTime !== state.applied && <Button disabled={guided || state.playing} onClick={() => dispatch({ type: 'select', time: state.applied })}>Return to latest</Button>}
          <Button disabled={guided || state.playing || state.selectedTime === 0} onClick={() => { setExploredQuery(null); dispatch({ type: 'previous-change' }); }}><ArrowLeft size={14} aria-hidden="true" />Previous change</Button>
          <Button data-walkthrough="next-change" disabled={guided || state.playing || state.selectedTime === lecture.lessons.length} onClick={() => { setExploredQuery(null); dispatch({ type: 'next-change' }); }}>Next change<ArrowRight size={14} aria-hidden="true" /></Button></div>
      </div>} />
    <Spotlight open={guided} targetRef={refs[introduction?.target ?? lesson.target]} step={introductionIndex === null ? lecture.introductions.length + Math.min(state.step + 1, lecture.lessons.length) : introductionIndex + 1} total={lecture.introductions.length + lecture.lessons.length}
      title={introduction?.title ?? lesson.title} description={<span className="object-lesson-text"><LessonText content={introduction?.explanation ?? (pending ? lesson.before : lesson.explanation)} /></span>} phaseLabel={introduction ? 'Learn the concept' : pending ? 'Predict the effect' : 'Explanation'}
      visual={introduction?.example ? <pre className="object-concept-example object-lesson-text"><code><LessonText content={introduction.example} /></code></pre> : null}
      onClose={() => { setIntroductionIndex(null); dispatch({ type: 'close-guided' }); }}>
      <Button disabled={introductionIndex === 0} onClick={() => {
        if (introductionIndex !== null) setIntroductionIndex(introductionIndex - 1);
        else if (state.step === 0 && pending) { dispatch({ type: 'reset' }); setIntroductionIndex(lecture.introductions.length - 1); }
        else dispatch({ type: 'back' });
      }}>Back</Button>
      {introduction ? <Button variant="primary" onClick={nextIntroduction}>{introductionIndex === lecture.introductions.length - 1 ? 'Try the changes' : 'Next'}</Button>
        : pending ? <Button variant="primary" onClick={() => dispatch({ type: 'reveal' })}>Show effect</Button> : <Button variant="primary" onClick={() => dispatch({ type: 'next' })}>{state.step === lecture.lessons.length - 1 ? 'Finish tutorial' : 'Next'}</Button>}
    </Spotlight>
  </>;
}
