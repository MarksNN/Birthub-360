import type {
  LeadFunnel,
  ContactStatus as PrismaContactStatus,
  LeadStatus as PrismaLeadStatus,
  LeadTemperature as PrismaLeadTemperature,
} from '@prisma/client';
import type { ActivityStatus, ActivityType, CompanyStatus } from '../../lib/zod.js';

export interface LeadQualification {
  segmentoOperacao?: string;
  tipoCarga?: string;
  principaisRotas?: string;
  usaTerceiros?: 'Sim' | 'Não' | '';
  mediaContratacaoTerceiros?: string;
  viagensPorMes?: string;
  frotaPropria?: string;
  frotaAgregados?: string;
  frotaTerceiros?: string;
  ermTms?: string;
  rastreador?: string;
  seguradora?: string;
  corretora?: string;
  possuiGR?: string;
  fornecedorGRAtual?: string;
  possuiCadastroMotorista?: string;
  consultaCadastroAtual?: string;
  possuiSoftwareLogistico?: string;
  softwareLogisticoAtual?: string;
  dorPrincipal?: string;
  detalhamentoDor?: string;
  impactoPercebido?: string;
  solucaoBirthub360?: 'Profile' | 'GR' | 'Connect' | 'Combinação' | '';
  nivelAutoridade?: 'Decisor' | 'Influenciador' | 'Usuário' | '';
  interessePercebido?: 'Baixo' | 'Médio' | 'Alto' | '';
  horizonteDecisao?: 'Imediato' | '30 dias' | '60-90 dias' | 'Indefinido' | '';
  expectativaProximaCall?: string;
  temaProximaReuniao?: string;
}

export interface Company<TDate = Date> {
  id: string;
  legalName: string;
  tradeName: string;
  cnpj?: string | null;
  stateRegistration?: string | null;
  segment?: string | null;
  cnae?: string | null;
  size?: string | null;
  employeeCount?: number | null;
  estimatedRevenue?: number | null;
  website?: string | null;
  linkedin?: string | null;
  instagram?: string | null;
  twitter?: string | null;
  facebook?: string | null;
  phones: string[];
  emails: string[];
  address?: string | null;
  city?: string | null;
  state?: string | null;
  zipCode?: string | null;
  status: CompanyStatus | string;
  tags: string[];
  observations?: string | null;
  customFields?: any;
  organizationId?: string | null;
  createdAt: TDate;
  updatedAt: TDate;

  situacaoCadastral?: string | null;
  naturezaJuridica?: string | null;
  capitalSocial?: number | null;
  dataAbertura?: TDate | null;
  qsa?: unknown | null;
  enrichmentStatus?: string;
  enrichmentSource?: string | null;
  enrichedAt?: TDate | null;

  googleRating?: number | null;
  googleReviewsCount?: number | null;
  businessHours?: { openNow?: boolean; weekdayDescriptions?: string[] } | null;

  technologies?: string[];
  keywords?: string[];
  logoUrl?: string | null;
  apolloOrgId?: string | null;

  contacts?: Contact<TDate>[];
  leads?: Lead<TDate>[];
}

export interface Contact<TDate = Date> {
  id: string;
  name: string;
  role?: string | null;
  department?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
  email?: string | null;
  linkedin?: string | null;
  birthDate?: TDate | null;
  observations?: string | null;
  status: PrismaContactStatus | string;
  source?: string | null;
  seniority?: string | null;
  emailStatus?: string | null;
  customFields?: any;
  companyId: string;
  company?: Company<TDate>;
  aiProcessingConsent?: boolean | null;
  leads?: Lead<TDate>[];
  organizationId?: string | null;
  createdAt: TDate;
  updatedAt: TDate;
}

export interface Lead<TDate = Date> {
  id: string;
  status: PrismaLeadStatus | string;
  funnel?: LeadFunnel | 'Lead' | 'Negocio' | string;
  title?: string | null;
  amount?: number | null;
  currency: string;
  probability?: number | null;
  forecastProbabilityAi?: number | null;
  expectedCloseAt?: TDate | null;
  customFields?: any;
  tags: string[];
  pipelineId?: string | null;
  pipelineStageId?: string | null;
  source?: string | null;
  channel?: string | null;
  temperature?: PrismaLeadTemperature | string | null;
  score?: number | null;
  owner?: string | null;
  lastInteraction?: TDate | null;
  nextAction?: TDate | null;
  closedAt?: TDate | null;
  organizationId?: string | null;
  pic?: 'PIC1_Expansao' | 'PIC2_Risco' | 'PIC3_Transicao' | string | null;
  qualification?: LeadQualification | Record<string, unknown> | null;

