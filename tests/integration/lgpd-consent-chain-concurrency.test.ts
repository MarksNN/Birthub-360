import { randomUUID } from 'node:crypto';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createConsentAuditChain } from '@/lib/security/consentChainFactory';
import { EnvTenantPepperProvider } from '@/lib/security/subjectTokenizer';

/**
 * REMED-06 (Agente 21) — concorrência real: N appends paralelos no mesmo tenant geram sequência
 * contínua, sem fork, e verify() OK. Usa um PrismaClient BASE (não estendido), para que lock,
 * set_config e inserts rodem todos na conexão da transação interativa (`tx` do callback).
 * Roda quando DATABASE_URL existir (CI de integração).
 */
const URL = process.env.DATABASE_URL;
const pool = URL ? new Pool({ connectionString: URL }) : undefined;
const db = pool ? new PrismaClient({ adapter: new PrismaPg(pool) }) : undefined;
const ORG = `test-lgpd21-conc-${randomUUID().slice(0, 8)}`;
const N = 16;
let ready = false;

describe.skipIf(!URL)('REMED-06 — cadeia de consentimento sob concorrência (Postgres real)', () => {
  beforeAll(async () => {
    const c = await (pool as Pool).connect();
    try {
      const t = await c.query(`SELECT to_regclass('"ConsentAuditChainHead"') IS NOT NULL AS ok`);
      ready = t.rows[0].ok;
      if (!ready) return;
      await c.query('BEGIN');
      await c.query(`SELECT set_config('app.bypass_rls', 'on', TRUE)`);
      await c.query(`INSERT INTO "Organization" (id,name,"updatedAt") VALUES ($1,$1,now()) ON CONFLICT (id) DO NOTHING`, [
        ORG,
      ]);
      await c.query('COMMIT');
    } finally {
      c.release();
    }
  });

  afterAll(async () => {
    await db?.$disconnect();
    await pool?.end().catch(() => {});
  });

  it(`${N} appends paralelos: sequência 0..${N} contínua, encadeada e verify() válido`, async ({ skip }) => {
    if (!ready) skip();
    const chain = createConsentAuditChain({
      env: { NODE_ENV: 'development' },
      prisma: db,
      pepperProvider: new EnvTenantPepperProvider('c'.repeat(48)),
      listTenants: async () => [ORG],
    });
    const results = await Promise.allSettled(
      Array.from({ length: N }, (_, i) =>
        chain.recordConsent({
          organizationId: ORG,
          subjectRef: `lead-${i}`,
          purpose: 'COMMERCIAL_CONTACT',
          termsVersion: 'v1',
        }),
      ),
    );
    expect(results.filter((r) => r.status === 'rejected')).toEqual([]);
    const events = await chain.getChain(ORG);
    expect(events.map((e) => e.sequence)).toEqual(Array.from({ length: N + 1 }, (_, i) => i));
    for (let i = 1; i < events.length; i++) expect(events[i].previousHash).toBe(events[i - 1].currentHash);
    expect(new Set(events.map((e) => e.previousHash)).size).toBe(events.length); // sem fork
    expect(await chain.verifyChainIntegrity(ORG)).toEqual({ valid: true, totalRecords: N + 1 });
  }, 60_000);
});
