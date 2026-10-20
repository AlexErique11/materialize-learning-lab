import type { Page } from '@playwright/test';
import { expect, test } from './fixtures';

async function observeMotion(page: Page) {
  await page.addInitScript(() => {
    const observations = window as unknown as { motionEvents: string[]; motionSamples: { id: string; target: string; duration: number; frames: Keyframe[] }[] };
    observations.motionEvents = [];
    observations.motionSamples = [];
    const animate = Element.prototype.animate;
    Element.prototype.animate = function (frames, options) {
      const animation = animate.call(this, frames, options);
      observations.motionEvents.push(animation.id);
      observations.motionSamples.push({ id: animation.id, target: this.tagName, duration: Number(animation.effect!.getTiming().duration), frames: (animation.effect as KeyframeEffect).getKeyframes() });
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

test('lecture navigation transitions the content while keeping the page stationary', async ({ page }) => {
  await observeMotion(page);
  await page.goto('/labs/changing-relations/tutorial/lecture-1');
  const mobile = page.locator('.mobile-sidebar');
  if (await mobile.isVisible()) await mobile.locator('summary').first().click();
  const header = await page.getByRole('banner').boundingBox();
  await page.locator('.chapter-pages a[href$="/changing-relations/tutorial/lecture-2"]:visible').click();
  await expect(page).toHaveURL('/labs/changing-relations/tutorial/lecture-2');
  await expectMotion(page, 'route-enter');
  await expect(page.locator('#main-content')).not.toHaveAttribute('data-area-transition');
  const routes = await page.evaluate(() => (window as unknown as { motionSamples: { id: string; target: string; duration: number; frames: Keyframe[] }[] }).motionSamples.filter(sample => sample.id.startsWith('ui-motion-route')));
  expect(routes.map(route => route.id)).toEqual(['ui-motion-route-exit', 'ui-motion-route-enter']);
  expect(routes.map(route => route.duration)).toEqual([80, 140]);
  expect(routes.every(route => route.target === 'DIV' && route.frames.every(frame => !('transform' in frame)))).toBe(true);
  expect(await page.getByRole('banner').boundingBox()).toEqual(header);
  const indicator = page.locator('.chapter-pages a[aria-current="page"] .chapter-page-dot:visible');
  // Phone navigation closes after selection; the desktop dot stays visible.
  if (await indicator.count()) await expect(indicator).toHaveCSS('transition-duration', '0.12s, 0.12s');
});

test('overview starts use the same content transition across all six chapters', async ({ page }) => {
  test.setTimeout(60_000);
  await observeMotion(page);
  for (const chapter of ['changing-relations', 'incremental-maintenance', 'views-indexes-materialized-views', 'getting-data-in', 'time-in-materialize', 'progress-and-freshness']) {
    for (const activity of ['tutorial/lecture-1', 'exercises/exercise-1']) {
      await page.goto(`/labs/${chapter}`);
      await page.locator(`.chapter-overview-start[href="/labs/${chapter}/${activity}"]`).click();
      await expect(page).toHaveURL(`/labs/${chapter}/${activity}`);
      await expectMotion(page, 'route-enter');
      await expect(page.locator('#main-content')).not.toHaveAttribute('data-area-transition');
      const targets = await page.evaluate(() => (window as unknown as { motionSamples: { id: string; target: string }[] }).motionSamples.filter(sample => sample.id.startsWith('ui-motion-route')).map(sample => sample.target));
      expect(targets).toEqual(['DIV', 'DIV']);
      await expect(page.locator('.learning-area-content')).toHaveCSS('opacity', '1');
      await expect(page.locator('.learning-area-content')).toHaveCSS('transform', 'none');
    }
  }
});

test('moving to the next exercise uses the same content transition', async ({ page }) => {
  await observeMotion(page);
  await page.goto('/labs/progress-and-freshness/exercises/exercise-1');
  for (let question = 0; question < 4; question++) {
    await page.getByRole('button', { name: 'Show Answer', exact: true }).click();
    await page.getByRole('button', { name: question === 3 ? 'Exercise 2' : 'Next question', exact: true }).click();
  }
  await expect(page).toHaveURL('/labs/progress-and-freshness/exercises/exercise-2');
  await expectMotion(page, 'route-enter');
  await expect(page.locator('#main-content')).not.toHaveAttribute('data-area-transition');
  await expect(page.locator('.guided-lab-title h1')).toHaveText('Exercise 2');
  await expect(page.locator('.learning-area-content')).toHaveCSS('opacity', '1');
});

for (const mode of ['keyboard', 'reduced motion']) {
  test(`${mode} lecture navigation preserves focus and motion preferences`, async ({ page }) => {
    await observeMotion(page);
    if (mode === 'reduced motion') await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/labs/changing-relations/tutorial/lecture-1');
    const mobile = page.locator('.mobile-sidebar');
    if (await mobile.isVisible()) await mobile.locator('summary').first().click();
    const link = page.locator('.chapter-pages a[href$="/changing-relations/tutorial/lecture-2"]:visible');
    if (mode === 'keyboard') {
      await link.focus();
      await page.keyboard.press('Enter');
    } else await link.click();
    await expect(page).toHaveURL('/labs/changing-relations/tutorial/lecture-2');
    if (mode === 'keyboard') await expectMotion(page, 'route-enter');
    else expect(await page.evaluate(() => (window as unknown as { motionEvents: string[] }).motionEvents.filter(id => id.startsWith('ui-motion-route')))).toEqual([]);
    await expect(page.locator('#main-content')).not.toHaveAttribute('data-area-transition');
    await expect(page.locator('#main-content')).toBeFocused();
    await expect(page.locator('.chapter-page-dot').first()).toHaveCSS('transition-duration', '0s');
  });
}

test('learning path and challenges share directional slides and retain history', async ({ page }) => {
  await observeMotion(page);
  await page.goto('/');
  const header = await page.getByRole('banner').boundingBox();
  await page.getByRole('main').getByRole('link', { name: 'Challenges', exact: true }).click();
  await expect(page).toHaveURL('/challenges');
  await expect(page.locator('#main-content')).not.toHaveAttribute('data-area-transition');
  expect(await page.getByRole('banner').boundingBox()).toEqual(header);
  await page.goBack();
  await expect(page).toHaveURL('/');
  await expect(page.locator('#main-content')).not.toHaveAttribute('data-area-transition');
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

const progressPath = '/labs/progress-and-freshness';

for (const lecture of [1, 2, 3]) {
  test(`Chapter 6 lecture ${lecture} softens evidence while keeping progress boundaries exact`, async ({ page }) => {
    await observeMotion(page);
    await page.goto(`${progressPath}/tutorial/lecture-${lecture}`);
    const panel = page.locator('.progress-lane-panel');
    const geometry = () => panel.evaluate(element => {
      const box = element.getBoundingClientRect();
      return { x: box.x, y: box.y + scrollY, width: box.width, height: box.height };
    });
    const before = await geometry();
    await page.getByRole('button', { name: lecture === 3 ? 'Next case' : 'Next change', exact: true }).click();
    await expectMotion(page, 'value');
    const boundaries = await page.locator('.progress-track').evaluateAll(tracks => tracks.map(track => {
      const frontier = track.querySelector<HTMLElement>('.progress-frontier')!;
      const complete = track.querySelector<HTMLElement>('.progress-complete')!;
      return {
        aligned: Math.abs(frontier.getBoundingClientRect().x + frontier.getBoundingClientRect().width / 2 - complete.getBoundingClientRect().right) < 1,
        animated: [...frontier.getAnimations(), ...complete.getAnimations()].some(animation => animation.playState === 'running'),
      };
    }));
    expect(boundaries.every(boundary => boundary.aligned && !boundary.animated)).toBe(true);
    expect(await geometry()).toEqual(before);
    const key = page.getByRole('button', { name: 'Explain diagram symbols', exact: true });
    await key.click();
    await expectMotion(page, 'dialog-enter');
    await page.keyboard.press('Escape');
    await expectMotion(page, 'dialog-exit');
    await expect(key).toBeFocused();
  });
}

test('Chapter 6 split questions animate without moving the aligned diagram or answers', async ({ page, isMobile }) => {
  await observeMotion(page);
  if (!isMobile) await page.setViewportSize({ width: 1366, height: 768 });
  await page.goto(`${progressPath}/exercises/exercise-1`);
  await expect(page.locator('.progress-exercise-layout')).toHaveAttribute('data-aligned', 'true');
  const geometry = () => page.locator('.progress-lane-panel').evaluate(element => {
    const box = element.getBoundingClientRect();
    return { x: box.x, y: box.y, width: box.width, height: box.height };
  });
  const before = await geometry();
  await page.getByRole('button', { name: 'Hint', exact: true }).click();
  await expectMotion(page, 'feedback');
  await page.getByRole('button', { name: 'Show Answer', exact: true }).click();
  await expect(page.locator('.exercise-question')).toHaveAttribute('data-result', 'correct');
  await page.getByRole('button', { name: 'Next question', exact: true }).click();
  await expectMotion(page, 'question');
  await expect(page.locator('.exercise-question h2')).toContainText('Question 2');
  expect(await geometry()).toEqual(before);
  const animations = await page.evaluate(() => (window as unknown as { motionSamples: { id: string; frames: Keyframe[] }[] }).motionSamples.filter(sample => sample.id === 'ui-motion-question').map(sample => sample.frames));
  expect(animations.length).toBeGreaterThan(0);
  expect(animations.flat().every(frame => !frame.transform || frame.transform === 'translateY(0px)')).toBe(true);
});

test('Chapter 6 reduced motion preserves immediate progress, lag and question updates', async ({ page }) => {
  await observeMotion(page);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(`${progressPath}/tutorial/lecture-3`);
  await page.getByRole('button', { name: 'Next case', exact: true }).click();
  await expect(page.getByTestId('progress-case-label')).toContainText('Computation delay');
  await expect(page.getByTestId('lane-join')).toHaveAttribute('aria-label', /frontier 12;/);
  await page.goto(`${progressPath}/exercises/exercise-1`);
  await page.getByRole('button', { name: 'Show Answer', exact: true }).click();
  await page.getByRole('button', { name: 'Next question', exact: true }).click();
  await expect(page.locator('.exercise-question h2')).toContainText('Question 2');
  expect(await page.evaluate(() => (
    (window as unknown as { motionEvents: string[] }).motionEvents.filter(id => id.startsWith('ui-motion-'))
  ))).toEqual([]);
});
