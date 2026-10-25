import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Prisma } from '@prisma/client';
import { Pool } from 'pg';
import {
  prisma,
  runInTransaction,
  TransactionClosedError,
  TransactionTenantMismatchError,
} from '../../src/lib/prisma';
import { AuditService } from '../../src/lib/audit/audit.service';
import { requestContext } from '../../src/lib/async-context';

/**
 * Propagação de transação no client ESTENDIDO (parecer 15 U1/U2/U3) contra Postgres real com RLS.
 * Prova que, dentro de `runInTransaction`, operação de model (cifragem/injeção/auditoria) e SQL cru
 * (stand-in de outbox append: INSERT cru em "AuditLog", tabela com RLS FORCE) rodam na MESMA
 * conexão/transação e são atômicos.
 */
const STAMP = Date.now();
const ORG_A = `test-txprop-a-${STAMP}`;
const ORG_B = `test-txprop-b-${STAMP}`;
const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 4 });

async function asTenant<T>(org: string, sql: string, params: unknown[] = []): Promise<T[]> {
  const c = await pool.connect();
  try {
    await c.query('BEGIN');
    await c.query(
      `SELECT set_config('app.bypass_rls','off',true), set_config('app.current_tenant_id',$1,true)`,
      [org],
    );
    const r = await c.query(sql, params);
    await c.query('COMMIT');
    return r.rows as T[];
  } finally {
    c.release();
  }
}

const outboxAppend = (
  tx: { $executeRawUnsafe: (q: string, ...v: unknown[]) => Promise<number> },
  org: string,
  tag: string,
) =>
  tx.$executeRawUnsafe(
    `INSERT INTO "AuditLog"(id, action, entity, "entityId", "tenantId") VALUES ($1,'OUTBOX','OutboxProbe',$2,$3)`,
    `ob-${tag}-${STAMP}`,
    tag,
    org,
  );

class Rollback extends Error {}

// O setup global de integração faz enterWith({tenantId:'test-org-id'}); cada UoW roda num contexto
// do próprio tenant, como um request/worker real faria.
const rit = <R>(fn: Parameters<typeof runInTransaction<R>>[0], opts: { organizationId: string }) =>
  requestContext.run({ tenantId: opts.organizationId }, () => runInTransaction(fn, opts));

beforeAll(async () => {
  await requestContext.run({ bypassRls: true }, async () => {
    await prisma.organization.create({ data: { id: ORG_A, name: ORG_A } });
    await prisma.organization.create({ data: { id: ORG_B, name: ORG_B } });
  });
});

afterAll(async () => {
  await requestContext.run({ bypassRls: true }, async () => {
    await prisma.organization.deleteMany({ where: { id: { in: [ORG_A, ORG_B] } } });
  });
  for (const org of [ORG_A, ORG_B])
    await asTenant(org, `DELETE FROM "AuditLog" WHERE "tenantId"=$1`, [org]);
  await pool.end();
});

