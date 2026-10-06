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

test('chapter overview lists collapse independently and start their content', async ({ page, isMobile }, testInfo) => {
  const chapter = coreChapters.find((item) => item.slug === 'time-in-materialize');
  if (!chapter) throw new Error('Time in Materialize must be in the curriculum.');
  await page.goto(chapterPath(chapter));
  await expect(page.getByRole('heading', { name: chapter.shortTitle, exact: true })).toBeVisible();
  const tutorialList = page.getByRole('list', { name: 'Tutorials list' });
  const exerciseList = page.getByRole('list', { name: 'Exercises list' });
  await expect(tutorialList.getByRole('listitem')).toHaveCount(2);
  await expect(exerciseList.getByRole('listitem')).toHaveCount(2);
  const resourcesToggle = page.locator('.chapter-learn-more > summary');
  const resourcesList = page.getByRole('list', { name: 'Documentation links' });
  await expect(resourcesList).not.toBeVisible();
  await resourcesToggle.focus();
  await page.keyboard.press('Enter');
  await expect(resourcesList).toBeVisible();
  await expect(resourcesList.getByRole('link')).toHaveCount(3);
  await expect(resourcesList.getByRole('link', { name: 'Temporal filters (time windows)' })).toHaveAttribute('href', 'https://materialize.com/docs/transform-data/patterns/temporal-filters/');
  await expect(resourcesList.getByRole('link', { name: 'now() and mz_now() functions' })).toHaveAttribute('href', 'https://materialize.com/docs/sql/functions/now_and_mz_now/');
  await page.keyboard.press('Enter');
  await expect(resourcesList).not.toBeVisible();
  await expect(tutorialList).toBeVisible();
  await expect(exerciseList).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('time-chapter-overview.png'), fullPage: true });
  const tutorialToggle = page.locator('.chapter-overview-section > summary').filter({ hasText: 'Tutorials' });
  await tutorialToggle.focus();
  await page.keyboard.press('Enter');
  await expect(tutorialList).not.toBeVisible();
  await expect(exerciseList).toBeVisible();
  await page.keyboard.press('Enter');
  await expect(tutorialList).toBeVisible();
  const exerciseToggle = page.locator('.chapter-overview-section > summary').filter({ hasText: 'Exercises' });
  await exerciseToggle.click();
  await expect(exerciseList).not.toBeVisible();
  await expect(tutorialList).toBeVisible();
  await exerciseToggle.click();
  await expect(exerciseList).toBeVisible();
  await page.getByRole('link', { name: 'Start tutorial: Order lifecycles', exact: true }).click();
  await expect(page).toHaveURL('/labs/time-in-materialize/tutorial/order-lifecycles');
  await expect(page.getByRole('heading', { name: 'Order lifecycles', exact: true })).toBeVisible();
  if (isMobile) await page.locator('.mobile-sidebar > summary').click();
  await page.getByRole('navigation', { name: 'Chapters' }).getByRole('link', { name: 'Time in Materialize overview', exact: true }).click();
  await expect(page).toHaveURL(chapterPath(chapter));
  await expect(tutorialList).toBeVisible();
  await expect(exerciseList).toBeVisible();
  await page.getByRole('link', { name: 'Start exercise: Query order timelines', exact: true }).click();
  await expect(page).toHaveURL('/labs/time-in-materialize/exercises/query-order-timelines');
  await expect(page.getByRole('heading', { name: 'Query order timelines', exact: true })).toBeVisible();
  const dimensions = await page.evaluate(() => ({ width: document.documentElement.scrollWidth, viewport: innerWidth }));
  expect(dimensions.width).toBeLessThanOrEqual(dimensions.viewport);
});

