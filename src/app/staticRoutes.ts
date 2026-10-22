import { challengePath, challenges } from '../challenges/challengeRegistry';
import { chapterContentPath, getChapterPages } from '../chapters/chapterOutline';
import { chapterPath, chapters } from '../chapters/chapterRegistry';

export const SITE_TITLE = 'Materialize Learning Lab';
export const SITE_DESCRIPTION =
  'Build real-time data skills with Materialize Learning Lab. Explore the learning path, guided chapters, and capstones.';

const SITE_IMAGE = '/materialize-logo-high-resolution.png';

export interface StaticRoute {
  readonly path: string;
  /** Page title without the site suffix, matching what usePageTitle sets. */
  readonly title?: string;
  readonly description: string;
  /** Preview image, as a path from the site root. */
  readonly image: string;
}

// Linkable routes that get their own HTML file at build time, so shared links resolve
// with a 200 and per-page preview metadata instead of falling through to 404.html.
export const staticRoutes: readonly StaticRoute[] = [
  { path: '/', description: SITE_DESCRIPTION, image: SITE_IMAGE },
  { path: '/faq', title: 'FAQ', description: 'Common questions about labs and challenges.', image: SITE_IMAGE },
  { path: '/labs', title: 'Guided labs', description: SITE_DESCRIPTION, image: SITE_IMAGE },
  { path: '/challenges', title: 'Challenges', description: 'Capstone projects.', image: SITE_IMAGE },
  ...chapters.flatMap((chapter) => {
    // Outside Vite, publicAsset() resolves against '/', so this is a path from the site root.
    const image = chapter.overviewImage ?? SITE_IMAGE;
    return [
      { path: chapterPath(chapter), title: chapter.shortTitle, description: chapter.description, image },
      ...getChapterPages(chapter).map((page) => ({
        path: chapterContentPath(chapter, page),
        title: `${page.title} · ${chapter.shortTitle}`,
        description: page.description ?? chapter.description,
        image,
      })),
    ];
  }),
  ...challenges.map((challenge) => ({
    path: challengePath(challenge),
    title: challenge.title,
    description: challenge.description,
    image: SITE_IMAGE,
  })),
];

export function documentTitle(route: StaticRoute) {
  return route.title ? `${route.title} | ${SITE_TITLE}` : SITE_TITLE;
}
