import type { Page } from '@playwright/test';

// Freeze the displayed date, not timers: authentication, polling and transitions must still run.
export const VISUAL_REFERENCE_TIME = '2026-01-15T15:00:00.000Z';

export async function setupDeterministicState(page: Page, theme: 'light' | 'dark') {
  await page.clock.setFixedTime(new Date(VISUAL_REFERENCE_TIME));
  await page.addInitScript((selectedTheme) => {
    // Sincroniza tanto a chave canônica do ThemeContext quanto a legada
    window.localStorage.setItem('birthhub360_theme', selectedTheme);
    window.localStorage.setItem('atlas_theme', selectedTheme);
    window.localStorage.setItem('@prospector:has_seen_tour', 'true');
    const root = document.documentElement;
    root.dataset.theme = selectedTheme;
    if (selectedTheme === 'dark') {
      root.classList.add('dark');
      root.classList.remove('light');
    } else {
      root.classList.add('light');
      root.classList.remove('dark');
    }
  }, theme);

  // Desativa animações, transições e cursores piscando para determinismo absoluto nos snapshots
  await page.addStyleTag({
    content: `
      *, *::before, *::after {
        -moz-animation: none !important;
        -webkit-animation: none !important;
        animation: none !important;
        -moz-transition: none !important;
        -webkit-transition: none !important;
        transition: none !important;
        caret-color: transparent !important;
      }
    `,
  }).catch(() => undefined);
}

// Call after navigation. Waiting on about:blank only waits for that empty document's fonts.
export async function waitForVisualFonts(page: Page) {
  await page.evaluate(async () => {
    await document.fonts.ready;
  });
  // Pequena pausa determinística para layout e font settling no Chromium
  await page.waitForTimeout(150);
}
