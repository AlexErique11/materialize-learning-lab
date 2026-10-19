import type { Page } from '@playwright/test';
import { expect, test } from './fixtures';

async function observeMotion(page: Page) {
  await page.addInitScript(() => {
    (window as unknown as { motionEvents: string[] }).motionEvents = [];
    const animate = Element.prototype.animate;
    Element.prototype.animate = function (frames, options) {
      const animation = animate.call(this, frames, options);
      (window as unknown as { motionEvents: string[] }).motionEvents.push(animation.id);
      return animation;
    };
  });
}

async function expectMotion(page: Page, name: string) {
  await expect.poll(() => page.evaluate((id) => (
    (window as unknown as { motionEvents: string[] }).motionEvents.includes(id)
  ), `ui-motion-${name}`)).toBe(true);
}

test('SQL dialogs animate both directions and restore keyboard focus after repeated use', async ({ page }) => {
  await observeMotion(page);
  await page.goto('/labs/getting-data-in/tutorial/lecture-2');
  const trigger = page.getByRole('button', { name: 'SQL & Objectives', exact: true });
  const dialog = page.getByRole('dialog', { name: 'SQL & Objectives', exact: true });
  for (let index = 0; index < 2; index += 1) {
    await trigger.click();
    await expect(dialog).toBeVisible();
    await expectMotion(page, 'dialog-enter');
    await page.keyboard.press('Escape');
    await expect(dialog).not.toBeVisible();
    await expect(trigger).toBeFocused();
  }
  await expectMotion(page, 'dialog-exit');
});

test('guided steps keep their placement and soften explanations and metric changes', async ({ page }) => {
  await observeMotion(page);
  await page.goto('/labs/changing-relations/tutorial/lecture-1');
  await page.getByRole('button', { name: 'Start guided run', exact: true }).click();
  const guide = page.getByRole('dialog');
  await expect(guide).toBeVisible();
  await guide.getByRole('button', { name: 'Next', exact: true }).click();
  await expectMotion(page, 'guide-step');
  await expectMotion(page, 'guide-target');
  const reveal = guide.getByRole('button', { name: 'Show effect', exact: true });
  if (await reveal.isVisible()) await reveal.click();
  await expectMotion(page, 'value');
  await page.keyboard.press('Escape');
  await expect(guide).not.toBeVisible();
});

test('question changes and feedback preserve native progress and answer controls', async ({ page }) => {
  await observeMotion(page);
  await page.goto('/labs/time-in-materialize/exercises/exercise-1');
  await page.getByRole('button', { name: 'Hint', exact: true }).click();
  await expectMotion(page, 'feedback');
  await page.getByRole('button', { name: 'Show Answer', exact: true }).click();
  await expect(page.getByRole('progressbar', { name: 'Exercise questions completed' })).toHaveAttribute('value', '1');
  await page.getByRole('button', { name: 'Next question', exact: true }).click();
  await expectMotion(page, 'question');
  await expect(page.locator('.exercise-question h2')).toContainText('Question 2');
  await expect(page.getByRole('button', { name: 'Check Answer', exact: true })).toBeEnabled();
  await expect(page.locator('.exercise-question-navigation')).toHaveCount(1);
});

test('native disclosures reverse rapid toggles and keep their keyboard behavior', async ({ page }) => {
  await observeMotion(page);
  await page.goto('/labs/getting-data-in');
  const details = page.locator('.chapter-learn-more');
  await details.locator('summary').evaluate((summary) => { const control = summary as HTMLElement; control.click(); control.click(); control.click(); });
  await expect(details).toHaveJSProperty('open', true);
  await expect(details.locator('ul')).not.toHaveAttribute('inert');
  await details.locator('summary').focus();
  await page.keyboard.press('Enter');
  await expect(details).toHaveJSProperty('open', false);
  await expectMotion(page, 'disclosure-open');
  await expectMotion(page, 'disclosure-close');
});

