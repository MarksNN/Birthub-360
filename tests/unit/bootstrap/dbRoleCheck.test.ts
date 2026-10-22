import { describe, expect, it, vi } from 'vitest';
import {
  assertDbRoleIsLeastPrivilege,
  DbRoleCheckError,
  MIGRATOR_ROLE,
  type DbRoleQueryExecutor,
} from '../../../src/bootstrap/dbRoleCheck.js';

type Role = {
  currentUser: string;
  isSuperuser: boolean;
  bypassRls: boolean;
  memberOfMigrator: boolean;
  ownsPublicSchema: boolean;
};
const SAFE: Role = {
  currentUser: 'prospector_app',
  isSuperuser: false,
  bypassRls: false,
  memberOfMigrator: false,
  ownsPublicSchema: false,
};

function mockDb(role: Partial<Role> = {}, owned: string[] = []) {
  const q = vi.fn(async (sql: string, ..._v: unknown[]) =>
    sql.includes('rolsuper') ? [{ ...SAFE, ...role }] : owned.map((relname) => ({ relname })),
  );
  return { db: { $queryRawUnsafe: q } as unknown as DbRoleQueryExecutor, q };
}
const PROD = { NODE_ENV: 'production' } as NodeJS.ProcessEnv;
const logger = () => ({ warn: vi.fn(), info: vi.fn() });

describe('dbRoleCheck — produção (fail-closed)', () => {
  it('papel mínimo passa', async () => {
    const { db, q } = mockDb();
    const r = await assertDbRoleIsLeastPrivilege(db, { env: PROD, logger: logger() });
    expect(r?.ok).toBe(true);
    expect(q.mock.calls[0]?.[1]).toBe(MIGRATOR_ROLE);
  });
  it.each([
    [{ isSuperuser: true }, /SUPERUSER/],
    [{ bypassRls: true }, /BYPASSRLS/],
    [{ memberOfMigrator: true }, /prospector_migrator/],
    [{ ownsPublicSchema: true }, /dono do schema public/],
  ])('%o derruba o boot', async (role, re) => {
    const { db } = mockDb(role);
    await expect(assertDbRoleIsLeastPrivilege(db, { env: PROD })).rejects.toThrow(re);
  });
  it('dono de tabela de negócio derruba o boot', async () => {
    const { db } = mockDb({}, ['Lead', 'ForecastSnapshot']);
    await expect(assertDbRoleIsLeastPrivilege(db, { env: PROD })).rejects.toThrow(
      /dono de 2 objeto\(s\).*Lead/,
    );
  });
  it('checkpoint* só é tolerado com a flag, e só a lista fechada do LangGraph', async () => {
    const owned = ['checkpoints', 'checkpoint_writes', 'checkpoint_blobs', 'checkpoint_migrations'];
    await expect(assertDbRoleIsLeastPrivilege(mockDb({}, owned).db, { env: PROD })).rejects.toThrow(
      DbRoleCheckError,
    );
    const env = { ...PROD, DB_ROLE_CHECK_ALLOW_CHECKPOINT_OWNERSHIP: '1' };
    expect((await assertDbRoleIsLeastPrivilege(mockDb({}, owned).db, { env }))?.ok).toBe(true);
    await expect(
      assertDbRoleIsLeastPrivilege(mockDb({}, [...owned, 'checkpoint_evil']).db, { env }),
    ).rejects.toThrow(/checkpoint_evil/);
  });
  it('falha ao consultar o catálogo é fatal', async () => {
    const db = {
      $queryRawUnsafe: vi.fn(async () => {
        throw new Error('conn refused');
      }),
    } as unknown as DbRoleQueryExecutor;
    await expect(assertDbRoleIsLeastPrivilege(db, { env: PROD })).rejects.toThrow(
      /não foi possível verificar.*conn refused/,
    );
  });
  it('current_user ausente em pg_roles é fatal', async () => {
    const db = { $queryRawUnsafe: vi.fn(async () => []) } as unknown as DbRoleQueryExecutor;
    await expect(assertDbRoleIsLeastPrivilege(db, { env: PROD })).rejects.toThrow(DbRoleCheckError);
  });
});

describe('dbRoleCheck — fora de produção (só aviso)', () => {
  it('superuser apenas avisa', async () => {
    const l = logger();
    const r = await assertDbRoleIsLeastPrivilege(
      mockDb({ currentUser: 'postgres', isSuperuser: true }, ['Lead']).db,
      {
        env: { NODE_ENV: 'development' } as NodeJS.ProcessEnv,
        logger: l,
      },
    );
    expect(r?.ok).toBe(false);
    expect(r?.violations).toHaveLength(2);
    expect(l.warn).toHaveBeenCalledTimes(1);
  });
  it('erro de catálogo apenas avisa', async () => {
    const l = logger();
    const db = {
      $queryRawUnsafe: vi.fn(async () => {
        throw new Error('x');
      }),
    } as unknown as DbRoleQueryExecutor;
    expect(
      await assertDbRoleIsLeastPrivilege(db, {
        env: { NODE_ENV: 'test' } as NodeJS.ProcessEnv,
        logger: l,
      }),
    ).toBeNull();
    expect(l.warn).toHaveBeenCalled();
  });
});
