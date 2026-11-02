import type { Page } from '@playwright/test';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  setupDeterministicState,
  VISUAL_REFERENCE_TIME,
  waitForVisualFonts,
} from '../../visual-regression/deterministic-state';

afterEach(() => vi.unstubAllGlobals());

describe('visual regression deterministic state', () => {
  it.each(['light', 'dark'] as const)(
    'sets %s before navigation without freezing timers',
    async (theme) => {
      const setFixedTime = vi.fn().mockResolvedValue(undefined);
      const addInitScript = vi.fn().mockResolvedValue(undefined);
      const addStyleTag = vi.fn().mockResolvedValue(undefined);
      const evaluate = vi.fn();
      const page = { clock: { setFixedTime }, addInitScript, addStyleTag, evaluate } as unknown as Page;

      await setupDeterministicState(page, theme);

      expect(setFixedTime).toHaveBeenCalledExactlyOnceWith(new Date(VISUAL_REFERENCE_TIME));
      expect(addInitScript).toHaveBeenCalledWith(expect.any(Function), theme);
      expect(addStyleTag).toHaveBeenCalledOnce();
      expect(evaluate).not.toHaveBeenCalled();
      const setItem = vi.fn();
      vi.stubGlobal('window', { localStorage: { setItem } });
      const [initialize, selectedTheme] = addInitScript.mock.calls[0];
      initialize(selectedTheme);
      expect(setItem).toHaveBeenCalledExactlyOnceWith('atlas_theme', theme);
    },
  );

  it('waits for the current document fonts instead of resolving before fonts load', async () => {
    let resolveFonts!: () => void;
    const fontsReady = new Promise<void>((resolve) => {
      resolveFonts = resolve;
    });
    vi.stubGlobal('document', { fonts: { ready: fontsReady } });
    const evaluate = vi.fn(async (callback: () => Promise<void>) => callback());
    const waitForTimeout = vi.fn().mockResolvedValue(undefined);
    const page = { evaluate, waitForTimeout } as unknown as Page;
    const completed = vi.fn();

    const waiting = waitForVisualFonts(page).then(completed);
    await Promise.resolve();
    expect(completed).not.toHaveBeenCalled();
    resolveFonts();
    await waiting;

    expect(evaluate).toHaveBeenCalledOnce();
    expect(waitForTimeout).toHaveBeenCalledWith(150);
    expect(completed).toHaveBeenCalledOnce();
  });

  it('propagates font loading errors to the visual test', async () => {
    const failure = new Error('font loading failed');
    vi.stubGlobal('document', { fonts: { ready: Promise.reject(failure) } });
    const page = {
      evaluate: (callback: () => Promise<void>) => callback(),
      waitForTimeout: vi.fn().mockResolvedValue(undefined),
    } as unknown as Page;

    await expect(waitForVisualFonts(page)).rejects.toThrow(failure);
  });
});
