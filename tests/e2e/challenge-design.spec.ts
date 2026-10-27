import { expect, test } from './fixtures';

test('challenge shares lecture chrome and supports incident shortcuts and motion', async ({ page }) => {
  await page.addInitScript(() => {
    const events: string[] = [];
    (window as unknown as { challengeMotion: string[] }).challengeMotion = events;
    const animate = Element.prototype.animate;
    Element.prototype.animate = function (frames, options) {
      const animation = animate.call(this, frames, options);
      events.push(animation.id);
      return animation;
    };
  });
  const appearance = () => page.evaluate(() => {
    const heading = getComputedStyle(document.querySelector('.guided-lab-title h1')!);
    const button = getComputedStyle(document.querySelector('.guided-lab-controls .button')!);
    return { font: heading.fontFamily, size: heading.fontSize, weight: heading.fontWeight, buttonHeight: button.height, buttonBorder: button.borderColor };
  });
  await page.goto('/labs/changing-relations/tutorial/lecture-1');
  const lecture = await appearance();
  await page.goto('/challenge');
  await page.getByRole('button', { name: 'Start incident', exact: true }).click();
  expect(await appearance()).toEqual(lecture);
  await expect(page.locator('.chapter-sidebar')).toHaveCount(0);
  await expect(page.getByRole('navigation', { name: 'Incident checkpoints' }).getByRole('button')).toHaveCount(6);
  await expect(page.getByRole('progressbar', { name: 'Incident repairs applied' })).toHaveAttribute('value', '0');
  await page.getByRole('button', { name: 'Keyboard shortcuts' }).click();
  const help = page.getByRole('dialog', { name: 'Keyboard shortcuts' });
  await expect(help).toContainText('Apply verified repair');
  await expect(help).not.toContainText('Chapter complete');
  await page.keyboard.press('Escape');
  await page.locator('#main-content').focus();
  await page.keyboard.press('h');
  await expect(page.getByText('Hint 1 of 2', { exact: true })).toBeVisible();
  await page.keyboard.press('Control+Enter');
  await expect(page.getByRole('radio', { name: 'UPSERT — latest value for a key', exact: true })).toBeChecked();
  await page.keyboard.press('s');
  await expect(page.getByRole('dialog', { name: 'SQL & Objectives', exact: true })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog', { name: 'SQL & Objectives', exact: true })).not.toBeVisible();
  await page.locator('#main-content').focus();
  await page.keyboard.press('Enter');
  await expect(page.getByText('Repair verified', { exact: true })).toBeVisible();
  await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('heading', { name: 'Place maintained state', exact: true })).toBeVisible();
  await expect(page.getByRole('progressbar', { name: 'Incident repairs applied' })).toHaveAttribute('value', '1');
  await expect.poll(() => page.evaluate(() => (window as unknown as { challengeMotion: string[] }).challengeMotion)).toEqual(expect.arrayContaining(['ui-motion-checkpoint', 'ui-motion-feedback', 'ui-motion-dialog-enter']));
  expect(await page.evaluate(() => scrollY)).toBe(0);
});

for (const reduced of [false, true]) {
  test(`main Challenge entry reuses the lab loading screen${reduced ? ' with reduced motion' : ''}`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: reduced ? 'reduce' : 'no-preference' });
    await page.goto('/');
    await page.getByRole('main').getByRole('link', { name: 'Challenge', exact: true }).click();
    await expect(page).toHaveURL('/challenge');
    if (!reduced) {
      await expect(page.getByRole('status', { name: 'Preparing challenge' })).toBeVisible();
      await expect(page.getByText('Preparing your incident', { exact: true })).toBeVisible();
      await expect(page.locator('.lab-entry-background')).toHaveAttribute('inert', '');
    }
    await expect(page.locator('.lab-intro-screen')).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Start incident', exact: true })).toBeVisible();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await page.getByRole('button', { name: 'Start incident', exact: true }).click();
    await page.reload();
    await expect(page.getByRole('heading', { name: 'Repair the feed', exact: true })).toBeVisible();
    await expect(page.locator('.lab-intro-screen')).toHaveCount(0);
  });
}