  resumeDate?: TDate | null;
  cadenceStage?: string | null;
  lossReason?: string | null;
  dealPackage?: string | null;
  dealStatus?: string | null;
  relationshipLevel?: string | null;
  commissionPercent?: string | null;
  partnerBroker?: string | null;
  qualificationValidatedByAM?: boolean | null;

  bitrixLeadId?: string | null;
  bitrixDealId?: string | null;
  bitrixStageLabel?: string | null;
  bitrixSyncStatus?: string | null;
  bitrixSyncError?: string | null;
  bitrixSyncedAt?: TDate | null;

  companyId: string | null;
  company?: Company<TDate>;
  contactId: string | null;
  contact?: Contact<TDate>;

  activities?: Activity<TDate>[];
  timeline?: TimelineEvent<TDate>[];
  internalNotes?: Note<TDate>[];

  createdAt: TDate;
  updatedAt: TDate;
}

export interface Activity<TDate = Date> {
  id: string;
  type: ActivityType | string;
  owner: string;
  date: TDate;
  time?: string | null;
  status: ActivityStatus | string;
  observations?: string | null;
  leadId: string;
  lead?: Lead<TDate>;
  organizationId?: string | null;
  createdAt: TDate;
  updatedAt: TDate;
}

export interface TimelineEvent<TDate = Date> {
  id: string;
  type: string;
  description: string;
  leadId: string;
  createdAt: TDate;
}

export interface Note<TDate = Date> {
  id: string;
  content: string;
  author: string;
  leadId: string | null;
  companyId: string | null;
  contactId: string | null;
  createdAt: TDate;
  updatedAt: TDate;
}

export interface Attachment<TDate = Date> {
  id: string;
  leadId: string | null;
  companyId: string | null;
  contactId: string | null;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  objectKey: string;
  uploadedBy: string | null;
  organizationId: string;
  createdAt: TDate;
}

/**
 * Estágios canônicos do Funil de Vendas do Birth Hub 360 (Commercial Intelligence).
 * Utilizados para agregação cross-CRM sem discrepâncias taxonômicas.
 */
export type CanonicalPipelineStage =
  | 'PROSPECTING'
  | 'QUALIFICATION'
  | 'PROPOSAL'
  | 'NEGOTIATION'
  | 'WON'
  | 'LOST';

export interface ExternalCrmStageMapping {
  provider: 'hubspot' | 'pipedrive' | 'rdstation' | 'monday' | 'bitrix';
  externalStageId: string;
  externalStageName?: string;
  canonicalStage: CanonicalPipelineStage;
  defaultProbability: number;
}

/**
 * Tabela de equivalência padrão (default mappings) para os estágios nativos dos CRMs suportados.
 */
export const DEFAULT_CRM_STAGE_MAPPINGS: Record<
  string,
  { stage: CanonicalPipelineStage; defaultProbability: number }
