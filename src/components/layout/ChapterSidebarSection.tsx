import { ChevronDown } from 'lucide-react';
import { NavLink } from 'react-router';
import {
  chapterContentPath,
  type ChapterSectionDefinition,
} from '../../chapters/chapterOutline';
import type { ChapterDefinition } from '../../chapters/chapterRegistry';
import { useLabProgress } from '../../hooks/useLabProgress';

interface ChapterSidebarSectionProps {
  chapter: ChapterDefinition;
  section: ChapterSectionDefinition;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ChapterSidebarSection({ chapter, section, open, onOpenChange }: ChapterSidebarSectionProps) {
  const { completedPaths } = useLabProgress();
  return (
    <details
      className="chapter-section"
      open={open}
      onToggle={(event) => onOpenChange(event.currentTarget.open)}
    >
      <summary>
        <span className="chapter-group-dot" aria-hidden="true" />
        <ChevronDown className="chapter-section-chevron" size={16} aria-hidden="true" />
        <span>{section.listTitle}</span>
      </summary>
      <ol className="chapter-pages">
        {section.pages.length === 0 && (
          <li className="reserved-sidebar-row" aria-hidden="true" />
        )}
        {section.pages.map((page) => {
          const path = chapterContentPath(chapter, { ...page, sectionSlug: section.slug });
          const completed = completedPaths.includes(path);
          return (
            <li key={page.slug}>
              <NavLink to={path} end data-completed={completed || undefined} aria-description={completed ? 'Completed' : undefined}>
                <span className="chapter-page-dot" aria-hidden="true" />
                <span className="chapter-page-label">{page.title}</span>
              </NavLink>
            </li>
          );
        })}
      </ol>
    </details>
  );
}
