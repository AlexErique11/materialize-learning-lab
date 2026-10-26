import type { Page } from '@playwright/test';
import { expect, test } from './fixtures';
import { coreChapters } from '../../src/chapters/chapterRegistry';
import { chapterContentPath, getChapterPages } from '../../src/chapters/chapterOutline';
import { LAB_PROGRESS_KEY } from '../../src/progress/labProgress';

test.use({ reducedMotion: 'reduce' });
const chapters = coreChapters.filter(chapter => getChapterPages(chapter).length > 0);
const progress = (page: Page) => page.locator('#main-content .sidebar-progress progress').first();
const tutorialBadge = (page: Page) => page.locator('#main-content .relation-playback-controls .relation-tutorial-complete');
const exerciseBadge = (page: Page) => page.locator('#main-content > .learning-area .guided-lab-page > .exercise-completion');
const titleCheck = (page: Page) => page.locator('#main-content .guided-lab-title > h1 .activity-title-check').first();

test('replaying a completed activity celebrates again without removing the saved title check', async ({ page }) => {
  await page.clock.install();
  for (const kind of ['tutorial', 'exercise'] as const) {
    await page.goto(`/labs/changing-relations/${kind === 'tutorial' ? 'tutorial/lecture-1' : 'exercises/exercise-1'}`);
    const finish = kind === 'tutorial' ? finishTutorial : finishExercise;
    const badge = kind === 'tutorial' ? tutorialBadge(page) : exerciseBadge(page);
    await finish(page);
    await page.clock.fastForward(3200);
    await expect(badge).toHaveCount(0);
    await page.getByRole('button', { name: 'Reset', exact: true }).click();
    await expect(titleCheck(page)).toBeVisible();
    await expect(badge).toHaveCount(0);
    await finish(page);
    await expect(titleCheck(page)).toBeVisible();
  }
});

