import type { Prisma, PrismaClient } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AgentDnConflictError } from '../../../../../src/features/cadence/dialer/application/ports/CallAttemptRepository.js';
import {
  CallAttempt,
  TERMINAL_CALL_ATTEMPT_STATUSES,
  type CallAttemptProps,
} from '../../../../../src/features/cadence/dialer/domain/entities/CallAttempt.js';
import { PgCallAttemptRepository } from '../../../../../src/features/cadence/dialer/infrastructure/db/repositories/PgCallAttemptRepository.js';
import { PgDncRepository } from '../../../../../src/features/cadence/dialer/infrastructure/db/repositories/PgDncRepository.js';

const queryRaw = vi.fn();
const executeRaw = vi.fn();
const prisma = { $queryRaw: queryRaw, $executeRaw: executeRaw } as unknown as PrismaClient;

function sqlArg(mock: ReturnType<typeof vi.fn>, call = 0): Prisma.Sql {
  const arg = mock.mock.calls[call]?.[0];
  // Tagged template do Prisma (Prisma.sql), não string crua + array.
  expect(arg).toEqual(expect.objectContaining({ sql: expect.any(String), values: expect.any(Array) }));
  // Uma única Prisma.Sql por chamada — nunca array como 2º argumento.
  expect(mock.mock.calls[call]).toHaveLength(1);
  return arg as Prisma.Sql;
}

const props: CallAttemptProps = {
  id: '11111111-1111-4111-8111-111111111111',
  leadId: '22222222-2222-4222-8222-222222222222',
  campaignId: '33333333-3333-4333-8333-333333333333',
  agentDn: '101',
  status: 'dialing',
  providerCallId: null,
  startedAt: new Date('2026-10-10T12:00:00Z'),
  endedAt: null,
};

const row = {
  id: props.id,
  lead_id: props.leadId,
  campaign_id: props.campaignId,
  agent_dn: props.agentDn,
  status: props.status,
  provider_call_id: props.providerCallId,
  started_at: props.startedAt,
  ended_at: props.endedAt,
};

beforeEach(() => {
  queryRaw.mockReset();
  executeRaw.mockReset();
});

describe('PgCallAttemptRepository', () => {
  const repo = new PgCallAttemptRepository(prisma);

  it('save faz upsert parametrizado em call_attempts', async () => {
    executeRaw.mockResolvedValue(1);
    await repo.save(CallAttempt.restore(props));
    const sql = sqlArg(executeRaw);
    expect(sql.sql).toContain('INSERT INTO call_attempts');
    expect(sql.sql).toContain('ON CONFLICT (id) DO UPDATE');
    expect(sql.values).toEqual([
      props.id,
      props.leadId,
      props.campaignId,
      props.agentDn,
      props.status,
      props.providerCallId,
      props.startedAt,
      props.endedAt,
    ]);
  });

  it('save traduz violação de uq_call_attempts_active_agent_dn (erro pg cru) em AgentDnConflictError', async () => {
    executeRaw.mockRejectedValue(
      Object.assign(new Error('dup'), { code: '23505', constraint: 'uq_call_attempts_active_agent_dn' }),
    );
    await expect(repo.save(CallAttempt.restore(props))).rejects.toBeInstanceOf(AgentDnConflictError);
  });

  it('save traduz violação vinda do Prisma + adapter-pg (meta.driverAdapterError) em AgentDnConflictError', async () => {
    executeRaw.mockRejectedValue(
      Object.assign(new Error('Raw query failed'), {
        code: 'P2010',
        meta: {
          driverAdapterError: {
            cause: {
              kind: 'UniqueConstraintViolation',
              originalCode: '23505',
              constraint: { index: 'uq_call_attempts_active_agent_dn' },
            },
          },
        },
      }),
    );
    await expect(repo.save(CallAttempt.restore(props))).rejects.toBeInstanceOf(AgentDnConflictError);
  });

  it('save propaga outras violações 23505 sem traduzir', async () => {
    const other = Object.assign(new Error('dup pk'), { code: '23505', constraint: 'call_attempts_pkey' });
    executeRaw.mockRejectedValue(other);
    await expect(repo.save(CallAttempt.restore(props))).rejects.toBe(other);
  });

  it('findById retorna entidade restaurada ou null', async () => {
    queryRaw.mockResolvedValueOnce([row]).mockResolvedValueOnce([]);
    const found = await repo.findById(props.id);
    expect(found?.toProps()).toEqual(props);
    expect(sqlArg(queryRaw).values).toEqual([props.id]);
    expect(await repo.findById(props.id)).toBeNull();
  });

  it('findInProgress filtra por campanha e exclui status terminais do domínio', async () => {
    queryRaw.mockResolvedValue([row]);
    const result = await repo.findInProgress(props.campaignId);
    expect(result).toHaveLength(1);
    const sql = sqlArg(queryRaw);
    expect(sql.sql).toContain('NOT IN');
    expect(sql.values).toEqual([props.campaignId, ...TERMINAL_CALL_ATTEMPT_STATUSES]);
  });

  it('findBusyAgentDns devolve Set de DNs não terminais', async () => {
    queryRaw.mockResolvedValue([{ agent_dn: '101' }, { agent_dn: '102' }]);
    const result = await repo.findBusyAgentDns();
    expect(result).toEqual(new Set(['101', '102']));
    expect(sqlArg(queryRaw).values).toEqual([...TERMINAL_CALL_ATTEMPT_STATUSES]);
  });
});

describe('PgDncRepository', () => {
  const repo = new PgDncRepository(prisma);

  it('isBlocked consulta dnc_list por telefone', async () => {
    queryRaw.mockResolvedValueOnce([{ exists: 1 }]).mockResolvedValueOnce([]);
    expect(await repo.isBlocked('+5511999999999')).toBe(true);
    const sql = sqlArg(queryRaw);
    expect(sql.sql).toContain('FROM dnc_list');
    expect(sql.values).toEqual(['+5511999999999']);
    expect(await repo.isBlocked('+5511888888888')).toBe(false);
  });

  it('add faz upsert parametrizado (phone, reason)', async () => {
    executeRaw.mockResolvedValue(1);
    await repo.add('+5511999999999', 'opt-out');
    const sql = sqlArg(executeRaw);
    expect(sql.sql).toContain('INSERT INTO dnc_list');
    expect(sql.sql).toContain('ON CONFLICT (phone) DO UPDATE');
    expect(sql.values).toEqual(['+5511999999999', 'opt-out']);
  });
});