test('overview illustrations keep a consistent frame when sections collapse near the layout breakpoint', async ({ page, isMobile }) => {
  test.skip(isMobile, 'Desktop verifies the breakpoint where a scrollbar can change the layout.');
  await page.setViewportSize({ width: 1350, height: 900 });
  const imageFrames = new Map<string, { width: number; height: number }>();
  for (const slug of ['changing-relations', 'time-in-materialize']) {
    await page.goto(`/labs/${slug}`);
    const illustration = page.locator('.chapter-overview-illustration');
    if (slug === 'changing-relations') {
      await expect(illustration).toHaveAttribute('src', '/changing-relations-overview.png');
      await expect.poll(() => illustration.evaluate((el) => (el as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
    } else {
      await expect(page.locator('svg.chapter-overview-illustration')).toHaveCount(1);
    }
    for (const width of [1350, 1351, 1366, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      for (const expanded of [true, false]) {
        for (const section of await page.locator('.chapter-overview-section').all()) {
          if (await section.evaluate((el) => el.hasAttribute('open')) !== expanded)
            await section.locator('summary').click();
        }
        const geometry = await page.locator('.chapter-overview-hero').evaluate((hero) => {
          const text = hero.querySelector('div')!.getBoundingClientRect();
          const illustration = hero.querySelector('.chapter-overview-illustration')!.getBoundingClientRect();
          return { textRight: text.right, illustrationLeft: illustration.left,
            illustrationRight: illustration.right, heroRight: hero.getBoundingClientRect().right,
            width: illustration.width, height: illustration.height,
            pageHeight: document.documentElement.scrollHeight, viewportHeight: innerHeight };
        });
        expect(geometry.illustrationLeft, `Text separation in ${slug} at ${width}px, expanded=${expanded}`).toBeGreaterThanOrEqual(geometry.textRight + 16);
        expect(geometry.illustrationRight).toBeLessThanOrEqual(geometry.heroRight);
        const frameKey = `${width}/${expanded}`;
        if (slug === 'changing-relations') {
          imageFrames.set(frameKey, geometry);
        } else {
          const imageFrame = imageFrames.get(frameKey)!;
          expect(geometry.width).toBeCloseTo(imageFrame.width);
          expect(geometry.height).toBeCloseTo(imageFrame.height);
        }
        if (!expanded) expect(geometry.pageHeight).toBeLessThanOrEqual(geometry.viewportHeight);
      }
    }
  }
});

test('learning path, chapter navigation, and browser history', async ({ page }, testInfo) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Learning path', exact: true })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('learning-path.png'), fullPage: true });
  await page.getByRole('main').getByRole('link', { name: 'Guided labs', exact: true }).click();
  await expect(page).toHaveURL(chapterPath(firstChapter));
  await expect(page.getByRole('heading', { name: firstChapter.shortTitle, exact: true })).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Page navigation' })).toHaveCount(0);
  await page.screenshot({ path: testInfo.outputPath('chapter-overview.png'), fullPage: true });
  await page.goBack();
  await expect(page).toHaveURL('/');
  await page.goForward();
  await expect(page).toHaveURL(chapterPath(firstChapter));
  await page.reload();
  await expect(page.getByRole('heading', { name: firstChapter.shortTitle, exact: true })).toBeVisible();
  await page.goto('/');
  await expect(page.getByRole('banner').getByText('Learning Lab', { exact: true })).toBeVisible();
  await expect(page.getByRole('banner').getByRole('link', { name: 'Community' })).toHaveCount(0);
  await expect(page.getByRole('banner').getByRole('link', { name: 'Docs', exact: true })).toHaveAttribute('target', '_blank');
  await page.goto('/labs');
  await expect(page).toHaveURL(chapterPath(firstChapter));
  await expect(page.getByRole('heading', { name: firstChapter.shortTitle, exact: true })).toBeVisible();
});

test('lectures and exercises form one next/previous sequence', async ({ page }) => {
  await page.goto(chapterPath(firstChapter));
  await expect(page.getByRole('region', { name: 'Chapter overview' })).toBeVisible();
  await expect(page.getByRole('link', { name: /preview/i })).toHaveCount(0);
  await expect(page.getByRole('navigation', { name: 'Page navigation' })).toHaveCount(0);
  await page.getByRole('link', { name: 'Start tutorial: Lecture 1', exact: true }).click();
  const pages = getChapterPages(firstChapter);
  for (const [index, content] of pages.entries()) {
    if (index > 0)
    await page
      .getByRole('navigation', { name: 'Page navigation' })
      .getByRole('link', { name: new RegExp(`Next\\s+${content.title}`) })
      .click();
    await expect(page).toHaveURL(chapterContentPath(firstChapter, content));
    await expect(page.getByRole('heading', { name: content.title, exact: true })).toBeVisible();
    await expect(page.getByRole('navigation', { name: 'Breadcrumb' })).toBeVisible();
    await expect(
      page.getByRole('region', {
        name: content.sectionSlug === 'tutorial' ? 'Lecture content' : 'Exercise content',
        exact: true,
      }),
    ).toBeVisible();
    if (content.sectionSlug === 'tutorial') {
      await expect(page.getByRole('button', { name: 'Run', exact: true })).toBeEnabled();
      await expect(page.getByRole('button', { name: 'SQL & Objectives', exact: true })).toBeEnabled();
    } else {
      await expect(page.getByRole('button', { name: 'Check Answer', exact: true })).toBeEnabled();
      await expect(page.getByRole('button', { name: 'Show Answer', exact: true })).toBeEnabled();
      await expect(page.getByRole('button', { name: 'SQL & Objectives', exact: true })).toHaveCount(0);
    }
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
  await page.goto(chapterSectionPath(firstChapter, 'tutorial'));
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
  await page.goto(chapterSectionPath(firstChapter, 'tutorial'));
  const sidebar = page.getByRole('complementary', { name: 'Guided labs navigation' });
  const mobileToggle = page.locator('.mobile-sidebar > summary');
  if (isMobile) {
    await mobileToggle.focus();
    await page.keyboard.press('Enter');
  }
  const tutorialToggle = sidebar
    .getByRole('navigation', { name: 'Chapters' })
    .locator('.chapter-branch-selected .chapter-section > summary')
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
  await sidebar.getByRole('navigation', { name: 'Chapters' }).locator('.chapter-branch-selected .chapter-section > summary').filter({ hasText: 'Exercises' }).click();
  await sidebar.getByRole('link', { name: 'Exercise 1', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Exercise 1', exact: true })).toBeVisible();
});

test('chapter navigation remains accessible when the sidebar is collapsed', async ({
  page,
  isMobile,
}, testInfo) => {
  await page.goto(chapterPath(firstChapter));
  const sidebar = page.getByRole('complementary', { name: 'Guided labs navigation' });
  await expect(sidebar.getByText('Current lab', { exact: true })).toHaveCount(0);
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
    await expect(sidebar.getByRole('navigation', { name: 'Chapters' })).toBeVisible();
    await expect(sidebar.locator('.desktop-sidebar .chapter-link-label')).toHaveCount(0);
    const compactFirstChapter = sidebar.getByRole('link', { name: `01 ${firstChapter.shortTitle}`, exact: true });
    await expect(compactFirstChapter).toHaveAttribute('aria-current', 'page');
    const compactSecondChapter = coreChapters[1];
    if (!compactSecondChapter) throw new Error('The curriculum must contain a second chapter.');
    await sidebar.getByRole('link', { name: `02 ${compactSecondChapter.shortTitle}`, exact: true }).click();
    await expect(page).toHaveURL(chapterPath(compactSecondChapter));
    await expect(expand).toHaveAttribute('aria-expanded', 'false');
    await expect(sidebar.getByRole('link', { name: `02 ${compactSecondChapter.shortTitle}`, exact: true })).toHaveAttribute('aria-current', 'page');
    await compactFirstChapter.click();
    await expect(page).toHaveURL(chapterPath(firstChapter));
    const collapsedBounds = await content.boundingBox();
    expect(collapsedBounds).not.toBeNull();
    if (expandedBounds && collapsedBounds)
      expect(collapsedBounds.width).toBeGreaterThan(expandedBounds.width);
    await page.getByRole('link', { name: 'Start tutorial: Lecture 1', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Lecture 1', exact: true })).toBeVisible();
    await expect(page.getByRole('navigation', { name: 'Breadcrumb' })).toBeVisible();
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
  await sidebar.getByRole('link', { name: `02 ${secondChapter.shortTitle}`, exact: true }).click();
  await expect(page).toHaveURL(chapterPath(secondChapter));
  await expect(page.getByRole('heading', { name: secondChapter.shortTitle, exact: true })).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Page navigation' })).toHaveCount(0);
  if (isMobile) await expect(page.locator('.mobile-sidebar')).not.toHaveAttribute('open', '');
  else
    await expect(
      sidebar.getByRole('link', { name: `02 ${secondChapter.shortTitle}`, exact: true }),
    ).toHaveClass(/chapter-selected/);
});

test('chapter sidebar preserves open groups and toggles from the chapter body', async ({ page, isMobile }) => {
  await page.goto(chapterPath(firstChapter));
  const sidebar = page.getByRole('complementary', { name: 'Guided labs navigation' });
  const revealSidebar = async () => {
    if (isMobile && !await page.locator('.mobile-sidebar').evaluate((el) => el.hasAttribute('open')))
      await page.locator('.mobile-sidebar > summary').click();
  };
  await revealSidebar();
  const overview = sidebar.getByRole('link', { name: `${firstChapter.shortTitle} overview`, exact: true });
  const chaptersNavigation = sidebar.getByRole('navigation', { name: 'Chapters' });
  const firstBranch = chaptersNavigation.locator('.chapter-links > li').filter({ has: page.getByRole('link', { name: '01 Changing Relations', exact: true }) });
  const tutorials = firstBranch.locator('.chapter-section').filter({ has: page.locator('summary').filter({ hasText: 'Tutorials' }) });
  const exercises = firstBranch.locator('.chapter-section').filter({ has: page.locator('summary').filter({ hasText: 'Exercises' }) });
  await expect(overview).toBeVisible();
  await expect(overview).toHaveAttribute('aria-current', 'page');
  await expect(tutorials).not.toHaveAttribute('open', '');
  await expect(exercises).not.toHaveAttribute('open', '');
  await tutorials.locator('summary').click();
  await expect(sidebar.getByRole('link', { name: 'Lecture 1', exact: true })).toBeVisible();
  await expect(exercises).not.toHaveAttribute('open', '');
  await sidebar.getByRole('link', { name: 'Lecture 2', exact: true }).click();
  await revealSidebar();
  await expect(tutorials).toHaveAttribute('open', '');
  await expect(exercises).not.toHaveAttribute('open', '');
  await expect(sidebar.getByRole('link', { name: 'Lecture 2', exact: true })).toHaveAttribute('aria-current', 'page');
  const chapterBody = sidebar.getByRole('link', { name: `01 ${firstChapter.shortTitle}`, exact: true });
  await chapterBody.click();
  await expect(overview).not.toBeVisible();
  await expect(page).toHaveURL('/labs/changing-relations/tutorial/lecture-2');
  await chapterBody.focus();
  await page.keyboard.press('Enter');
  await expect(overview).toBeVisible();
  await expect(tutorials).toHaveAttribute('open', '');
  await overview.click();
  await expect(page).toHaveURL(chapterPath(firstChapter));
  await revealSidebar();
  await expect(tutorials).toHaveAttribute('open', '');
  await expect(exercises).not.toHaveAttribute('open', '');
  await sidebar.getByRole('button', { name: `Collapse ${firstChapter.shortTitle} chapter` }).click();
  await expect(overview).not.toBeVisible();
  await sidebar.getByRole('button', { name: `Expand ${firstChapter.shortTitle} chapter` }).click();
  await expect(overview).toBeVisible();
  await page.getByRole('link', { name: 'Start exercise: Exercise 1', exact: true }).click();
  await revealSidebar();
  await expect(tutorials).toHaveAttribute('open', '');
  await expect(exercises).toHaveAttribute('open', '');
  await expect(sidebar.getByRole('link', { name: 'Exercise 1', exact: true })).toHaveAttribute('aria-current', 'page');
  await sidebar.getByRole('link', { name: 'Lecture 1', exact: true }).click();
  await revealSidebar();
  await expect(tutorials).toHaveAttribute('open', '');
  await expect(exercises).toHaveAttribute('open', '');
  await overview.click();
  await revealSidebar();
  await expect(tutorials).toHaveAttribute('open', '');
  await expect(exercises).toHaveAttribute('open', '');
  const other = coreChapters[1];
  if (!other) throw new Error('Chapter 2 must be in the curriculum.');
  await sidebar.getByRole('link', { name: `02 ${other.shortTitle}`, exact: true }).click();
  await revealSidebar();
  await expect(overview).toBeVisible();
  await expect(tutorials).toHaveAttribute('open', '');
  await expect(exercises).toHaveAttribute('open', '');
  await sidebar.getByRole('link', { name: `01 ${firstChapter.shortTitle}`, exact: true }).click();
  await revealSidebar();
  await expect(tutorials).toHaveAttribute('open', '');
  await expect(exercises).toHaveAttribute('open', '');
  await page.getByRole('link', { name: 'Start tutorial: Lecture 1', exact: true }).click();
  await revealSidebar();
  await expect(tutorials).toHaveAttribute('open', '');
  await expect(exercises).toHaveAttribute('open', '');
  await sidebar.getByRole('link', { name: 'Exercise 1', exact: true }).click();
  await page.reload();
  await revealSidebar();
  await expect(tutorials).not.toHaveAttribute('open', '');
  await expect(exercises).toHaveAttribute('open', '');
});

test('chapter row and badge sizes stay consistent after selection', async ({ page, isMobile }) => {
  const chapter = coreChapters[1];
  if (!chapter) throw new Error('Chapter 2 must be in the curriculum.');
  await page.goto(chapterPath(firstChapter));
  if (isMobile) await page.locator('.mobile-sidebar > summary').click();
  const chapterLink = page.getByRole('navigation', { name: 'Chapters' }).getByRole('link', { name: `02 ${chapter.shortTitle}`, exact: true });
  const measure = () => chapterLink.evaluate((el) => {
    const box = el.getBoundingClientRect();
    const badge = el.querySelector('.chapter-link-number')!;
    const badgeBox = badge.getBoundingClientRect();
    return { width: box.width, height: box.height, font: getComputedStyle(el).fontSize,
      badgeWidth: badgeBox.width, badgeHeight: badgeBox.height, badgeFont: getComputedStyle(badge).fontSize };
  });
  const before = await measure();
  await chapterLink.click();
  await expect(page).toHaveURL(chapterPath(chapter));
  if (isMobile) await page.locator('.mobile-sidebar > summary').click();
  expect(await measure()).toEqual(before);
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

test('every chapter opens its overview and tutorial reference controls remain accessible', async ({ page }) => {
  for (const chapter of coreChapters) {
    await page.goto(chapterPath(chapter));
    await expect(page.getByRole('heading', { name: chapter.shortTitle, exact: true })).toBeVisible();
    await expect(page.getByRole('region', { name: 'Chapter overview' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Learn more', exact: true })).toBeVisible();
    await page.locator('.chapter-learn-more > summary').click();
    await expect(page.getByRole('list', { name: 'Documentation links' }).getByRole('link', { name: 'Materialize documentation', exact: true })).toBeVisible();
    for (const link of await page.getByRole('list', { name: 'Documentation links' }).getByRole('link').all()) {
      await expect(link).toHaveAttribute('target', '_blank');
      await expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    }
    await expect(page.getByRole('heading', { name: 'Tutorials', exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Exercises', exact: true })).toBeVisible();
  }

  await page.goto(chapterPath(firstChapter));
  await page.getByRole('link', { name: 'Start tutorial: Lecture 1', exact: true }).click();
  const referenceButton = page.getByRole('button', { name: 'SQL & Objectives', exact: true });
  const tipButton = page.getByRole('button', { name: 'Open SQL & Objectives', exact: true });
  const dialog = page.getByRole('dialog', { name: 'SQL & Objectives' });
  for (const trigger of [referenceButton, tipButton]) {
    await trigger.click();
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole('link', { name: 'Tutorial', exact: true })).toHaveAttribute('href', chapterSectionPath(firstChapter, 'tutorial'));
    await expect(dialog.getByRole('button', { name: 'Close SQL & Objectives' })).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(dialog).not.toBeVisible();
    await expect(trigger).toBeFocused();
  }
  await page.getByRole('button', { name: 'Switch to dark mode' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.reload();
  await expect(page.getByRole('button', { name: 'Switch to dark mode' })).toHaveAttribute('aria-pressed', 'true');
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
  await expect(page.getByRole('region', { name: 'Chapter overview' })).toBeVisible();
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
        // Populated lectures and exercises stack readable tables on phone-sized screens.
        // Their desktop canvases still fit the viewport.
        if (viewport.width >= 640) expect(
          dimensions.height,
          `${route.path} at ${viewport.width} × ${viewport.height}`,
        ).toBeLessThanOrEqual(dimensions.viewportHeight);
        await expect(page.getByRole('contentinfo')).toHaveCount(0);
        const navigation = await page
          .getByRole('navigation', { name: 'Page navigation' })
          .boundingBox();
        expect(navigation).not.toBeNull();
        if (navigation)
          expect(navigation.y + navigation.height).toBeLessThanOrEqual(dimensions.viewportHeight);
        const reset = await page.getByRole('button', { name: 'Reset', exact: true }).boundingBox();
        const breadcrumb = await page.getByRole('navigation', { name: 'Breadcrumb' }).boundingBox();
        expect(reset).not.toBeNull();
        expect(breadcrumb).not.toBeNull();
        if (navigation && reset) expect(navigation.y + navigation.height).toBeLessThanOrEqual(reset.y);
        if (navigation && breadcrumb && viewport.width >= 640)
          expect(Math.abs(navigation.y + navigation.height / 2 - breadcrumb.y - breadcrumb.height / 2)).toBeLessThan(1);
      } else {
        await expect(page.getByRole('contentinfo')).toHaveCount(0);
        if (!isMobile) {
          expect(
            dimensions.height,
            `Learning path at ${viewport.width} × ${viewport.height}`,
          ).toBeLessThanOrEqual(dimensions.viewportHeight);
        }
        await expect(page.getByRole('region', { name: 'Help & resources' }).getByRole('link', { name: /Community/ })).toHaveCount(0);
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
