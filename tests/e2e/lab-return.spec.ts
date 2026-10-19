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
    (window as unknown as { returnProbe: ReturnProbe }).returnProbe.animations.filter((animation) => animation.id === 'lab-return-in').length
  ));
}

test('sidebar, breadcrumb, and logo returns slide the views apart while the header stays steady', async ({ page }, testInfo) => {
  await observeReturns(page, true);
  for (const source of ['sidebar', 'breadcrumb', 'logo']) {
    await page.goto('/labs/getting-data-in');
    const header = await page.getByRole('banner').boundingBox();
    if (source === 'sidebar') {
      const mobileNavigation = page.locator('.mobile-sidebar');
      if (await mobileNavigation.isVisible()) await mobileNavigation.locator('summary').first().click();
      await page.locator('.sidebar-back:visible').click();
    } else if (source === 'breadcrumb') {
      await page.getByRole('navigation', { name: 'Breadcrumb' }).getByRole('link', { name: 'Learning path', exact: true }).click();
    } else {
      await page.getByRole('link', { name: 'Materialize Learning Lab home', exact: true }).click();
    }
    await expect(page).toHaveURL('/');
    await expect(page.getByRole('heading', { name: 'Learning path', exact: true })).toBeVisible();
    await expect(page.locator('.lab-intro-screen')).toHaveCount(0);
    expect(await returnCount(page)).toBe(1);
    await expect.poll(() => page.evaluate(() => (
      (window as unknown as { returnProbe: ReturnProbe }).returnProbe.animations.length
    ))).toBe(2);
    expect(await page.getByRole('banner').boundingBox()).toEqual(header);
    await expect(page.getByRole('banner')).toHaveCSS('transform', 'none');
    if (source === 'sidebar') {
      await page.evaluate(() => {
        for (const animation of (window as unknown as { returnProbe: ReturnProbe }).returnProbe.animations) animation.currentTime = 180;
      });
      await page.screenshot({ path: testInfo.outputPath('learning-path-return.png') });
    }
    await page.evaluate(() => {
      const probe = (window as unknown as { returnProbe: ReturnProbe }).returnProbe;
      for (const animation of probe.animations) animation.finish();
    });
    await expect(page.locator('.lab-return-snapshot')).toHaveCount(0);
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
  expect(await returnCount(page)).toBe(1);
  await expect(page.locator('.lab-return-snapshot')).toHaveCount(0);
  await page.goForward();
  await expect(page).toHaveURL('/labs/changing-relations');
  await expect(page.getByRole('heading', { name: 'Changing Relations', exact: true })).toBeVisible();
  await expect(page.locator('.lab-intro-screen')).toHaveCount(0);
  expect(await returnCount(page)).toBe(1);
});

test('returning with reduced motion navigates immediately without a transition', async ({ page }) => {
  await observeReturns(page);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/labs/time-in-materialize/tutorial/lecture-1');
  await page.getByRole('link', { name: 'Materialize Learning Lab home', exact: true }).click();
  await expect(page).toHaveURL('/');
  await expect(page.getByRole('heading', { name: 'Learning path', exact: true })).toBeVisible();
  expect(await returnCount(page)).toBe(0);
  await expect(page.locator('.lab-return-snapshot')).toHaveCount(0);
});

test('returning from a scrolled lab preserves the outgoing sidebar position', async ({ page }) => {
  await observeReturns(page, true);
  await page.goto('/labs/getting-data-in');
  await page.evaluate(() => window.scrollTo(0, 250));
  await page.getByRole('link', { name: 'Materialize Learning Lab home', exact: true }).evaluate((element) => element.focus({ preventScroll: true }));
  const sidebar = await page.locator('.chapter-sidebar').boundingBox();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL('/');
  const snapshot = page.locator('.lab-return-snapshot');
  expect(await snapshot.locator('.chapter-sidebar').boundingBox()).toEqual(sidebar);
  await expect(snapshot).toHaveAttribute('inert', '');
  await expect(snapshot).toHaveAttribute('aria-hidden', 'true');
  await page.evaluate(() => {
    for (const animation of (window as unknown as { returnProbe: ReturnProbe }).returnProbe.animations) animation.finish();
  });
  await expect(snapshot).toHaveCount(0);
  await expect(page.locator('#main-content')).toHaveCSS('opacity', '1');
  await expect(page.locator('#main-content')).toHaveCSS('transform', 'none');
  await expect(page.locator('.lab-intro-screen')).toHaveCount(0);
});

test('direct home entry and returning from challenges remain immediate', async ({ page }) => {
  await observeReturns(page);
  await page.goto('/');
  expect(await returnCount(page)).toBe(0);
  await page.goto('/challenges');
  await page.getByRole('link', { name: 'Materialize Learning Lab home', exact: true }).click();
  await expect(page).toHaveURL('/');
  expect(await returnCount(page)).toBe(0);
  await expect(page.locator('.lab-return-snapshot')).toHaveCount(0);
});

test('a new navigation interrupts the return without delaying the next lab entry', async ({ page }) => {
  await observeReturns(page, true);
  await page.goto('/labs/changing-relations');
  await page.getByRole('link', { name: 'Materialize Learning Lab home', exact: true }).click();
  await expect(page).toHaveURL('/');
  await expect.poll(() => page.evaluate(() => (
    (window as unknown as { returnProbe: ReturnProbe }).returnProbe.animations.length
  ))).toBe(2);
  await page.getByRole('main').getByRole('link', { name: 'Guided labs', exact: true }).click();
  await expect(page.locator('.lab-intro-screen')).toHaveAttribute('data-phase', 'reacting');
  await expect(page.locator('.lab-return-snapshot')).toHaveCount(0);
  await expect(page.locator('.lab-intro-screen')).toHaveCount(0);
  await expect(page).toHaveURL('/labs/changing-relations');
});
