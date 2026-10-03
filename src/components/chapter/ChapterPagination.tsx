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
    <nav className="guided-lab-pagination" aria-label="Page navigation">
        {previous && (
          <Link to={previous.to} aria-label={`${previous.label ?? 'Previous'} ${previous.title}`} title={`${previous.label ?? 'Previous'}: ${previous.title}`}>
            <ArrowLeft size={12} strokeWidth={3.5} aria-hidden="true" />
            <span>Previous</span>
          </Link>
        )}
        {next && (
          <Link to={next.to} aria-label={`${next.label ?? 'Next'} ${next.title}`} title={`${next.label ?? 'Next'}: ${next.title}`}>
            <span>Next</span>
            <ArrowRight size={12} strokeWidth={3.5} aria-hidden="true" />
          </Link>
        )}
    </nav>
  );
}
