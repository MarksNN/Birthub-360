import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/**
 * Parecer 24 (P2-4 / condição 3): o bootstrap (scripts/db/create-app-role.sql) faz GRANT ALL ON ALL
 * TABLES e transfere posse. Ele precisa (a) manter as tabelas LGPD fora da transferência de posse e
 * (b) re-aplicar lgpd_apply_consent_privileges() DEPOIS de todo GRANT amplo. O efeito no banco é
 * provado em tests/integration/lgpd-consent-flywheel-rls.test.ts ("grants mínimos"), que roda após o bootstrap.
 */
const sql = readFileSync('scripts/db/create-app-role.sql', 'utf8');
const LGPD = [
  'ConsentAuditRecord',
  'ConsentAuditChainHead',
  'ConsentSubjectKey',
  'ConsentSubjectKeyTombstone',
  'ConsentEventDetail',
  'ConsentPurgeTask',
  'FlywheelApproachRecord',
  'FlywheelFewShotExample',
  'TenantKeyEnvelope',
];

describe('create-app-role.sql re-aplica os grants mínimos LGPD após o bootstrap', () => {
  it('todas as tabelas LGPD estão fora da transferência de posse', () => {
    const notIn = sql.match(/tablename NOT IN \(([^)]*)\)/);
    expect(notIn).not.toBeNull();
    for (const t of LGPD) expect(notIn![1], t).toContain(`'${t}'`);
  });
  it('lgpd_apply_consent_privileges() roda depois do último GRANT amplo', () => {
    const apply = sql.lastIndexOf('lgpd_apply_consent_privileges()');
    const lastBroad = Math.max(
      ...[/GRANT [A-Z ,]+ ON ALL (TABLES|FUNCTIONS|SEQUENCES) IN SCHEMA public/g].flatMap((re) =>
        [...sql.matchAll(re)].map((m) => m.index ?? -1),
      ),
    );
    expect(apply).toBeGreaterThan(lastBroad);
  });
});
