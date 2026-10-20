import type { Page } from '@playwright/test';
import { expect, test } from './fixtures';

type ReturnProbe = { animations: Animation[] };

async function observeReturns(page: Page, pause = false) {
  await page.addInitScript((pauseAnimations) => {
    const probe: ReturnProbe = { animations: [] };
    (window as unknown as { returnProbe: ReturnProbe }).returnProbe = probe;
    const animate = Element.prototype.animate;
    Element.prototype.animate = function (keyframes, options) {
      const animation = animate.call(this, keyframes, options);
      if (animation.id.startsWith('lab-return-')) {
        probe.animations.push(animation);
        if (pauseAnimations) animation.pause();
      }
      return animation;
    };
  }, pause);
}

async function returnCount(page: Page) {
  return page.evaluate(() => (
    (window as unknown as { returnProbe: ReturnProbe }).returnProbe.animations.length
  ));
}

async function finishSlide(page: Page) {
  await page.evaluate(() => {
    for (const animation of (window as unknown as { returnProbe: ReturnProbe }).returnProbe.animations) {
      if (animation.playState !== 'idle') animation.finish();
    }
  });
}

test('sidebar, breadcrumb, and logo returns bring Learning path in from the left over a stationary lab', async ({ page }, testInfo) => {
  await observeReturns(page, true);
  for (const source of ['sidebar', 'breadcrumb', 'logo']) {
    await page.goto('/labs/getting-data-in');
    if (source === 'logo') await page.getByRole('button', { name: 'Switch to dark mode', exact: true }).click();
    const header = await page.getByRole('banner').boundingBox();
    const title = await page.locator('#main-content h1').innerText();
    const background = await page.locator('.app-shell').first().evaluate(element => getComputedStyle(element).backgroundColor);
    if (source === 'sidebar') {
      const mobileNavigation = page.locator('.mobile-sidebar');
      if (await mobileNavigation.isVisible()) await mobileNavigation.locator('summary').first().click();
      await page.locator('.sidebar-back:visible').click();
    } else if (source === 'breadcrumb') {
      await page.getByRole('navigation', { name: 'Breadcrumb' }).getByRole('link', { name: 'Learning path', exact: true }).click();
    } else {
      await page.getByRole('link', { name: 'Materialize Learning Lab home', exact: true }).click();
    }
    const main = page.locator('#main-content');
    await expect(page).toHaveURL('/');
    await expect(main).toHaveAttribute('data-area-transition', 'entering');
    await expect(main).not.toHaveAttribute('inert');
    await expect(main).toHaveCSS('opacity', '1');
    await expect(main).toHaveCSS('filter', 'none');
    const snapshot = page.locator('body > .area-transition-viewport > [data-area-transition-view="outgoing"]');
    const incoming = page.locator('body > .area-transition-viewport > [data-area-transition-view="incoming"]');
    await expect(snapshot).toHaveAttribute('inert', '');
    await expect(snapshot).toHaveAttribute('aria-hidden', 'true');
    await expect(snapshot).toHaveCSS('opacity', '1');
    await expect(snapshot).toHaveCSS('background-color', background);
    await expect(snapshot.locator('h1')).toHaveText(title);
    await expect(page.getByRole('heading', { name: 'Learning path', exact: true })).toBeVisible();
    await expect(page.locator('.lab-intro-screen')).toHaveCount(0);
    await expect.poll(() => returnCount(page)).toBe(1);
    await expect.poll(() => page.evaluate(() => (
      (window as unknown as { returnProbe: ReturnProbe }).returnProbe.animations.length
    ))).toBe(1);
    await expect(incoming).toHaveAttribute('inert', '');
    await expect(incoming).toHaveAttribute('aria-hidden', 'true');
    await expect(incoming.locator('h1')).toHaveText('Learning path');
    await expect(incoming).toHaveCSS('opacity', '1');
    expect(await incoming.evaluate(element => element.previousElementSibling?.getAttribute('data-area-transition-view'))).toBe('outgoing');
    const sourceBounds = await snapshot.boundingBox();
    expect(sourceBounds!.x).toBe(0);
    expect((await incoming.boundingBox())!.x).toBe(await page.evaluate(() => -innerWidth));
    expect(await page.getByRole('banner').boundingBox()).toEqual(header);
    await expect(page.getByRole('banner')).toHaveCSS('transform', 'none');
    const frames = await page.evaluate(() => (window as unknown as { returnProbe: ReturnProbe }).returnProbe.animations.map(animation => ({
      frames: (animation.effect as KeyframeEffect).getKeyframes(), duration: animation.effect!.getTiming().duration,
      onLayer: ((animation.effect as KeyframeEffect).target as Element).matches('[data-area-transition-view="incoming"]'),
    })));
    expect(frames.map(animation => animation.duration)).toEqual([320]);
    expect(frames.every(animation => animation.onLayer)).toBe(true);
    expect(frames.flatMap(animation => animation.frames).every(frame => 'transform' in frame && !('backdropFilter' in frame) && !('opacity' in frame))).toBe(true);
    expect(frames[0]!.frames[0]!.transform).toBe('translateX(-100%)');
    expect(frames[0]!.frames.at(-1)!.transform).toBe('translateX(0px)');
    await page.evaluate(() => {
      for (const animation of (window as unknown as { returnProbe: ReturnProbe }).returnProbe.animations) animation.currentTime = 160;
    });
    await expect(snapshot).toHaveCSS('opacity', '1');
    expect(await snapshot.boundingBox()).toEqual(sourceBounds);
    const incomingBounds = (await incoming.boundingBox())!;
    expect(incomingBounds.x).toBeLessThan(0);
    expect(incomingBounds.x).toBeGreaterThan(await page.evaluate(() => -innerWidth));
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await expect(main).toHaveCSS('opacity', '1');
    if (source === 'sidebar') {
      await page.screenshot({ path: testInfo.outputPath('learning-path-return.png') });
    }
    await finishSlide(page);
    await expect(main).not.toHaveAttribute('data-area-transition');
    await expect(main).toHaveCSS('opacity', '1');
    await expect(main).toHaveCSS('transform', 'none');
    await expect(snapshot).toHaveCount(0);
    await expect(incoming).toHaveCount(0);
    if (source === 'logo') await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await expect(page.locator('#main-content')).toBeFocused();
  }
});

