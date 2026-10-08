import { ArrowLeft, ArrowRight } from 'lucide-react';
import { Link } from 'react-router';
import type { ChapterPageDestination } from '../../chapters/chapterNavigation';
import { useWalkthrough } from '../walkthrough/WalkthroughProvider';
import { LectureControlsTourButton } from '../walkthrough/LectureControlsTourButton';

interface ChapterPaginationProps {
  previous?: ChapterPageDestination;
  next?: ChapterPageDestination;
  showTooltips?: boolean;
  hideLinks?: boolean;
}

export function ChapterPagination({ previous, next, showTooltips = true, hideLinks = false }: ChapterPaginationProps) {
  const { lectureHelpAvailable } = useWalkthrough();
  const previousContent = <><ArrowLeft size={12} strokeWidth={3.5} aria-hidden="true" /><span>Previous</span></>;
  const nextContent = <><span>Next</span><ArrowRight size={12} strokeWidth={3.5} aria-hidden="true" /></>;

  if (lectureHelpAvailable || hideLinks) {
    // Preserve the original navigation footprint so titles and controls do not move.
    return <div className="guided-lab-pagination guided-lab-help-slot">
      {previous && <span className="guided-lab-pagination-size" aria-hidden="true">{previousContent}</span>}
      {next && <span className="guided-lab-pagination-size" aria-hidden="true">{nextContent}</span>}
      {lectureHelpAvailable && <LectureControlsTourButton />}
    </div>;
  }

  return (
    <nav className="guided-lab-pagination" aria-label="Page navigation">
      {previous && (
        <Link
          to={previous.to}
          aria-label={`${previous.label ?? 'Previous'} ${previous.title}`}
          title={showTooltips ? `${previous.label ?? 'Previous'}: ${previous.title}` : undefined}
        >
          {previousContent}
        </Link>
      )}
      {next && (
        <Link
          to={next.to}
          aria-label={`${next.label ?? 'Next'} ${next.title}`}
          title={showTooltips ? `${next.label ?? 'Next'}: ${next.title}` : undefined}
        >
          {nextContent}
        </Link>
      )}
    </nav>
  );
}
