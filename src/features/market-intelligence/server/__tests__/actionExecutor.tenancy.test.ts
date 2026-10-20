import { beforeEach, describe, expect, it, vi } from 'vitest';

type Rec = {
  id: string;
  organizationId: string;
  companyId: string;
  status: string;
  actionType: string;
  title: string;
  rationale: string;
  company: {
    id: string;
    organizationId: string;
    legalName: string;
    organization: { bitrixConnections: Array<{ webhookUrl: string }> };
  };
};

const store: { recs: Rec[] } = { recs: [] };
const update = vi.fn(async ({ where, data }: { where: { id: string }; data: Partial<Rec> }) => {
  const rec = store.recs.find((r) => r.id === where.id)!;
  Object.assign(rec, data);
  return rec;
});
const findFirst = vi.fn(
  async ({ where }: { where: { id: string; organizationId: string; companyId: string } }) =>
    store.recs.find(
      (r) =>
        r.id === where.id &&
        r.organizationId === where.organizationId &&
        r.companyId === where.companyId,
    ) ?? null,
);
const updateMany = vi.fn(
  async ({
    where,
    data,
  }: {
    where: { id: string; organizationId: string; companyId: string };
    data: Partial<Rec>;
  }) => {
    const hits = store.recs.filter(
      (r) =>
        r.id === where.id &&
        r.organizationId === where.organizationId &&
        r.companyId === where.companyId,
    );
    hits.forEach((r) => Object.assign(r, data));
    return { count: hits.length };
  },
);
const callBitrix = vi.fn();
const leadFindFirst = vi.fn(async (_args: unknown) => null as null | { id: string });
const sequenceFindFirst = vi.fn(async (_args: unknown) => null as null | { id: string });
const saveRun = vi.fn(async (_run: unknown) => undefined);

vi.mock('../../../../lib/prisma.js', () => ({
  // Simula a transação real: qualquer throw faz rollback do estado gravado dentro dela.
  withRlsContext: async (fn: (p: unknown) => unknown) => {
    const before = structuredClone(store.recs);
    try {
      return await fn({
        accountRecommendation: { findFirst, update, updateMany },
        user: { findUnique: async () => ({ bitrixUserId: 7 }) },
        lead: { findFirst: leadFindFirst },
        cadenceSequence: { findFirst: sequenceFindFirst },
      });
    } catch (error) {
      store.recs = before;
      throw error;
    }
  },
}));
vi.mock('../../../cadence/domain/cadence.js', () => ({ startCadenceRun: (x: unknown) => x }));
vi.mock('../../../cadence/infra/PrismaCadenceRunRepository.js', () => ({
  prismaCadenceRunRepository: { save: (run: unknown) => saveRun(run) },
}));
vi.mock('../../../../lib/async-context.js', () => ({ getUserId: () => 'user-a' }));
vi.mock('../../../integrations/bitrix/service/client.js', () => ({
  callBitrix: (...args: unknown[]) => callBitrix(...args),
}));

const { actionExecutorService } = await import('../actionExecutor.service.js');

function rec(over: Partial<Rec> & { org: string; webhook?: string }): Rec {
  const { org, webhook, ...rest } = over;
  return {
    id: 'rec-1',
    organizationId: org,
    companyId: 'co-1',
    status: 'Pending',
    actionType: 'CREATE_BITRIX_TASK',
    title: 'T',
    rationale: 'R',
    company: {
      id: 'co-1',
      organizationId: org,
      legalName: 'ACME',
      organization: { bitrixConnections: webhook ? [{ webhookUrl: webhook }] : [] },
    },
    ...rest,
  };
}

