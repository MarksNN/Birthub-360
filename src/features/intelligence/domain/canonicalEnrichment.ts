import { z } from 'zod';

/**
 * Contrato Canônico de Enriquecimento e Inteligência Comercial — ONDA 11
 * Padroniza os dados firmográficos, de ICP Fit, temperatura, estagnação e proveniência
 * para consumo uniforme por todos os agentes do Swarm e pelo Copiloto Contextual.
 */

export const LeadTemperatureEnum = z.enum(['HOT', 'WARM', 'COLD', 'UNKNOWN']);
export type LeadTemperatureType = z.infer<typeof LeadTemperatureEnum>;

export const EnrichmentStatusEnum = z.enum([
  'Pendente',
  'Enriquecendo',
  'Enriquecido',
  'Falhou',
  'UNKNOWN',
]);
export type EnrichmentStatusType = z.infer<typeof EnrichmentStatusEnum>;

export function toPrismaTemperature(temp?: string | null): 'Quente' | 'Morno' | 'Frio' | undefined {
  if (!temp) return undefined;
  const upper = temp.toUpperCase();
  if (upper === 'HOT' || upper === 'QUENTE') return 'Quente';
  if (upper === 'WARM' || upper === 'MORNO') return 'Morno';
  if (upper === 'COLD' || upper === 'FRIO') return 'Frio';
  return undefined;
}

export function toCanonicalTemperature(temp?: string | null): LeadTemperatureType {
  if (!temp) return 'UNKNOWN';
  const upper = temp.toUpperCase();
  if (upper === 'HOT' || upper === 'QUENTE') return 'HOT';
  if (upper === 'WARM' || upper === 'MORNO') return 'WARM';
  if (upper === 'COLD' || upper === 'FRIO') return 'COLD';
  return 'UNKNOWN';
}

export interface CanonicalFirmographics {
  legalName: string | null;
  tradeName: string | null;
  cnpj: string | null;
  capitalSocial: number | null;
  size: string | null;
  segment: string | null;
  cnae: string | null;
  employeeCount: number | null;
  website: string | null;
  city: string | null;
  state: string | null;
  situacaoCadastral: string | null;
}

export interface CanonicalIntentSignals {
  keywords: string[];
  technologies: string[];
  googleRating: number | null;
  googleReviewsCount: number | null;
}

export interface CanonicalCommercialHistory {
  status: string;
  amount: number | null;
  currency: string;
  lastInteraction: string | null;
  nextAction: string | null;
  activityCount: number;
  openActivitiesCount: number;
}

export interface CanonicalStagnation {
  isStagnant: boolean;
  daysSinceLastInteraction: number | null;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  reason: string;
}

export interface CanonicalDataFreshness {
  enrichmentStatus: EnrichmentStatusType;
  enrichmentSource: string | null;
  enrichedAt: string | null;
  isStale: boolean; // Mais de 90 dias sem atualização
  completenessPercent: number; // 0 a 100
}

export interface CanonicalEnrichmentContext {
  version: '1.0.0';
  leadId: string;
  organizationId: string;
  companyId: string | null;
  contactId: string | null;
  contactName: string | null;
  contactRole: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  icpFitScore: number | null; // 0 a 100
  temperature: LeadTemperatureType;
  pic: string | null; // Perfil de Cliente Ideal (ex: PIC1_Expansao)
  firmographics: CanonicalFirmographics;
  intentSignals: CanonicalIntentSignals;
  commercialHistory: CanonicalCommercialHistory;
  stagnation: CanonicalStagnation;
  dataFreshness: CanonicalDataFreshness;
}

/**
 * Calcula a completude cadastral e firmográfica (0 a 100%).
 */
export function calculateCompleteness(company: any, lead: any): number {
  const fieldsToCheck = [
    company?.legalName || company?.tradeName,
    company?.cnpj,
    company?.segment,
    company?.size,
    company?.city,
    company?.state,
    company?.website,
    lead?.contact?.name,
    lead?.contact?.email || lead?.contact?.phone,
    lead?.score !== null && lead?.score !== undefined,
  ];

  const presentCount = fieldsToCheck.filter(Boolean).length;
  return Math.round((presentCount / fieldsToCheck.length) * 100);
}

