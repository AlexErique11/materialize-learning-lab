import { Navigate } from 'react-router';
import { chapterPath, coreChapters } from '../chapters/chapterRegistry';

export function GuidedLabsPage() {
  const firstChapter = coreChapters[0];
  if (!firstChapter) throw new Error('The guided labs need a first core chapter.');

  return <Navigate to={chapterPath(firstChapter)} replace />;
}
