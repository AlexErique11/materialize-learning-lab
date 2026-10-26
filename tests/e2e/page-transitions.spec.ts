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
  const chapter = page.locator(`#main-content .chapter-link-row a[href="/labs/${slug}"]:visible`);
  if (await chapter.getAttribute('aria-expanded') !== 'true') await chapter.click();
  await page.locator(`#main-content .chapter-overview-link[href="/labs/${slug}"]:visible`).click();
  await expect(page).toHaveURL(`/labs/${slug}`);
  await expect(page.locator('#main-content .chapter-overview')).toHaveAttribute('data-chapter', slug);
  if (await mobile.isVisible()) await expect(mobile).not.toHaveAttribute('open');
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

for (const [source, path] of [
  ['overview breadcrumb', '/labs/incremental-maintenance'],
  ['lecture breadcrumb', '/labs/getting-data-in/tutorial/lecture-2'],
  ['exercise breadcrumb', '/labs/time-in-materialize/exercises/exercise-1'],
  ['sidebar title', '/labs/progress-and-freshness/tutorial/lecture-1'],
] as const) {
  test(`${source} returns to Guided labs with the existing page transition`, async ({ page, isMobile }) => {
    test.skip(isMobile && source !== 'sidebar title', 'Breadcrumbs are hidden on phones.');
    await pausePageMotion(page);
    await page.goto(path);
    const header = await page.getByRole('banner').boundingBox();
    if (source === 'sidebar title') {
      const mobile = page.locator('#main-content .mobile-sidebar');
      if (await mobile.isVisible()) await mobile.locator('summary').first().click();
      await page.locator('#main-content .sidebar-title:visible').click();
    } else {
      await page.getByRole('navigation', { name: 'Breadcrumb', exact: true })
        .getByRole('link', { name: 'Guided labs', exact: true }).click();
    }
    await expect(page).toHaveURL('/labs/changing-relations');
    await expect(curtain(page)).toHaveCSS('opacity', '1');
    await expect(page.locator('#main-content .learning-area-content')).toHaveAttribute('inert', '');
    await expect(page.locator('.lab-intro-screen')).toHaveCount(0);
    await finishPhase(page, 'exit');
    await finishPhase(page, 'enter');
    await expect(curtain(page)).toHaveCount(0);
    await expect(page.locator('#main-content .learning-area-content')).not.toHaveAttribute('inert');
    await expect(page.getByRole('heading', { name: 'Changing Relations', exact: true })).toBeVisible();
    await expect(page.locator('#main-content')).toBeFocused();
    expect(await page.getByRole('banner').boundingBox()).toEqual(header);
    await page.goBack();
    await expect(page).toHaveURL(path);
    await finishPhase(page, 'exit');
    await finishPhase(page, 'enter');
    await expect(curtain(page)).toHaveCount(0);
  });
}

for (const theme of ['light', 'dark']) {
  test(`${theme} chapter changes keep navigation fixed and reveal only settled content`, async ({ page }, testInfo) => {
    await pausePageMotion(page);
    await page.goto('/labs/changing-relations');
    if (theme === 'dark') await page.getByRole('button', { name: 'Switch to dark mode', exact: true }).click();
    const mobile = page.locator('#main-content .mobile-sidebar');
    const mobileNavigation = await mobile.isVisible();
    if (mobileNavigation) {
      await mobile.locator('summary').first().click();
      await expect(page.locator('#main-content .learning-area-content')).toHaveCSS('transform', 'none');
      // Clicking a lower menu item can scroll the document before navigation.
      // Measure the visible source after that scroll, as the snapshot does.
      await page.getByRole('button', { name: 'Expand Incremental Maintenance chapter', exact: true }).click();
      await page.locator('#main-content .chapter-overview-link[href="/labs/incremental-maintenance"]:visible').scrollIntoViewIfNeeded();
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
    if (!mobileNavigation) expect(await page.locator('#main-content .chapter-sidebar').boundingBox()).toEqual(sidebar);
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
    await page.route('**/incremental-maintenance-overview.svg', async route => {
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

for (const asset of ['image', 'font'] as const) {
  test(`a permanently pending ${asset} cannot trap a chapter transition`, async ({ page }) => {
    await pausePageMotion(page);
    await page.addInitScript(asset => {
      let release!: () => void;
      const pending = new Promise<void>(resolve => { release = resolve; });
      (window as unknown as { releaseAsset: () => void }).releaseAsset = release;
      if (asset === 'font') Object.defineProperty(document.fonts, 'ready', { get: () => pending });
      else {
        const decode = HTMLImageElement.prototype.decode;
        HTMLImageElement.prototype.decode = function () {
          return this.src.includes('incremental-maintenance-overview') ? pending : decode.call(this);
        };
      }
    }, asset);
    await page.goto('/labs/changing-relations');
    await selectChapter(page, 'incremental-maintenance');
    await finishPhase(page, 'exit');
    await finishPhase(page, 'enter');
    await expect(curtain(page)).toHaveCount(0);
    await expect(page.locator('#main-content .learning-area-content')).not.toHaveAttribute('inert');
    await expect(page.locator('#main-content .learning-area-content')).not.toHaveAttribute('aria-busy');
    await page.evaluate(() => (window as unknown as { releaseAsset: () => void }).releaseAsset());
    await expect(curtain(page)).toHaveCount(0);
    await page.getByRole('link', { name: 'Start tutorial: Lecture 1: Filters and projections', exact: true }).click();
    await finishPhase(page, 'exit');
    await finishPhase(page, 'enter');
    await expect(page.getByRole('heading', { name: 'Lecture 1', exact: true })).toBeVisible();
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
