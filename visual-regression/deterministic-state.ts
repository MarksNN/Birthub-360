import type { Page } from '@playwright/test';

// Freeze the displayed date, not timers: authentication, polling and transitions must still run.
export const VISUAL_REFERENCE_TIME = '2026-01-15T15:00:00.000Z';

export async function setupDeterministicState(page: Page, theme: 'light' | 'dark') {
  await page.clock.setFixedTime(new Date(VISUAL_REFERENCE_TIME));
  await page.addInitScript((selectedTheme) => {
    window.localStorage.setItem('atlas_theme', selectedTheme);
  }, theme);
}

// Call after navigation. Waiting on about:blank only waits for that empty document's fonts.
export async function waitForVisualFonts(page: Page) {
  await page.evaluate(async () => {
    await document.fonts.ready;
  });
}
