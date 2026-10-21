import type { ComponentProps } from 'react';
import { Link, useNavigate } from 'react-router';
import { ArrowRight } from 'lucide-react';
import { chapterContentPath, getChapterPages } from '../../chapters/chapterOutline';
import { chapterPath, chapters, type ChapterDefinition } from '../../chapters/chapterRegistry';
import { useLabProgress } from '../../hooks/useLabProgress';
import { Button } from '../ui/Button';
import { Dialog } from '../ui/Dialog';

export function ChapterCompletionDialog({ chapter, children, ...props }: Omit<ComponentProps<typeof Dialog>, 'title' | 'eyebrow'> & {
  chapter: ChapterDefinition;
}) {
  const navigate = useNavigate();
  const { completedPaths, completedChapterSlugs } = useLabProgress();
  const complete = completedChapterSlugs.includes(chapter.slug);
  const remaining = getChapterPages(chapter).filter(activity => !completedPaths.includes(chapterContentPath(chapter, activity)));
  const nextChapter = chapters[chapters.findIndex(item => item.slug === chapter.slug) + 1];

  return <Dialog {...props} title={complete ? `You finished Chapter ${chapter.number}` : 'Exercise completed'}
    eyebrow={complete ? 'Chapter complete' : 'Chapter in progress'}>
    {complete ? children : <div className="space-y-5">
      <p>This exercise is complete. Finish the remaining activities to complete Chapter {chapter.number}.</p>
      <div className="space-y-2">
        <p>You have left:</p>
        <ul className="list-disc space-y-2 pl-5" aria-label="Remaining chapter activities">
          {remaining.map(activity => <li key={activity.slug}>
            <Link className="text-link" to={chapterContentPath(chapter, activity)}>{activity.title}</Link>
          </li>)}
        </ul>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button onClick={() => navigate(chapterPath(chapter))}>
          Chapter overview<ArrowRight size={16} aria-hidden="true" />
        </Button>
        {nextChapter && <Button data-dialog-primary aria-keyshortcuts="Enter" variant="primary"
          onClick={() => navigate(chapterPath(nextChapter))}>
          Go to next chapter<ArrowRight size={16} aria-hidden="true" />
        </Button>}
      </div>
    </div>}
  </Dialog>;
}
