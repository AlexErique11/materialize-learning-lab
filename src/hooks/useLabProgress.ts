import { useContext, useEffect, useSyncExternalStore } from 'react';
import { useLocation } from 'react-router';
import type { ChapterSectionSlug } from '../chapters/chapterOutline';
import { ChapterCompletionContext } from '../components/lab/chapterCompletionContext';
import { completeLabActivity, getLabChapterProgress, getLabProgress, labActivityPaths, subscribeLabProgress } from '../progress/labProgress';

export function useLabProgress() {
  const completedPaths = useSyncExternalStore(subscribeLabProgress, getLabProgress);
  return { completedPaths, ...getLabChapterProgress(completedPaths) };
}

export function useActivityCompletion(section: ChapterSectionSlug, completeNow: boolean) {
  const { pathname } = useLocation();
  const path = pathname.replace(/\/+$/, '');
  const { completedPaths } = useLabProgress();
  const chapterCompletion = useContext(ChapterCompletionContext);
  // Hidden exercise reference diagrams also mount lecture hooks; they must not earn progress.
  const matchingActivity = labActivityPaths.includes(path) && path.split('/')[3] === section;
  useEffect(() => {
    if (!matchingActivity || !completeNow || getLabProgress().includes(path)) return;
    completeLabActivity(path);
    if (getLabChapterProgress(getLabProgress()).completedChapterSlugs.includes(path.split('/')[2]!)) chapterCompletion?.open();
  }, [path, matchingActivity, completeNow, chapterCompletion]);
  return matchingActivity && (completeNow || completedPaths.includes(path));
}
