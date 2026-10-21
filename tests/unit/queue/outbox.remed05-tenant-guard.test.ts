import { describe, expect, it } from 'vitest';
import {
  OUTBOX_SYSTEM_JOBS,
  OutboxTenantContextError,
  requireOutboxTenantContext,
  systemJobOutboxContext,
} from '../../../src/lib/queue/outbox/tenantGuard.js';

describe('REMED-05 guarda de tenant da UoW', () => {
  it('sem contexto ou com tenant vazio falha', () => {
    expect(() => requireOutboxTenantContext(undefined)).toThrow(OutboxTenantContextError);
    expect(() => requireOutboxTenantContext({ tenantId: '  ' })).toThrow(/tenantId ausente/);
  });
  it('bypassRls sem opt-in nomeado falha, mesmo com tenant', () => {
    expect(() => requireOutboxTenantContext({ tenantId: 'org', bypassRls: true })).toThrow(/bypassRls não é permitido/);
    expect(() => requireOutboxTenantContext({ tenantId: 'org', bypassRls: true, outboxSystemJob: 'nao-listado' })).toThrow(
      /OUTBOX_SYSTEM_JOBS/,
    );
  });
  it('tenant explícito sem bypass passa', () => {
    expect(requireOutboxTenantContext({ tenantId: 'org-1' })).toBe('org-1');
  });
  it('job de sistema com opt-in passa, mas a transação nunca herda o bypass', () => {
    (OUTBOX_SYSTEM_JOBS as Set<string>).add('job-teste');
    try {
      expect(systemJobOutboxContext({ tenantId: 'org-1', bypassRls: true, outboxSystemJob: 'job-teste' })).toEqual({
        tenantId: 'org-1',
        bypassRls: false,
      });
      expect(() => systemJobOutboxContext({ bypassRls: true, outboxSystemJob: 'job-teste' })).toThrow(/tenantId ausente/);
    } finally {
      (OUTBOX_SYSTEM_JOBS as Set<string>).delete('job-teste');
    }
  });
});