test('sidebar resizing settles at its original layout and supports rapid reversal', async ({ page, isMobile }) => {
  test.skip(isMobile, 'Phones use the native navigation disclosure.');
  await observeMotion(page);
  await page.goto('/labs/getting-data-in/tutorial/lecture-2');
  const sidebar = page.locator('.learning-area');
  const content = page.locator('.learning-area-content');
  const initial = await content.boundingBox();
  await page.getByRole('button', { name: 'Collapse chapter navigation', exact: true }).click();
  await expectMotion(page, 'sidebar-layout');
  await expect(sidebar).not.toHaveAttribute('data-motion-sidebar');
  await expect(sidebar).toHaveAttribute('data-sidebar-collapsed', 'true');
  const collapsed = await content.boundingBox();
  expect(collapsed!.x).toBeLessThan(initial!.x);
  await page.getByRole('button', { name: 'Expand chapter navigation', exact: true }).click();
  await page.getByRole('button', { name: 'Collapse chapter navigation', exact: true }).click();
  await page.getByRole('button', { name: 'Expand chapter navigation', exact: true }).click();
  await expect(sidebar).not.toHaveAttribute('data-motion-sidebar');
  expect(await content.boundingBox()).toEqual(initial);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('lecture navigation keeps the header and navigation stationary', async ({ page }) => {
  await observeMotion(page);
  await page.goto('/labs/changing-relations/tutorial/lecture-1');
  const mobile = page.locator('.mobile-sidebar');
  if (await mobile.isVisible()) await mobile.locator('summary').first().click();
  const header = await page.getByRole('banner').boundingBox();
  await page.locator('.chapter-pages a[href$="/changing-relations/tutorial/lecture-2"]:visible').click();
  await expect(page).toHaveURL('/labs/changing-relations/tutorial/lecture-2');
  await expectMotion(page, 'route');
  expect(await page.getByRole('banner').boundingBox()).toEqual(header);
});

test('learning path and challenges share the page slide and retain history', async ({ page }) => {
  await observeMotion(page);
  await page.goto('/');
  const header = await page.getByRole('banner').boundingBox();
  await page.getByRole('main').getByRole('link', { name: 'Challenges', exact: true }).click();
  await expect(page).toHaveURL('/challenges');
  await expect(page.locator('.lab-return-snapshot')).toHaveCount(0);
  expect(await page.getByRole('banner').boundingBox()).toEqual(header);
  await page.goBack();
  await expect(page).toHaveURL('/');
  await expect(page.locator('.lab-return-snapshot')).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Learning path', exact: true })).toBeVisible();
});

test('metric help reveals and dismisses from the keyboard without losing its anchor', async ({ page }) => {
  await observeMotion(page);
  await page.goto('/labs/getting-data-in/tutorial/lecture-2');
  const help = page.getByRole('button', { name: 'About Records read', exact: true });
  await help.focus();
  const tooltip = page.getByRole('tooltip').filter({ hasText: 'Incoming messages read' });
  await expect(tooltip).toBeVisible();
  await expectMotion(page, 'tooltip');
  await page.keyboard.press('Escape');
  await expect(tooltip).not.toBeVisible();
  await expect(help).toBeFocused();
});

test('reduced motion keeps dialogs, disclosures, values and progress immediate', async ({ page }) => {
  await observeMotion(page);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/labs/changing-relations/tutorial/lecture-1');
  await page.getByRole('button', { name: 'SQL & Objectives', exact: true }).click();
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Next change', exact: true }).click();
  await expect(page.getByRole('progressbar', { name: 'Changes progress' })).toHaveAttribute('value', '1');
  expect(await page.evaluate(() => (
    (window as unknown as { motionEvents: string[] }).motionEvents.filter((id) => id.startsWith('ui-motion-'))
  ))).toEqual([]);
  await expect(page.locator('.progress-motion-fill').last()).toHaveCSS('transition-duration', '0s');
});

const objectsPath = '/labs/views-indexes-materialized-views';

test('Chapter 3 sidebar navigation preserves the measured graph and playback frame', async ({ page, isMobile }) => {
  test.skip(isMobile, 'The expanded desktop sidebar exercises the measured full-page frame.');
  await page.goto(`${objectsPath}/tutorial/lecture-1`);
  const geometry = () => page.evaluate(() => ({
    canvas: document.querySelector('.flow-canvas')!.getBoundingClientRect().top + scrollY,
    playback: document.querySelector('.relation-playback-controls')!.getBoundingClientRect().top + scrollY,
    pageHeight: document.documentElement.scrollHeight,
  }));
  const before = await geometry();
  for (const lecture of [2, 3, 1]) {
    await page.locator(`.chapter-pages a[href="${objectsPath}/tutorial/lecture-${lecture}"]:visible`).click();
    await expect(page).toHaveURL(`${objectsPath}/tutorial/lecture-${lecture}`);
    await expect.poll(geometry).toEqual(before);
  }
});

test('Chapter 3 query routes animate only after an action and retain exact answers', async ({ page, isMobile }) => {
  await observeMotion(page);
  await page.goto(`${objectsPath}/tutorial/lecture-2`);
  await expect(page.locator(`${isMobile ? '.flow-overview' : '.flow-connectors'} [data-flow-edge]`).first()).toBeAttached();
  expect(await page.evaluate(() => (
    (window as unknown as { motionEvents: string[] }).motionEvents.filter((id) => id.startsWith('ui-motion-flow-'))
  ))).toEqual([]);
  const canvas = await page.locator('.flow-canvas').boundingBox();
  const result = page.getByTestId('object-query-result');
  await page.getByRole('button', { name: 'Run query', exact: true }).click();
  await expect(result).toContainText('Local memory');
  await expectMotion(page, 'flow-query');
  await page.getByLabel('Query cluster', { exact: true }).selectOption('b');
  await page.getByRole('button', { name: 'Run query', exact: true }).click();
  await expect(result).toContainText('Compute query');
  await expectMotion(page, 'flow-object');
  await expectMotion(page, 'flow-edge');
  await page.getByLabel('Query object', { exact: true }).selectOption('revenue_mv');
  await page.getByRole('button', { name: 'Run query', exact: true }).click();
  await expect(result).toContainText('Durable storage');
  await expect(result).toContainText('North $150');
  expect(await page.locator('.flow-canvas').boundingBox()).toEqual(canvas);
});

test('Chapter 3 object updates keep past query snapshots and support Back', async ({ page, isMobile }) => {
  await observeMotion(page);
  await page.goto(`${objectsPath}/tutorial/lecture-1`);
  const next = page.getByRole('button', { name: 'Next change', exact: true });
  await next.click();
  await expectMotion(page, isMobile ? 'flow-panel' : 'value');
  await next.click();
  await next.click();
  await expectMotion(page, 'flow-object');
  const index = page.getByRole('region', { name: 'Cluster A view index result', exact: true });
  if (isMobile) await page.locator('.flow-overview').getByRole('button', { name: 'Cluster A', exact: true }).click();
  await expect(index).toContainText('$150');
  await next.click();
  await expect(index).toContainText('$170');
  await expect(page.getByTestId('object-query-result')).toContainText('North $150');
  await page.getByRole('button', { name: 'Previous change', exact: true }).click();
  await expect(index).toContainText('$150');
});

test('Chapter 3 exercises retain question motion inside the new workspace frame', async ({ page }) => {
  await observeMotion(page);
  await page.goto(`${objectsPath}/exercises/exercise-1`);
  const graphBox = () => page.locator('.flow-canvas').evaluate((element) => {
    const box = element.getBoundingClientRect();
    return { top: box.top + scrollY, height: box.height, width: box.width };
  });
  const before = await graphBox();
  await page.getByRole('button', { name: 'Hint', exact: true }).click();
  await expectMotion(page, 'feedback');
  await page.getByRole('button', { name: 'Show Answer', exact: true }).click();
  await expect(page.getByRole('progressbar', { name: 'Exercise questions completed' })).toHaveAttribute('value', '1');
  await page.getByRole('button', { name: 'Next question', exact: true }).click();
  await expectMotion(page, 'question');
  await expect(page.locator('.exercise-question h2')).toContainText('Question 2');
  expect(await graphBox()).toEqual(before);
  await expect(page.locator('.exercise-question-navigation')).toHaveCount(1);
});

test('compact flow navigation stays anchored while a button is pressed', async ({ page }) => {
  await observeMotion(page);
  await page.setViewportSize({ width: 1024, height: 768 });
  await page.goto(`${objectsPath}/tutorial/lecture-2`);
  const button = page.locator('.flow-overview').getByRole('button', { name: 'Cluster B', exact: true });
  const before = (await button.boundingBox())!;
  const transform = await button.evaluate((element) => getComputedStyle(element).transform);
  await page.mouse.move(before.x + before.width / 2, before.y + before.height / 2);
  await page.mouse.down();
  try {
    await expect(button).toHaveCSS('transform', transform);
    const pressed = (await button.boundingBox())!;
    expect(pressed.x).toBeCloseTo(before.x, 1);
    expect(Math.abs(pressed.y - before.y)).toBeLessThanOrEqual(1.1);
  } finally { await page.mouse.up(); }
  await expect(page.locator('.flow-cluster-b')).toBeVisible();
  await expectMotion(page, 'flow-panel');
  await button.focus();
  await page.keyboard.press('Enter');
  await expect(button).toHaveAttribute('aria-pressed', 'true');
});

test('Chapter 3 reduced motion updates graph objects, edges and query answers immediately', async ({ page }) => {
  await observeMotion(page);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(`${objectsPath}/tutorial/lecture-2`);
  await page.getByLabel('Query cluster', { exact: true }).selectOption('b');
  await page.getByRole('button', { name: 'Run query', exact: true }).click();
  await expect(page.getByTestId('object-query-result')).toContainText('Compute query');
  expect(await page.evaluate(() => (
    (window as unknown as { motionEvents: string[] }).motionEvents.filter((id) => id.startsWith('ui-motion-'))
  ))).toEqual([]);
});
