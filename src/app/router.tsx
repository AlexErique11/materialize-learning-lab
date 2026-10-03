import { createBrowserRouter } from 'react-router';
import { ChallengePage } from '../challenges/ChallengePage';
import { ChapterPage } from '../chapters/ChapterPage';
import { ChapterContentPage } from '../chapters/ChapterContentPage';
import { ChallengesPage } from '../pages/ChallengesPage';
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
      { path: 'challenges', element: <ChallengesPage /> },
      { path: 'challenges/:challengeSlug', element: <ChallengePage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]);
