import { useEffect, useId, useRef, useState } from 'react';
import { ArrowLeft, BookOpen, ChevronDown, ChevronRight, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { Link, NavLink, useLocation, useParams } from 'react-router';
import {
  chapterContentPath,
  chapterSectionPath,
  getChapterSections,
} from '../../chapters/chapterOutline';
import {
  advancedChapters,
  chapterPath,
  coreChapters,
  formatChapterNumber,
  type ChapterDefinition,
} from '../../chapters/chapterRegistry';
import { IconButton } from '../ui/IconButton';
import { ProgressBar } from '../ui/ProgressBar';

function ChapterEntry({ chapter, compact }: { chapter: ChapterDefinition; compact: boolean }) {
  const { chapterSlug, sectionSlug } = useParams();
  const { pathname } = useLocation();
  const selected = chapter.slug === chapterSlug;
  const [expanded, setExpanded] = useState(selected);
  const [openSections, setOpenSections] = useState<string[]>(selected && sectionSlug ? [sectionSlug] : []);
  const branchId = useId();
  useEffect(() => { setExpanded(selected); }, [pathname, selected]);
  useEffect(() => {
    if (!selected) setOpenSections((previous) => previous.length ? [] : previous);
    else if (sectionSlug)
      setOpenSections((previous) => previous.includes(sectionSlug) ? previous : [...previous, sectionSlug]);
  }, [pathname, selected, sectionSlug]);
  const number = formatChapterNumber(chapter.number);
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
              } else setExpanded(true);
            }}
          >
            <span className="chapter-link-number">{number}</span>
            {!compact && <span className="chapter-link-label">{chapter.shortTitle}</span>}
          </NavLink>
          {!compact && selected && <button
            type="button" className="chapter-branch-toggle"
            aria-label={`${expanded ? 'Collapse' : 'Expand'} ${chapter.shortTitle} chapter`}
            aria-expanded={expanded} aria-controls={branchId}
            onClick={() => setExpanded((value) => !value)}
          ><ChevronDown size={16} aria-hidden="true" /></button>}
          {!compact && !selected && <span className="chapter-branch-toggle-spacer" aria-hidden="true" />}
      </div>
          {!compact && selected && <div id={branchId} className="chapter-sections" hidden={!expanded}>
              <NavLink to={chapterPath(chapter)} end className="chapter-overview-link" aria-label={`${chapter.shortTitle} overview`}>
                <span className="chapter-group-dot" aria-hidden="true" />Overview
              </NavLink>
              {getChapterSections(chapter).map((section) => {
                const title = section.slug === 'tutorial' ? 'Tutorials' : 'Exercises';
                return <details key={section.slug} className="chapter-section" open={openSections.includes(section.slug)}
                  onToggle={(event) => {
                    const isOpen = event.currentTarget.open;
                    setOpenSections((previous) => isOpen
                      ? previous.includes(section.slug) ? previous : [...previous, section.slug]
                      : previous.filter((slug) => slug !== section.slug));
                  }}>
                  <summary>
                    <span className="chapter-group-dot" aria-hidden="true" />
                    <ChevronDown className="chapter-section-chevron" size={16} aria-hidden="true" />
                    <span>{title}</span>
                    <ChevronRight className="chapter-section-forward" size={16} aria-hidden="true" />
                  </summary>
                  <ol className="chapter-pages">
                    {section.pages.length === 0 && <li>
                      <NavLink to={chapterSectionPath(chapter, section.slug)} end aria-label={`${title} overview`}>
                        <span className="chapter-page-dot" aria-hidden="true" /><span className="chapter-page-label">To be done</span>
                      </NavLink>
                    </li>}
                    {section.pages.map((page) => (
                      <li key={page.slug}>
                        <NavLink
                          to={chapterContentPath(chapter, { ...page, sectionSlug: section.slug })}
                          end
                        >
                          <span className="chapter-page-dot" aria-hidden="true" /><span className="chapter-page-label">{page.title}</span>
                        </NavLink>
                      </li>
                    ))}
                  </ol>
                </details>;
              })}
            </div>}
    </li>
  );
}

function ChapterLinks({ items, compact = false }: { items: readonly ChapterDefinition[]; compact?: boolean }) {
  return (
    <ol className="chapter-links">
      {items.map((chapter) => <ChapterEntry key={chapter.slug} chapter={chapter} compact={compact} />)}
    </ol>
  );
}

function SidebarContent({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`sidebar-content${compact ? ' sidebar-content-compact' : ''}`}>
      {!compact && <>
        <Link to="/" className="sidebar-back">
        <ArrowLeft size={14} aria-hidden="true" /> Learning path
      </Link>
      <Link to="/labs" className="sidebar-title">
        Guided labs
      </Link>
      <div className="sidebar-progress">
        <ProgressBar value={0} total={coreChapters.length} label="Core chapters completed" />
        <p>0/{coreChapters.length} completed</p>
      </div>
      </>}
      <nav aria-label="Chapters">
        <ChapterLinks items={coreChapters} compact={compact} />
        {!compact && <p className="eyebrow mb-2 mt-6">Optional · advanced</p>}
        <ChapterLinks items={advancedChapters} compact={compact} />
      </nav>
    </div>
  );
}

interface ChapterSidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export function ChapterSidebar({ collapsed, onToggle }: ChapterSidebarProps) {
  const { pathname } = useLocation();
  const mobileSidebar = useRef<HTMLDetailsElement>(null);
  useEffect(() => { if (mobileSidebar.current) mobileSidebar.current.open = false; }, [pathname]);
  return (
    <aside className="chapter-sidebar" aria-label="Guided labs navigation">
      <div className="desktop-sidebar" data-collapsed={collapsed}>
        <div className="sidebar-toggle-row">
          <IconButton
            label={collapsed ? 'Expand chapter navigation' : 'Collapse chapter navigation'}
            aria-expanded={!collapsed}
            aria-controls="desktop-chapter-navigation"
            onClick={onToggle}
          >
            {collapsed ? (
              <PanelLeftOpen size={18} aria-hidden="true" />
            ) : (
              <PanelLeftClose size={18} aria-hidden="true" />
            )}
          </IconButton>
        </div>
        <div id="desktop-chapter-navigation">
          <SidebarContent compact={collapsed} />
        </div>
      </div>
      <details ref={mobileSidebar} className="mobile-sidebar">
        <summary>
          <span className="flex items-center gap-2">
            <BookOpen size={16} aria-hidden="true" /> Chapter navigation
          </span>
          <ChevronDown size={16} aria-hidden="true" />
        </summary>
        <SidebarContent />
      </details>
    </aside>
  );
}
