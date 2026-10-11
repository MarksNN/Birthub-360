import { describe, expect, it } from 'vitest';
import {
  isModuleNotReadyPayload,
  readModuleAvailabilityError,
} from '@/features/voice-hub/lib/moduleNotReady.js';

describe('moduleNotReady helper', () => {
  it('recognizes the fail-closed legacy gate payload', () => {
    expect(
      isModuleNotReadyPayload({
        success: false,
        code: 'MODULE_NOT_READY',
        module: 'voice-hub',
        error: 'Módulo indisponível: integração segura por organização ainda não concluída.',
      }),
    ).toBe(true);
    expect(isModuleNotReadyPayload({ success: true })).toBe(false);
  });

  it('surfaces MODULE_NOT_READY and generic 503 without inventing success', async () => {
    const gated = await readModuleAvailabilityError(
      { ok: false, status: 503 } as Response,
      {
        success: false,
        code: 'MODULE_NOT_READY',
        module: 'voice-hub',
        error: 'Módulo indisponível: integração segura por organização ainda não concluída.',
      },
    );
    expect(gated).toMatch(/organização/);

    const plain503 = await readModuleAvailabilityError(
      { ok: false, status: 503 } as Response,
      { message: 'down' },
    );
    expect(plain503).toMatch(/503/);

    const ok = await readModuleAvailabilityError({ ok: true, status: 200 } as Response, {
      callLogs: [],
    });
    expect(ok).toBeNull();
  });
});
