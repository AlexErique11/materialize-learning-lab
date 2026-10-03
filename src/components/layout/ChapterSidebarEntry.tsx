import { useEffect, useId, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { NavLink, useLocation, useParams } from 'react-router';
import { getChapterSections } from '../../chapters/chapterOutline';
import { chapterPath, formatChapterNumber, type ChapterDefinition } from '../../chapters/chapterRegistry';
import { ChapterSidebarSection } from './ChapterSidebarSection';

interface ChapterSidebarEntryProps {
  chapter: ChapterDefinition;
  compact: boolean;
}

export function ChapterSidebarEntry({ chapter, compact }: ChapterSidebarEntryProps) {
  const { chapterSlug, sectionSlug } = useParams();
  const { pathname } = useLocation();
  const selected = chapter.slug === chapterSlug;
  const [expanded, setExpanded] = useState(selected);
  const [openSections, setOpenSections] = useState<string[]>(selected && sectionSlug ? [sectionSlug] : []);
  const branchId = useId();
  const number = formatChapterNumber(chapter.number);

  useEffect(() => {
    setExpanded(selected);
  }, [pathname, selected]);

  useEffect(() => {
    if (!selected) {
      setOpenSections((previous) => previous.length ? [] : previous);
    } else if (sectionSlug) {
      setOpenSections((previous) => previous.includes(sectionSlug) ? previous : [...previous, sectionSlug]);
    }
  }, [pathname, selected, sectionSlug]);

  function setSectionOpen(slug: string, open: boolean) {
    setOpenSections((previous) => {
      if (!open) return previous.filter((item) => item !== slug);
      return previous.includes(slug) ? previous : [...previous, slug];
    });
  }

  return (
    <li className={selected && !compact ? 'chapter-branch-selected' : undefined}>
      <div className="chapter-link-row">
        <NavLink
          to={chapterPath(chapter)}
          end
          className={selected ? 'chapter-selected' : undefined}
          aria-label={`${number} ${chapter.shortTitle}`}
          aria-current={compact ? undefined : false}
          aria-expanded={selected && !compact ? expanded : undefined}
          aria-controls={selected && !compact ? branchId : undefined}
          title={compact ? chapter.shortTitle : undefined}
          onClick={(event) => {
            if (selected && !compact && !event.ctrlKey && !event.metaKey && !event.shiftKey) {
              event.preventDefault();
              setExpanded((value) => !value);
            } else {
              setExpanded(true);
            }
          }}
        >
          <span className="chapter-link-number">{number}</span>
          {!compact && <span className="chapter-link-label">{chapter.shortTitle}</span>}
        </NavLink>
        {!compact && selected && (
          <button
            type="button"
            className="chapter-branch-toggle"
            aria-label={`${expanded ? 'Collapse' : 'Expand'} ${chapter.shortTitle} chapter`}
            aria-expanded={expanded}
            aria-controls={branchId}
            onClick={() => setExpanded((value) => !value)}
          >
            <ChevronDown size={16} aria-hidden="true" />
          </button>
        )}
        {!compact && !selected && <span className="chapter-branch-toggle-spacer" aria-hidden="true" />}
      </div>
      {!compact && selected && (
        <div id={branchId} className="chapter-sections" hidden={!expanded}>
          <NavLink to={chapterPath(chapter)} end className="chapter-overview-link" aria-label={`${chapter.shortTitle} overview`}>
            <span className="chapter-group-dot" aria-hidden="true" />Overview
          </NavLink>
          {getChapterSections(chapter).map((section) => (
            <ChapterSidebarSection
              key={section.slug}
              chapter={chapter}
              section={section}
              open={openSections.includes(section.slug)}
              onOpenChange={(open) => setSectionOpen(section.slug, open)}
            />
          ))}
        </div>
      )}
    </li>
  );
}