test('browser Back returns smoothly and Forward retains the original labs history entry', async ({ page }) => {
  await observeReturns(page);
  await page.goto('/');
  await page.getByRole('main').getByRole('link', { name: 'Guided labs', exact: true }).click();
  await expect(page).toHaveURL('/labs/changing-relations');
  await expect(page.locator('.lab-intro-screen')).toHaveCount(0);
  await page.goBack();
  await expect(page).toHaveURL('/');
  await expect.poll(() => returnCount(page)).toBe(1);
  await expect(page.locator('#main-content')).not.toHaveAttribute('data-area-transition');
  await page.goForward();
  await expect(page).toHaveURL('/labs/changing-relations');
  await expect(page.getByRole('heading', { name: 'Changing Relations', exact: true })).toBeVisible();
  await expect(page.locator('.lab-intro-screen')).toHaveCount(0);
  await expect.poll(() => returnCount(page)).toBe(2);
  await expect(page.locator('#main-content')).not.toHaveAttribute('data-area-transition');
  await expect(page.locator('.area-transition-layer')).toHaveCount(0);
});

test('returning with reduced motion navigates immediately without a transition', async ({ page }) => {
  await observeReturns(page);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/labs/time-in-materialize/tutorial/lecture-1');
  await page.getByRole('link', { name: 'Materialize Learning Lab home', exact: true }).click();
  await expect(page).toHaveURL('/');
  await expect(page.getByRole('heading', { name: 'Learning path', exact: true })).toBeVisible();
  expect(await returnCount(page)).toBe(0);
  await expect(page.locator('#main-content')).not.toHaveAttribute('data-area-transition');
});

test('returning from a scrolled lab preserves the outgoing sidebar position', async ({ page }) => {
  await observeReturns(page, true);
  await page.goto('/labs/getting-data-in');
  await page.evaluate(() => window.scrollTo(0, 250));
  await page.getByRole('link', { name: 'Materialize Learning Lab home', exact: true }).evaluate((element) => element.focus({ preventScroll: true }));
  const sidebar = await page.locator('.chapter-sidebar').boundingBox();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL('/');
  await expect(page.locator('#main-content')).toHaveAttribute('data-area-transition', 'entering');
  const snapshot = page.locator('body > .area-transition-viewport > [data-area-transition-view="outgoing"]');
  expect(await snapshot.locator('.chapter-sidebar').boundingBox()).toEqual(sidebar);
  await expect(snapshot).toHaveAttribute('inert', '');
  await expect.poll(() => returnCount(page)).toBe(1);
  await finishSlide(page);
  await expect(page.locator('#main-content')).not.toHaveAttribute('data-area-transition');
  await expect(page.locator('#main-content')).toHaveCSS('opacity', '1');
  await expect(page.locator('#main-content')).toHaveCSS('transform', 'none');
  await expect(page.locator('.lab-intro-screen')).toHaveCount(0);
});

test('direct home entry is immediate and challenges use the shared return transition', async ({ page }) => {
  await observeReturns(page);
  await page.goto('/');
  expect(await returnCount(page)).toBe(0);
  await page.goto('/challenges');
  await page.getByRole('link', { name: 'Materialize Learning Lab home', exact: true }).click();
  await expect(page).toHaveURL('/');
  await expect.poll(() => returnCount(page)).toBe(1);
  await expect(page.locator('#main-content')).not.toHaveAttribute('data-area-transition');
});

test('a new navigation interrupts the return without delaying the next lab entry', async ({ page }) => {
  await observeReturns(page, true);
  await page.goto('/labs/changing-relations');
  await page.getByRole('link', { name: 'Materialize Learning Lab home', exact: true }).click();
  await expect(page).toHaveURL('/');
  await expect.poll(() => page.evaluate(() => (
    (window as unknown as { returnProbe: ReturnProbe }).returnProbe.animations.length
  ))).toBe(1);
  await page.getByRole('main').getByRole('link', { name: 'Guided labs', exact: true }).click();
  await expect(page.locator('.lab-intro-screen')).toHaveAttribute('data-phase', 'reacting');
  await expect(page.locator('#main-content')).not.toHaveAttribute('data-area-transition');
  await expect(page.locator('.lab-intro-screen')).toHaveCount(0);
  await expect(page).toHaveURL('/labs/changing-relations');
});

