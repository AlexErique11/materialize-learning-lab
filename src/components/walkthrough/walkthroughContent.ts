import { chapterPath, findChapter } from '../../chapters/chapterRegistry';
import { chapterContentPath, findChapterContent } from '../../chapters/chapterOutline';

export interface WalkthroughStep {
  path: string;
  target?: string;
  title: string;
  description: string;
  unavailable?: string;
}

export const chapterTourWelcome = {
  title: 'How chapters work',
  description: 'This walkthrough explains the structure of chapters: lectures to learn the concepts, followed by exercises to practise them. We will visit Chapter 1 and show you its pages and main controls. You can exit at any time.',
};

const chapter = findChapter('changing-relations')!;
export const chapterTourPaths = {
  overview: chapterPath(chapter),
  lectureOne: chapterContentPath(chapter, findChapterContent(chapter, 'tutorial', 'lecture-1')!),
  lectureTwo: chapterContentPath(chapter, findChapterContent(chapter, 'tutorial', 'lecture-2')!),
  exercise: chapterContentPath(chapter, findChapterContent(chapter, 'exercises', 'exercise-1')!),
};

export function getLectureWalkthrough(path: string): WalkthroughStep[] | null {
  const parts = path.split('/').filter(Boolean);
  const currentChapter = findChapter(parts[1]);
  if (parts.length !== 4 || parts[0] !== 'labs' || parts[2] !== 'tutorial'
    || !currentChapter || !findChapterContent(currentChapter, parts[2], parts[3])) return null;
  const independentCases = currentChapter.slug === 'progress-and-freshness' && parts[3] === 'lecture-3';
  const scenarioSteps = ['views-indexes-materialized-views', 'progress-and-freshness', 'consistent-reads'].includes(currentChapter.slug);
  const stepDescription = independentCases
    ? 'Open the next independent case with fresh starting values. These examples are separate incidents, so a lower frontier does not mean progress moved backward. Previous change revisits the prior example.'
    : currentChapter.slug === 'consistent-reads'
    ? 'Advance one scenario checkpoint: select a query snapshot, advance a frontier, or replay a named independent fixture. Steps are not logical timestamps. Previous change restores the earlier state; the time slider explores a separate selected request.'
    : currentChapter.slug === 'progress-and-freshness'
    ? 'Advance one scenario action at a time: report input progress, observe a change, or process maintained work. Step numbers are not logical timestamps. Previous change inspects earlier steps.'
    : scenarioSteps ? 'Advance one completed scenario action at a time. These object-creation and query steps are not logical timestamps. Previous change inspects earlier steps.' : 'Advance manually, one complete timestamp at a time. When inspecting earlier history, move forward through changes already applied.';
  return [
    { path, target: 'run', title: 'Run and Pause', description: 'Run plays changes automatically. Pause stops playback so you can inspect the current state. Opening this help also pauses playback.', unavailable: 'This tutorial is unfinished, so playback is unavailable.' },
    { path, target: 'guided', title: 'Start guided run', description: 'Restart the scenario with lesson explanations. Show effect reveals a change; Next continues the lesson. Finish the guided lesson to complete tutorial progress.', unavailable: 'This tutorial is unfinished, so a guided run is unavailable.' },
    { path, target: 'sql', title: 'SQL & Objectives', description: 'Open the learning objective, SQL reference, and documentation for this lecture.' },
    { path, target: 'next-change', title: 'Next change', description: stepDescription, unavailable: 'All changes have been applied. Reset or replay the scenario to explore it again.' },
  ];
}

export const chapterTourSteps: readonly WalkthroughStep[] = [
  { path: chapterTourPaths.overview, target: 'tutorials', title: 'Start with the lectures', description: 'Chapter 1 has two lectures, followed by one exercise. Start with Lecture 1, then continue to Lecture 2. These Start links open the actual lecture pages.' },
  { path: chapterTourPaths.overview, target: 'exercises', title: 'Then practice with an exercise', description: 'After the lectures, exercises let you practise what you learned by solving problems and checking your answers.' },
  { path: chapterTourPaths.overview, title: 'Lectures', description: 'Now we will leave the chapter overview and open Lecture 1. Lectures explain the concepts through interactive examples. We will look at the lecture page and its main controls.' },
  { path: chapterTourPaths.lectureOne, target: 'lecture-workspace', title: 'Lecture 1: read changes and see their effect', description: 'The change ledger and current relation show the same scenario. Watch the relation change as you apply additions and retractions. The tour highlights controls without running the scenario.' },
  ...getLectureWalkthrough(chapterTourPaths.lectureOne)!,
  { path: chapterTourPaths.lectureOne, title: 'Exercises', description: 'After the lectures, exercises let you put what you learned into practice. Next, we will leave the lecture page and open an exercise where you solve problems and check your answers.' },
  { path: chapterTourPaths.exercise, target: 'question', title: 'Practise with exercises', description: 'Exercises let you apply what you learned in the lectures. Solve each problem, then check your answer.' },
  { path: chapterTourPaths.overview, target: 'start-lecture-1', title: 'Ready to begin', description: 'Use Start tutorial to begin Lecture 1. Controls tour at the top right of a lecture replays help for its buttons. You can restart this full tour from Take a tour beside Learning path on the home page.' },
];
