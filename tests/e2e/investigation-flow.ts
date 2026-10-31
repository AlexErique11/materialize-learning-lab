import type { Page } from '@playwright/test';
import { expect } from './fixtures';
export const predicate = "o.status = 'paid' AND mz_now() >= o.event_at AND mz_now() < o.event_at + INTERVAL '5 minutes'";
export async function workspace(page: Page, name: string) { await page.getByRole('navigation', { name: 'Investigation workspaces' }).getByRole('button', { name, exact: true }).click(); }
export async function openTools(page: Page) {
  const toggle = page.getByRole('button', { name: 'Tools', exact: true });
  if (await toggle.isVisible() && await toggle.getAttribute('aria-expanded') === 'false') await toggle.click();
}
export async function start(page: Page) { await page.getByRole('button', { name: 'Start investigation', exact: true }).click(); }
export async function selectSnapshot(page: Page) {
  await page.getByRole('combobox', { name: 'Scenario replay snapshot', exact: true }).selectOption({ label: '622.999 s' });
}
export async function repairSource(page: Page) {
  await workspace(page, 'Data');
  await page.getByRole('combobox', { name: 'Order envelope', exact: true }).selectOption('UPSERT');
  await page.getByRole('combobox', { name: 'Order identity', exact: true }).selectOption('order_id');
  const apply = page.getByRole('button', { name: 'Apply changes', exact: true });
  if (await apply.isEnabled()) await apply.click();
}
export async function repairQuery(page: Page, sql = predicate) {
  await workspace(page, 'SQL');
  await selectSnapshot(page);
  await page.getByRole('textbox', { name: 'Temporal WHERE predicate', exact: true }).fill(sql);
  await page.getByRole('button', { name: 'Run query preview', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Apply query', exact: true })).toBeEnabled({ timeout: 45000 });
  await page.getByRole('button', { name: 'Apply query', exact: true }).click();
}
export async function restoreServing(page: Page) {
  await workspace(page, 'System');
  await page.getByRole('combobox', { name: 'Recent-orders helper', exact: true }).selectOption('view');
  await page.getByRole('combobox', { name: 'Regional totals', exact: true }).selectOption('materialized');
  await page.getByRole('combobox', { name: 'Serving indexes', exact: true }).selectOption('both');
  const apply = page.getByRole('button', { name: 'Apply changes', exact: true });
  if (await apply.isEnabled()) await apply.click();
  const resume = page.getByRole('button', { name: 'Resume customer connection', exact: true });
  if (await resume.count()) await resume.click();
  const next = page.getByRole('button', { name: 'Process pending updates', exact: true });
  if (await next.isEnabled()) await next.click();
  await page.getByRole('button', { name: 'Request normal read', exact: true }).click();
  await expect(page.getByText('Normal read available', { exact: true })).toBeVisible();
}
export async function repairClient(page: Page) {
  await workspace(page, 'Client');
  await page.getByRole('combobox', { name: 'Publish application updates', exact: true }).selectOption('complete');
  const apply = page.getByRole('button', { name: 'Apply changes', exact: true });
  if (await apply.isEnabled()) await apply.click();
}
export async function handover(page: Page) {
  await page.getByRole('button', { name: 'Review handover', exact: true }).click();
  await page.getByRole('button', { name: 'Run acceptance checks', exact: true }).click();
  await expect(page.getByText(/^Passed ·/)).toHaveCount(5, { timeout: 45000 });
  await page.getByRole('button', { name: 'Complete handover', exact: true }).click();
  const celebration = page.getByRole('dialog', { name: 'Congratulations!', exact: true });
  await expect(celebration).toContainText('Congratulations on finishing the challenge!');
  await celebration.getByRole('button', { name: 'View handover', exact: true }).click();
}
export async function completeInvestigation(page: Page, reverse = false) {
  await start(page);
  if (reverse) { await repairClient(page); await restoreServing(page); }
  await repairSource(page);
  await repairQuery(page);
  if (!reverse) await repairClient(page);
  await restoreServing(page);
  await workspace(page, 'Client');
  for (let i = 0; i < 8; i++) await page.getByRole('button', { name: 'Receive and process delivery', exact: true }).click();
  await expect(page.getByTestId('subscribe-application')).toContainText('90');
  await handover(page);
}
