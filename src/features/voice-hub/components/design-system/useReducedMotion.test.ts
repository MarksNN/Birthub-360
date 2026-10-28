// @vitest-environment jsdom

import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { usePrefersReducedMotion } from './useReducedMotion.js';

afterEach(() => {
  delete document.documentElement.dataset.reducedMotion;
  vi.unstubAllGlobals();
});

describe('usePrefersReducedMotion', () => {
  it('is false by default (no OS preference, no in-app toggle)', () => {
    const { result } = renderHook(() => usePrefersReducedMotion());
    expect(result.current).toBe(false);
  });

  it('does not throw in an environment without window.matchMedia (e.g. jsdom-lite/SSR-ish setups)', () => {
    vi.stubGlobal('matchMedia', undefined);

    expect(() => renderHook(() => usePrefersReducedMotion())).not.toThrow();
  });

  it('reflects the in-app `data-reduced-motion` toggle set by Preferences', async () => {
    const { result } = renderHook(() => usePrefersReducedMotion());
    expect(result.current).toBe(false);

    act(() => {
      document.documentElement.dataset.reducedMotion = 'true';
    });

    await waitFor(() => expect(result.current).toBe(true));
  });
});
