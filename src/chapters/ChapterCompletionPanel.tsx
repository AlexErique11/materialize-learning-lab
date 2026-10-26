import { ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router';
import { chapterPath, chapters, formatChapterNumber, type ChapterDefinition } from './chapterRegistry';
import { chapterCompletionContent } from './chapterCompletionContent';
import { ChapterCompletionDialog } from '../components/lab/ChapterCompletionDialog';
import { Button } from '../components/ui/Button';
import '../styles/chapter-completion.css';

export function ChapterCompletionPanel({ chapter, open, onClose }: {
  chapter: ChapterDefinition; open: boolean; onClose: () => void;
}) {
  const navigate = useNavigate();
  const content = chapterCompletionContent[chapter.slug];
  const nextChapter = chapters[chapters.findIndex(item => item.slug === chapter.slug) + 1];
  if (!content) return null;

  // Preserve the existing exercise-only dialog styling before a chapter is complete.
  const exerciseDialogClassName = ['changing-relations', 'incremental-maintenance', 'getting-data-in', 'time-in-materialize'].includes(chapter.slug)
    ? 'chapter-completion-dialog' : undefined;

  return (
    <ChapterCompletionDialog chapter={chapter} open={open} onClose={onClose}
      className={exerciseDialogClassName} completedClassName="chapter-completion-dialog">
      <div className="chapter-completion-intro">
        <div className="chapter-completion-copy">
          <h3>{content.title}</h3>
          <p>{content.description}</p>
        </div>
        <img src={chapter.overviewImage} alt="" aria-hidden="true" className="chapter-completion-art" />
      </div>
      <div className="chapter-completion-topics">
        {content.topics.map(({ title, description }, index) => (
          <section key={title}>
            <h3>
              <span className="chapter-completion-topic-number" aria-hidden="true">{formatChapterNumber(index + 1)}</span>
              <span>{title}</span>
            </h3>
            <p>{description}</p>
          </section>
        ))}
      </div>
      <div className="chapter-completion-takeaway">
        <strong>The key idea</strong>
        <p>{content.takeaway}</p>
      </div>
      <div className="chapter-completion-next">
        <div>
          <span className="eyebrow">{nextChapter ? `Up next · Chapter ${nextChapter.number}` : 'Learning path'}</span>
          <p>{nextChapter ? nextChapter.shortTitle : 'Choose what to explore next'}</p>
        </div>
        <Button data-dialog-primary aria-keyshortcuts="Enter" variant="primary"
          onClick={() => navigate(nextChapter ? chapterPath(nextChapter) : '/')}>
          {nextChapter ? 'Go to next chapter' : 'Return to learning path'}
          <ArrowRight size={16} aria-hidden="true" />
        </Button>
      </div>
    </ChapterCompletionDialog>
  );
}

