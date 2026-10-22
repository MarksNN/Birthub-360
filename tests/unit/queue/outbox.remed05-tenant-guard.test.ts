import { describe, expect, it } from 'vitest';
import {
  OUTBOX_SYSTEM_JOBS,
  OutboxTenantContextError,
  outboxUnitOfWorkContext,
  requireOutboxTenantContext,
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
  it('G4: OUTBOX_SYSTEM_JOBS é congelada (sem auto-autorização em runtime)', () => {
    expect(Object.isFrozen(OUTBOX_SYSTEM_JOBS)).toBe(true);
    expect(() => (OUTBOX_SYSTEM_JOBS as string[]).push('intruso')).toThrow(TypeError);
    expect(OUTBOX_SYSTEM_JOBS).not.toContain('intruso');
  });
  it('job de sistema com opt-in (allowlist explícita) passa, mas nunca herda o bypass', () => {
    const allow = Object.freeze(['job-teste']);
    expect(
      outboxUnitOfWorkContext({ tenantId: 'org-1', bypassRls: true, outboxSystemJob: 'job-teste' }, allow),
    ).toEqual({ tenantId: 'org-1', bypassRls: false, outboxUnitOfWorkActive: true });
    expect(() => outboxUnitOfWorkContext({ bypassRls: true, outboxSystemJob: 'job-teste' }, allow)).toThrow(/tenantId ausente/);
  });
  it('G3: preserva userId e demais campos; troca só tenantId/bypassRls e descarta outboxSystemJob', () => {
    const ctx = outboxUnitOfWorkContext(
      { tenantId: 'org-1', userId: 'u-1', role: 'admin', requestId: 'r-9', bypassRls: true, outboxSystemJob: 'job-x' },
      ['job-x'],
    );
    expect(ctx).toEqual({
      tenantId: 'org-1',
      userId: 'u-1',
      role: 'admin',
      requestId: 'r-9',
      bypassRls: false,
      outboxUnitOfWorkActive: true,
    });
    expect('outboxSystemJob' in ctx).toBe(false);
  });
});
