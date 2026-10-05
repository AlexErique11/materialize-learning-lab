import { useEffect } from 'react';
import { useNavigate } from 'react-router';
import { chapterPath, coreChapters } from '../chapters/chapterRegistry';
import { useWalkthrough } from '../components/walkthrough/WalkthroughProvider';
import { shouldStartChapterTour } from '../components/walkthrough/walkthroughStorage';

export function GuidedLabsPage() {
  const navigate = useNavigate();
  const { startChapterTour } = useWalkthrough();
  const firstChapter = coreChapters[0];
  if (!firstChapter) throw new Error('The guided labs need a first core chapter.');
  useEffect(() => {
    if (shouldStartChapterTour()) startChapterTour(true);
    else navigate(chapterPath(firstChapter), { replace: true });
  }, [navigate, startChapterTour, firstChapter]);
  return null;
}