test('changing to reduced motion during a slide restores visibility and interaction', async ({ page }) => {
  await observeReturns(page, true);
  await page.goto('/challenges');
  await page.getByRole('link', { name: 'Materialize Learning Lab home', exact: true }).click();
  await expect(page).toHaveURL('/');
  await expect.poll(() => returnCount(page)).toBe(1);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(page).toHaveURL('/');
  await expect(page.locator('#main-content')).not.toHaveAttribute('data-area-transition');
  await expect(page.locator('#main-content')).not.toHaveAttribute('inert');
  await expect(page.locator('#main-content')).toHaveCSS('opacity', '1');
  await expect(page.locator('.area-transition-layer')).toHaveCount(0);
  await expect(page.getByRole('main').getByRole('link', { name: 'Challenges', exact: true })).toBeEnabled();
});

test('rapid Back and Forward preserve both outgoing and incoming views at their current positions', async ({ page }) => {
  await observeReturns(page, true);
  await page.goto('/');
  await page.getByRole('main').getByRole('link', { name: 'Challenges', exact: true }).click();
  await expect(page).toHaveURL('/challenges');
  await expect.poll(() => returnCount(page)).toBe(1);
  expect(await page.evaluate(() => ((window as unknown as { returnProbe: ReturnProbe }).returnProbe.animations[0]!.effect as KeyframeEffect).getKeyframes().at(-1)!.transform)).toBe('translateX(-100%)');
  await page.evaluate(() => { (window as unknown as { returnProbe: ReturnProbe }).returnProbe.animations[0]!.currentTime = 160; });
  await page.goBack();
  await expect(page).toHaveURL('/');
  await expect.poll(() => returnCount(page)).toBe(2);
  const snapshot = page.locator('body > .area-transition-viewport > [data-area-transition-view="outgoing"]');
  await expect(snapshot).toHaveCount(1);
  await expect(snapshot.locator(':scope > main h1')).toHaveText('Challenges');
  const previous = snapshot.locator(':scope > .area-transition-layer');
  await expect(previous).toHaveCount(1);
  await expect(previous).toHaveCSS('opacity', '1');
  expect((await previous.boundingBox())!.x).toBeLessThan(0);
  expect(await page.evaluate(() => ((window as unknown as { returnProbe: ReturnProbe }).returnProbe.animations[1]!.effect as KeyframeEffect).getKeyframes()[0]!.transform)).toBe('translateX(-100%)');
  await page.evaluate(() => { (window as unknown as { returnProbe: ReturnProbe }).returnProbe.animations[1]!.currentTime = 160; });
  const incoming = page.locator('body > .area-transition-viewport > [data-area-transition-view="incoming"]');
  const incomingBounds = await incoming.boundingBox();
  const outgoingBounds = await snapshot.boundingBox();
  await page.goForward();
  await expect(page).toHaveURL('/challenges');
  await expect.poll(() => returnCount(page)).toBe(3);
  expect(await snapshot.locator(':scope > [data-area-transition-view="outgoing"]').boundingBox()).toEqual(outgoingBounds);
  const frozenIncoming = await snapshot.locator(':scope > [data-area-transition-view="incoming"]').boundingBox();
  for (const dimension of ['x', 'y', 'width', 'height'] as const) {
    expect(frozenIncoming![dimension]).toBeCloseTo(incomingBounds![dimension], 2);
  }
  await finishSlide(page);
  await expect(page.locator('.area-transition-layer')).toHaveCount(0);
  await expect(page.locator('#main-content')).toHaveCSS('opacity', '1');
});

test('outgoing Chapter 3 snapshots preserve SVG arrowheads with their own references', async ({ page }) => {
  await observeReturns(page, true);
  await page.goto('/labs/views-indexes-materialized-views/tutorial/lecture-2');
  await expect(page.locator('#main-content [data-flow-edge]').first()).toBeAttached();
  await page.getByRole('link', { name: 'Materialize Learning Lab home', exact: true }).click();
  await expect(page).toHaveURL('/');
  await expect.poll(() => returnCount(page)).toBe(1);
  const snapshot = page.locator('body > .area-transition-viewport > [data-area-transition-view="outgoing"]');
  const references = await snapshot.locator('[marker-end]').evaluateAll(elements => elements.map(element => {
    const id = element.getAttribute('marker-end')!.match(/url\(#([^)]+)\)/)![1]!;
    return id.startsWith('area-transition-') && Boolean(element.closest('.area-transition-layer')!.querySelector(`#${CSS.escape(id)}`));
  }));
  expect(references.length).toBeGreaterThan(0);
  expect(references.every(Boolean)).toBe(true);
  await finishSlide(page);
  await expect(snapshot).toHaveCount(0);
});
