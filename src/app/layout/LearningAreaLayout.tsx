import { useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { Outlet, useParams } from 'react-router';
import { findChapter } from '../../chapters/chapterRegistry';
import { ChapterSidebar } from '../../components/layout/ChapterSidebar';
import { NotFoundPage } from '../../pages/NotFoundPage';
import { animateMotion, reducedMotion } from '../../motion/motion';

export function LearningAreaLayout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const sidebarGeneration = useRef(0);
  const toggleSidebar = () => {
    const content = contentRef.current;
    const left = content?.getBoundingClientRect().left ?? 0;
    flushSync(() => setSidebarCollapsed((collapsed) => !collapsed));
    if (!content || reducedMotion()) return;
    const root = rootRef.current!;
    const generation = ++sidebarGeneration.current;
    root.dataset.motionSidebar = 'true';
    for (const animation of content.getAnimations()) if (animation.id === 'ui-motion-sidebar-layout') animation.cancel();
    const delta = left - content.getBoundingClientRect().left;
    const animation = animateMotion(content, 'sidebar-layout', [{ transform: `translateX(${delta}px)` }, { transform: 'translateX(0)' }]);
    const finish = () => { if (sidebarGeneration.current === generation) delete root.dataset.motionSidebar; };
    if (animation) void animation.finished.then(finish, finish);
    else finish();
    animateMotion(rootRef.current?.querySelector('.sidebar-content') ?? null, 'sidebar-labels', [{ opacity: 0.25 }, { opacity: 1 }]);
  };
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
    <div ref={rootRef} className="learning-area" data-sidebar-collapsed={sidebarCollapsed}
      onKeyDownCapture={event => { event.currentTarget.dataset.navigationInput = 'keyboard'; }}
      onPointerDownCapture={event => { event.currentTarget.dataset.navigationInput = 'pointer'; }}>
      <ChapterSidebar
        collapsed={sidebarCollapsed}
        onToggle={toggleSidebar}
      />
      <div ref={contentRef} className="learning-area-content">
        <Outlet context={chapter} />
      </div>
    </div>
  );
}
