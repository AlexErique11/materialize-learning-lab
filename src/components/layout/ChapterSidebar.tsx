import { ArrowLeft, BookOpen, ChevronDown, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
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

function ChapterLinks({ items, compact = false }: { items: readonly ChapterDefinition[]; compact?: boolean }) {
  const { chapterSlug } = useParams();
  const { pathname } = useLocation();
  return (
    <ol className="chapter-links">
      {items.map((chapter) => (
        <li key={chapter.slug}>
          <NavLink
            to={chapterPath(chapter)}
            end
            className={chapter.slug === chapterSlug ? 'chapter-selected' : undefined}
            aria-label={compact ? `${formatChapterNumber(chapter.number)} ${chapter.shortTitle}` : undefined}
            title={compact ? chapter.shortTitle : undefined}
          >
            <span className="chapter-link-number">{formatChapterNumber(chapter.number)}</span>
            {!compact && <span className="chapter-link-label">{chapter.shortTitle}</span>}
          </NavLink>
          {!compact && chapter.slug === chapterSlug && pathname !== chapterPath(chapter) && (
            <div className="chapter-sections">
              {getChapterSections(chapter).map((section) => (
                <details key={`${pathname}/${section.slug}`} className="chapter-section" open>
                  <summary>
                    <ChevronDown size={13} aria-hidden="true" />
                    {section.title}
                  </summary>
                  <ol className="chapter-pages">
                    <li>
                      <NavLink
                        to={chapterSectionPath(chapter, section.slug)}
                        end
                        aria-label={`${section.title} overview`}
                      >
                        Overview
                      </NavLink>
                    </li>
                    {section.pages.map((page) => (
                      <li key={page.slug}>
                        <NavLink
                          to={chapterContentPath(chapter, { ...page, sectionSlug: section.slug })}
                          end
                        >
                          {page.title}
                        </NavLink>
                      </li>
                    ))}
                  </ol>
                </details>
              ))}
            </div>
          )}
        </li>
      ))}
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
      <details key={pathname} className="mobile-sidebar">
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
