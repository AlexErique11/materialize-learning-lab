import { expect, test } from './fixtures';

test('SUBSCRIBE holds partial changes and publishes complete timestamp groups', async ({ page }) => {
  await page.goto('/labs/live-applications-subscribe/tutorial/lecture-3');
  const next = page.getByRole('button', { name: 'Next change', exact: true });
  const result = page.getByTestId('subscribe-application');
  const row = result.getByRole('row').filter({ hasText: 'EU' });
  for (let change = 0; change < 3; change++) await next.click();
  await expect(row).toContainText('100');
  await expect(page.getByRole('region', { name: 'Pending timestamp tray', exact: true })).toContainText('Open · pending');
  await next.click();
  await expect(row).toContainText('130');
  await expect(result).toContainText('Showing times < 13');
  await page.getByRole('button', { name: 'Diagram key', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Timestamp-tray diagram key', exact: true })).toContainText('mz_progressed = true');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: 'Diagram key', exact: true })).toBeFocused();
});

test('navigation, native help and SQL dialogs stay interactive', async ({ page, isMobile }) => {
  await page.goto('/labs/changing-relations');
  await page.getByRole('link', { name: 'Start tutorial: Lecture 1: Signed changes', exact: true }).click();
  await expect(page).toHaveURL('/labs/changing-relations/tutorial/lecture-1');
  await expect(page.locator('#main-content .learning-area-content')).not.toHaveAttribute('inert');
  const sql = page.getByRole('button', { name: 'SQL & Objectives', exact: true });
  await sql.click();
  await expect(page.getByRole('dialog', { name: 'SQL & Objectives', exact: true })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(sql).toBeFocused();
  const shortcuts = page.getByRole('button', { name: 'Keyboard shortcuts', exact: true });
  await shortcuts.click();
  await expect(page.getByRole('dialog', { name: 'Keyboard shortcuts', exact: true })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(shortcuts).toBeFocused();
  const help = page.getByRole('button', { name: 'About Change ledger', exact: true });
  if (isMobile) await help.tap();
  else await help.hover();
  const tooltip = page.getByRole('tooltip');
  if (isMobile) await page.waitForTimeout(200);
  await expect(tooltip).toBeVisible();
  if (!isMobile) await tooltip.hover();
  await page.keyboard.press('Escape');
  await expect(tooltip).not.toBeVisible();
  await page.goBack();
  await expect(page.getByRole('heading', { name: 'Changing Relations', exact: true })).toBeVisible();
  await expect(page.locator('#main-content .learning-area-content')).not.toHaveAttribute('inert');
});

test('tablet exercise tabs expose real reference content', async ({ page }) => {
  await page.setViewportSize({ width: 768, height: 900 });
  await page.goto('/labs/time-in-materialize/exercises/exercise-1');
  const panels = page.locator('#main-content .temporal-workspace > .temporal-panel');
  for (const stage of ['Source', 'Timeline', 'Result']) {
    await page.locator('.temporal-panel-tabs').getByRole('button', { name: stage, exact: true }).click();
    await expect(panels.filter({ visible: true })).toHaveCount(1);
    const panel = panels.filter({ visible: true });
    if (stage === 'Timeline') await expect(panel.locator('.temporal-clocks')).toBeVisible();
    else await expect(panel.getByRole('table')).toBeVisible();
  }
});

test('exercise feedback and earned completion survive navigation and reload', async ({ page }) => {
  await page.goto('/labs/changing-relations/exercises/exercise-1');
  await page.getByRole('button', { name: 'Check Answer', exact: true }).click();
  await expect(page.locator('.exercise-question')).toHaveAttribute('data-result', 'incorrect');
  for (let question = 0; question < 3; question++) {
    await page.getByRole('button', { name: 'Show Answer', exact: true }).click();
    await expect(page.locator('.exercise-question')).toHaveAttribute('data-result', 'correct');
    if (question < 2) await page.getByRole('button', { name: 'Next question', exact: true }).click();
  }
  await expect(page.locator('#main-content h1 .activity-title-check')).toBeVisible();
  await page.getByRole('button', { name: 'Finish chapter', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Exercise completed', exact: true });
  await expect(dialog).toContainText('You have left:');
  await dialog.getByRole('button', { name: 'Chapter overview', exact: true }).click();
  await expect(page).toHaveURL('/labs/changing-relations');
  await page.goto('/labs/changing-relations/exercises/exercise-1');
  await expect(page.locator('#main-content h1 .activity-title-check')).toBeVisible();
  await page.reload();
  await expect(page.locator('#main-content h1 .activity-title-check')).toBeVisible();
});
