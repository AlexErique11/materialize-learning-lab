import type { Page } from '@playwright/test';
import { expect, test } from './fixtures';
import { coreChapters } from '../../src/chapters/chapterRegistry';
import { chapterContentPath, getChapterPages } from '../../src/chapters/chapterOutline';

test.use({ reducedMotion: 'reduce' });
const chapters = coreChapters.filter(chapter => getChapterPages(chapter).length > 0);
const progress = (page: Page) => page.locator('#main-content .sidebar-progress progress').first();
const tutorialBadge = (page: Page) => page.locator('#main-content .relation-playback-controls .relation-tutorial-complete');
const exerciseBadge = (page: Page) => page.locator('#main-content > .learning-area .guided-lab-page > .exercise-completion');

async function expectFooterClear(page: Page) {
  const badge = (await exerciseBadge(page).boundingBox())!;
  const answers = await page.locator('.exercise-answers').boundingBox();
  if (answers?.width && answers.height) {
    const overlaps = answers.x < badge.x + badge.width && answers.x + answers.width > badge.x
      && answers.y < badge.y + badge.height && answers.y + answers.height > badge.y;
    expect(overlaps, 'Completion must not overlap the answer controls').toBe(false);
  }
}

async function finishTutorial(page: Page) {
  await page.getByRole('button', { name: 'Start guided run', exact: true }).click();
  for (let step = 0; step < 100 && await page.locator('.relation-guide[open]').count(); step++) await page.keyboard.press('ArrowRight');
  await expect(page.locator('.relation-guide[open]')).toHaveCount(0);
  await expect(tutorialBadge(page)).toHaveText('Tutorial completed');
}

async function finishExercise(page: Page) {
  await page.locator('#main-content').focus();
  for (let question = 0; question < 12; question++) {
    await page.keyboard.press('Control+Enter');
    await expect(page.locator('.exercise-question')).toHaveAttribute('data-result', 'correct');
    const forward = page.locator('[data-shortcut="exercise-forward"]');
    if (await forward.textContent() !== 'Next question') break;
    await expect(exerciseBadge(page)).toHaveCount(0);
    await page.keyboard.press('ArrowRight');
    await expect(page.locator('.exercise-question')).toHaveAttribute('data-result', 'ready');
  }
  await expect(exerciseBadge(page)).toHaveText('Exercise completed');
}

for (const chapter of chapters) {
  test(`${chapter.slug}: all tutorials retain completion after reset and reload`, async ({ page }) => {
    test.setTimeout(90_000);
    const lectures = getChapterPages(chapter).filter(item => item.sectionSlug === 'tutorial');
    for (const lecture of lectures) {
      const path = chapterContentPath(chapter, lecture);
      await page.goto(path);
      await expect(tutorialBadge(page)).toHaveCount(0);
      await page.locator('#main-content').focus();
      await page.keyboard.press('ArrowRight');
      await expect(progress(page)).toHaveAttribute('value', '0');
      await finishTutorial(page);
      await expect(progress(page)).toHaveAttribute('value', '0');
      await page.reload();
      await expect(tutorialBadge(page)).toBeVisible();
      await page.getByRole('button', { name: 'Reset', exact: true }).click();
      await expect(tutorialBadge(page)).toBeVisible();
      await expect(progress(page)).toHaveAttribute('value', '0');
      await expect(page.locator(`#main-content .chapter-pages a[href="${path}"]`).first()).toHaveAttribute('data-completed', 'true');
    }
  });

  test(`${chapter.slug}: every exercise has the same persistent completion footer`, async ({ page, isMobile }, testInfo) => {
    test.setTimeout(90_000);
    if (!isMobile) await page.setViewportSize({ width: 1366, height: 768 });
    const exercises = getChapterPages(chapter).filter(item => item.sectionSlug === 'exercises');
    for (const [index, exercise] of exercises.entries()) {
      await page.goto(chapterContentPath(chapter, exercise));
      const heading = await page.locator('.guided-lab-heading').boundingBox();
      await finishExercise(page);
      await expect(progress(page)).toHaveAttribute('value', '0');
      const badge = exerciseBadge(page);
      const bounds = (await badge.boundingBox())!;
      const pageBounds = (await page.locator('.guided-lab-page').boundingBox())!;
      const inset = await page.locator('.guided-lab-page').evaluate(el => parseFloat(getComputedStyle(el).getPropertyValue('--exercise-navigation-inset')));
      expect(bounds.x - pageBounds.x).toBe(isMobile ? 16 : 28);
      expect(Math.abs(pageBounds.y + pageBounds.height - bounds.y - bounds.height - inset)).toBeLessThan(1);
      const next = (await page.locator('[data-shortcut="exercise-forward"]').boundingBox())!;
      expect(bounds.x + bounds.width).toBeLessThanOrEqual(next.x);
      await expectFooterClear(page);
      if (index === 0) await page.screenshot({ path: testInfo.outputPath('exercise-completed.png') });
      await page.reload();
      await expect(badge).toBeVisible();
      await page.getByRole('button', { name: 'Reset', exact: true }).click();
      await expect(badge).toBeVisible();
      await expect(page.locator('.exercise-question')).toHaveAttribute('data-result', 'ready');
      await expectFooterClear(page);
      expect(await page.locator('.guided-lab-heading').boundingBox()).toEqual(heading);
      await expect(progress(page)).toHaveAttribute('value', '0');
    }
  });
}

test('both bars count whole chapters while activity dots and other tabs stay in sync', async ({ page, context }) => {
  test.setTimeout(60_000);
  const lecture = '/labs/changing-relations/tutorial/lecture-1';
  await page.goto(lecture);
  await finishTutorial(page);
  const successColor = await tutorialBadge(page).evaluate(el => getComputedStyle(el).color);
  const activeDot = page.locator(`#main-content .chapter-pages a[href="${lecture}"] .chapter-page-dot`).first();
  expect(await activeDot.evaluate(el => getComputedStyle(el).backgroundColor)).not.toBe(successColor);
  await page.goto('/labs/changing-relations/tutorial/lecture-2');
  await expect(page.locator(`#main-content .chapter-pages a[href="${lecture}"] .chapter-page-dot`).first()).toHaveCSS('background-color', successColor);
  await page.goto('/labs/changing-relations/exercises/exercise-1');
  await finishExercise(page);
  await page.goto('/');
  const pathProgress = page.getByRole('progressbar', { name: 'Core chapters completed', exact: true });
  await expect(pathProgress).toHaveAttribute('value', '0');
  await expect(pathProgress).toHaveAttribute('max', String(coreChapters.length));
  await expect(page.getByRole('progressbar', { name: 'Featured challenges completed' })).toHaveAttribute('value', '0');
  await page.reload();
  await expect(pathProgress).toHaveAttribute('value', '0');
  const other = await context.newPage();
  await other.goto('/labs/changing-relations');
  await expect(progress(other)).toHaveAttribute('value', '0');
  await page.goto('/labs/changing-relations/tutorial/lecture-2');
  await finishTutorial(page);
  await expect(progress(other)).toHaveAttribute('value', '1');
  await page.goto('/');
  await expect(pathProgress).toHaveAttribute('value', '1');
  await page.reload();
  await expect(pathProgress).toHaveAttribute('value', '1');
  await other.close();
});
