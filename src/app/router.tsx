import { createBrowserRouter, Navigate } from 'react-router';
import { challenge } from '../challenges/challengeRegistry';
import { LiveOrderOperationsPage } from '../challenges/live-order-operations/LiveOrderOperationsPage';
import { ChapterPage } from '../chapters/ChapterPage';
import { ChapterContentPage } from '../chapters/ChapterContentPage';
import { FaqPage } from '../pages/FaqPage';
import { GuidedLabsPage } from '../pages/GuidedLabsPage';
import { LearningPathPage } from '../pages/LearningPathPage';
import { NotFoundPage } from '../pages/NotFoundPage';
import { RouteErrorPage } from '../pages/RouteErrorPage';
import { AppShell } from './layout/AppShell';
import { LearningAreaLayout } from './layout/LearningAreaLayout';

export const router = createBrowserRouter([
  {
    element: <AppShell />,
    errorElement: <RouteErrorPage />,
    children: [
      { index: true, element: <LearningPathPage /> },
      { path: 'faq', element: <FaqPage /> },
      { path: 'labs', element: <GuidedLabsPage /> },
      {
        path: 'labs/:chapterSlug',
        element: <LearningAreaLayout />,
        children: [
          { index: true, element: <ChapterPage /> },
          { path: ':sectionSlug', element: <ChapterContentPage /> },
          { path: ':sectionSlug/:pageSlug', element: <ChapterContentPage /> },
          { path: '*', element: <NotFoundPage /> },
        ],
      },
      { path: challenge.path, element: <LiveOrderOperationsPage /> },
      ...challenge.legacyPaths.map(path => ({ path, element: <Navigate to={challenge.path} replace /> })),
      { path: 'challenges/*', element: <NotFoundPage title="Challenge not found" description="Open Challenge on the main page to start Live Order Operations." /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
], { basename: import.meta.env.BASE_URL });
