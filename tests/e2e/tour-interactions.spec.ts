import type { Page } from '@playwright/test';
import { expect, test } from './fixtures';
import { coreChapters } from '../../src/chapters/chapterRegistry';
import { chapterTourSteps, chapterTourWelcome, getLectureWalkthrough } from '../../src/components/walkthrough/walkthroughContent';

test.use({ reducedMotion: 'reduce' });

const tour = (page: Page) => page.locator('.walkthrough-dialog[open]');
const scrollPosition = (page: Page) => page.evaluate(() => [scrollX, scrollY, document.body.scrollTop]);
async function expectTourStep(page: Page, index: number) {
  const step = chapterTourSteps[index]!;
  await expect(page).toHaveURL(step.path);
  await expect(tour(page).getByRole('heading', { level: 2 })).toHaveText(step.title);
}
async function openTour(page: Page) {
  await page.goto('/');
  await page.getByRole('button', { name: 'Take a tour', exact: true }).click();
  await expect(page).toHaveURL(chapterTourSteps[0]!.path);
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  await expect(tour(page)).toBeVisible();
  await expect(tour(page).getByRole('heading', { level: 2 })).toHaveText(chapterTourWelcome.title);
}

test('every part of Take a tour blocks background scrolling and interaction', async ({ page, context, isMobile, browserName }, testInfo) => {
  test.setTimeout(90_000);
  if (isMobile) await page.setViewportSize({ width: 320, height: 568 });
  await openTour(page);
  for (let index = -1; index < chapterTourSteps.length; index++) {
    if (index >= 0) await expectTourStep(page, index);
    await expect(page.locator('html')).toHaveAttribute('data-walkthrough-active', /^(fixed|scrollable)$/);
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    const before = await scrollPosition(page);
    const progress = await page.locator('#main-content .guided-lab-progress').allTextContents();
    const url = page.url();
    // Mobile WebKit has no mouse-wheel emulation; keyboard scrolling is native there.
    if (!isMobile || browserName !== 'webkit') {
      await page.mouse.move(5, page.viewportSize()!.height / 2);
      await page.mouse.wheel(0, 700);
      await page.mouse.wheel(0, -700);
    }
    await tour(page).focus();
    await page.keyboard.press('PageDown');
    await page.keyboard.press('Home');
    for (const key of ['s', 'r', 'h', 'Control+Enter']) await page.keyboard.press(key);
    await expect.poll(() => scrollPosition(page)).toEqual(before);
    expect(await page.locator('#main-content .guided-lab-progress').allTextContents()).toEqual(progress);

    if (isMobile && browserName === 'chromium') {
      const input = await context.newCDPSession(page);
      await input.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 5, y: 350 }] });
      await input.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: 5, y: 180 }] });
      await input.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
      await input.detach();
      await expect.poll(() => scrollPosition(page)).toEqual(before);
    }

    // The highlighted control and navbar remain visible, but cannot be activated.
    const target = index >= 0 ? chapterTourSteps[index]!.target : undefined;
    if (target) {
      const highlight = (await tour(page).locator('.relation-guide-hole').boundingBox())!;
      const x = highlight.x + highlight.width / 2;
      const y = highlight.y + highlight.height / 2;
      if (isMobile) await page.touchscreen.tap(x, y);
      else await page.mouse.click(x, y);
    }
    if (isMobile) await page.touchscreen.tap(5, 5);
    else await page.mouse.click(5, 5);
    await expect(tour(page)).toBeVisible();
    await expect(page).toHaveURL(url);
    expect(context.pages()).toHaveLength(1);
    await page.keyboard.press('Tab');
    await page.keyboard.press('Shift+Tab');
    expect(await page.evaluate(() => Boolean(document.activeElement?.closest('.walkthrough-dialog')))).toBe(true);
    if (index === 0) await page.screenshot({ path: testInfo.outputPath('tour-background-locked.png') });
    await tour(page).getByRole('button', { name: index === -1 ? 'Start walkthrough' : index === chapterTourSteps.length - 1 ? 'Finish' : 'Next', exact: true }).click();
  }
  await expect(tour(page)).toHaveCount(0);
  await expect(page.locator('html')).not.toHaveAttribute('data-walkthrough-active');
  if (await page.evaluate(() => document.documentElement.scrollHeight > innerHeight)) {
    await page.evaluate(() => scrollTo(0, 0));
    if (isMobile && browserName === 'webkit') {
      await page.locator('#main-content').focus();
      await page.keyboard.press('PageDown');
    } else {
      // Keep the wheel over content, since a desktop sidebar scrolls independently.
      await page.mouse.move(page.viewportSize()!.width - 20, page.viewportSize()!.height / 2);
      await page.mouse.wheel(0, 500);
    }
    await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(0);
  }
});