test('completion confetti respects the learner motion preference', async ({ page }, testInfo) => {
  for (const reducedMotion of ['no-preference', 'reduce'] as const) {
    await page.emulateMedia({ reducedMotion });
    await page.goto('/labs/changing-relations/exercises/exercise-1');
    await finishExercise(page);
    const confetti = exerciseBadge(page).locator('.activity-completion-confetti');
    if (reducedMotion === 'reduce') {
      await expect(confetti).toBeHidden();
      await expect(exerciseBadge(page)).toHaveCSS('animation-name', 'none');
    } else {
      await expect(confetti).toBeVisible();
      await expect(exerciseBadge(page)).toHaveCSS('opacity', '1');
      expect(await confetti.locator('i').first().evaluate(el => el.getAnimations().some(animation => animation.playState === 'running'))).toBe(true);
      await page.screenshot({ path: testInfo.outputPath('completion-confetti.png') });
    }
    await expect(titleCheck(page)).toBeVisible();
  }
});

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
  for (const prerequisitesComplete of [false, true]) {
    test(`${chapter.slug}: last exercise recap ${prerequisitesComplete ? 'celebrates a fully completed chapter' : 'keeps unfinished activities outstanding'}`, async ({ page, isMobile }) => {
      const activities = getChapterPages(chapter);
      const lastExercise = activities.filter(activity => activity.sectionSlug === 'exercises').at(-1)!;
      const path = chapterContentPath(chapter, lastExercise);
      const remaining = activities.filter(activity => activity !== lastExercise);
      const nextChapter = coreChapters[chapter.number];
      await page.addInitScript(({ key, completed }) => localStorage.setItem(key, JSON.stringify({ version: 1, completed })), {
        key: LAB_PROGRESS_KEY,
        completed: prerequisitesComplete ? remaining.map(activity => chapterContentPath(chapter, activity)) : [],
      });
      await page.clock.install();
      await page.goto(path);
      await finishExercise(page);
      const finish = page.getByRole('button', { name: 'Finish chapter', exact: true });
      if (!prerequisitesComplete) await finish.click();
      const dialog = page.getByRole('dialog', { name: prerequisitesComplete ? `You finished Chapter ${chapter.number}` : 'Exercise completed', exact: true });
      await expect(dialog).toBeVisible();
      await expect(progress(page)).toHaveAttribute('value', prerequisitesComplete ? '1' : '0');
      if (prerequisitesComplete) {
        await expect(dialog).toContainText('Chapter complete');
        await expect(dialog.locator('.chapter-completion-intro')).toHaveCSS('display', 'grid');
        await expect(dialog.locator('.chapter-completion-topics')).toHaveCSS('display', 'grid');
        await expect(dialog.locator('.chapter-completion-topics section')).toHaveCount(3);
        await expect(dialog.locator('.chapter-completion-topic-number')).toHaveText(['01', '02', '03']);
        const artwork = dialog.locator('.chapter-completion-art');
        await expect(artwork).toBeVisible();
        await expect(artwork).toHaveAttribute('src', chapter.overviewImage!);
        await expect.poll(() => artwork.evaluate(image => (image as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
        if (!isMobile) await expect(dialog.locator('.chapter-completion-takeaway')).toContainText('The key idea');
        expect(await dialog.evaluate(element => element.scrollHeight <= element.clientHeight + 1), 'The completed chapter recap fits without clipping').toBe(true);
        if (isMobile) {
          const viewport = page.viewportSize()!;
          for (const height of [664, 560]) {
            await page.setViewportSize({ width: viewport.width, height });
            expect(await dialog.evaluate(element => element.scrollHeight <= element.clientHeight + 1), `The recap fits a ${height}px-tall phone`).toBe(true);
          }
          await page.setViewportSize(viewport);
        }
        await expect(dialog.getByRole('button', { name: nextChapter ? 'Go to next chapter' : 'Return to learning path', exact: true })).toBeFocused();
      } else {
        await expect(dialog).toContainText('Chapter in progress');
        await expect(dialog).toContainText('You have left:');
        await expect(dialog).not.toContainText(`You finished Chapter ${chapter.number}`);
        const unfinished = dialog.getByRole('list', { name: 'Remaining chapter activities' });
        await expect(unfinished.getByRole('link')).toHaveCount(remaining.length);
        for (const activity of remaining) {
          await expect(unfinished.getByRole('link', { name: activity.title, exact: true })).toHaveAttribute('href', chapterContentPath(chapter, activity));
        }
        await expect(dialog.getByRole('button', { name: 'Chapter overview', exact: true })).toHaveClass(nextChapter ? /button-secondary/ : /button-primary/);
        const primary = dialog.getByRole('button', { name: nextChapter ? 'Go to next chapter' : 'Chapter overview', exact: true });
        await expect(primary).toHaveClass(/button-primary/);
        await expect(primary).toBeFocused();
      }
      await page.keyboard.press('Escape');
      await expect(dialog).not.toBeVisible();
      await expect(finish).toBeFocused();
      await finish.click();
      await page.keyboard.press('Enter');
      await expect(page).toHaveURL(nextChapter ? `/labs/${nextChapter.slug}` : prerequisitesComplete ? '/' : `/labs/${chapter.slug}`);
    });
  }

  test(`${chapter.slug}: all tutorials retain completion after reset and reload`, async ({ page }) => {
    test.setTimeout(90_000);
    await page.clock.install();
    const lectures = getChapterPages(chapter).filter(item => item.sectionSlug === 'tutorial');
    for (const lecture of lectures) {
      const path = chapterContentPath(chapter, lecture);
      await page.goto(path);
      await expect(tutorialBadge(page)).toHaveCount(0);
      await page.locator('#main-content').focus();
      await page.keyboard.press('ArrowRight');
      await expect(progress(page)).toHaveAttribute('value', '0');
      await finishTutorial(page);
      await expect(titleCheck(page)).toBeVisible();
      await page.clock.fastForward(3200);
      await expect(tutorialBadge(page)).toHaveCount(0);
      await expect(titleCheck(page)).toBeVisible();
      await expect(progress(page)).toHaveAttribute('value', '0');
      await page.reload();
      await expect(tutorialBadge(page)).toHaveCount(0);
      await expect(titleCheck(page)).toBeVisible();
      await page.getByRole('button', { name: 'Reset', exact: true }).click();
      await expect(tutorialBadge(page)).toHaveCount(0);
      await expect(titleCheck(page)).toBeVisible();
      await expect(progress(page)).toHaveAttribute('value', '0');
      await expect(page.locator(`#main-content .chapter-pages a[href="${path}"]`).first()).toHaveAttribute('data-completed', 'true');
    }
  });

  test(`${chapter.slug}: every exercise celebrates in the same footer and retains its title check`, async ({ page, isMobile }, testInfo) => {
    test.setTimeout(90_000);
    await page.clock.install();
    if (!isMobile) await page.setViewportSize({ width: 1366, height: 768 });
    const exercises = getChapterPages(chapter).filter(item => item.sectionSlug === 'exercises');
    for (const [index, exercise] of exercises.entries()) {
      await page.goto(chapterContentPath(chapter, exercise));
      const heading = await page.locator('.guided-lab-heading').boundingBox();
      await finishExercise(page);
      await expect(titleCheck(page)).toBeVisible();
      await expect(progress(page)).toHaveAttribute('value', '0');
      const badge = exerciseBadge(page);
      const bounds = (await badge.boundingBox())!;
      const pageBounds = (await page.locator('.guided-lab-page').boundingBox())!;
      const inset = await page.locator('.guided-lab-page').evaluate(el => parseFloat(getComputedStyle(el).getPropertyValue('--exercise-navigation-inset')));
      expect(bounds.x - pageBounds.x).toBe(isMobile ? 16 : 28);
      expect(Math.abs(pageBounds.y + pageBounds.height - bounds.y - bounds.height - inset)).toBeLessThan(1);
      const next = (await page.locator('[data-shortcut="exercise-forward"]').boundingBox())!;
      expect(bounds.x + bounds.width <= next.x || next.x + next.width <= bounds.x
        || bounds.y + bounds.height <= next.y || next.y + next.height <= bounds.y,
      'Completion feedback must not overlap navigation, including when it moves onto its own row').toBe(true);
      await expectFooterClear(page);
      if (index === 0) await page.screenshot({ path: testInfo.outputPath('exercise-completed.png') });
      const question = await page.locator('.exercise-question').boundingBox();
      const answers = await page.locator('.exercise-answers').boundingBox();
      await page.clock.fastForward(3200);
      await expect(badge).toHaveCount(0);
      await expect(titleCheck(page)).toBeVisible();
      expect(await page.locator('.exercise-question').boundingBox()).toEqual(question);
      expect(await page.locator('.exercise-answers').boundingBox()).toEqual(answers);
      expect(await page.locator('[data-shortcut="exercise-forward"]').boundingBox()).toEqual(next);
      await page.reload();
      await expect(badge).toHaveCount(0);
      await expect(titleCheck(page)).toBeVisible();
      await page.getByRole('button', { name: 'Reset', exact: true }).click();
      await expect(badge).toHaveCount(0);
      await expect(titleCheck(page)).toBeVisible();
      await expect(page.locator('.exercise-question')).toHaveAttribute('data-result', 'ready');
      expect(await page.locator('.guided-lab-heading').boundingBox()).toEqual(heading);
      await expect(progress(page)).toHaveAttribute('value', '0');
    }
  });
}

for (const chapter of chapters) {
  for (const kind of ['tutorial', 'exercises'] as const) {
    test(`${chapter.slug}: the final remaining ${kind === 'tutorial' ? 'tutorial' : 'exercise'} opens the chapter panel automatically`, async ({ page }) => {
      test.setTimeout(60_000);
      const activities = getChapterPages(chapter);
      const lastRemaining = activities.find(activity => activity.sectionSlug === kind)!;
      const path = chapterContentPath(chapter, lastRemaining);
      await page.addInitScript(({ key, completed }) => {
        if (localStorage.getItem(key) === null) localStorage.setItem(key, JSON.stringify({ version: 1, completed }));
      }, {
        key: LAB_PROGRESS_KEY,
        completed: activities.filter(activity => activity !== lastRemaining).map(activity => chapterContentPath(chapter, activity)),
      });
      await page.goto(path);
      const dialog = page.getByRole('dialog', { name: `You finished Chapter ${chapter.number}`, exact: true });
      await expect(dialog).not.toBeVisible();
      const finish = kind === 'tutorial' ? finishTutorial : finishExercise;
      await finish(page);
      await expect(dialog).toBeVisible();
      await expect(progress(page)).toHaveAttribute('value', '1');
      await expect(dialog.getByRole('button', { name: coreChapters[chapter.number] ? 'Go to next chapter' : 'Return to learning path', exact: true })).toBeFocused();
      await page.keyboard.press('Escape');
      await expect(dialog).not.toBeVisible();
      await page.reload();
      await expect(dialog).not.toBeVisible();
      await expect(titleCheck(page)).toBeVisible();
      await finish(page);
      await expect(dialog).not.toBeVisible();
      await page.reload();
      await expect(dialog).not.toBeVisible();
    });
  }
}

test('chapter completion still requires earlier exercises after all tutorials are complete', async ({ page }) => {
  const chapter = chapters.find(item => item.slug === 'incremental-maintenance')!;
  const activities = getChapterPages(chapter);
  const exercises = activities.filter(activity => activity.sectionSlug === 'exercises');
  const missingPath = chapterContentPath(chapter, exercises[0]!);
  const lastPath = chapterContentPath(chapter, exercises.at(-1)!);
  await page.addInitScript(({ key, completed }) => localStorage.setItem(key, JSON.stringify({ version: 1, completed })), {
    key: LAB_PROGRESS_KEY,
    completed: activities.map(activity => chapterContentPath(chapter, activity)).filter(path => path !== missingPath && path !== lastPath),
  });
  await page.goto(lastPath);
  await finishExercise(page);
  await page.getByRole('button', { name: 'Finish chapter', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Exercise completed', exact: true });
  await expect(dialog).toBeVisible();
  await expect(progress(page)).toHaveAttribute('value', '0');
  const remaining = dialog.getByRole('list', { name: 'Remaining chapter activities' }).getByRole('link');
  await expect(remaining).toHaveCount(1);
  await expect(remaining).toHaveAttribute('href', missingPath);
  await dialog.getByRole('button', { name: 'Chapter overview', exact: true }).focus();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL('/labs/incremental-maintenance');
});

test('both bars count whole chapters while chapter badges, activity dots and other tabs stay in sync', async ({ page, context, isMobile }, testInfo) => {
  test.setTimeout(60_000);
  const lecture = '/labs/changing-relations/tutorial/lecture-1';
  const chapterLink = (target: Page) => target.locator('#main-content .chapter-link-row > a[href="/labs/changing-relations"]').first();
  await page.goto(lecture);
  const badgeStyle = await chapterLink(page).locator('.chapter-link-number').evaluate(el => {
    const style = getComputedStyle(el);
    return { fill: style.backgroundColor, color: style.color, border: style.borderColor };
  });
  let compactFill = '';
  let compactColor = '';
  if (!isMobile) {
    await page.getByRole('button', { name: 'Collapse chapter navigation', exact: true }).click();
    compactFill = await chapterLink(page).locator('.chapter-link-number').evaluate(el => getComputedStyle(el).backgroundColor);
    compactColor = await chapterLink(page).locator('.chapter-link-number').evaluate(el => getComputedStyle(el).color);
    await page.getByRole('button', { name: 'Expand chapter navigation', exact: true }).click();
  }
  await finishTutorial(page);
  await expect(chapterLink(page)).not.toHaveAttribute('data-completed', 'true');
  const successColor = await titleCheck(page).evaluate(el => getComputedStyle(el).color);
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
  await expect(page.getByRole('progressbar', { name: 'Featured challenges completed' })).toHaveCount(0);
  await page.reload();
  await expect(pathProgress).toHaveAttribute('value', '0');
  const other = await context.newPage();
  await other.goto('/labs/changing-relations/tutorial/lecture-2');
  await expect(progress(other)).toHaveAttribute('value', '0');
  await expect(chapterLink(other)).not.toHaveAttribute('data-completed', 'true');
  await expect(titleCheck(other)).toHaveCount(0);
  await page.goto('/labs/changing-relations/tutorial/lecture-2');
  await finishTutorial(page);
  await expect(page.getByRole('dialog', { name: 'You finished Chapter 1', exact: true })).toBeVisible();
  await expect(other.getByRole('dialog', { name: 'You finished Chapter 1', exact: true })).not.toBeVisible();
  await page.keyboard.press('Escape');
  await expect(titleCheck(other)).toBeVisible();
  await expect(tutorialBadge(other)).toHaveCount(0);
  await expect(progress(other)).toHaveAttribute('value', '1');
  await expect(chapterLink(other)).toHaveAttribute('data-completed', 'true');
  const number = chapterLink(page).locator('.chapter-link-number');
  await expect(number).toHaveCSS('color', badgeStyle.color);
  await expect(number).toHaveCSS('border-color', badgeStyle.border);
  await expect(number).toHaveCSS('background-color', badgeStyle.fill);
  if (!isMobile) {
    await page.getByRole('button', { name: 'Collapse chapter navigation', exact: true }).click();
    await expect(number).toHaveCSS('background-color', compactFill);
    await expect(number).toHaveCSS('color', compactColor);
    await expect(chapterLink(page)).toHaveAttribute('data-completed', 'true');
    await page.getByRole('button', { name: 'Expand chapter navigation', exact: true }).click();
    await page.screenshot({ path: testInfo.outputPath('chapter-completed-badge.png') });
  }
  const neutralFill = await other.locator('#main-content .chapter-link-row > a[href="/labs/incremental-maintenance"] .chapter-link-number').first().evaluate(el => getComputedStyle(el).backgroundColor);
  await other.goto('/labs/incremental-maintenance');
  await expect(chapterLink(other).locator('.chapter-link-number')).toHaveCSS('color', successColor);
  await expect(chapterLink(other).locator('.chapter-link-number')).not.toHaveCSS('background-color', neutralFill);
  if (!isMobile) await other.screenshot({ path: testInfo.outputPath('chapter-completed-inactive-badge.png') });
  await other.reload();
  await expect(chapterLink(other)).toHaveAttribute('data-completed', 'true');
  await page.goto('/');
  await expect(pathProgress).toHaveAttribute('value', '1');
  await page.reload();
  await expect(pathProgress).toHaveAttribute('value', '1');
  await other.close();
});
