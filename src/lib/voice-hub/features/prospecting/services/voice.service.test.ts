import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { Birthhub360OutboundPayload } from '../validators/birthhub360.schema.js';

vi.mock('../lib/webhookIdempotency.js', () => ({
  buildBirthhub360OutboundIdempotencyKey: vi
    .fn()
    .mockReturnValue('idempotency:birthhub360-outbound-call:hash:test'),
  claimIdempotencyKey: vi.fn(),
}));

vi.mock('../../../services/settingService.js', () => ({
  getAiConsent: vi.fn(),
}));

import { claimIdempotencyKey } from '../lib/webhookIdempotency.js';
import { getAiConsent } from '../../../services/settingService.js';
import {
  BlandConfigurationError,
  ExternalAiConsentRequiredError,
  VoiceProspectingService,
} from './voice.service.js';

const mockClaim = vi.mocked(claimIdempotencyKey);
const mockGetAiConsent = vi.mocked(getAiConsent);

const basePayload: Birthhub360OutboundPayload = {
  phone_number: '+5511999998888',
  name: 'Fulano de Tal',
  company: 'Acme Logística',
};

const ORIGINAL_ENV = { ...process.env };

beforeEach(() => {
  vi.clearAllMocks();
  process.env = {
    ...ORIGINAL_ENV,
    BLAND_API_KEY: 'bland-test-key',
    BLAND_WEBHOOK_TOKEN: 'token-123',
    WEBHOOK_BASE_URL: 'https://api.birthhub360.com',
    BIRTHHUB360_TENANT_ID: 'tenant-123',
  };
});

afterEach(() => {
  process.env = ORIGINAL_ENV;
});

describe('VoiceProspectingService.triggerOutboundCall', () => {
  it('should throw BlandConfigurationError if BLAND_API_KEY is not defined', async () => {
    delete process.env.BLAND_API_KEY;
    const service = new VoiceProspectingService();
    await expect(service.triggerOutboundCall(basePayload)).rejects.toThrow(BlandConfigurationError);
  });

  it('should throw ExternalAiConsentRequiredError if AI consent is false', async () => {
    mockGetAiConsent.mockResolvedValue({ granted: false } as any);

    const service = new VoiceProspectingService();
    await expect(service.triggerOutboundCall(basePayload)).rejects.toThrow(
      ExternalAiConsentRequiredError,
    );
  });

  it('should return duplicate:true if idempotency key is already claimed', async () => {
    mockGetAiConsent.mockResolvedValue({ granted: true } as any);
    mockClaim.mockResolvedValue(false); // Já usado

    const service = new VoiceProspectingService();
    const result = await service.triggerOutboundCall(basePayload);
    expect(result).toEqual(
      expect.objectContaining({
        success: true,
        duplicate: true,
      }),
    );
  });

  it('should throw if Bland API fetch fails', async () => {
    mockGetAiConsent.mockResolvedValue({ granted: true } as any);
    mockClaim.mockResolvedValue(true);

    const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: false,
      status: 400,
      text: async () => JSON.stringify({ message: 'Bad request' }),
    } as Response);

    const service = new VoiceProspectingService();
    await expect(service.triggerOutboundCall(basePayload)).rejects.toThrow('Bad request');

    fetchSpy.mockRestore();
  });

  it('should return call details if successful', async () => {
    mockGetAiConsent.mockResolvedValue({ granted: true } as any);
    mockClaim.mockResolvedValue(true);

    const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      text: async () => JSON.stringify({ call_id: 'bland-call-abc', status: 'queued' }),
    } as Response);

    const service = new VoiceProspectingService();
    const result = await service.triggerOutboundCall(basePayload);

    expect(result).toEqual({
      success: true,
      duplicate: false,
      message: 'Outbound call triggered successfully via Bland AI',
      callId: 'bland-call-abc',
      status: 'queued',
    });

    expect(fetchSpy).toHaveBeenCalledWith('https://api.bland.ai/v1/calls', {
      method: 'POST',
      headers: {
        Authorization: 'bland-test-key',
        'Content-Type': 'application/json',
      },
      body: expect.stringContaining('"phone_number":"+5511999998888"'),
    });

    fetchSpy.mockRestore();
  });
});