test('a short-screen tour explanation can scroll without moving the background', async ({ page, isMobile, browserName }) => {
  await openTour(page);
  await page.setViewportSize({ width: 320, height: 300 });
  const panel = tour(page);
  expect(await panel.evaluate(element => element.scrollHeight > element.clientHeight)).toBe(true);
  const background = await scrollPosition(page);
  if (isMobile && browserName === 'webkit') {
    await panel.focus();
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
  } else {
    const bounds = (await panel.boundingBox())!;
    await page.mouse.move(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
    await page.mouse.wheel(0, 200);
  }
  await expect.poll(() => panel.evaluate(element => element.scrollTop)).toBeGreaterThan(0);
  expect(await scrollPosition(page)).toEqual(background);
  await panel.getByRole('button', { name: 'Exit', exact: true }).click();
  await expect(panel).toHaveCount(0);
  await expect(page.locator('html')).not.toHaveAttribute('data-walkthrough-active');
});

test('Take a tour supports arrows, Enter, boundaries and held-key protection through every page', async ({ page }) => {
  test.setTimeout(60_000);
  await openTour(page);
  await page.keyboard.press('ArrowLeft');
  await expect(tour(page).getByRole('heading', { level: 2 })).toHaveText(chapterTourWelcome.title);
  await page.keyboard.press('Enter');
  await expectTourStep(page, 0);
  await page.keyboard.press('ArrowLeft');
  await expectTourStep(page, 0);
  await page.keyboard.down('ArrowRight');
  await page.keyboard.down('ArrowRight');
  await page.keyboard.up('ArrowRight');
  await expectTourStep(page, 1);
  for (let index = 1; index < chapterTourSteps.length; index++) {
    await expectTourStep(page, index);
    await page.keyboard.press('ArrowLeft');
    await expectTourStep(page, index - 1);
    await page.keyboard.press('ArrowRight');
    await expectTourStep(page, index);
    await page.keyboard.press(index % 2 ? 'Enter' : 'ArrowRight');
  }
  await expect(tour(page)).toHaveCount(0);
  await expect(page.locator('html')).not.toHaveAttribute('data-walkthrough-active');
  await expect(page.locator('#main-content')).toBeFocused();
});

for (const chapter of coreChapters) {
  test(`${chapter.slug}: controls tour supports arrows and restores normal lecture shortcuts`, async ({ page }) => {
    const path = `/labs/${chapter.slug}/tutorial/lecture-1`;
    const steps = getLectureWalkthrough(path)!;
    await page.goto(path);
    const progress = page.locator('#main-content .guided-lab-progress strong');
    const before = await progress.textContent();
    await page.getByRole('button', { name: 'Lecture controls walkthrough', exact: true }).click();
    await page.keyboard.press('ArrowLeft');
    await expect(tour(page).getByRole('heading', { level: 2 })).toHaveText(steps[0]!.title);
    for (let index = 0; index < steps.length; index++) {
      await expect(tour(page).getByRole('heading', { level: 2 })).toHaveText(steps[index]!.title);
      await expect(progress).toHaveText(before!);
      await page.keyboard.press(index % 2 ? 'Enter' : 'ArrowRight');
    }
    await expect(tour(page)).toHaveCount(0);
    await expect(page.locator('html')).not.toHaveAttribute('data-walkthrough-active');
    await page.keyboard.press('ArrowRight');
    await expect(progress).not.toHaveText(before!);
  });
}
