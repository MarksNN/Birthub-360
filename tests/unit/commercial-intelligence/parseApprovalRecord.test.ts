import { describe, expect, it, vi } from 'vitest';

vi.mock('../../../src/lib/prisma.js', () => ({ prisma: {} }));

import { parseApprovalRecord } from '../../../src/features/commercial-intelligence/infra/PrismaRebalanceRecommendationReader.js';

describe('parseApprovalRecord — AuditLog corrompido não derruba a listagem', () => {
  it.each([null, '', '{', 'null', '42', '{"recommendationId":"x"}', '{"recommendationId":"x","decision":"MAYBE","decidedAt":"2026-01-01"}'])(
    'inválido %s → null',
    (raw) => {
      expect(parseApprovalRecord(raw as string | null)).toBeNull();
    },
  );
  it('válido → registro', () => {
    const rec = { recommendationId: 'rb_1', decision: 'REJECTED', decidedAt: '2026-10-01T00:00:00.000Z' };
    expect(parseApprovalRecord(JSON.stringify(rec))).toMatchObject(rec);
  });
});
