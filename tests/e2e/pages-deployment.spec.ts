import { expect, test } from './fixtures';
import { openTools, workspace } from './investigation-flow';

test('direct challenge routes retain their theme and walkthroughs after refresh on static hosting', async ({ page, baseURL }, testInfo) => {
  test.setTimeout(90_000);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  for (const route of ['challenge/', 'challenge']) {
    await page.goto(new URL(route, `${baseURL!.replace(/\/$/, '')}/`).href);
    const shell = page.locator('.app-shell');
    await expect(shell).toHaveClass(/app-shell-challenge/);
    await expect(page.locator('.app-footer')).toHaveCount(0);
    const start = page.getByRole('button', { name: 'Start investigation', exact: true });
    if (await start.count()) await start.click();
    for (const theme of ['light', 'dark']) {
      await page.getByRole('button', { name: `Switch to ${theme} mode`, exact: true }).click();
      const colors = theme === 'light'
        ? { surface: 'rgb(255, 255, 255)', accent: 'rgb(86, 49, 197)' }
        : { surface: 'rgb(32, 29, 38)', accent: 'rgb(177, 139, 243)' };
      await expect(shell).toHaveCSS('background-color', colors.surface);
      await expect(page.locator('.incident-card').first()).toHaveCSS('background-color', colors.surface);
      await expect(page.getByRole('button', { name: 'Review handover', exact: true })).toHaveCSS('background-color', colors.accent);
    }
    await workspace(page, 'SQL'); await openTools(page);
    await page.getByRole('button', { name: 'Explain this page', exact: true }).click();
    await expect(page.locator('.walkthrough-dialog[open]').getByRole('heading', { level: 2 })).toHaveText('SQL');
    await page.keyboard.press('Escape');
    await page.reload();
    await expect(shell).toHaveClass(/app-shell-challenge/);
    await expect(shell).toHaveCSS('background-color', 'rgb(32, 29, 38)');
    await openTools(page);
    await page.getByRole('button', { name: 'Challenge overview', exact: true }).click();
    await page.getByRole('button', { name: 'Full walkthrough', exact: true }).click();
    await page.locator('.walkthrough-dialog[open] [data-walkthrough-action="forward"]').click();
    await expect(page.locator('.walkthrough-dialog[open]').getByRole('heading', { level: 2 })).toHaveText('Start with the operating contract');
    await page.keyboard.press('Escape');
    await page.screenshot({ path: testInfo.outputPath(`static-${route.endsWith('/') ? 'directory' : 'canonical'}.png`) });
  }
});
