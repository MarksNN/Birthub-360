import { createHash } from 'node:crypto';
import type {
  RebalanceApprovalRecord,
  RebalanceOwnerStatsV2,
  RebalanceRecommendationsResponseV2,
  RebalanceRecommendationV2,
} from '../../../shared/contracts/predictiveRevenueOracle.contract.js';

/**
 * Recomendações de rebalanceamento de carteira a partir de dados REAIS do tenant (funil Negócio).
 *
 * Regra (simples e explicável, constantes nomeadas abaixo):
 *  1. Owner elegível = `Lead.owner` que resolve para um `User.id` do tenant e que encerrou
 *     (ganho + perdido) ≥ REBALANCE_MIN_CLOSED_PER_OWNER negócios nos últimos
 *     REBALANCE_THROUGHPUT_WINDOW_DAYS dias.
 *  2. backlogDays = negóciosAbertos ÷ (encerradosNaJanela ÷ janelaDias) — quantos dias o owner
 *     levaria para escoar a carteira atual no próprio ritmo histórico.
 *  3. Referência = mediana de backlogDays dos owners elegíveis.
 *  4. Doador: backlogDays > REBALANCE_OVERLOAD_RATIO × mediana e abertos ≥ REBALANCE_MIN_OPEN_TO_DONATE.
 *     Receptor: owner elegível cujo backlogDays, já contando o negócio recebido, fica ≤ mediana.
 *  5. Move, do doador mais sobrecarregado para o receptor de menor backlogDays, os negócios abertos
 *     MAIS ANTIGOS (createdAt), um a um, recalculando backlogDays, até o doador sair da sobrecarga,
 *     faltar receptor ou atingir REBALANCE_MAX_MOVES_PER_OWNER.
 * Abaixo dos mínimos (owners elegíveis < REBALANCE_MIN_OWNERS) → [] + status insufficient_data.
 * Nada é aplicado ao CRM: a decisão humana vai para POST /rebalance/approvals.
 */
export const REBALANCE_THROUGHPUT_WINDOW_DAYS = 90;
export const REBALANCE_MIN_OWNERS = 2;
export const REBALANCE_MIN_CLOSED_PER_OWNER = 3;
export const REBALANCE_OVERLOAD_RATIO = 1.5;
export const REBALANCE_MIN_OPEN_TO_DONATE = 5;
export const REBALANCE_MAX_MOVES_PER_OWNER = 5;

const DAY_MS = 86_400_000;

export interface RebalanceOpenDeal {
  leadId: string;
  title: string | null;
  owner: string | null;
  companyId: string | null;
  companyName: string | null;
  amount: number | null;
  createdAt: Date;
}
export interface RebalanceClosedDeal {
  owner: string | null;
  closedAt: Date;
}
export interface RebalanceOrgUser {
  id: string;
  name: string;
}

/** Porta de leitura tenant-scoped — implementação Prisma em infra/PrismaRebalanceRecommendationReader.ts. */
export interface RebalanceRecommendationReader {
  listOpenDeals(organizationId: string): Promise<RebalanceOpenDeal[]>;
  /** Ganhos + perdidos com closedAt ≥ since. */
  listClosedDeals(organizationId: string, since: Date): Promise<RebalanceClosedDeal[]>;
  listOrgUsers(organizationId: string): Promise<RebalanceOrgUser[]>;
  listDecisions(
    organizationId: string,
    recommendationIds: string[],
  ): Promise<RebalanceApprovalRecord[]>;
}

export function rebalanceRecommendationId(
  organizationId: string,
  leadId: string,
  fromOwner: string,
  toOwner: string,
): string {
  const h = createHash('sha256').update(`${organizationId}|${leadId}|${fromOwner}|${toOwner}`);
  return `rb_${h.digest('hex').slice(0, 32)}`;
}

function median(values: number[]): number {
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}
const r1 = (n: number) => Math.round(n * 10) / 10;

