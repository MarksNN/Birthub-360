import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  REBALANCE_APPROVALS_PATH,
  RebalanceApprovalApiError,
  canApproveRebalance,
  submitRebalanceApproval,
} from '../../../../src/features/predictability/rebalance.api.js';

const req = {
  recommendationId: 'rec-01',
  leadId: 'lead-1',
  fromOwner: 'u1',
  toOwner: 'u2',
  decision: 'APPROVED' as const,
};
const approval = {
  ...req,
  approvalId: 'ap-1',
  organizationId: 'org-1',
  decidedBy: 'gestor-1',
  decidedAt: '2026-10-20T22:00:00.000Z',
  appliedToCrm: false as const,
};

function mockFetch(status: number, body: unknown) {
  const fn = vi.fn(async () => new Response(JSON.stringify(body), { status }));
  vi.stubGlobal('fetch', fn);
  return fn;
}
async function caught(p: Promise<unknown>) {
  return (await p.catch((e: unknown) => e)) as RebalanceApprovalApiError;
}

describe('rebalance.api — contrato 04 (PR #15)', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('201: POST no path do contrato com o body', async () => {
    const fn = mockFetch(201, { success: true, data: { approval, alreadyRecorded: false } });
    const res = await submitRebalanceApproval(req);
    expect(res.alreadyRecorded).toBe(false);
    const [url, init] = fn.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toContain(REBALANCE_APPROVALS_PATH);
    expect(REBALANCE_APPROVALS_PATH).toBe(
      '/api/commercial-intelligence/predictive/rebalance/approvals',
    );
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body as string)).toEqual(req);
  });

  it('200: replay idempotente é sucesso', async () => {
    mockFetch(200, { success: true, data: { approval, alreadyRecorded: true } });
    expect((await submitRebalanceApproval(req)).alreadyRecorded).toBe(true);
  });

  it('409: expõe data.existing', async () => {
    mockFetch(409, { success: false, error: 'Já decidido.', data: { existing: approval } });
    const err = await caught(submitRebalanceApproval(req));
    expect(err.kind).toBe('conflict');
    expect(err.existing?.approvalId).toBe('ap-1');
  });

  it('422: erros por campo', async () => {
    mockFetch(422, { success: false, error: 'Payload inválido.', details: { toOwner: ['igual'] } });
    const err = await caught(submitRebalanceApproval(req));
    expect(err.kind).toBe('validation');
    expect(err.fieldErrors).toEqual({ toOwner: ['igual'] });
  });

  it('404 / 403 / 401', async () => {
    mockFetch(404, { success: false, error: 'x' });
    expect((await caught(submitRebalanceApproval(req))).kind).toBe('not_found');
    mockFetch(403, { success: false, error: 'x' });
    expect((await caught(submitRebalanceApproval(req))).kind).toBe('forbidden');
    mockFetch(401, { success: false, error: 'x' });
    expect((await caught(submitRebalanceApproval(req))).kind).toBe('forbidden');
  });

  it('RBAC: só ADMIN e GESTOR', () => {
    expect(canApproveRebalance('ADMIN')).toBe(true);
    expect(canApproveRebalance('GESTOR')).toBe(true);
    expect(canApproveRebalance('CLOSER')).toBe(false);
    expect(canApproveRebalance(undefined)).toBe(false);
  });
});