describe('runInTransaction — client estendido reusa a transação ativa', () => {
  it('commit: model write + outbox raw + audit + PII cifrada na mesma tx; tenant visível em todas as ops', async () => {
    const tag = 'commit';
    const contactId = await rit(
      async (tx) => {
        const [{ t1 }] = await tx.$queryRawUnsafe<{ t1: string }[]>(
          `SELECT current_setting('app.current_tenant_id', true) AS t1`,
        );
        expect(t1).toBe(ORG_A);
        const company = await tx.company.create({
          data: { legalName: `C ${tag}`, tradeName: `C ${tag}` } as never,
        });
        expect((company as { organizationId: string }).organizationId).toBe(ORG_A); // injeção de tenant
        const contact = await prisma.contact.create({
          data: {
            name: 'Fulana',
            email: 'fulana@example.com',
            phone: '+5511999990000',
            companyId: company.id,
          } as never,
        });
        expect(contact.email).toBe('fulana@example.com'); // decifrado em memória
        await outboxAppend(tx, ORG_A, tag);
        return contact.id;
      },
      { organizationId: ORG_A },
    );
    const [row] = await asTenant<{ email: string; phone: string; emailIndex: string | null }>(
      ORG_A,
      `SELECT email, phone, "emailIndex" FROM "Contact" WHERE id=$1`,
      [contactId],
    );
    expect(row.email.startsWith('enc:v1:')).toBe(true);
    expect(row.phone.startsWith('enc:v1:')).toBe(true);
    expect(row.emailIndex).toBeTruthy();
    const ob = await asTenant(
      ORG_A,
      `SELECT 1 FROM "AuditLog" WHERE entity='OutboxProbe' AND "entityId"=$1`,
      [tag],
    );
    expect(ob).toHaveLength(1);
    const audit = await asTenant(
      ORG_A,
      `SELECT 1 FROM "AuditLog" WHERE entity='Contact' AND "entityId"=$1`,
      [contactId],
    );
    expect(audit).toHaveLength(1);
  });

  it('rollback desfaz model write, outbox raw e audit log juntos', async () => {
    const tag = 'rollback';
    let companyId = '';
    await expect(
      rit(
        async (tx) => {
          const c = await prisma.company.create({
            data: { legalName: tag, tradeName: tag } as never,
          });
          companyId = c.id;
          await outboxAppend(tx, ORG_A, tag);
          const inside = await tx.$queryRawUnsafe<unknown[]>(
            `SELECT 1 FROM "AuditLog" WHERE entity='Company' AND "entityId"=$1`,
            companyId,
          );
          expect(inside).toHaveLength(1); // audit escrito DENTRO da tx
          throw new Rollback('boom');
        },
        { organizationId: ORG_A },
      ),
    ).rejects.toBeInstanceOf(Rollback);
    expect(companyId).not.toBe('');
    expect(await asTenant(ORG_A, `SELECT 1 FROM "Company" WHERE id=$1`, [companyId])).toHaveLength(
      0,
    );
    expect(
      await asTenant(ORG_A, `SELECT 1 FROM "AuditLog" WHERE "entityId" IN ($1,$2)`, [
        companyId,
        tag,
      ]),
    ).toHaveLength(0);
  });

  it('mesma conexão (pg_backend_pid) para raw, model e runInTransaction aninhado', async () => {
    await rit(
      async (tx) => {
        const [{ pid }] = await tx.$queryRawUnsafe<{ pid: number }[]>(
          'SELECT pg_backend_pid() AS pid',
        );
        // model op via client estendido: o set_config local só é visível se for a mesma tx/conexão
        const viaModel = await prisma.company.findMany({ where: { legalName: '__none__' } });
        expect(viaModel).toEqual([]);
        await runInTransaction(async (inner) => {
          const [{ pid: p2 }] = await inner.$queryRawUnsafe<{ pid: number }[]>(
            'SELECT pg_backend_pid() AS pid',
          );
          expect(p2).toBe(pid);
        });
        await tx.$transaction(async (t2) => {
          const [{ pid: p3 }] = await t2.$queryRawUnsafe<{ pid: number }[]>(
            'SELECT pg_backend_pid() AS pid',
          );
          expect(p3).toBe(pid);
        });
      },
      { organizationId: ORG_A },
    );
  });

  it('tenant divergente lança (contexto, aninhado e op de model com outro tenant)', async () => {
    await expect(
      requestContext.run({ tenantId: ORG_B }, () =>
        runInTransaction(async () => 1, { organizationId: ORG_A }),
      ),
    ).rejects.toBeInstanceOf(TransactionTenantMismatchError);
    await expect(
      rit(async () => runInTransaction(async () => 1, { organizationId: ORG_B }), {
        organizationId: ORG_A,
      }),
    ).rejects.toBeInstanceOf(TransactionTenantMismatchError);
    await expect(
      rit(async () => requestContext.run({ tenantId: ORG_B }, () => prisma.company.findMany()), {
        organizationId: ORG_A,
      }),
    ).rejects.toBeInstanceOf(TransactionTenantMismatchError);
    await expect(requestContext.run({}, () => runInTransaction(async () => 1))).rejects.toThrow(
      /tenant obrigatório/,
    );
  });

  it('pg_advisory_xact_lock tomado na tx bloqueia tx concorrente até o commit', async () => {
    const KEY = 918273645;
    const events: string[] = [];
    let releaseA!: () => void;
    const gate = new Promise<void>((r) => (releaseA = r));
    let lockedA!: () => void;
    const aLocked = new Promise<void>((r) => (lockedA = r));
    const a = rit(
      async (tx) => {
        await tx.$executeRawUnsafe('SELECT pg_advisory_xact_lock($1::bigint)', KEY);
        events.push('A-locked');
        lockedA();
        await gate;
        // escrita de model enquanto segura o lock: tem que ser na mesma conexão (sem self-deadlock)
        await prisma.company.create({ data: { legalName: 'lockA', tradeName: 'lockA' } as never });
        events.push('A-commit');
      },
      { organizationId: ORG_A },
    );
    await aLocked;
    const b = rit(
      async (tx) => {
        await tx.$executeRawUnsafe('SELECT pg_advisory_xact_lock($1::bigint)', KEY);
        events.push('B-locked');
      },
      { organizationId: ORG_A },
    );
    await new Promise((r) => setTimeout(r, 300));
    expect(events).toEqual(['A-locked']); // B esperando
    releaseA();
    await Promise.all([a, b]);
    expect(events).toEqual(['A-locked', 'A-commit', 'B-locked']);
  });
});