const RULE_DESCRIPTION =
  `backlogDays = abertos ÷ (encerrados em ${REBALANCE_THROUGHPUT_WINDOW_DAYS}d ÷ ${REBALANCE_THROUGHPUT_WINDOW_DAYS}). ` +
  `Doador: backlogDays > ${REBALANCE_OVERLOAD_RATIO} × mediana da equipe e ≥ ${REBALANCE_MIN_OPEN_TO_DONATE} abertos. ` +
  'Receptor: backlogDays (após receber) ≤ mediana. Move os negócios abertos mais antigos, ' +
  `até ${REBALANCE_MAX_MOVES_PER_OWNER} por doador.`;

export class RebalanceRecommendationService {
  private readonly readerFactory: () => Promise<RebalanceRecommendationReader>;
  private readonly now: () => Date;

  constructor(deps?: { reader?: RebalanceRecommendationReader; now?: () => Date }) {
    const injected = deps?.reader;
    this.readerFactory = injected
      ? async () => injected
      : async () => {
          const mod = await import('../infra/PrismaRebalanceRecommendationReader.js');
          return new mod.PrismaRebalanceRecommendationReader();
        };
    this.now = deps?.now ?? (() => new Date());
  }

  async list(organizationId: string): Promise<RebalanceRecommendationsResponseV2> {
    if (!organizationId) throw new Error('Tenancy violation: organizationId obrigatório');
    const reader = await this.readerFactory();
    const now = this.now();
    const since = new Date(now.getTime() - REBALANCE_THROUGHPUT_WINDOW_DAYS * DAY_MS);
    const [open, closed, users] = await Promise.all([
      reader.listOpenDeals(organizationId),
      reader.listClosedDeals(organizationId, since),
      reader.listOrgUsers(organizationId),
    ]);
    const userName = new Map(users.map((u) => [u.id, u.name]));

    const openBy = new Map<string, RebalanceOpenDeal[]>();
    let unassigned = 0;
    let unresolved = 0;
    for (const d of open) {
      if (!d.owner) unassigned++;
      else if (!userName.has(d.owner)) unresolved++;
      else openBy.set(d.owner, [...(openBy.get(d.owner) ?? []), d]);
    }
    const closedBy = new Map<string, number>();
    for (const c of closed) {
      if (c.owner && userName.has(c.owner) && c.closedAt >= since && c.closedAt <= now) {
        closedBy.set(c.owner, (closedBy.get(c.owner) ?? 0) + 1);
      }
    }
    const W = REBALANCE_THROUGHPUT_WINDOW_DAYS;
    const stats = (id: string, openDeals: number): RebalanceOwnerStatsV2 => {
      const closedInWindow = closedBy.get(id) ?? 0;
      return {
        id,
        name: userName.get(id) ?? id,
        openDeals,
        closedInWindow,
        backlogDays: r1(openDeals / (closedInWindow / W)),
      };
    };
    const eligible = [...closedBy.entries()]
      .filter(([, n]) => n >= REBALANCE_MIN_CLOSED_PER_OWNER)
      .map(([id]) => id)
      .sort();
    const owners = eligible.map((id) => stats(id, openBy.get(id)?.length ?? 0));

    const base = {
      generatedAt: now.toISOString(),
      rule: {
        description: RULE_DESCRIPTION,
        throughputWindowDays: W,
        minOwners: REBALANCE_MIN_OWNERS,
        minClosedPerOwner: REBALANCE_MIN_CLOSED_PER_OWNER,
        overloadRatio: REBALANCE_OVERLOAD_RATIO,
        minOpenDealsToDonate: REBALANCE_MIN_OPEN_TO_DONATE,
        maxMovesPerOwner: REBALANCE_MAX_MOVES_PER_OWNER,
      },
      owners,
      diagnostics: {
        openDealsTotal: open.length,
        unassignedOpenDeals: unassigned,
        unresolvedOwnerOpenDeals: unresolved,
      },
    };
    if (owners.length < REBALANCE_MIN_OWNERS) {
      return {
        ...base,
        status: 'insufficient_data',
        insufficientDataReason: `Rebalanceamento exige ${REBALANCE_MIN_OWNERS} owners (User do tenant) com ≥ ${REBALANCE_MIN_CLOSED_PER_OWNER} negócios encerrados nos últimos ${W} dias; há ${owners.length}.`,
        teamMedianBacklogDays: null,
        recommendations: [],
      };
    }

    const med = median(owners.map((o) => o.backlogDays));
    const load = new Map(owners.map((o) => [o.id, o.openDeals]));
    const backlog = (id: string, extra = 0) =>
      ((load.get(id) ?? 0) + extra) / ((closedBy.get(id) ?? 0) / W);
    const donors = owners
      .filter(
        (o) =>
          o.backlogDays > REBALANCE_OVERLOAD_RATIO * med &&
          o.openDeals >= REBALANCE_MIN_OPEN_TO_DONATE,
      )
      .sort((a, b) => b.backlogDays - a.backlogDays || a.id.localeCompare(b.id));

    const drafts: Array<Omit<RebalanceRecommendationV2, 'approvalStatus' | 'decision'>> = [];
    for (const donor of donors) {
      const deals = [...(openBy.get(donor.id) ?? [])].sort(
        (a, b) => a.createdAt.getTime() - b.createdAt.getTime() || a.leadId.localeCompare(b.leadId),
      );
      let moves = 0;
      for (const deal of deals) {
        if (moves >= REBALANCE_MAX_MOVES_PER_OWNER) break;
        if (backlog(donor.id) <= REBALANCE_OVERLOAD_RATIO * med) break;
        const receiver = owners
          .filter((o) => o.id !== donor.id && backlog(o.id, 1) <= med)
          .sort((a, b) => backlog(a.id) - backlog(b.id) || a.id.localeCompare(b.id))[0];
        if (!receiver) break;
        const fromStats = stats(donor.id, load.get(donor.id) ?? 0);
        const toStats = stats(receiver.id, load.get(receiver.id) ?? 0);
        load.set(donor.id, (load.get(donor.id) ?? 0) - 1);
        load.set(receiver.id, (load.get(receiver.id) ?? 0) + 1);
        moves++;
        drafts.push({
          recommendationId: rebalanceRecommendationId(
            organizationId,
            deal.leadId,
            donor.id,
            receiver.id,
          ),
          leadId: deal.leadId,
          leadTitle: deal.title,
          account: { companyId: deal.companyId, name: deal.companyName },
          amount: deal.amount,
          fromOwner: { id: donor.id, name: fromStats.name },
          toOwner: { id: receiver.id, name: toStats.name },
          reason: `${fromStats.name} tem ${fromStats.backlogDays} dias de carteira no ritmo atual (${fromStats.openDeals} abertos, ${fromStats.closedInWindow} encerrados em ${W}d), acima de ${REBALANCE_OVERLOAD_RATIO}× a mediana da equipe (${r1(med)} dias); ${toStats.name} está em ${toStats.backlogDays} dias. Negócio aberto mais antigo da carteira sobrecarregada.`,
          evidence: {
            from: fromStats,
            to: toStats,
            teamMedianBacklogDays: r1(med),
            dealOpenSinceDays: Math.floor((now.getTime() - deal.createdAt.getTime()) / DAY_MS),
          },
        });
      }
    }

    const decisions = drafts.length
      ? await reader.listDecisions(
          organizationId,
          drafts.map((d) => d.recommendationId),
        )
      : [];
    const byId = new Map(
      decisions
        .filter((d) => d.organizationId === organizationId)
        .map((d) => [d.recommendationId, d]),
    );
    return {
      ...base,
      status: 'ok',
      insufficientDataReason: null,
      teamMedianBacklogDays: r1(med),
      recommendations: drafts.map((d) => {
        const decision = byId.get(d.recommendationId) ?? null;
        return {
          ...d,
          approvalStatus: decision ? decision.decision : 'PENDING_HUMAN_REVIEW',
          decision,
        };
      }),
    };
  }
}

export const rebalanceRecommendationService = new RebalanceRecommendationService();
