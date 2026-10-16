import type { Prisma, PrismaClient } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AgentDnConflictError } from '../../../../../src/features/cadence/dialer/application/ports/CallAttemptRepository.js';
import {
  CallAttempt,
  TERMINAL_CALL_ATTEMPT_STATUSES,
  type CallAttemptProps,
} from '../../../../../src/features/cadence/dialer/domain/entities/CallAttempt.js';
import { Campaign } from '../../../../../src/features/cadence/dialer/domain/entities/Campaign.js';
import { Lead } from '../../../../../src/features/cadence/dialer/domain/entities/Lead.js';
import { PhoneNumber } from '../../../../../src/features/cadence/dialer/domain/value-objects/PhoneNumber.js';
import { PgCallAttemptRepository } from '../../../../../src/features/cadence/dialer/infrastructure/db/repositories/PgCallAttemptRepository.js';
import { PgCampaignRepository } from '../../../../../src/features/cadence/dialer/infrastructure/db/repositories/PgCampaignRepository.js';
import { PgDncRepository } from '../../../../../src/features/cadence/dialer/infrastructure/db/repositories/PgDncRepository.js';
import { PgLeadRepository } from '../../../../../src/features/cadence/dialer/infrastructure/db/repositories/PgLeadRepository.js';

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

describe('PgCampaignRepository', () => {
  const orgId = 'org-tenant-a';
  const repo = new PgCampaignRepository(prisma, orgId);
  const campaignProps = {
    id: '44444444-4444-4444-8444-444444444444',
    organizationId: orgId,
    name: 'Campanha Teste',
    status: 'active' as const,
    createdAt: new Date('2026-10-10T10:00:00Z'),
    updatedAt: new Date('2026-10-10T10:00:00Z'),
  };

  it('rejeita operação sem organizationId configurado ou no contexto', async () => {
    const unscopedRepo = new PgCampaignRepository(prisma);
    await expect(unscopedRepo.findAll()).rejects.toThrow(/requires organizationId/);
  });

  it('save faz upsert parametrizado em campaigns com organization_id', async () => {
    executeRaw.mockResolvedValue(1);
    await repo.save(Campaign.restore(campaignProps));
    const sql = sqlArg(executeRaw);
    expect(sql.sql).toContain('INSERT INTO campaigns');
    expect(sql.sql).toContain('ON CONFLICT (id) DO UPDATE');
    expect(sql.sql).toContain('WHERE campaigns.organization_id =');
    expect(sql.values).toEqual([
      campaignProps.id,
      orgId,
      campaignProps.name,
      campaignProps.status,
      campaignProps.createdAt,
      campaignProps.updatedAt,
      orgId,
    ]);
  });

  it('findById retorna campanha ou null escopado por organization_id', async () => {
    queryRaw.mockResolvedValueOnce([
      {
        id: campaignProps.id,
        organization_id: orgId,
        name: campaignProps.name,
        status: campaignProps.status,
        created_at: campaignProps.createdAt,
        updated_at: campaignProps.updatedAt,
      },
    ]).mockResolvedValueOnce([]);

    const found = await repo.findById(campaignProps.id);
    expect(found?.toProps()).toEqual(campaignProps);
    expect(sqlArg(queryRaw).values).toEqual([campaignProps.id, orgId]);

    const notFound = await repo.findById(campaignProps.id, 'org-tenant-b');
    expect(notFound).toBeNull();
    expect(sqlArg(queryRaw, 1).values).toEqual([campaignProps.id, 'org-tenant-b']);
  });

  it('findActive busca apenas status active do tenant informado', async () => {
    queryRaw.mockResolvedValue([
      {
        id: campaignProps.id,
        organization_id: orgId,
        name: campaignProps.name,
        status: 'active',
        created_at: campaignProps.createdAt,
        updated_at: campaignProps.updatedAt,
      },
    ]);
    const list = await repo.findActive();
    expect(list).toHaveLength(1);
    expect(list[0]?.toProps().status).toBe('active');
    const sql = sqlArg(queryRaw);
    expect(sql.sql).toContain("status = 'active'");
    expect(sql.sql).toContain('organization_id =');
    expect(sql.values).toEqual([orgId]);
  });

  it('findAll retorna todas as campanhas do tenant ordenadas', async () => {
    queryRaw.mockResolvedValue([]);
    await repo.findAll();
    const sql = sqlArg(queryRaw);
    expect(sql.sql).toContain('FROM campaigns');
    expect(sql.sql).toContain('WHERE organization_id =');
    expect(sql.sql).toContain('ORDER BY created_at DESC');
    expect(sql.values).toEqual([orgId]);
  });
});

