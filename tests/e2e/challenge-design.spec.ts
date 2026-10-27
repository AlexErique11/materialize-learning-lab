import { expect, test } from './fixtures';
import { start, workspace } from './investigation-flow';

test('investigation shares lecture chrome while exposing free workspaces and no fault checklist', async ({ page }) => {
  const appearance = () => page.evaluate(() => {
    const title = getComputedStyle(document.querySelector('.guided-lab-title h1')!);
    const control = getComputedStyle(document.querySelector('.guided-lab-controls .button')!);
    return { font: title.fontFamily, size: title.fontSize, weight: title.fontWeight, height: control.height, border: control.borderColor };
  });
  await page.goto('/labs/changing-relations/tutorial/lecture-1'); const reference = await appearance();
  await page.goto('/challenge'); await start(page); expect(await appearance()).toEqual(reference);
  await expect(page.locator('.chapter-sidebar')).toHaveCount(0);
  await expect(page.getByRole('navigation', { name: 'Investigation workspaces' }).getByRole('button')).toHaveCount(5);
  await expect(page.getByRole('progressbar')).toHaveCount(0);
  await page.getByRole('button', { name: 'Reference', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Incident reference', exact: true });
  await expect(dialog).not.toContainText('o.event_at + INTERVAL');
  await page.keyboard.press('Escape'); await expect(dialog).not.toBeVisible();
  await page.getByRole('button', { name: 'Keyboard shortcuts', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Keyboard shortcuts', exact: true })).toContainText('Run SQL in the editor');
  await page.keyboard.press('Escape');
  for (const viewport of [{ width: 1440, height: 1000 }, { width: 1280, height: 640 }, { width: 768, height: 900 }, { width: 390, height: 844 }, { width: 320, height: 640 }]) {
    await page.setViewportSize(viewport);
    for (const name of ['Dashboard', 'SQL', 'System', 'Client']) {
      await workspace(page, name);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    }
  }
  await page.getByRole('button', { name: 'Switch to dark mode', exact: true }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.getByRole('button', { name: 'Pause', exact: true }).click();
  await expect(page.getByText('Investigation paused', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Resume investigation', exact: true }).click();
});

for (const reduced of [false, true]) {
  test(`main Challenge entry reuses loading and restores work${reduced ? ' with reduced motion' : ''}`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: reduced ? 'reduce' : 'no-preference' });
    await page.goto('/'); await page.getByRole('main').getByRole('link', { name: 'Challenge', exact: true }).click();
    if (!reduced) await expect(page.getByRole('status', { name: 'Preparing challenge', exact: true })).toBeVisible();
    await expect(page.locator('.lab-intro-screen')).toHaveCount(0);
    await start(page); await workspace(page, 'Data'); await page.reload();
    await expect(page.getByRole('heading', { name: 'Current orders relation', exact: true })).toBeVisible();
    await expect(page.locator('.lab-intro-screen')).toHaveCount(0);
  });
}
