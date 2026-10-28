import { beforeEach, describe, expect, it, vi } from 'vitest';

const db = vi.hoisted(() => ({ create: vi.fn(), findMany: vi.fn() }));
vi.mock('../../../lib/prisma.js', () => ({ prisma: { optOutRecord: db } }));

import { PrismaOptOutRepository as LegacyRepository } from '../../../features/cadence/infra/PrismaOptOutRepository.js';
import { PrismaOptOutRepository } from '../PrismaOptOutRepository.js';

const row = {
  id: 'opt-out-1',
  organizationId: 'tenant-a',
  scope: 'Global',
  leadId: 'lead-1',
  email: 'lead@example.test',
  phoneE164: null,
  originChannel: 'email',
  reason: null,
  evidence: null,
  requestedBy: null,
  createdAt: new Date('2026-10-09T12:00:00Z'),
};

describe('shared PrismaOptOutRepository', () => {
  beforeEach(() => vi.resetAllMocks());

  it('preserves the public repository class when importing the legacy path', () => {
    expect(LegacyRepository).toBe(PrismaOptOutRepository);
  });

  it('filters matches by tenant and identifiers and maps global scope', async () => {
    db.findMany.mockResolvedValue([row]);
    const records = await new PrismaOptOutRepository().findMatches('tenant-a', {
      leadId: 'lead-1',
      email: 'lead@example.test',
      phoneE164: null,
    });
    expect(db.findMany).toHaveBeenCalledWith({
      where: {
        organizationId: 'tenant-a',
        OR: [{ leadId: 'lead-1' }, { email: 'lead@example.test' }],
      },
    });
    expect(records[0]).toMatchObject({ organizationId: 'tenant-a', scope: 'global' });
  });

  it('never queries all opt-outs when identifiers are absent', async () => {
    expect(
      await new PrismaOptOutRepository().findMatches('tenant-b', {
        leadId: null,
        email: null,
        phoneE164: null,
      }),
    ).toEqual([]);
    expect(db.findMany).not.toHaveBeenCalled();
  });

  it('persists tenant and scope without discarding opt-out evidence', async () => {
    db.create.mockResolvedValue(row);
    await new PrismaOptOutRepository().create({
      organizationId: 'tenant-a',
      scope: 'global',
      leadId: 'lead-1',
      email: 'lead@example.test',
      phoneE164: null,
      originChannel: 'email',
      reason: 'unsubscribe',
      evidence: 'STOP',
      requestedBy: null,
    });
    expect(db.create).toHaveBeenCalledWith({
      data: {
        organizationId: 'tenant-a',
        scope: 'Global',
        leadId: 'lead-1',
        email: 'lead@example.test',
        phoneE164: null,
        originChannel: 'email',
        reason: 'unsubscribe',
        evidence: 'STOP',
        requestedBy: null,
      },
    });
  });

  it('propagates persistence failures instead of reporting successful suppression', async () => {
    db.findMany.mockRejectedValue(new Error('database unavailable'));
    await expect(
      new PrismaOptOutRepository().findMatches('tenant-a', {
        leadId: 'lead-1',
        email: null,
        phoneE164: null,
      }),
    ).rejects.toThrow('database unavailable');
  });
});