describe('PgLeadRepository', () => {
  const orgId = 'org-tenant-a';
  const repo = new PgLeadRepository(prisma, orgId);
  const leadProps = {
    id: '55555555-5555-4555-8555-555555555555',
    organizationId: orgId,
    campaignId: '44444444-4444-4444-8444-444444444444',
    name: 'Lead Teste',
    phone: PhoneNumber.create('+5511988887777'),
    status: 'pending' as const,
    attempts: 0,
    nextAttemptAt: new Date('2026-10-10T12:00:00Z'),
    createdAt: new Date('2026-10-10T10:00:00Z'),
    updatedAt: new Date('2026-10-10T10:00:00Z'),
  };

  it('rejeita operação sem organizationId configurado ou no contexto', async () => {
    const unscopedRepo = new PgLeadRepository(prisma);
    await expect(unscopedRepo.findById(leadProps.id)).rejects.toThrow(/requires organizationId/);
  });

  it('save faz upsert parametrizado em lote de 1 lead com organization_id', async () => {
    executeRaw.mockResolvedValue(1);
    await repo.save(Lead.restore(leadProps));
    const sql = sqlArg(executeRaw);
    expect(sql.sql).toContain('INSERT INTO leads');
    expect(sql.sql).toContain('ON CONFLICT (id) DO UPDATE');
    expect(sql.sql).toContain('WHERE leads.organization_id =');
    expect(sql.values).toEqual([
      leadProps.id,
      orgId,
      leadProps.campaignId,
      leadProps.name,
      leadProps.phone.toE164(),
      leadProps.status,
      leadProps.attempts,
      leadProps.nextAttemptAt,
      leadProps.createdAt,
      leadProps.updatedAt,
      orgId,
    ]);
  });

  it('findById retorna lead restaurado ou null escopado por organization_id', async () => {
    queryRaw.mockResolvedValueOnce([
      {
        id: leadProps.id,
        organization_id: orgId,
        campaign_id: leadProps.campaignId,
        name: leadProps.name,
        phone: leadProps.phone.toE164(),
        status: leadProps.status,
        attempts: leadProps.attempts,
        next_attempt_at: leadProps.nextAttemptAt,
        created_at: leadProps.createdAt,
        updated_at: leadProps.updatedAt,
      },
    ]).mockResolvedValueOnce([]);

    const found = await repo.findById(leadProps.id);
    expect(found?.toProps().id).toEqual(leadProps.id);
    expect(sqlArg(queryRaw).values).toEqual([leadProps.id, orgId]);

    const notFound = await repo.findById(leadProps.id, 'org-tenant-b');
    expect(notFound).toBeNull();
    expect(sqlArg(queryRaw, 1).values).toEqual([leadProps.id, 'org-tenant-b']);
  });

  it('claimNextEligible executa CTE com FOR UPDATE SKIP LOCKED e organization_id parametrizado', async () => {
    const now = new Date('2026-10-10T12:00:00Z');
    queryRaw.mockResolvedValue([
      {
        id: leadProps.id,
        organization_id: orgId,
        campaign_id: leadProps.campaignId,
        name: leadProps.name,
        phone: leadProps.phone.toE164(),
        status: 'in_progress',
        attempts: leadProps.attempts,
        next_attempt_at: leadProps.nextAttemptAt,
        created_at: leadProps.createdAt,
        updated_at: now,
      },
    ]);

    const claimed = await repo.claimNextEligible(leadProps.campaignId, now, 5);
    expect(claimed).toHaveLength(1);
    expect(claimed[0]?.toProps().status).toBe('in_progress');
    const sql = sqlArg(queryRaw);
    expect(sql.sql).toContain('FOR UPDATE SKIP LOCKED');
    expect(sql.sql).toContain('organization_id =');
    expect(sql.values).toEqual([orgId, leadProps.campaignId, now, 5, now, orgId]);
  });

  it('existsByCampaignAndPhone retorna booleano parametrizado por organization_id', async () => {
    queryRaw.mockResolvedValueOnce([{ exists: 1 }]).mockResolvedValueOnce([]);
    expect(await repo.existsByCampaignAndPhone(leadProps.campaignId, '+5511988887777')).toBe(true);
    const sql = sqlArg(queryRaw);
    expect(sql.values).toEqual([orgId, leadProps.campaignId, '+5511988887777']);
    expect(await repo.existsByCampaignAndPhone(leadProps.campaignId, '+5511900000000')).toBe(false);
  });

  it('getCampaignStats computa agregação parametrizada por organization_id', async () => {
    queryRaw.mockResolvedValue([
      {
        total_leads: '10',
        pending: '5',
        in_progress: '2',
        contacted: '3',
        exhausted: '0',
        do_not_call: '0',
        invalid_number: '0',
      },
    ]);

    const stats = await repo.getCampaignStats(leadProps.campaignId);
    expect(stats.totalLeads).toBe(10);
    expect(stats.contacted).toBe(3);
    expect(stats.contactRatePercent).toBe(30);
    const sql = sqlArg(queryRaw);
    expect(sql.values).toEqual([orgId, leadProps.campaignId]);
  });
});