describe('actionExecutorService.executeAction — tenancy e pré-condições', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    leadFindFirst.mockResolvedValue(null);
    sequenceFindFirst.mockResolvedValue(null);
    saveRun.mockResolvedValue(undefined);
    store.recs = [];
  });

  it('filtra explicitamente por organizationId: tenant B não executa recomendação do tenant A', async () => {
    store.recs = [rec({ org: 'org-a', webhook: 'https://a.bitrix24/rest/1/x/' })];
    await expect(
      actionExecutorService.executeAction('rec-1', 'co-1', 'org-b'),
    ).rejects.toMatchObject({ statusCode: 404 });
    expect(findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'rec-1', organizationId: 'org-b', companyId: 'co-1' },
      }),
    );
    expect(callBitrix).not.toHaveBeenCalled();
    expect(update).not.toHaveBeenCalled();
    expect(store.recs[0].status).toBe('Pending');
  });

  it('tenant A executa a própria recomendação', async () => {
    store.recs = [rec({ org: 'org-a', webhook: 'https://a.bitrix24/rest/1/x/' })];
    callBitrix.mockResolvedValueOnce({ result: { task: { id: 42 } } });
    const out = await actionExecutorService.executeAction('rec-1', 'co-1', 'org-a');
    expect(out).toEqual({ success: true, taskId: 42 });
    expect(store.recs[0].status).toBe('Executed');
  });

  it('Bitrix não conectado → 400 e status permanece Pending (não marca Failed)', async () => {
    store.recs = [rec({ org: 'org-a' })];
    await expect(
      actionExecutorService.executeAction('rec-1', 'co-1', 'org-a'),
    ).rejects.toMatchObject({ statusCode: 400 });
    expect(update).not.toHaveBeenCalled();
    expect(store.recs[0].status).toBe('Pending');
  });

  it('falha real da chamada ao Bitrix marca Failed', async () => {
    store.recs = [rec({ org: 'org-a', webhook: 'https://a.bitrix24/rest/1/x/' })];
    callBitrix.mockRejectedValueOnce(new Error('bitrix down'));
    await expect(actionExecutorService.executeAction('rec-1', 'co-1', 'org-a')).rejects.toThrow(
      'bitrix down',
    );
    expect(store.recs[0].status).toBe('Failed');
  });

  it('cadência sem lead → 400 e status permanece Pending', async () => {
    store.recs = [rec({ org: 'org-a', actionType: 'START_SDR_CADENCE' })];
    await expect(
      actionExecutorService.executeAction('rec-1', 'co-1', 'org-a'),
    ).rejects.toMatchObject({ statusCode: 400 });
    expect(store.recs[0].status).toBe('Pending');
  });

  it('cadência já ativa (P2002) → 409 e status permanece Pending', async () => {
    store.recs = [rec({ org: 'org-a', actionType: 'START_SDR_CADENCE' })];
    leadFindFirst.mockResolvedValue({ id: 'lead-1' });
    sequenceFindFirst.mockResolvedValue({ id: 'seq-1' });
    saveRun.mockRejectedValueOnce(Object.assign(new Error('dup'), { code: 'P2002' }));
    await expect(
      actionExecutorService.executeAction('rec-1', 'co-1', 'org-a'),
    ).rejects.toMatchObject({ statusCode: 409 });
    expect(store.recs[0].status).toBe('Pending');
  });

  it('lead e sequência são buscados com o organizationId da sessão', async () => {
    store.recs = [rec({ org: 'org-a', actionType: 'START_SDR_CADENCE' })];
    leadFindFirst.mockResolvedValue({ id: 'lead-1' });
    sequenceFindFirst.mockResolvedValue({ id: 'seq-1' });
    await actionExecutorService.executeAction('rec-1', 'co-1', 'org-a');
    expect(leadFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ organizationId: 'org-a', companyId: 'co-1' }),
      }),
    );
    expect(sequenceFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ organizationId: 'org-a' }) }),
    );
    expect(store.recs[0].status).toBe('Executed');
  });

  it('falha real persiste Failed mesmo com rollback da transação de execução', async () => {
    store.recs = [rec({ org: 'org-a', actionType: 'START_SDR_CADENCE' })];
    leadFindFirst.mockResolvedValue({ id: 'lead-1' });
    sequenceFindFirst.mockResolvedValue({ id: 'seq-1' });
    saveRun.mockRejectedValueOnce(new Error('db down'));
    await expect(actionExecutorService.executeAction('rec-1', 'co-1', 'org-a')).rejects.toThrow(
      'db down',
    );
    expect(store.recs[0].status).toBe('Failed');
    expect(updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'rec-1', organizationId: 'org-a', companyId: 'co-1' },
      }),
    );
  });
});
