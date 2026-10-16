import { beforeEach, describe, expect, it, vi } from 'vitest';
import { assignLeadRoundRobin } from '../leadAssignment.service.js';

const { prismaMock, redisIncrMock, recordLeadFieldChangesMock } = vi.hoisted(() => ({
  prismaMock: {
    user: { findMany: vi.fn() },
    lead: { update: vi.fn() },
  },
  redisIncrMock: vi.fn(),
  recordLeadFieldChangesMock: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../../lib/prisma.js', () => ({ prisma: prismaMock }));
vi.mock('../../../lib/queue/redis.js', () => ({
  connection: {
    incr: (...args: unknown[]) => redisIncrMock(...args),
  },
}));
vi.mock('../leadFieldChangeHistory.service.js', () => ({
  recordLeadFieldChanges: (...args: unknown[]) => recordLeadFieldChangesMock(...args),
}));

describe('assignLeadRoundRobin', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('retorna null se não houver usuários CLOSER na organização', async () => {
    prismaMock.user.findMany.mockResolvedValueOnce([]);

    const result = await assignLeadRoundRobin('org-1', 'lead-1');
    expect(result).toBeNull();
    expect(prismaMock.lead.update).not.toHaveBeenCalled();
    expect(recordLeadFieldChangesMock).not.toHaveBeenCalled();
  });

  it('atribui ao CLOSER usando round-robin e registra alteração no histórico', async () => {
    const closers = [
      { id: 'user-a', name: 'Closer A' },
      { id: 'user-b', name: 'Closer B' },
    ];
    prismaMock.user.findMany.mockResolvedValueOnce(closers);
    redisIncrMock.mockResolvedValueOnce(1); // 1 - 1 = 0 -> closers[0] = user-a
    prismaMock.lead.update.mockResolvedValueOnce({ id: 'lead-1', owner: 'user-a' });

    const result = await assignLeadRoundRobin('org-1', 'lead-1');

    expect(result).toBe('user-a');
    expect(prismaMock.lead.update).toHaveBeenCalledWith({
      where: { id: 'lead-1' },
      data: { owner: 'user-a' },
    });
    expect(recordLeadFieldChangesMock).toHaveBeenCalledWith(
      'org-1',
      'lead-1',
      { owner: null },
      { owner: 'user-a' },
      { source: 'round_robin' },
    );
  });
});
