import { Prisma, type PrismaClient } from '@prisma/client';
import {
  AgentDnConflictError,
  type CallAttemptRepository,
} from '../../../application/ports/CallAttemptRepository.js';
import {
  CallAttempt,
  type CallAttemptProps,
  type CallAttemptStatus,
  TERMINAL_CALL_ATTEMPT_STATUSES,
} from '../../../domain/entities/CallAttempt.js';

/** Nome do índice único parcial criado na migration 002 (ver esse arquivo para o motivo). */
const ACTIVE_AGENT_DN_CONSTRAINT = 'uq_call_attempts_active_agent_dn';
const UNIQUE_VIOLATION_SQLSTATE = '23505';

type UnknownRecord = Record<string, unknown>;

function asRecord(value: unknown): UnknownRecord | null {
  return typeof value === 'object' && value !== null ? (value as UnknownRecord) : null;
}

/**
 * Detecta a violação do índice `uq_call_attempts_active_agent_dn` (SQLSTATE 23505).
 *
 * Aceita dois formatos de erro:
 * - erro cru do driver `pg` (`{ code: '23505', constraint: '<nome>' }`);
 * - erro do Prisma com `@prisma/adapter-pg` (P2002/P2010), em que o erro do
 *   driver vem em `meta.driverAdapterError.cause` como
 *   `{ originalCode: '23505', constraint: { index: '<nome>' } }`.
 */
function isActiveAgentDnViolation(error: unknown): boolean {
  const err = asRecord(error);
  if (err === null) return false;

  if (err.code === UNIQUE_VIOLATION_SQLSTATE && err.constraint === ACTIVE_AGENT_DN_CONSTRAINT) {
    return true;
  }

  const cause = asRecord(asRecord(asRecord(err.meta)?.driverAdapterError)?.cause);
  if (cause === null) return false;
  const isUniqueViolation =
    cause.originalCode === UNIQUE_VIOLATION_SQLSTATE || cause.kind === 'UniqueConstraintViolation';
  return isUniqueViolation && asRecord(cause.constraint)?.index === ACTIVE_AGENT_DN_CONSTRAINT;
}

interface CallAttemptRow {
  id: string;
  lead_id: string;
  campaign_id: string;
  agent_dn: string;
  status: CallAttemptStatus;
  provider_call_id: string | null;
  started_at: Date;
  ended_at: Date | null;
}

function rowToProps(row: CallAttemptRow): CallAttemptProps {
  return {
    id: row.id,
    leadId: row.lead_id,
    campaignId: row.campaign_id,
    agentDn: row.agent_dn,
    status: row.status,
    providerCallId: row.provider_call_id,
    startedAt: row.started_at,
    endedAt: row.ended_at,
  };
}

/**
 * Lista parametrizada dos status terminais, a partir da constante do domínio —
 * fonte única de verdade em vez de duplicar a lista de status em SQL.
 */
function terminalStatusList(): Prisma.Sql {
  return Prisma.join(TERMINAL_CALL_ATTEMPT_STATUSES);
}

/**
 * As tabelas do discador (`call_attempts`, migrations em `../migrations`) usam
 * colunas snake_case que o model Prisma `CallAttempt` não cobre
 * (provider_call_id, started_at, ended_at). Por isso as queries usam
 * `$queryRaw`/`$executeRaw` com tagged templates (parametrizados), não o
 * Client CRUD. Alinhamento do schema: handoff 17 → 01 (onda-enxuta).
 */
export class PgCallAttemptRepository implements CallAttemptRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async save(attempt: CallAttempt): Promise<void> {
    const props = attempt.toProps();
    try {
      // biome-ignore lint/plugin/no-prisma-tx-escape: uso legado congelado no baseline (parecer 15 #75 A1; Prisma.sql parametrizado); migrar para runInTransaction
      await this.prisma.$executeRaw(Prisma.sql`
        INSERT INTO call_attempts (id, lead_id, campaign_id, agent_dn, status, provider_call_id, started_at, ended_at)
        VALUES (
          ${props.id}::uuid,
          ${props.leadId}::uuid,
          ${props.campaignId}::uuid,
          ${props.agentDn},
          ${props.status},
          ${props.providerCallId},
          ${props.startedAt},
          ${props.endedAt}
        )
        ON CONFLICT (id) DO UPDATE SET
          status = EXCLUDED.status,
          provider_call_id = EXCLUDED.provider_call_id,
          ended_at = EXCLUDED.ended_at`);
    } catch (error: unknown) {
      if (isActiveAgentDnViolation(error)) {
        throw new AgentDnConflictError(props.agentDn);
      }
      throw error;
    }
  }

  async findById(id: string): Promise<CallAttempt | null> {
    // biome-ignore lint/plugin/no-prisma-tx-escape: uso legado congelado no baseline (parecer 15 #75 A1; Prisma.sql parametrizado); migrar para runInTransaction
    const rows = await this.prisma.$queryRaw<CallAttemptRow[]>(Prisma.sql`
      SELECT id, lead_id, campaign_id,
             agent_dn, status, provider_call_id, started_at, ended_at
      FROM call_attempts
      WHERE id = ${id}::uuid`);
    const row = rows[0];
    return row === undefined ? null : CallAttempt.restore(rowToProps(row));
  }

  async findInProgress(campaignId: string): Promise<CallAttempt[]> {
    // biome-ignore lint/plugin/no-prisma-tx-escape: uso legado congelado no baseline (parecer 15 #75 A1; Prisma.sql parametrizado); migrar para runInTransaction
    const rows = await this.prisma.$queryRaw<CallAttemptRow[]>(Prisma.sql`
      SELECT id, lead_id, campaign_id,
             agent_dn, status, provider_call_id, started_at, ended_at
      FROM call_attempts
      WHERE campaign_id = ${campaignId}::uuid
        AND status NOT IN (${terminalStatusList()})`);
    return rows.map((row) => CallAttempt.restore(rowToProps(row)));
  }

  async findBusyAgentDns(): Promise<Set<string>> {
    // biome-ignore lint/plugin/no-prisma-tx-escape: uso legado congelado no baseline (parecer 15 #75 A1; Prisma.sql parametrizado); migrar para runInTransaction
    const rows = await this.prisma.$queryRaw<{ agent_dn: string }[]>(Prisma.sql`
      SELECT DISTINCT agent_dn FROM call_attempts
      WHERE status NOT IN (${terminalStatusList()})`);
    return new Set(rows.map((row) => row.agent_dn));
  }
}
