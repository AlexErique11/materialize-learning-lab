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

function ChapterLinks({ items }: { items: readonly ChapterDefinition[] }) {
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
          >
            <span className="chapter-link-number">{formatChapterNumber(chapter.number)}</span>
            <span>{chapter.shortTitle}</span>
          </NavLink>
          {chapter.slug === chapterSlug && (
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

function SidebarContent() {
  return (
    <div className="sidebar-content">
      <Link to="/" className="sidebar-back">
        <ArrowLeft size={14} aria-hidden="true" /> Learning path
      </Link>
      <Link to="/labs" className="mt-7 flex items-center gap-2 font-semibold">
        <BookOpen size={17} aria-hidden="true" /> Guided labs
      </Link>
      <div className="mb-5 mt-4">
        <p className="mb-2 text-xs text-text-muted">0/{coreChapters.length} completed</p>
        <ProgressBar value={0} total={coreChapters.length} label="Core chapters completed" />
      </div>
      <nav aria-label="Chapters">
        <p className="eyebrow mb-2">Core chapters</p>
        <ChapterLinks items={coreChapters} />
        <p className="eyebrow mb-2 mt-6">Optional · advanced</p>
        <ChapterLinks items={advancedChapters} />
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
      <div className="desktop-sidebar">
        <div className="sidebar-toggle-row">
          {!collapsed && <span>Chapter navigation</span>}
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
        <div id="desktop-chapter-navigation" hidden={collapsed}>
          <SidebarContent />
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
