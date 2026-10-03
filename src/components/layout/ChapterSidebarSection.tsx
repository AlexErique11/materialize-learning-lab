import { ChevronDown, ChevronRight } from 'lucide-react';
import { NavLink } from 'react-router';
import {
  chapterContentPath,
  chapterSectionPath,
  type ChapterSectionDefinition,
} from '../../chapters/chapterOutline';
import type { ChapterDefinition } from '../../chapters/chapterRegistry';

interface ChapterSidebarSectionProps {
  chapter: ChapterDefinition;
  section: ChapterSectionDefinition;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ChapterSidebarSection({ chapter, section, open, onOpenChange }: ChapterSidebarSectionProps) {
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
        <ChevronRight className="chapter-section-forward" size={16} aria-hidden="true" />
      </summary>
      <ol className="chapter-pages">
        {section.pages.length === 0 && (
          <li>
            <NavLink to={chapterSectionPath(chapter, section.slug)} end aria-label={`${section.listTitle} overview`}>
              <span className="chapter-page-dot" aria-hidden="true" />
              <span className="chapter-page-label">To be done</span>
            </NavLink>
          </li>
        )}
        {section.pages.map((page) => (
          <li key={page.slug}>
            <NavLink to={chapterContentPath(chapter, { ...page, sectionSlug: section.slug })} end>
              <span className="chapter-page-dot" aria-hidden="true" />
              <span className="chapter-page-label">{page.title}</span>
            </NavLink>
          </li>
        ))}
      </ol>
    </details>
  );
}
