import { describe, expect, it, beforeEach, vi } from 'vitest';
import { continuousSecurityAuditService } from '../../../src/lib/security/services/continuousSecurityAudit.service.js';

describe('ContinuousSecurityAuditService — Evolução 20', () => {
  beforeEach(() => {
    continuousSecurityAuditService.clear();
  });

  it('deve executar a varredura contínua de dependências e gerar o relatório com SBOM', async () => {
    const report = await continuousSecurityAuditService.runSecuritySweep();

    expect(report.sweepId).toBeDefined();
    expect(report.totalDependenciesScanned).toBeGreaterThan(400);
    expect(report.criticalCount).toBe(0);
    expect(report.sbomSummary.format).toBe('CycloneDX_JSON');
    expect(report.sbomSummary.sha256Digest).toHaveLength(64);
    expect(report.sbomSummary.isReproducible).toBe(true);
    expect(['PASS', 'WARN_WAIVED']).toContain(report.complianceRating);
  });

  it('deve validar a integridade criptográfica do manifesto SBOM via SHA-256', async () => {
    const sweep = await continuousSecurityAuditService.runSecuritySweep();
    const hash = sweep.sbomSummary.sha256Digest;

    const validation = await continuousSecurityAuditService.validateSbomIntegrity(hash);
    expect(validation.valid).toBe(true);
    expect(validation.hash).toBe(hash);
    expect(validation.componentCount).toBe(sweep.totalDependenciesScanned);

    const invalidValidation =
      await continuousSecurityAuditService.validateSbomIntegrity('hash-falso-invalido');
    expect(invalidValidation.valid).toBe(false);
  });

  it('deve verificar a vigência e a justificativa de waivers de segurança cadastrados', async () => {
    const validWaiver =
      await continuousSecurityAuditService.checkWaiverValidity('WAIVER-2026-DEV-01');
    expect(validWaiver.valid).toBe(true);
    expect(validWaiver.reason).toContain('ambiente de teste');

    const unknownWaiver =
      await continuousSecurityAuditService.checkWaiverValidity('WAIVER-INEXISTENTE');
    expect(unknownWaiver.valid).toBe(false);
  });

  it('deve manter o último relatório de auditoria disponível para consulta', async () => {
    expect(await continuousSecurityAuditService.getLatestReport()).toBeNull();

    await continuousSecurityAuditService.runSecuritySweep();
    const latest = await continuousSecurityAuditService.getLatestReport();

    expect(latest).not.toBeNull();
    expect(latest?.sweepId).toBeDefined();
  });
});

describe('ContinuousSecurityAuditService — canal global de eventos de segurança', () => {
  it('emite SECURITY_AUDIT_SWEEP_COMPLETED pelo canal global, sem organizationId sentinela', async () => {
    const { ContinuousSecurityAuditService } =
      await import('../../../src/lib/security/services/continuousSecurityAudit.service.js');
    const { InMemoryGlobalSecurityEventSink } =
      await import('../../../src/lib/security/events/loggerGlobalSecurityEventSink.js');
    const sink = new InMemoryGlobalSecurityEventSink();
    const svc = new ContinuousSecurityAuditService(sink);
    const report = await svc.runSecuritySweep();

    expect(sink.events).toHaveLength(1);
    const ev = sink.events[0]!;
    expect(ev.eventType).toBe('SECURITY_AUDIT_SWEEP_COMPLETED');
    expect(ev.aggregateId).toBe(report.sweepId);
    expect(ev.payload.sbomHash).toBe(report.sbomSummary.sha256Digest);
    expect(JSON.stringify(ev)).not.toContain('global-security-governance');
    expect(ev).not.toHaveProperty('organizationId');
  });

  it('não publica na outbox por tenant (domainEventMesh)', async () => {
    const { domainEventMesh } = await import('../../../src/lib/queue/domainEventMesh.service.js');
    const spy = vi.spyOn(domainEventMesh, 'publish');
    const { ContinuousSecurityAuditService } =
      await import('../../../src/lib/security/services/continuousSecurityAudit.service.js');
    const { InMemoryGlobalSecurityEventSink } =
      await import('../../../src/lib/security/events/loggerGlobalSecurityEventSink.js');
    await new ContinuousSecurityAuditService(
      new InMemoryGlobalSecurityEventSink(),
    ).runSecuritySweep();
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it('propaga falha do canal (fail-closed: não reporta varredura sem evento)', async () => {
    const { ContinuousSecurityAuditService } =
      await import('../../../src/lib/security/services/continuousSecurityAudit.service.js');
    const svc = new ContinuousSecurityAuditService({
      emit: async () => {
        throw new Error('sink down');
      },
    });
    await expect(svc.runSecuritySweep()).rejects.toThrow('sink down');
  });
});
