import { useEffect, useRef } from 'react';
import { ArrowLeft, BookOpen, ChevronDown, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { Link, useLocation } from 'react-router';
import {
  advancedChapters,
  coreChapters,
  type ChapterDefinition,
} from '../../chapters/chapterRegistry';
import { IconButton } from '../ui/IconButton';
import { ProgressBar } from '../ui/ProgressBar';
import { ChapterSidebarEntry } from './ChapterSidebarEntry';

function ChapterLinks({ items, compact = false }: { items: readonly ChapterDefinition[]; compact?: boolean }) {
  return (
    <ol className="chapter-links">
      {items.map((chapter) => <ChapterSidebarEntry key={chapter.slug} chapter={chapter} compact={compact} />)}
    </ol>
  );
}

function SidebarContent({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`sidebar-content${compact ? ' sidebar-content-compact' : ''}`}>
      {!compact && (
        <>
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
        </>
      )}
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
  useEffect(() => {
    if (mobileSidebar.current) mobileSidebar.current.open = false;
  }, [pathname]);
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