> = {
  // HubSpot Deal Stages
  appointmentscheduled: { stage: 'PROSPECTING', defaultProbability: 0.2 },
  qualifiedtobuy: { stage: 'QUALIFICATION', defaultProbability: 0.4 },
  presentationscheduled: { stage: 'PROPOSAL', defaultProbability: 0.6 },
  decisionmakerboughtin: { stage: 'NEGOTIATION', defaultProbability: 0.8 },
  closedwon: { stage: 'WON', defaultProbability: 1.0 },
  closedlost: { stage: 'LOST', defaultProbability: 0.0 },

  // Pipedrive Deal Stages
  lead_in: { stage: 'PROSPECTING', defaultProbability: 0.15 },
  contact_made: { stage: 'QUALIFICATION', defaultProbability: 0.35 },
  demo_scheduled: { stage: 'PROPOSAL', defaultProbability: 0.55 },
  proposal_sent: { stage: 'PROPOSAL', defaultProbability: 0.7 },
  negotiations_started: { stage: 'NEGOTIATION', defaultProbability: 0.85 },
  won: { stage: 'WON', defaultProbability: 1.0 },
  lost: { stage: 'LOST', defaultProbability: 0.0 },

  // RD Station CRM
  sem_contato: { stage: 'PROSPECTING', defaultProbability: 0.1 },
  contato_feito: { stage: 'QUALIFICATION', defaultProbability: 0.3 },
  reuniao_agendada: { stage: 'PROPOSAL', defaultProbability: 0.5 },
  proposta_enviada: { stage: 'PROPOSAL', defaultProbability: 0.7 },
  em_negociacao: { stage: 'NEGOTIATION', defaultProbability: 0.85 },
  fechado_ganho: { stage: 'WON', defaultProbability: 1.0 },
  fechado_perdido: { stage: 'LOST', defaultProbability: 0.0 },

  // Monday.com Deals Board
  new_lead: { stage: 'PROSPECTING', defaultProbability: 0.15 },
  qualified: { stage: 'QUALIFICATION', defaultProbability: 0.4 },
  proposal: { stage: 'PROPOSAL', defaultProbability: 0.65 },
  negotiation: { stage: 'NEGOTIATION', defaultProbability: 0.85 },
  won_deal: { stage: 'WON', defaultProbability: 1.0 },
  lost_deal: { stage: 'LOST', defaultProbability: 0.0 },
};

/**
 * Normaliza qualquer estágio externo para o modelo canônico de Commercial Intelligence.
 */
export function normalizeCrmStage(
  rawStage: string | null | undefined,
  defaultStage: CanonicalPipelineStage = 'PROSPECTING',
): { stage: CanonicalPipelineStage; probability: number } {
  if (!rawStage) return { stage: defaultStage, probability: 0.2 };
  const normalizedKey = rawStage
    .toLowerCase()
    .trim()
    .replace(/[\s-_]+/g, '_');

  if (DEFAULT_CRM_STAGE_MAPPINGS[normalizedKey]) {
    return {
      stage: DEFAULT_CRM_STAGE_MAPPINGS[normalizedKey].stage,
      probability: DEFAULT_CRM_STAGE_MAPPINGS[normalizedKey].defaultProbability,
    };
  }

  // Fallback heurístico por substring caso o CRM envie label customizado
  if (/ganh|won|closed_won|fechado_ganho/i.test(rawStage))
    return { stage: 'WON', probability: 1.0 };
  if (/perd|lost|closed_lost|fechado_perdido/i.test(rawStage))
    return { stage: 'LOST', probability: 0.0 };
  if (/negoc|negotiat/i.test(rawStage)) return { stage: 'NEGOTIATION', probability: 0.85 };
  if (/propos|apresenta|demo/i.test(rawStage)) return { stage: 'PROPOSAL', probability: 0.6 };
  if (/qualif|contato/i.test(rawStage)) return { stage: 'QUALIFICATION', probability: 0.35 };

  return { stage: defaultStage, probability: 0.2 };
}

/**
 * Categorias canônicas de objeção em chamadas comerciais (Voice / WebRTC / LiveKit).
 */
export type LiveCallObjectionCategory =
  | 'preco_ou_orcamento'
  | 'concorrente'
  | 'timing_ou_prioridade'
  | 'autoridade_decisor'
  | 'produto_fit'
  | 'indecisao'
  | 'contrato_ou_juridico'
  | 'outros'
  | string;

/**
 * Contrato de LiveCallInsight para recepção de sinais de chamadas em tempo real (Onda 15).
 * Emite eventos de detecção de sentimento, objeções comerciais e intenções de compra
 * sem poluir o histórico com logs brutos.
 */
export interface LiveCallInsight {
  callId: string;
  dealId: string;
  timestamp: string | Date;
  objectionCategory?: LiveCallObjectionCategory | null;
  suggestedRebuttal?: string | null;
  sentimentScore: number;
  organizationId?: string;
  confidence?: number;
  competitorMentioned?: string | null;
  keyPhrases?: string[];
  transcriptSnippet?: string | null;
}
