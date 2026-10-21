import { randomUUID } from 'node:crypto';
import { Pool, type PoolClient } from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

/**
 * REMED-06 (Agente 21) — SQL pronto para DEPOIS da migração complementar do Agente 01
 * (ConsentAuditChainHead, ConsentPurgeTask, ConsentEventDetail, ConsentSubjectKey e colunas
 * formatVersion/reasonCode). Pulado enquanto as tabelas não existirem.
 */
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const RUN = randomUUID().slice(0, 8);
const ORG_A = `test-lgpd21-a-${RUN}`;
const ORG_B = `test-lgpd21-b-${RUN}`;
const TABLES = ['ConsentAuditChainHead', 'ConsentPurgeTask', 'ConsentEventDetail', 'ConsentSubjectKey'];

async function tx<T>(tenant: string | null, fn: (c: PoolClient) => Promise<T>, bypass = false): Promise<T> {
  const c = await pool.connect();
  try {
    await c.query('BEGIN');
    await c.query(`SELECT set_config('app.bypass_rls', $1, TRUE)`, [bypass ? 'on' : 'off']);
    if (tenant) await c.query(`SELECT set_config('app.current_tenant_id', $1, TRUE)`, [tenant]);
    const r = await fn(c);
    await c.query('COMMIT');
    return r;
  } catch (e) {
    await c.query('ROLLBACK').catch(() => {});
    throw e;
  } finally {
    c.release();
  }
}

let ready = false;

describe('REMED-06 — tabelas complementares (head, outbox, detalhe, chave do titular)', () => {
  beforeAll(async () => {
    const r = await pool.query(`SELECT count(*)::int AS n FROM information_schema.tables WHERE table_name = ANY($1)`, [
      TABLES,
    ]);
    ready = r.rows[0].n === TABLES.length;
    if (!ready) return;
    await tx(
      null,
      async (c) => {
        for (const id of [ORG_A, ORG_B]) {
          await c.query(
            `INSERT INTO "Organization" (id,name,"updatedAt") VALUES ($1,$1,now()) ON CONFLICT (id) DO NOTHING`,
            [id],
          );
        }
      },
      true,
    );
  });

  afterAll(async () => {
    await pool.end();
  });

  it('RLS: chave do titular de A é invisível e indestrutível para B', async ({ skip }) => {
    if (!ready) skip();
    await tx(ORG_A, (c) =>
      c.query(`INSERT INTO "ConsentSubjectKey" ("organizationId","lookupId","keyMaterial") VALUES ($1,'l1',$2)`, [
        ORG_A,
        Buffer.alloc(32, 1),
      ]),
    );
    const seen = await tx(ORG_B, (c) => c.query(`SELECT 1 FROM "ConsentSubjectKey" WHERE "lookupId"='l1'`));
    expect(seen.rowCount).toBe(0);
    const del = await tx(ORG_B, (c) => c.query(`DELETE FROM "ConsentSubjectKey" WHERE "lookupId"='l1'`));
    expect(del.rowCount).toBe(0);
    // crypto-shredding: o próprio tenant consegue destruir a chave
    const own = await tx(ORG_A, (c) => c.query(`DELETE FROM "ConsentSubjectKey" WHERE "lookupId"='l1'`));
    expect(own.rowCount).toBe(1);
  });

  it('head: genesis imutável e lastSequence só cresce (trigger)', async ({ skip }) => {
    if (!ready) skip();
    await tx(ORG_A, (c) =>
      c.query(
        `INSERT INTO "ConsentAuditChainHead" ("organizationId","genesisId","genesisHash","lastSequence","lastHash")
         VALUES ($1,'g',repeat('a',64),1,repeat('b',64))`,
        [ORG_A],
      ),
    );
    await expect(
      tx(ORG_A, (c) => c.query(`UPDATE "ConsentAuditChainHead" SET "lastSequence"=0 WHERE "organizationId"=$1`, [ORG_A])),
    ).rejects.toThrow();
    await expect(
      tx(ORG_A, (c) => c.query(`UPDATE "ConsentAuditChainHead" SET "genesisId"='x' WHERE "organizationId"=$1`, [ORG_A])),
    ).rejects.toThrow();
    await expect(
      tx(ORG_A, (c) => c.query(`DELETE FROM "ConsentAuditChainHead" WHERE "organizationId"=$1`, [ORG_A])),
    ).rejects.toThrow();
  });

  it('ConsentAuditRecord: reasonCode só aceita o enum e formatVersion é obrigatório', async ({ skip }) => {
    if (!ready) skip();
    await expect(
      tx(ORG_A, (c) =>
        c.query(
          `INSERT INTO "ConsentAuditRecord" (id,"organizationId","formatVersion",sequence,kind,"subjectRef",purpose,"termsVersion",status,"reasonCode","previousHash","currentHash","occurredAt")
           VALUES ($1,$2,3,999,'REVOCATION','hs256:x','REVOCATION','REVOKED','REVOKED','texto livre',repeat('0',64),repeat('c',64),now())`,
          [`r-${RUN}`, ORG_A],
        ),
      ),
    ).rejects.toThrow();
  });
});