/**
 * Avalia o indicador de estagnação de um lead com base na data da última interação.
 */
export function evaluateStagnation(
  lastInteractionDate: Date | null | undefined,
  leadStatus: string,
  now: Date = new Date(),
): CanonicalStagnation {
  // Leads finalizados não sofrem estagnação de pipeline
  if (
    leadStatus === 'Negocios_Ganhos' ||
    leadStatus === 'Negocios_Perdidos' ||
    leadStatus === 'Lead_Desqualificado'
  ) {
    return {
      isStagnant: false,
      daysSinceLastInteraction: null,
      riskLevel: 'LOW',
      reason: 'Lead em estágio terminal (concluído ou desqualificado).',
    };
  }

  if (!lastInteractionDate) {
    return {
      isStagnant: true,
      daysSinceLastInteraction: null,
      riskLevel: 'HIGH',
      reason: 'Nenhuma interação registrada desde a criação da oportunidade.',
    };
  }

  const diffMs = now.getTime() - new Date(lastInteractionDate).getTime();
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (days >= 14) {
    return {
      isStagnant: true,
      daysSinceLastInteraction: days,
      riskLevel: 'HIGH',
      reason: `Sem contato há ${days} dias (limite crítico de estagnação excedido).`,
    };
  }

  if (days >= 7) {
    return {
      isStagnant: true,
      daysSinceLastInteraction: days,
      riskLevel: 'MEDIUM',
      reason: `Sem contato há ${days} dias (atenção recomendada para manter o deal aquecido).`,
    };
  }

  return {
    isStagnant: false,
    daysSinceLastInteraction: days,
    riskLevel: 'LOW',
    reason: `Última interação recente (${days} dia(s) atrás).`,
  };
}

/**
 * Constrói o contexto canônico a partir dos modelos Prisma Lead, Company e Activities.
 */
export function buildCanonicalEnrichmentContext(
  lead: any,
  now: Date = new Date(),
): CanonicalEnrichmentContext {
  const c = lead.company;
  const p = lead.contact;
  const activities = Array.isArray(lead.activities) ? lead.activities : [];

  const openActivities = activities.filter((a: any) => a.status === 'Pendente');
  const stagnation = evaluateStagnation(lead.lastInteraction, lead.status, now);
  const completeness = calculateCompleteness(c, lead);

  let isStale = false;
  if (c?.enrichedAt) {
    const enrichedAgeDays =
      (now.getTime() - new Date(c.enrichedAt).getTime()) / (1000 * 60 * 60 * 24);
    if (enrichedAgeDays > 90) {
      isStale = true;
    }
  }

  return {
    version: '1.0.0',
    leadId: lead.id,
    organizationId: lead.organizationId,
    companyId: lead.companyId ?? null,
    contactId: lead.contactId ?? null,
    contactName: p?.name ?? null,
    contactRole: p?.role ?? null,
    contactEmail: p?.email ?? null,
    contactPhone: p?.phone ?? null,
    icpFitScore: lead.score ?? null,
    temperature: toCanonicalTemperature(lead.temperature),
    pic: lead.pic ?? null,
    firmographics: {
      legalName: c?.legalName ?? null,
      tradeName: c?.tradeName ?? null,
      cnpj: c?.cnpj ?? null,
      capitalSocial: c?.capitalSocial ?? null,
      size: c?.size ?? null,
      segment: c?.segment ?? null,
      cnae: c?.cnae ?? null,
      employeeCount: c?.employeeCount ?? null,
      website: c?.website ?? null,
      city: c?.city ?? null,
      state: c?.state ?? null,
      situacaoCadastral: c?.situacaoCadastral ?? null,
    },
    intentSignals: {
      keywords: Array.isArray(c?.keywords) ? c.keywords : [],
      technologies: Array.isArray(c?.technologies) ? c.technologies : [],
      googleRating: c?.googleRating ?? null,
      googleReviewsCount: c?.googleReviewsCount ?? null,
    },
    commercialHistory: {
      status: lead.status,
      amount: lead.amount ?? null,
      currency: lead.currency || 'BRL',
      lastInteraction: lead.lastInteraction ? new Date(lead.lastInteraction).toISOString() : null,
      nextAction: lead.nextAction ? new Date(lead.nextAction).toISOString() : null,
      activityCount: activities.length,
      openActivitiesCount: openActivities.length,
    },
    stagnation,
    dataFreshness: {
      enrichmentStatus: (c?.enrichmentStatus as EnrichmentStatusType) || 'UNKNOWN',
      enrichmentSource: c?.enrichmentSource ?? null,
      enrichedAt: c?.enrichedAt ? new Date(c.enrichedAt).toISOString() : null,
      isStale,
      completenessPercent: completeness,
    },
  };
}

