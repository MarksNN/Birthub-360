import { describe, expect, it, vi } from 'vitest';
import {
  assertModelOperationAllowed,
  guardGlobalClientEscapes,
  TransactionEscapeError,
  type TxEscapeState,
} from '../../../src/lib/txEscapeGuard.js';

function fakeClient() {
  const calls: string[] = [];
  const client = {
    _secret: 'ok',
    lead: {
      update: vi.fn(async () => {
        calls.push('lead.update');
        return { id: 'l1' };
      }),
    },
    $queryRaw: vi.fn(function (this: { _secret: string }, ..._a: unknown[]) {
      calls.push(`$queryRaw:${this._secret}`);
      return Promise.resolve([1]);
    }),
    $executeRaw: vi.fn(async () => {
      calls.push('$executeRaw');
      return 1;
    }),
    $queryRawUnsafe: vi.fn(async () => {
      calls.push('$queryRawUnsafe');
      return [];
    }),
    $executeRawUnsafe: vi.fn(async () => {
      calls.push('$executeRawUnsafe');
      return 1;
    }),
    $transaction: vi.fn(async (fn: (c: unknown) => unknown) => {
      calls.push('$transaction');
      return fn({});
    }),
    $disconnect: vi.fn(function (this: { _secret: string }) {
      calls.push(`$disconnect:${this._secret}`);
      return Promise.resolve();
    }),
  };
  return { client, calls };
}

const OFF: TxEscapeState = { activeTransaction: false, outboxUnitOfWorkActive: false };
const TX: TxEscapeState = { activeTransaction: true, outboxUnitOfWorkActive: false };
const UOW: TxEscapeState = { activeTransaction: false, outboxUnitOfWorkActive: true };
const RAW = ['$queryRaw', '$executeRaw', '$queryRawUnsafe', '$executeRawUnsafe'] as const;

describe('G1 — guard de escape do tx no client global', () => {
  it('fora de tx/UoW: raw, $transaction e model passam, com `this` preservado', async () => {
    const { client, calls } = fakeClient();
    const p = guardGlobalClientEscapes(client, () => OFF);
    await p.$queryRaw`SELECT 1`;
    for (const m of RAW.slice(1)) await (p[m] as (...a: unknown[]) => Promise<unknown>)('SELECT 1');
    await p.$transaction(async () => 'x');
    await p.lead.update();
    await p.$disconnect();
    expect(calls).toEqual([
      '$queryRaw:ok',
      '$executeRaw',
      '$queryRawUnsafe',
      '$executeRawUnsafe',
      '$transaction',
      'lead.update',
      '$disconnect:ok',
    ]);
  });

  it.each([
    ['tx ativo (runInTransaction)', TX],
    ['flag outboxUnitOfWorkActive', UOW],
  ])('%s: raw global e $transaction lançam e NÃO executam', async (_n, state) => {
    const { client, calls } = fakeClient();
    const p = guardGlobalClientEscapes(client, () => state);
    for (const m of RAW) {
      expect(() => (p[m] as (...a: unknown[]) => unknown)('SELECT 1')).toThrow(
        TransactionEscapeError,
      );
      expect(() => (p[m] as (...a: unknown[]) => unknown)('SELECT 1')).toThrow(
        /proibido dentro de .*use tx\./,
      );
    }
    expect(() => p.$transaction(async () => 1)).toThrow(/prisma\.\$transaction proibido/);
    expect(calls).toEqual([]);
  });

  it.each([
    ['tx ativo', TX],
    ['flag UoW', UOW],
  ])('%s: o proxy não intercepta model (o caso a fica no $allOperations)', async (_n, state) => {
    const { client, calls } = fakeClient();
    const p = guardGlobalClientEscapes(client, () => state);
    await expect(p.lead.update()).resolves.toEqual({ id: 'l1' });
    expect(calls).toEqual(['lead.update']);
  });

  it('o estado é lido a cada chamada (entra/sai da UoW)', async () => {
    let state = OFF;
    const { client } = fakeClient();
    const p = guardGlobalClientEscapes(client, () => state);
    await p.$executeRawUnsafe('x');
    state = UOW;
    expect(() => p.$executeRawUnsafe('x')).toThrow(TransactionEscapeError);
    state = OFF;
    await expect(p.$executeRawUnsafe('x')).resolves.toBe(1);
  });

  it('o client transacional (tx) não é envolto: SQL cru via tx funciona dentro da UoW', async () => {
    const { client: tx, calls } = fakeClient();
    // dentro da UoW o código usa `tx` (client base da transação), que não passa pelo guard
    await tx.$executeRawUnsafe('INSERT INTO outbox ...');
    await tx.$queryRaw`SELECT 1`;
    expect(calls).toEqual(['$executeRawUnsafe', '$queryRaw:ok']);
  });

  describe('caso (a) — model op no $allOperations', () => {
    it('flag da UoW SEM tx ativo: qualquer prisma.model lança com mensagem clara', () => {
      expect(() => assertModelOperationAllowed(UOW, 'Lead', 'update')).toThrow(
        TransactionEscapeError,
      );
      expect(() => assertModelOperationAllowed(UOW, 'Lead', 'update')).toThrow(
        /prisma\.\* proibido dentro da UoW; use o tx \(prisma\.Lead\.update/,
      );
    });
    it('caminho permitido: com tx ativo (com ou sem flag) e fora de tudo, model passa', () => {
      expect(() => assertModelOperationAllowed(TX, 'Lead', 'update')).not.toThrow();
      expect(() =>
        assertModelOperationAllowed(
          { activeTransaction: true, outboxUnitOfWorkActive: true },
          'AuditLog',
          'create',
        ),
      ).not.toThrow();
      expect(() => assertModelOperationAllowed(OFF, 'Lead', 'findMany')).not.toThrow();
    });
  });

  it('caso (b)/(c) também com flag + tx ativo: raw global e $transaction lançam', () => {
    const { client, calls } = fakeClient();
    const p = guardGlobalClientEscapes(client, () => ({
      activeTransaction: true,
      outboxUnitOfWorkActive: true,
    }));
    expect(() => p.$queryRawUnsafe('SELECT 1')).toThrow(/use tx\.\$queryRawUnsafe/);
    expect(() => p.$transaction(async () => 1)).toThrow(/prisma\.\$transaction proibido/);
    expect(calls).toEqual([]);
  });
});
