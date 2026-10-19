import { describe, expect, it, beforeEach } from 'vitest';
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

    const invalidValidation = await continuousSecurityAuditService.validateSbomIntegrity('hash-falso-invalido');
    expect(invalidValidation.valid).toBe(false);
  });

  it('deve verificar a vigência e a justificativa de waivers de segurança cadastrados', async () => {
    const validWaiver = await continuousSecurityAuditService.checkWaiverValidity('WAIVER-2026-DEV-01');
    expect(validWaiver.valid).toBe(true);
    expect(validWaiver.reason).toContain('ambiente de teste');

    const unknownWaiver = await continuousSecurityAuditService.checkWaiverValidity('WAIVER-INEXISTENTE');
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