/**
 * Formata o contexto canônico para apresentação em texto estruturado aos modelos de IA,
 * usando estados explícitos como UNKNOWN, PENDING e UNAVAILABLE.
 */
export function formatCanonicalEnrichmentForAgent(ctx: CanonicalEnrichmentContext): string {
  const f = ctx.firmographics;
  const s = ctx.stagnation;
  const fresh = ctx.dataFreshness;
  const h = ctx.commercialHistory;

  let text = `=== CONTEXTO CANÔNICO DE INTELIGÊNCIA COMERCIAL (v${ctx.version}) ===\n`;
  text += `• Lead ID: ${ctx.leadId}\n`;
  text += `• Status no Funil: ${h.status}\n`;
  text += `• Temperatura: ${ctx.temperature}\n`;
  text += `• ICP Fit Score: ${ctx.icpFitScore !== null ? `${ctx.icpFitScore}/100` : 'PENDING (Não calculado)'}\n`;
  text += `• Perfil PIC Playbook: ${ctx.pic || 'UNKNOWN (Não classificado)'}\n\n`;

  text += `[DADOS FIRMOGRÁFICOS DA EMPRESA]\n`;
  text += `• Nome Fantasia / Razão: ${f.tradeName || f.legalName || 'UNKNOWN'}\n`;
  text += `• CNPJ: ${f.cnpj || 'UNAVAILABLE'}\n`;
  text += `• Segmento: ${f.segment || 'UNKNOWN'}\n`;
  text += `• Porte: ${f.size || 'UNKNOWN'}\n`;
  text += `• Colaboradores: ${f.employeeCount !== null ? f.employeeCount : 'UNKNOWN'}\n`;
  text += `• Localização: ${[f.city, f.state].filter(Boolean).join(' - ') || 'UNKNOWN'}\n`;
  text += `• Situação Cadastral: ${f.situacaoCadastral || 'UNKNOWN'}\n`;
  text += `• Tecnologias Mapeadas: ${ctx.intentSignals.technologies.length > 0 ? ctx.intentSignals.technologies.join(', ') : 'Nenhuma identificada'}\n\n`;

  text += `[HISTÓRICO & DIAGNÓSTICO DE ESTAGNAÇÃO]\n`;
  text += `• Última Interação: ${h.lastInteraction || 'NUNCA'}\n`;
  text += `• Atividades Totais / Abertas: ${h.activityCount} / ${h.openActivitiesCount}\n`;
  text += `• Risco de Estagnação: ${s.riskLevel} (${s.reason})\n\n`;

  text += `[PROVENIÊNCIA E CONFIANÇA DOS DADOS]\n`;
  text += `• Status Enriquecimento: ${fresh.enrichmentStatus}\n`;
  text += `• Origem dos Dados: ${fresh.enrichmentSource || 'Cadastro Manual'}\n`;
  text += `• Atualizado em: ${fresh.enrichedAt || 'PENDING'}${fresh.isStale ? ' (ATENÇÃO: Dados defasados > 90 dias)' : ''}\n`;
  text += `• Completude Cadastral: ${fresh.completenessPercent}%\n`;

  if (ctx.contactName) {
    text += `\n[CONTATO PRINCIPAL]\n`;
    text += `• Nome: ${ctx.contactName}\n`;
    text += `• Cargo: ${ctx.contactRole || 'UNKNOWN'}\n`;
  }

  return text;
}
