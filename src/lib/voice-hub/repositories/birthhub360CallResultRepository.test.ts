import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/prisma.js', () => ({
  prisma: {
    birthhub360CallResult: {
      upsert: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
    },
  },
}));

import { prisma } from '@/lib/prisma.js';
import {
  upsertBirthub360CallResult,
  findBirthub360CallResultByCallId,
  listBirthub360CallResultsForTenant,
} from './birthhub360CallResultRepository.js';

beforeEach(() => vi.clearAllMocks());

// Covers .agents/handoffs/onda-1/06-para-01-persistir-resultado-bland.md.
describe('birthhub360CallResultRepository.upsertBirthub360CallResult', () => {
  it('upserts by callId (idempotent on redelivery, no fake tenant association)', async () => {
    vi.mocked(prisma.birthhub360CallResult.upsert).mockResolvedValue({ id: 'row-1' } as any);

    await upsertBirthub360CallResult({ callId: 'call-123', status: 'completed' });

    expect(prisma.birthhub360CallResult.upsert).toHaveBeenCalledWith({
      where: { callId: 'call-123' },
      create: {
        callId: 'call-123',
        organizationId: null,
        leadId: null,
        status: 'completed',
        completed: null,
        callLength: null,
      },
      update: {
        organizationId: null,
        leadId: null,
        status: 'completed',
        completed: null,
        callLength: null,
      },
    });
  });

  it('passes organizationId through when the caller has one (e.g. BIRTHHUB360_TENANT_ID), but never invents one', async () => {
    vi.mocked(prisma.birthhub360CallResult.upsert).mockResolvedValue({ id: 'row-2' } as any);

    await upsertBirthub360CallResult({
      callId: 'call-456',
      organizationId: 'tenant-abc',
      leadId: 'lead-1',
      status: 'no-answer',
      completed: false,
      callLength: 12.5,
    });

    const call = vi.mocked(prisma.birthhub360CallResult.upsert).mock.calls[0][0];
    expect(call.where).toEqual({ callId: 'call-456' });
    expect(call.create).toMatchObject({
      organizationId: 'tenant-abc',
      leadId: 'lead-1',
      callLength: 12.5,
    });
  });
});

describe('birthhub360CallResultRepository.findBirthub360CallResultByCallId', () => {
  it('looks up by the unique callId', async () => {
    vi.mocked(prisma.birthhub360CallResult.findUnique).mockResolvedValue({
      id: 'row-1',
      callId: 'call-123',
    } as any);

    const result = await findBirthub360CallResultByCallId('call-123');

    expect(prisma.birthhub360CallResult.findUnique).toHaveBeenCalledWith({
      where: { callId: 'call-123' },
    });
    expect(result).toEqual({ id: 'row-1', callId: 'call-123' });
  });
});

describe('birthhub360CallResultRepository.listBirthub360CallResultsForTenant', () => {
  it('scopes strictly to the given organizationId (never trusts client input, AGENTS.md §15)', async () => {
    vi.mocked(prisma.birthhub360CallResult.findMany).mockResolvedValue([{ id: 'row-1' }] as any);
    vi.mocked(prisma.birthhub360CallResult.count).mockResolvedValue(1);

    const result = await listBirthub360CallResultsForTenant('tenant-abc', {
      page: 1,
      pageSize: 20,
    });

    expect(prisma.birthhub360CallResult.findMany).toHaveBeenCalledWith({
      where: { organizationId: 'tenant-abc' },
      orderBy: { receivedAt: 'desc' },
      skip: 0,
      take: 20,
    });
    expect(prisma.birthhub360CallResult.count).toHaveBeenCalledWith({
      where: { organizationId: 'tenant-abc' },
    });
    expect(result).toEqual({ items: [{ id: 'row-1' }], total: 1 });
  });
});
