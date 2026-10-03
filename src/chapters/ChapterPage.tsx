import { useOutletContext } from 'react-router';
import { GuidedLabScreen } from '../labs/components/GuidedLabScreen';
import type { ChapterDefinition } from './chapterRegistry';

export function ChapterPage() {
  const chapter = useOutletContext<ChapterDefinition>();
  return <GuidedLabScreen chapter={chapter} />;
}
