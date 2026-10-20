import { useEffect, useSyncExternalStore } from 'react';
import { useLocation } from 'react-router';
import type { ChapterSectionSlug } from '../chapters/chapterOutline';
import { completeLabActivity, getLabChapterProgress, getLabProgress, labActivityPaths, subscribeLabProgress } from '../progress/labProgress';

export function useLabProgress() {
  const completedPaths = useSyncExternalStore(subscribeLabProgress, getLabProgress);
  return { completedPaths, ...getLabChapterProgress(completedPaths) };
}

export function useActivityCompletion(section: ChapterSectionSlug, completeNow: boolean) {
  const { pathname } = useLocation();
  const path = pathname.replace(/\/+$/, '');
  const { completedPaths } = useLabProgress();
  // Hidden exercise reference diagrams also mount lecture hooks; they must not earn progress.
  const matchingActivity = labActivityPaths.includes(path) && path.split('/')[3] === section;
  useEffect(() => {
    if (matchingActivity && completeNow) completeLabActivity(path);
  }, [path, matchingActivity, completeNow]);
  return matchingActivity && (completeNow || completedPaths.includes(path));
}
