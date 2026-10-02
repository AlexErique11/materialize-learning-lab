import { ArrowLeft, ArrowRight } from 'lucide-react';
import { Link } from 'react-router';

interface PageDestination {
  to: string;
  title: string;
  label?: string;
}

interface ChapterPaginationProps {
  previous?: PageDestination;
  next?: PageDestination;
}

export function ChapterPagination({ previous, next }: ChapterPaginationProps) {
  return (
    <nav className="adjacent-chapters" aria-label="Page navigation">
      <div>
        {previous && (
          <Link to={previous.to}>
            <ArrowLeft size={16} aria-hidden="true" />
            <span>
              <small>{previous.label ?? 'Previous'}</small>
              {previous.title}
            </span>
          </Link>
        )}
      </div>
      <div>
        {next && (
          <Link to={next.to}>
            <span>
              <small>{next.label ?? 'Next'}</small>
              {next.title}
            </span>
            <ArrowRight size={16} aria-hidden="true" />
          </Link>
        )}
      </div>
    </nav>
  );
}
