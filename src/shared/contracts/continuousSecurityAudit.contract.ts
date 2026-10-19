/**
 * Contrato Canônico para a Governança Contínua de Segurança e SBOM (Eixo 20)
 * Onda 05 — Evolução 20
 * Responsável: Agente 18 (Contratos) / Agente 15 (Segurança Aplicada)
 */

export type VulnerabilitySeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface SecurityVulnerability {
  cveId: string;
  packageName: string;
  affectedVersionRange: string;
  severity: VulnerabilitySeverity;
  fixedInVersion?: string;
  description: string;
  waiverReference?: string;
}

export interface SbomManifestSummary {
  format: 'CycloneDX_JSON' | 'SPDX_JSON';
  specVersion: string;
  totalComponents: number;
  sha256Digest: string;
  isReproducible: boolean;
  generatedAt: string;
}

export interface SecuritySweepReport {
  sweepId: string;
  executedAt: string;
  durationMs: number;
  totalDependenciesScanned: number;
  vulnerabilitiesFound: SecurityVulnerability[];
  criticalCount: number;
  highCount: number;
  activeWaiversCount: number;
  sbomSummary: SbomManifestSummary;
  complianceRating: 'PASS' | 'WARN_WAIVED' | 'FAIL_BLOCKED';
}

export interface IContinuousSecurityAuditPort {
  runSecuritySweep(params?: { forceFreshScan?: boolean }): Promise<SecuritySweepReport>;
  validateSbomIntegrity(
    expectedSha256?: string,
  ): Promise<{ valid: boolean; componentCount: number; hash: string }>;
  checkWaiverValidity(
    waiverId: string,
  ): Promise<{ valid: boolean; expiresAt: string; reason: string }>;
  getLatestReport(): Promise<SecuritySweepReport | null>;
}
