import type { Page } from '@playwright/test';
import { expect, test } from './fixtures';
import { chapterTourPaths, chapterTourSteps, chapterTourWelcome, getLectureWalkthrough, type WalkthroughStep } from '../../src/components/walkthrough/walkthroughContent';
import { TOUR_SEEN_KEY, WORK_COMPLETED_KEY } from '../../src/components/walkthrough/walkthroughStorage';

const dialog = (page: Page) => page.locator('dialog[open]');
const lectureHelp = (page: Page) => page.getByRole('button', { name: 'Lecture controls walkthrough', exact: true });
async function expectWelcome(page: Page) {
  await expect(dialog(page).getByRole('heading', { level: 2 })).toHaveText(chapterTourWelcome.title);
  await expect(dialog(page).getByText(chapterTourWelcome.description)).toBeVisible();
  await expect(page.locator('.relation-guide-hole')).toHaveCount(0);
  await expect(dialog(page).getByRole('button', { name: 'Start walkthrough', exact: true })).toBeVisible();
  await expect(dialog(page).getByRole('button', { name: 'Exit', exact: true })).toBeVisible();
}
async function startWalkthrough(page: Page) {
  await expectWelcome(page);
  await dialog(page).getByRole('button', { name: 'Start walkthrough', exact: true }).click();
}
async function expectStep(page: Page, step: WalkthroughStep) {
  await expect(page).toHaveURL(new RegExp(step.path + '$'));
  await expect(dialog(page).getByRole('heading', { level: 2 })).toHaveText(step.title);
  if (!step.target) {
    await expect(page.locator('.relation-guide-hole')).toHaveCount(0);
    await expect(dialog(page).getByText(step.description)).toBeVisible();
    const headingSize = await dialog(page).getByRole('heading', { level: 2 }).evaluate((element) => parseFloat(getComputedStyle(element).fontSize));
    expect(headingSize).toBeGreaterThanOrEqual(36);
    return;
  }
  await expect(dialog(page).locator('.relation-guide-hole')).toBeVisible();
  await expect.poll(async () => {
    const target = await page.locator(`[data-walkthrough="${step.target}"]`).boundingBox();
    const hole = await dialog(page).locator('.relation-guide-hole').boundingBox();
    return Boolean(target && hole && hole.x < target.x + target.width && hole.x + hole.width > target.x && hole.y < target.y + target.height && hole.y + hole.height > target.y);
  }).toBe(true);
  await expect.poll(async () => {
    const card = await dialog(page).locator('.relation-guide-card').boundingBox();
    const hole = await dialog(page).locator('.relation-guide-hole').boundingBox();
    return Boolean(card && hole && card.x < hole.x + hole.width && card.x + card.width > hole.x && card.y < hole.y + hole.height && card.y + card.height > hole.y);
  }, { message: 'The explanation should leave the highlighted control visible' }).toBe(false);
  const card = await dialog(page).locator('.relation-guide-card').boundingBox();
  expect(card!.x).toBeGreaterThanOrEqual(0);
  expect(card!.y).toBeGreaterThanOrEqual(0);
  expect(card!.x + card!.width).toBeLessThanOrEqual(page.viewportSize()!.width);
  expect(card!.y + card!.height).toBeLessThanOrEqual(page.viewportSize()!.height);
}

for (const theme of ['light', 'dark']) test(`home tour visits and highlights the full chapter in ${theme} theme`, async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: `Switch to ${theme} mode` }).click();
  await page.getByRole('button', { name: 'Take a tour', exact: true }).click();
  await startWalkthrough(page);
  for (let index = 0; index < chapterTourSteps.length; index++) {
    const step = chapterTourSteps[index]!;
    await expectStep(page, step);
    if (step.target) await expect(dialog(page).locator('.relation-guide-step')).toHaveText(`${index + 1} of ${chapterTourSteps.length}`);
    if (!step.target) {
      await dialog(page).getByRole('button', { name: 'Back', exact: true }).click();
      await expectStep(page, chapterTourSteps[index - 1]!);
      await dialog(page).getByRole('button', { name: 'Next', exact: true }).click();
      await expectStep(page, step);
    }
    if (step.path === chapterTourPaths.lectureOne || step.path === chapterTourPaths.lectureTwo) {
      await expect(page.getByTestId('logical-time').locator('strong')).toHaveText('t = 0');
      await expect(page.getByRole('button', { name: 'Run', exact: true })).toBeVisible();
    }
    if (step.path === chapterTourPaths.exercise) {
      await expect(page.locator('input').first()).toHaveValue('');
      await expect(page.getByRole('progressbar', { name: 'Exercise questions completed' })).toHaveAttribute('value', '0');
      await expect(page.getByRole('button', { name: 'Hint', exact: true })).toHaveAttribute('aria-expanded', 'false');
    }
    await dialog(page).getByRole('button', { name: index === chapterTourSteps.length - 1 ? 'Finish' : 'Next', exact: true }).click();
  }
  await expect(dialog(page)).toHaveCount(0);
  await expect(page).toHaveURL(new RegExp(chapterTourPaths.overview + '$'));
  await expect(page.locator('#main-content')).toBeFocused();
});

