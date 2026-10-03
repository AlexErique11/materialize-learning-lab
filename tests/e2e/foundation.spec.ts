import { chapterPath, coreChapters } from '../../src/chapters/chapterRegistry';
import {
  chapterContentPath,
  chapterSectionPath,
  getChapterPages,
} from '../../src/chapters/chapterOutline';
import { challenges, challengePath } from '../../src/challenges/challengeRegistry';
import { THEME_STORAGE_KEY } from '../../src/hooks/theme';
import { expect, test } from './fixtures';

const firstChapter = coreChapters[0];
const firstChallenge = challenges[0];
if (!firstChapter || !firstChallenge)
  throw new Error('The learning path must have chapters and capstones.');

test('learning path, chapter navigation, and browser history', async ({ page }, testInfo) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Learning path', exact: true })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('learning-path.png'), fullPage: true });
  await page.getByRole('main').getByRole('link', { name: 'Guided labs', exact: true }).click();
  await expect(page).toHaveURL(chapterPath(firstChapter));
  await expect(page.getByRole('heading', { name: firstChapter.title, exact: true })).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Page navigation' })).toHaveCount(0);
  await page.screenshot({ path: testInfo.outputPath('chapter-overview.png'), fullPage: true });
  await page.goBack();
  await expect(page).toHaveURL('/');
  await page.goForward();
  await expect(page).toHaveURL(chapterPath(firstChapter));
  await page.reload();
  await expect(page.getByRole('heading', { name: firstChapter.title, exact: true })).toBeVisible();
  await page.goto('/');
  await page.getByRole('navigation', { name: 'Main navigation' }).getByRole('link', { name: 'Guided labs', exact: true }).click();
  await expect(page).toHaveURL(chapterPath(firstChapter));
  await page.goto('/labs');
  await expect(page).toHaveURL(chapterPath(firstChapter));
  await expect(page.getByRole('heading', { name: firstChapter.title, exact: true })).toBeVisible();
});

test('empty lectures and exercises form one next/previous sequence', async ({ page }) => {
  await page.goto(chapterPath(firstChapter));
  await expect(page.getByRole('heading', { name: "What you'll learn" })).toBeVisible();
  await expect(page.getByRole('link', { name: /preview/i })).toHaveCount(0);
  await expect(page.getByRole('navigation', { name: 'Page navigation' })).toHaveCount(0);
  await page.getByRole('main').getByRole('link', { name: 'Tutorial', exact: true }).click();
  const pages = getChapterPages(firstChapter);
  for (const content of pages) {
    await page
      .getByRole('navigation', { name: 'Page navigation' })
      .getByRole('link', { name: new RegExp(`Next\\s+${content.title}`) })
      .click();
    await expect(page).toHaveURL(chapterContentPath(firstChapter, content));
    await expect(page.getByRole('heading', { name: content.title, exact: true })).toBeVisible();
    await expect(page.getByRole('navigation', { name: 'Breadcrumb' })).toHaveCount(0);
    await expect(
      page.getByRole('region', {
        name: content.sectionSlug === 'tutorial' ? 'Lecture content' : 'Exercise content',
        exact: true,
      }),
    ).toBeVisible();
    await expect(page.getByRole('button', { name: /Run|Reset|SQL/ })).toHaveCount(0);
  }
  await expect(
    page
      .getByRole('navigation', { name: 'Page navigation' })
      .getByRole('link', { name: /Back to chapter/ }),
  ).toHaveAttribute('href', chapterPath(firstChapter));
  for (const content of pages.slice(0, -1).reverse()) {
    await page
      .getByRole('navigation', { name: 'Page navigation' })
      .getByRole('link', { name: new RegExp(`Previous\\s+${content.title}`) })
      .click();
    await expect(page).toHaveURL(chapterContentPath(firstChapter, content));
  }
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Lecture 1', exact: true })).toBeVisible();
  await page
    .getByRole('navigation', { name: 'Page navigation' })
    .getByRole('link', { name: /Chapter overview/ })
    .click();
  await expect(page).toHaveURL(chapterPath(firstChapter));
});

