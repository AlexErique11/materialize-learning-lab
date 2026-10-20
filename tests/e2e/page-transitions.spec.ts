import type { Page } from '@playwright/test';
import { expect, test } from './fixtures';

type PageMotion = { animations: Animation[] };
const curtain = (page: Page) => page.locator('body > .area-transition-viewport[data-transition-kind="page"]');

async function pausePageMotion(page: Page) {
  await page.addInitScript(() => {
    const probe: PageMotion = { animations: [] };
    (window as unknown as { pageMotion: PageMotion }).pageMotion = probe;
    const animate = Element.prototype.animate;
    Element.prototype.animate = function (frames, options) {
      const animation = animate.call(this, frames, options);
      if (animation.id.startsWith('ui-motion-route-')) {
        probe.animations.push(animation);
        animation.pause();
      }
      return animation;
    };
  });
}

async function selectChapter(page: Page, slug: string) {
  const mobile = page.locator('#main-content .mobile-sidebar');
  if (await mobile.isVisible() && await mobile.getAttribute('open') === null) await mobile.locator('summary').first().click();
  await page.locator(`#main-content .chapter-link-row a[href="/labs/${slug}"]:visible`).click();
  await expect(page).toHaveURL(`/labs/${slug}`);
}

async function finishPhase(page: Page, phase: 'exit' | 'enter') {
  await expect.poll(() => page.evaluate(phase =>
    (window as unknown as { pageMotion: PageMotion }).pageMotion.animations.some(animation => animation.id === `ui-motion-route-${phase}` && animation.playState === 'paused'), phase)).toBe(true);
  await page.evaluate(phase => {
    for (const animation of (window as unknown as { pageMotion: PageMotion }).pageMotion.animations) {
      if (animation.id === `ui-motion-route-${phase}` && animation.playState === 'paused') animation.finish();
    }
  }, phase);
}

for (const theme of ['light', 'dark']) {
  test(`${theme} chapter changes keep navigation fixed and reveal only settled content`, async ({ page }, testInfo) => {
    await pausePageMotion(page);
    await page.goto('/labs/changing-relations');
    if (theme === 'dark') await page.getByRole('button', { name: 'Switch to dark mode', exact: true }).click();
    const mobile = page.locator('#main-content .mobile-sidebar');
    if (await mobile.isVisible()) {
      await mobile.locator('summary').first().click();
      await expect(page.locator('#main-content .learning-area-content')).toHaveCSS('transform', 'none');
    }
    const header = await page.getByRole('banner').boundingBox();
    const sidebar = await page.locator('#main-content .chapter-sidebar').boundingBox();
    const title = await page.locator('#main-content h1').boundingBox();
    const background = await page.locator('.app-shell').first().evaluate(element => getComputedStyle(element).backgroundColor);
    await selectChapter(page, 'incremental-maintenance');
    const cover = curtain(page);
    await expect(cover).toHaveAttribute('inert', '');
    await expect(cover).toHaveCSS('background-color', background);
    await expect(cover).toHaveCSS('opacity', '1');
    const frozen = cover.locator(':scope > .area-transition-layer');
    await expect(frozen.locator('h1')).toHaveText('Changing Relations');
    expect(await frozen.locator('h1').boundingBox()).toEqual(title);
    expect(await page.getByRole('banner').boundingBox()).toEqual(header);
    expect(await page.locator('#main-content .chapter-sidebar').boundingBox()).toEqual(sidebar);
    const content = page.locator('#main-content .learning-area-content');
    await expect(content).toHaveAttribute('inert', '');
    await expect(content).toHaveAttribute('aria-busy', 'true');
    await expect(content).toHaveCSS('opacity', '1');
    await expect(content).toHaveCSS('transform', 'none');
    await finishPhase(page, 'exit');
    await expect.poll(() => page.evaluate(() => (window as unknown as { pageMotion: PageMotion }).pageMotion.animations.length)).toBe(2);
    await expect(frozen).toHaveCSS('opacity', '0');
    await page.evaluate(() => { (window as unknown as { pageMotion: PageMotion }).pageMotion.animations.at(-1)!.currentTime = 70; });
    await page.screenshot({ path: testInfo.outputPath(`chapter-content-${theme}.png`) });
    await finishPhase(page, 'enter');
    await expect(cover).toHaveCount(0);
    await expect(content).not.toHaveAttribute('inert');
    await expect(content).not.toHaveAttribute('aria-busy');
    await expect(page.getByRole('heading', { name: 'Incremental Maintenance', exact: true })).toBeVisible();
    await expect(page.locator('#main-content')).toBeFocused();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });
}

for (const reduceDuringLoad of [false, true]) {
  test(`an unfinished overview image stays covered${reduceDuringLoad ? ' until reduced motion is requested' : ' until it decodes'}`, async ({ page }) => {
    await pausePageMotion(page);
    let releaseImage!: () => void;
    const imageReady = new Promise<void>(resolve => { releaseImage = resolve; });
    let imageRequested = false;
    await page.route('**/incremental-maintenance-overview.png', async route => {
      imageRequested = true;
      await imageReady;
      await route.continue();
    });
    await page.goto('/labs/changing-relations');
    await selectChapter(page, 'incremental-maintenance');
    await expect.poll(() => imageRequested).toBe(true);
    await finishPhase(page, 'exit');
    // Deliberately hold the image past the normal animation duration.
    await page.waitForTimeout(250);
    expect(await page.evaluate(() => (window as unknown as { pageMotion: PageMotion }).pageMotion.animations.length)).toBe(1);
    await expect(curtain(page)).toHaveCSS('opacity', '1');
    if (reduceDuringLoad) {
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await expect(curtain(page)).toHaveCount(0);
      await expect(page.locator('#main-content .learning-area-content')).not.toHaveAttribute('inert');
    }
    releaseImage();
    if (!reduceDuringLoad) await finishPhase(page, 'enter');
    await expect(curtain(page)).toHaveCount(0);
    await expect.poll(() => page.locator('#main-content img').evaluate(image => (image as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
    await expect(page.getByRole('heading', { name: 'Incremental Maintenance', exact: true })).toBeVisible();
  });
}

test('rapid chapter selections and Back discard stale transitions and restore interaction', async ({ page }) => {
  await pausePageMotion(page);
  await page.goto('/labs/changing-relations');
  await selectChapter(page, 'incremental-maintenance');
  await selectChapter(page, 'getting-data-in');
  await page.goBack();
  await expect(page).toHaveURL('/labs/incremental-maintenance');
  await expect(curtain(page)).toHaveCount(1);
  await finishPhase(page, 'exit');
  await finishPhase(page, 'enter');
  await expect(page.locator('.area-transition-viewport')).toHaveCount(0);
  await expect(page.locator('#main-content .learning-area-content')).not.toHaveAttribute('inert');
  await expect(page.getByRole('heading', { name: 'Incremental Maintenance', exact: true })).toBeVisible();
  await expect(page.locator('#main-content')).toBeFocused();
});