describe('G1 — escape do tx pelo client global (parecer 15)', () => {
  it('prisma.$executeRawUnsafe global dentro de runInTransaction lança e não grava; tx.$executeRawUnsafe grava', async () => {
    const { TransactionEscapeError } = await import('../../src/lib/txEscapeGuard');
    await rit(
      async (tx) => {
        await expect((async () => prisma.$executeRawUnsafe('SELECT 1'))()).rejects.toBeInstanceOf(
          TransactionEscapeError,
        );
        await expect((async () => prisma.$transaction(async () => 1))()).rejects.toBeInstanceOf(
          TransactionEscapeError,
        );
        await outboxAppend(tx, ORG_A, 'g1-ok');
      },
      { organizationId: ORG_A },
    );
    const rows = await asTenant<{ id: string }>(ORG_A, `SELECT id FROM "AuditLog" WHERE id = $1`, [
      `ob-g1-ok-${STAMP}`,
    ]);
    expect(rows).toHaveLength(1);
  });

  it('fora de tx o raw global segue funcionando', async () => {
    await expect(prisma.$queryRawUnsafe('SELECT 1 AS one')).resolves.toEqual([{ one: 1 }]);
  });

  it('flag outboxUnitOfWorkActive (UoW do #32) bloqueia raw global', async () => {
    await expect(
      requestContext.run({ tenantId: ORG_A, outboxUnitOfWorkActive: true } as never, async () =>
        prisma.$queryRawUnsafe('SELECT 1'),
      ),
    ).rejects.toThrow(/proibido dentro de UoW da outbox/);
  });

  it('caso (a): flag da UoW sem runInTransaction — prisma.model lança e não executa', async () => {
    await expect(
      requestContext.run({ tenantId: ORG_A, outboxUnitOfWorkActive: true } as never, async () =>
        prisma.organization.findFirst({ where: { id: ORG_A } }),
      ),
    ).rejects.toThrow(/prisma\.\* proibido dentro da UoW; use o tx/);
  });

  it('caminho permitido: flag + runInTransaction — prisma.model reusa o tx e passa', async () => {
    const org = await requestContext.run(
      { tenantId: ORG_A, outboxUnitOfWorkActive: true } as never,
      () =>
        runInTransaction(async () => prisma.organization.findFirst({ where: { id: ORG_A } }), {
          organizationId: ORG_A,
        }),
    );
    expect(org?.id).toBe(ORG_A);
  });
});