for (const path of [chapterTourPaths.lectureOne, chapterTourPaths.lectureTwo]) test(`lecture help stays on ${path} and preserves paused playback`, async ({ page }) => {
  await page.goto(path);
  await expect(page.locator('.app-header').getByRole('button', { name: 'Lecture controls walkthrough', exact: true })).toHaveCount(0);
  await expect(page.locator('.guided-lab-top-row').getByRole('button', { name: 'Lecture controls walkthrough', exact: true })).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Page navigation', exact: true })).toHaveCount(0);
  await page.clock.install();
  await page.getByRole('button', { name: 'Run', exact: true }).click();
  await page.clock.fastForward(2200);
  await lectureHelp(page).click();
  const before = await page.getByTestId('logical-time').textContent();
  await page.clock.fastForward(6600);
  expect(await page.getByTestId('logical-time').textContent()).toBe(before);
  const steps = getLectureWalkthrough(path)!;
  for (let index = 0; index < steps.length; index++) {
    await expectStep(page, steps[index]!);
    await dialog(page).getByRole('button', { name: index === steps.length - 1 ? 'Finish' : 'Next', exact: true }).click();
  }
  await expect(lectureHelp(page)).toBeFocused();
  await page.clock.fastForward(4400);
  expect(await page.getByTestId('logical-time').textContent()).toBe(before);
  await lectureHelp(page).click();
  await expectStep(page, steps[0]!);
  await page.keyboard.press('Tab');
  expect(await page.evaluate(() => Boolean(document.activeElement?.closest('dialog')))).toBe(true);
  await page.keyboard.press('Escape');
  await expect(lectureHelp(page)).toBeFocused();
});

test('Escape and browser navigation exit the chapter tour', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Take a tour', exact: true }).click();
  await startWalkthrough(page);
  const exercisesIndex = chapterTourSteps.findIndex((step) => step.title === 'Exercises');
  for (let index = 0; index < exercisesIndex; index++) await dialog(page).getByRole('button', { name: 'Next', exact: true }).click();
  await expectStep(page, chapterTourSteps[exercisesIndex]!);
  await page.keyboard.press('Escape');
  await expect(dialog(page)).toHaveCount(0);
  await expect(page).toHaveURL(new RegExp(chapterTourPaths.lectureOne + '$'));
  await page.goto('/');
  await page.getByRole('button', { name: 'Take a tour', exact: true }).click();
  await startWalkthrough(page);
  await page.goBack();
  await expect(page).toHaveURL(/\/$/);
  await expect(dialog(page)).toHaveCount(0);
});

test('welcome can be exited or escaped and shown again before highlighting', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Take a tour', exact: true }).click();
  await expectWelcome(page);
  await page.keyboard.press('Tab');
  expect(await page.evaluate(() => Boolean(document.activeElement?.closest('dialog')))).toBe(true);
  await dialog(page).getByRole('button', { name: 'Exit', exact: true }).click();
  await expect(dialog(page)).toHaveCount(0);
  await expect(page.locator('#main-content')).toBeFocused();
  await page.goto('/');
  await page.getByRole('button', { name: 'Take a tour', exact: true }).click();
  await expectWelcome(page);
  await page.keyboard.press('Escape');
  await expect(dialog(page)).toHaveCount(0);
  await expect(page.locator('#main-content')).toBeFocused();
  await page.goto('/');
  await page.getByRole('button', { name: 'Take a tour', exact: true }).click();
  await startWalkthrough(page);
  await expectStep(page, chapterTourSteps[0]!);
});

test('question mark appears only on lecture pages', async ({ page }) => {
  for (const path of ['/', chapterTourPaths.overview, chapterTourPaths.exercise, '/labs/changing-relations/tutorial', '/labs/not-a-chapter/tutorial/lecture-1']) {
    await page.goto(path);
    await expect(lectureHelp(page)).toHaveCount(0);
  }
});

test.describe('first-time guided labs entry', () => {
  test.use({ tourSeen: false });
  test('Guided labs automatically opens an easily dismissible tour once', async ({ page }) => {
    await page.goto('/');
    await expect(dialog(page)).toHaveCount(0);
    await page.getByRole('link', { name: 'Guided labs', exact: true }).click();
    await expectWelcome(page);
    await dialog(page).getByRole('button', { name: 'Exit', exact: true }).click();
    await expect(dialog(page)).toHaveCount(0);
    expect(await page.evaluate((key) => localStorage.getItem(key), TOUR_SEEN_KEY)).toBe('true');
    await page.goto('/');
    await page.getByRole('link', { name: 'Guided labs', exact: true }).click();
    await expect(page).toHaveURL(new RegExp(chapterTourPaths.overview + '$'));
    await expect(dialog(page)).toHaveCount(0);
  });
  test('completed work suppresses auto-start but keeps manual replay', async ({ page }) => {
    await page.goto(chapterTourPaths.exercise);
    await page.getByRole('button', { name: 'Show Answer', exact: true }).click();
    expect(await page.evaluate((key) => localStorage.getItem(key), WORK_COMPLETED_KEY)).toBe('true');
    await page.goto('/');
    await page.getByRole('link', { name: 'Guided labs', exact: true }).click();
    await expect(page).toHaveURL(new RegExp(chapterTourPaths.overview + '$'));
    await expect(dialog(page)).toHaveCount(0);
    await page.goto('/');
    await page.getByRole('button', { name: 'Take a tour', exact: true }).click();
    await startWalkthrough(page);
    await expectStep(page, chapterTourSteps[0]!);
  });
});