test('section overviews have their own URLs and only registered pages', async ({ page }) => {
  await page.goto(chapterPath(firstChapter));
  await page.getByRole('main').getByRole('link', { name: 'Tutorial', exact: true }).click();
  await expect(page).toHaveURL(chapterSectionPath(firstChapter, 'tutorial'));
  await expect(page.getByRole('list', { name: 'Tutorial pages' }).getByRole('link')).toHaveCount(2);
  await page
    .getByRole('list', { name: 'Tutorial pages' })
    .getByRole('link', { name: 'Lecture 2' })
    .click();
  await expect(page.getByRole('heading', { name: 'Lecture 2', exact: true })).toBeVisible();
  await page.goBack();
  await expect(page).toHaveURL(chapterSectionPath(firstChapter, 'tutorial'));

  const other = coreChapters[1];
  if (!other) throw new Error('The curriculum must contain chapter 2.');
  await page.goto(chapterSectionPath(other, 'exercises'));
  await expect(page.getByRole('heading', { name: 'Exercises', exact: true })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Exercises content' })).toBeVisible();
  await expect(page.getByRole('list', { name: 'Exercises pages' })).toHaveCount(0);
});

test('sidebar subsections are keyboard-operable and reflect the active page', async ({
  page,
  isMobile,
}) => {
  await page.goto(chapterPath(firstChapter));
  const sidebar = page.getByRole('complementary', { name: 'Guided labs navigation' });
  const mobileToggle = page.locator('.mobile-sidebar > summary');
  if (isMobile) {
    await mobileToggle.focus();
    await page.keyboard.press('Enter');
  }
  const tutorialToggle = sidebar
    .getByRole('navigation', { name: 'Chapters' })
    .locator('.chapter-section > summary')
    .filter({ hasText: 'Tutorial' });
  await tutorialToggle.focus();
  await page.keyboard.press('Enter');
  await expect(sidebar.getByRole('link', { name: 'Lecture 2', exact: true })).not.toBeVisible();
  await page.keyboard.press('Enter');
  await sidebar.getByRole('link', { name: 'Lecture 2', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Lecture 2', exact: true })).toBeVisible();
  if (isMobile) {
    await expect(page.locator('.mobile-sidebar')).not.toHaveAttribute('open', '');
    await mobileToggle.click();
  }
  await expect(sidebar.getByRole('link', { name: 'Lecture 2', exact: true })).toHaveAttribute(
    'aria-current',
    'page',
  );
  await expect(sidebar.getByRole('link', { name: /01 Changing Relations/ })).not.toHaveAttribute(
    'aria-current',
    'page',
  );
  await sidebar.getByRole('link', { name: 'Exercise 1', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Exercise 1', exact: true })).toBeVisible();
});

test('chapter navigation remains accessible when the sidebar is collapsed', async ({
  page,
  isMobile,
}, testInfo) => {
  await page.goto(chapterPath(firstChapter));
  const sidebar = page.getByRole('complementary', { name: 'Guided labs navigation' });
  if (isMobile) {
    const navigationToggle = page.locator('summary').filter({ hasText: 'Chapter navigation' });
    await navigationToggle.focus();
    await page.keyboard.press('Enter');
  } else {
    const content = page.locator('.learning-area-content');
    const expandedBounds = await content.boundingBox();
    expect(expandedBounds).not.toBeNull();
    const collapse = sidebar.getByRole('button', { name: 'Collapse chapter navigation' });
    await expect(collapse).toHaveAttribute('aria-expanded', 'true');
    await collapse.focus();
    await page.keyboard.press('Enter');
    const expand = sidebar.getByRole('button', { name: 'Expand chapter navigation' });
    await expect(expand).toHaveAttribute('aria-expanded', 'false');
    await expect(sidebar.getByRole('navigation', { name: 'Chapters' })).not.toBeVisible();
    await expect(page).toHaveURL(chapterPath(firstChapter));
    const collapsedBounds = await content.boundingBox();
    expect(collapsedBounds).not.toBeNull();
    if (expandedBounds && collapsedBounds)
      expect(collapsedBounds.width).toBeGreaterThan(expandedBounds.width);
    await page.getByRole('main').getByRole('link', { name: 'Tutorial', exact: true }).click();
    await expect(expand).toHaveAttribute('aria-expanded', 'false');
    await page
      .getByRole('navigation', { name: 'Page navigation' })
      .getByRole('link', { name: /Next\s+Lecture 1/ })
      .click();
    await expect(page.getByRole('heading', { name: 'Lecture 1', exact: true })).toBeVisible();
    await expect(page.getByRole('navigation', { name: 'Breadcrumb' })).toHaveCount(0);
    await expect(expand).toHaveAttribute('aria-expanded', 'false');
    await page.screenshot({
      path: testInfo.outputPath('lecture-sidebar-collapsed.png'),
      fullPage: true,
    });
    await expand.focus();
    await page.keyboard.press('Space');
    await expect(sidebar.getByRole('navigation', { name: 'Chapters' })).toBeVisible();
    await expect(collapse).toHaveAttribute('aria-expanded', 'true');
  }
  const secondChapter = coreChapters[1];
  if (!secondChapter) throw new Error('The learning sequence must have a second chapter.');
  await sidebar.getByRole('link', { name: new RegExp(secondChapter.shortTitle) }).click();
  await expect(page).toHaveURL(chapterPath(secondChapter));
  await expect(page.getByRole('heading', { name: secondChapter.title, exact: true })).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Page navigation' })).toHaveCount(0);
  if (isMobile) await expect(page.locator('.mobile-sidebar')).not.toHaveAttribute('open', '');
  else
    await expect(
      sidebar.getByRole('link', { name: new RegExp(secondChapter.shortTitle) }),
    ).toHaveAttribute('aria-current', 'page');
});

test('explicit theme preference survives reload', async ({ page }, testInfo) => {
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await page.getByRole('button', { name: 'Switch to dark mode' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  expect(await page.evaluate((key) => localStorage.getItem(key), THEME_STORAGE_KEY)).toBe('dark');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.screenshot({ path: testInfo.outputPath('learning-path-dark.png'), fullPage: true });
  await page.getByRole('button', { name: 'Switch to light mode' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
});

test('challenges have real overview and detail URLs', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('main').getByRole('link', { name: 'Challenges', exact: true }).click();
  await expect(page).toHaveURL('/challenges');
  await page.getByRole('link', { name: new RegExp(firstChallenge.title) }).click();
  await expect(page).toHaveURL(challengePath(firstChallenge));
  await expect(
    page.getByRole('heading', { name: firstChallenge.title, exact: true }),
  ).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Challenge workspace' })).toBeVisible();
});

test('unknown locations show useful not-found pages', async ({ page }) => {
  for (const [path, heading] of [
    ['/missing-page', 'Page not found'],
    ['/labs/not-a-chapter', 'Chapter not found'],
    ['/labs/not-a-chapter/workspace', 'Chapter not found'],
    [`${chapterPath(firstChapter)}/workspace`, 'Page not found'],
    [`${chapterPath(firstChapter)}/tutorial/lecture-3`, 'Page not found'],
    [`${chapterPath(firstChapter)}/exercises/lecture-1`, 'Page not found'],
    ['/challenges/not-a-challenge', 'Challenge not found'],
  ]) {
    if (!path || !heading) throw new Error('Each not-found case must have a path and heading.');
    await page.goto(path);
    await expect(page.getByRole('heading', { name: heading, exact: true })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Browse guided labs' })).toBeVisible();
  }
});

test('chapter pages adapt at desktop, laptop, tablet, and mobile widths', async ({
  page,
  isMobile,
}, testInfo) => {
  test.skip(
    isMobile,
    'The desktop browser verifies all four breakpoints; mobile journeys run separately.',
  );
  const firstPage = getChapterPages(firstChapter)[0];
  if (!firstPage) throw new Error('Chapter 1 must have a scaffolded page.');
  await page.goto(chapterContentPath(firstChapter, firstPage));
  for (const width of [1440, 1024, 768, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    await expect(page.getByRole('heading', { name: 'Lecture 1', exact: true })).toBeVisible();
    const dimensions = await page.evaluate(() => ({
      pageWidth: document.documentElement.scrollWidth,
      viewportWidth: window.innerWidth,
    }));
    expect(dimensions.pageWidth).toBeLessThanOrEqual(dimensions.viewportWidth);
    await expect(page.locator('.mobile-sidebar > summary')).toBeVisible({ visible: width < 1024 });
    await page.screenshot({ path: testInfo.outputPath(`lecture-${width}.png`), fullPage: true });
  }
  await page.goto(chapterPath(firstChapter));
  await expect(page.getByRole('heading', { name: "What you'll learn" })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('chapter-mobile.png'), fullPage: true });
  await page.getByRole('button', { name: 'Switch to dark mode' }).click();
  await page.screenshot({
    path: testInfo.outputPath('chapter-mobile-dark.png'),
    fullPage: true,
    animations: 'disabled',
  });
  const exercise = getChapterPages(firstChapter).find(
    (content) => content.sectionSlug === 'exercises',
  );
  if (!exercise) throw new Error('Chapter 1 must have an exercise slot.');
  await page.goto(chapterContentPath(firstChapter, exercise));
  await expect(page.getByRole('heading', { name: exercise.title, exact: true })).toBeVisible();
  await page.screenshot({
    path: testInfo.outputPath('exercise-mobile-dark.png'),
    fullPage: true,
    animations: 'disabled',
  });
});

test('learning path and content pages fit desktop viewports without hiding navigation', async ({
  page,
  isMobile,
}, testInfo) => {
  const pages = getChapterPages(firstChapter);
  const lecture = pages.find((content) => content.sectionSlug === 'tutorial');
  const exercise = pages.find((content) => content.sectionSlug === 'exercises');
  if (!lecture || !exercise) throw new Error('Chapter 1 must have lecture and exercise slots.');
  const viewports = isMobile
    ? [
        { width: 390, height: 844 },
        { width: 390, height: 667 },
      ]
    : [
        { width: 1440, height: 900 },
        { width: 1366, height: 768 },
        { width: 1280, height: 720 },
        { width: 1280, height: 650 },
        { width: 1024, height: 768 },
        { width: 768, height: 1024 },
      ];
  const routes = [
    ...(!isMobile ? [{ path: '/', title: 'Learning path' }] : []),
    { path: chapterContentPath(firstChapter, lecture), title: lecture.title },
    { path: chapterContentPath(firstChapter, exercise), title: exercise.title },
  ];
  for (const viewport of viewports) {
    await page.setViewportSize(viewport);
    const viewportRoutes =
      isMobile && viewport.height >= 844
        ? [{ path: '/', title: 'Learning path' }, ...routes]
        : routes;
    for (const route of viewportRoutes) {
      await page.goto(route.path);
      await expect(page.getByRole('heading', { name: route.title, exact: true })).toBeVisible();
      const dimensions = await page.evaluate(() => ({
        width: document.documentElement.scrollWidth,
        height: document.documentElement.scrollHeight,
        viewportWidth: window.innerWidth,
        viewportHeight: window.innerHeight,
        footerBottom: document.querySelector('footer')?.getBoundingClientRect().bottom,
      }));
      expect(dimensions.width, `${route.path} at ${viewport.width}px`).toBeLessThanOrEqual(
        dimensions.viewportWidth,
      );
      if (route.path !== '/') {
        expect(
          dimensions.height,
          `${route.path} at ${viewport.width} × ${viewport.height}`,
        ).toBeLessThanOrEqual(dimensions.viewportHeight);
        expect(dimensions.footerBottom).toBeLessThanOrEqual(dimensions.viewportHeight);
        const navigation = await page
          .getByRole('navigation', { name: 'Page navigation' })
          .boundingBox();
        expect(navigation).not.toBeNull();
        if (navigation)
          expect(navigation.y + navigation.height).toBeLessThanOrEqual(dimensions.viewportHeight);
      } else {
        await expect(page.getByRole('contentinfo')).toHaveCount(0);
        if (!isMobile) {
          expect(
            dimensions.height,
            `Learning path at ${viewport.width} × ${viewport.height}`,
          ).toBeLessThanOrEqual(dimensions.viewportHeight);
        }
        await expect(page.getByRole('link', { name: /Community/ })).toHaveCount(0);
        const documentation = page
          .getByRole('region', { name: 'Help & resources' })
          .getByRole('link', { name: /Documentation/ });
        await documentation.scrollIntoViewIfNeeded();
        await expect(documentation).toBeVisible();
      }
      if (viewport.width === 1366 || (isMobile && viewport.height === 844)) {
        await page.screenshot({
          path: testInfo.outputPath(`${route.title}-${viewport.width}.png`),
          animations: 'disabled',
        });
      }
    }
  }
  if (isMobile) {
    // Stacked cards may scroll on a small screen; all content must remain reachable.
    await page.goto('/');
    const documentation = page
      .getByRole('region', { name: 'Help & resources' })
      .getByRole('link', { name: /Documentation/ });
    await documentation.scrollIntoViewIfNeeded();
    await expect(documentation).toBeVisible();
  }
});
