import { useState } from 'react';
import { Outlet, useParams } from 'react-router';
import { findChapter } from '../../chapters/chapterRegistry';
import { ChapterSidebar } from '../../components/layout/ChapterSidebar';
import { NotFoundPage } from '../../pages/NotFoundPage';

export function LearningAreaLayout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { chapterSlug } = useParams();
  const chapter = findChapter(chapterSlug);
  if (!chapter)
    return (
      <NotFoundPage
        title="Chapter not found"
        description="This chapter isn’t in the curriculum. Browse the guided labs to find your next stop."
      />
    );

  return (
    <div className="learning-area" data-sidebar-collapsed={sidebarCollapsed}>
      <ChapterSidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed((collapsed) => !collapsed)}
      />
      <div className="learning-area-content">
        <Outlet context={chapter} />
      </div>
    </div>
  );
}
