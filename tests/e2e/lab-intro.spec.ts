import type { Page } from '@playwright/test';
import { chapterTourWelcome } from '../../src/components/walkthrough/walkthroughContent';
import { expect, test } from './fixtures';

const intro = (page: Page) => page.getByRole('status', { name: 'Preparing guided labs', exact: true });
const guidedLabs = (page: Page) => page.getByRole('main').getByRole('link', { name: 'Guided labs', exact: true });
const overview = (page: Page) => page.getByRole('heading', { name: 'Changing Relations', exact: true });

async function expectIntroFits(page: Page) {
  const bounds = await intro(page).boundingBox();
  const viewport = page.viewportSize()!;
  const header = await page.getByRole('banner').boundingBox();
  const contentTop = header!.y + header!.height;
  expect(bounds).not.toBeNull();
  expect(bounds!.x).toBeCloseTo(0, 0);
  expect(bounds!.y).toBeCloseTo(contentTop, 0);
  expect(bounds!.width).toBeCloseTo(viewport.width, 0);
  expect(bounds!.height).toBeCloseTo(viewport.height - contentTop, 0);
  const dimensions = await page.evaluate(() => ({
    width: document.documentElement.scrollWidth,
    viewport: innerWidth,
    content: Array.from(document.querySelectorAll<HTMLElement>('.lab-intro-screen > *')).map((element) => {
      const box = element.getBoundingClientRect();
      return { left: box.left, top: box.top, right: box.right, bottom: box.bottom };
    }),
  }));
  expect(dimensions.width).toBeLessThanOrEqual(dimensions.viewport);
  for (const box of dimensions.content) {
    expect(box.left).toBeGreaterThanOrEqual(0);
    expect(box.top).toBeGreaterThanOrEqual(0);
    expect(box.right).toBeLessThanOrEqual(viewport.width);
    expect(box.bottom).toBeLessThanOrEqual(viewport.height);
  }
}

test('Guided labs plays the reaction and reveal when activated with Enter', async ({ page }, testInfo) => {
  await page.goto('/');
  await guidedLabs(page).focus();
  await page.keyboard.press('Enter');
  await expect(intro(page)).toBeVisible();
  await expect(intro(page)).toHaveAttribute('data-phase', 'reacting');
  await expect(page.locator('#main-content').locator('..')).toHaveAttribute('inert', '');
  await expectIntroFits(page);
  await page.screenshot({ path: testInfo.outputPath('guided-labs-reaction.png') });
  await page.waitForFunction(() => document.querySelector('.lab-intro-screen')?.getAttribute('data-phase') === 'revealing');
  await expect(intro(page)).toHaveCount(0);
  await expect(page).toHaveURL('/labs/changing-relations');
  await expect(overview(page)).toBeVisible();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.locator('#main-content')).toBeFocused();
});

test('opening labs directly and refreshing its overview do not play the introduction', async ({ page }) => {
  await page.goto('/labs');
  await expect(page).toHaveURL('/labs/changing-relations');
  await expect(overview(page)).toBeVisible();
  await expect(intro(page)).toHaveCount(0);
  await expect(page.locator('.learning-area')).toHaveCSS('animation-name', 'none');
  await page.reload();
  await expect(overview(page)).toBeVisible();
  await expect(intro(page)).toHaveCount(0);
});

test('Back cancels a pending introduction and a fresh Guided labs entry replays it', async ({ page }) => {
  const time = new Date('2026-10-19T12:00:00Z');
  await page.clock.install({ time });
  await page.clock.pauseAt(time);
  await page.goto('/');
  await guidedLabs(page).click();
  await expect(intro(page)).toHaveAttribute('data-phase', 'reacting');
  await page.goBack();
  await expect(page).toHaveURL('/');
  await expect(intro(page)).toHaveCount(0);
  await page.clock.runFor(2500);
  await expect(page).toHaveURL('/');
  await expect(page.getByRole('heading', { name: 'Learning path', exact: true })).toBeVisible();
  await guidedLabs(page).click();
  await expect(intro(page)).toHaveAttribute('data-phase', 'reacting');
  await page.clock.runFor(1400);
  await expect(page).toHaveURL('/labs/changing-relations');
  await page.clock.runFor(32);
  await expect(intro(page)).toHaveAttribute('data-phase', 'revealing');
  await expect(page.locator('.learning-area')).toHaveCSS('animation-name', 'lab-entry-reveal');
  await expect(page.getByRole('banner')).toBeVisible();
  await expect(page.getByRole('banner')).toHaveCSS('transform', 'none');
  await page.clock.runFor(350);
  await page.clock.runFor(32);
  await expect(intro(page)).toHaveCount(0);
  await expect(overview(page)).toBeVisible();
  await expect(page.locator('.learning-area')).toHaveCSS('animation-name', 'none');
});

test('reduced motion skips the reaction delay and decorative movement', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const time = new Date('2026-10-19T12:00:00Z');
  await page.clock.install({ time });
  await page.clock.pauseAt(time);
  await page.goto('/');
  await guidedLabs(page).click();
  await expect(intro(page)).toHaveAttribute('data-phase', 'reacting');
  const movingDecorations = await page.locator('.lab-intro-screen *').evaluateAll((elements) =>
    elements.filter((element) => getComputedStyle(element).animationName !== 'none').length,
  );
  expect(movingDecorations).toBe(0);
  await page.clock.runFor(16);
  await expect(page).toHaveURL('/labs/changing-relations');
  await page.clock.runFor(32);
  await page.clock.runFor(32);
  await expect(intro(page)).toHaveCount(0, { timeout: 500 });
  await expect(page).toHaveURL('/labs/changing-relations', { timeout: 500 });
  await expect(overview(page)).toBeVisible();
});

test('the introduction fits in dark theme and preserves that preference', async ({ page }, testInfo) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Switch to dark mode', exact: true }).click();
  await guidedLabs(page).click();
  await expect(intro(page)).toHaveAttribute('data-phase', 'reacting');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expectIntroFits(page);
  await page.screenshot({ path: testInfo.outputPath('guided-labs-reaction-dark.png') });
  await expect(intro(page)).toHaveCount(0);
  await expect(overview(page)).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
});

test.describe('first-time guided labs introduction', () => {
  test.use({ tourSeen: false });

  test('the welcome tour opens only after the introduction has finished', async ({ page }) => {
    const time = new Date('2026-10-19T12:00:00Z');
    await page.clock.install({ time });
    await page.clock.pauseAt(time);
    await page.goto('/');
    await guidedLabs(page).click();
    await expect(intro(page)).toHaveAttribute('data-phase', 'reacting');
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await page.clock.runFor(1400);
    await expect(page).toHaveURL('/labs/changing-relations');
    await page.clock.runFor(32);
    await expect(intro(page)).toHaveAttribute('data-phase', 'revealing');
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await page.clock.runFor(350);
    await expect(intro(page)).toHaveCount(0);
    await page.clock.runFor(32);
    const welcome = page.getByRole('dialog', { name: chapterTourWelcome.title, exact: true });
    await expect(welcome).toBeVisible();
    await expect(welcome.getByRole('button', { name: 'Start walkthrough', exact: true })).toBeVisible();
    await welcome.getByRole('button', { name: 'Exit', exact: true }).click();
    await page.clock.runFor(32);
    await expect(welcome).toHaveCount(0);
    await expect(overview(page)).toBeVisible();
    await expect(page.locator('#main-content')).toBeFocused();
  });
});