describe('ressalvas do parecer 15 no #40 (X1/X2/X3)', () => {
  it('X1: audit que falha dentro do tx faz runInTransaction rejeitar e nada é commitado', async () => {
    const tag = 'x1-audit-fail';
    let companyId = '';
    // T1 (parecer 15 #40): exige o erro que de fato propaga, não um toThrow() genérico. O INSERT do
    // audit é recusado pelo WITH CHECK do RLS (42501, insufficient_privilege) e o Prisma 7 com
    // driver adapter o embrulha em PrismaClientKnownRequestError P2039, com o código do Postgres em
    // meta.driverAdapterError.cause.code. Um 25P02 (tx abortado) ou um COMMIT silencioso falhariam aqui.
    const err = await rit(
      async (tx) => {
        const c = await tx.company.create({ data: { legalName: tag, tradeName: tag } as never });
        companyId = c.id;
        await outboxAppend(tx, ORG_A, tag);
        // tenantId de OUTRO tenant: o WITH CHECK do RLS de AuditLog recusa o INSERT dentro do tx.
        await AuditService.log({
          action: 'CREATE',
          entity: 'X1Probe',
          entityId: tag,
          tenantId: ORG_B,
        });
        return 'não deveria chegar aqui';
      },
      { organizationId: ORG_A },
    ).then(
      () => {
        throw new Error('runInTransaction deveria rejeitar com o erro do audit (X1)');
      },
      (e: unknown) => e,
    );
    expect(err).toBeInstanceOf(Prisma.PrismaClientKnownRequestError);
    expect(err).toMatchObject({
      code: 'P2039',
      meta: { modelName: 'AuditLog', driverAdapterError: { cause: { code: '42501' } } },
    });
    expect((err as Error).message).toMatch(/row-level security policy for table "AuditLog"/);
    expect(companyId).not.toBe('');
    expect(await asTenant(ORG_A, `SELECT 1 FROM "Company" WHERE id=$1`, [companyId])).toHaveLength(
      0,
    );
    expect(
      await asTenant(ORG_A, `SELECT 1 FROM "AuditLog" WHERE "entityId" IN ($1,$2)`, [
        companyId,
        tag,
      ]),
    ).toHaveLength(0);
    expect(
      await asTenant(ORG_B, `SELECT 1 FROM "AuditLog" WHERE "entityId"=$1`, [tag]),
    ).toHaveLength(0);
  });

  it('X1: fora de tx, audit que falha continua best-effort (não lança)', async () => {
    await expect(
      requestContext.run({ tenantId: ORG_A }, () =>
        AuditService.log({
          action: 'CREATE',
          entity: 'X1Probe',
          entityId: 'x1-out',
          tenantId: ORG_B,
        }),
      ),
    ).resolves.toBeUndefined();
  });

  it('X2: promessa não aguardada que roda após o commit lança TransactionClosedError e não grava', async () => {
    const tag = 'x2-late';
    let late: Promise<unknown> | undefined;
    let lateTx: Promise<unknown> | undefined;
    await rit(
      async (tx) => {
        late = new Promise((r) => setTimeout(r, 50)).then(() =>
          prisma.company.create({ data: { legalName: tag, tradeName: tag } as never }),
        );
        lateTx = new Promise((r) => setTimeout(r, 50)).then(() => outboxAppend(tx, ORG_A, tag));
        late.catch(() => undefined);
        lateTx.catch(() => undefined);
      },
      { organizationId: ORG_A },
    );
    await expect(late).rejects.toBeInstanceOf(TransactionClosedError);
    await expect(lateTx).rejects.toBeInstanceOf(TransactionClosedError);
    expect(
      await asTenant(ORG_A, `SELECT 1 FROM "Company" WHERE "legalName"=$1`, [tag]),
    ).toHaveLength(0);
    expect(
      await asTenant(ORG_A, `SELECT 1 FROM "AuditLog" WHERE "entityId"=$1`, [tag]),
    ).toHaveLength(0);
  });

  it('X3: $runCommandRaw no tx e $queryRawTyped/$runCommandRaw no client global dentro do tx lançam', async () => {
    const { TransactionEscapeError } = await import('../../src/lib/txEscapeGuard');
    await rit(
      async (tx) => {
        expect(() => (tx as unknown as { $runCommandRaw: () => unknown }).$runCommandRaw()).toThrow(
          /não é suportado dentro do tx/,
        );
        for (const m of ['$queryRawTyped', '$runCommandRaw']) {
          const f = (prisma as unknown as Record<string, unknown>)[m];
          if (typeof f === 'function') {
            await expect((async () => (f as () => unknown)())()).rejects.toBeInstanceOf(
              TransactionEscapeError,
            );
          }
        }
      },
      { organizationId: ORG_A },
    );
  });
});
