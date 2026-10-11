import type { Page } from '@playwright/test';
import { expect } from './fixtures';

export const chapterFourFrame = ['h1', '.guided-lab-title > p', '.guided-lab-controls', '.ingestion-status-bar', '.ingestion-layout', '.relation-playback-controls'];

export const chapterFourUsesTabs = (width: number, height: number) => width < 1024 || (width <= 1150 && height <= 700);

export async function expectIngestionLayoutToFit(page: Page) {
  const sizes = await page.evaluate(() => {
    const visible = (element: Element) => element.getClientRects().length > 0;
    return {
      pageFits: document.documentElement.scrollHeight <= innerHeight && document.documentElement.scrollWidth <= innerWidth,
      tables: Array.from(document.querySelectorAll<HTMLElement>('.ingestion-layout .table-scroll')).filter(visible).map((element) => ({
        label: element.getAttribute('aria-label'), height: element.clientHeight, contentHeight: element.scrollHeight,
        width: element.clientWidth, contentWidth: element.scrollWidth,
      })),
      panels: Array.from(document.querySelectorAll<HTMLElement>('.ingestion-layout .ingestion-panel')).filter(visible).map((panel) => ({
        stage: panel.dataset.stage, bottom: panel.getBoundingClientRect().bottom,
        contentBottom: Math.max(...Array.from(panel.querySelectorAll(':scope > *, .maintenance-diffs h3, .maintenance-diffs li, .maintenance-diffs p')).filter(visible).map((child) => child.getBoundingClientRect().bottom)),
      })),
    };
  });
  expect(sizes.pageFits, 'Chapter 4 fits without scrolling').toBe(true);
  for (const table of sizes.tables) {
    expect(table.contentHeight, table.label!).toBeLessThanOrEqual(table.height + 1);
    expect(table.contentWidth, table.label!).toBeLessThanOrEqual(table.width + 1);
  }
  for (const panel of sizes.panels) expect(panel.contentBottom, panel.stage).toBeLessThanOrEqual(panel.bottom + 1);
}
