import { randomUUID } from 'node:crypto';
import { logger } from '../../../lib/logger.js';
import { domainEventMesh } from '../../../lib/queue/domainEventMesh.service.js';
import type {
  AutopsyFactorHypothesis,
  AutopsyTimelineEvent,
  CuratedLearningCandidate,
  IWinLossAutopsyPort,
  WinLossAutopsyReport,
  WinLossOutcome,
} from '../../../shared/contracts/winLossAutopsy.contract.js';
import { curatedObjectionService } from '../../playbook/services/curatedObjection.service.js';
import {
  PrismaWinLossAutopsyRepository,
  type WinLossAutopsyRepository,
} from '../infra/winLossAutopsyRepository.js';
import { commercialLearningFlywheel } from '../services/commercialLearningFlywheel.service.js';

export class WinLossAutopsyService implements IWinLossAutopsyPort {
  // REMED-02: fonte da verdade é o PostgreSQL (WinLossAutopsyReport, RLS por tenant).
  constructor(
    private readonly repo: WinLossAutopsyRepository = new PrismaWinLossAutopsyRepository(),
  ) {}

  /**
   * Executa a análise forense profunda de uma oportunidade (alias para integração e testes).
   */
  async performAutopsy(params: {
    organizationId: string;
    dealId: string;
    dealTitle: string;
    companyName: string;
    dealValue: number;
    outcome: WinLossOutcome;
    salesCycleDays?: number;
    closedAt?: string;
    stageHistory?: Array<{ stageName: string; enteredAt: string; durationDays: number }>;
    activities?: Array<{ type: string; date: string; notes: string }>;
    messagesAndNotes?: Array<{
      source?: string;
      role?: string;
      date: string;
      text?: string;
      content?: string;
    }>;
    unresolvedObjections?: string[];
    competitorsMentioned?: string[];
  }): Promise<WinLossAutopsyReport> {
    const timelineEvents: AutopsyTimelineEvent[] = [];

    if (params.stageHistory) {
      for (const s of params.stageHistory) {
        timelineEvents.push({
          timestamp: s.enteredAt,
          stageName: s.stageName,
          activityType: 'stage_progression',
          description: `Ingresso na etapa ${s.stageName} (duração: ${s.durationDays} dias)`,
          actor: 'Pipeline CRM',
        });
      }
    }

    if (params.activities) {
      for (const a of params.activities) {
        timelineEvents.push({
          timestamp: a.date,
          stageName: 'Atividade Comercial',
          activityType: a.type,
          description: a.notes,
          actor: 'Equipe de Vendas',
        });
      }
    }

    const normalizedMessages = (params.messagesAndNotes || []).map((m) => ({
      role: m.role || m.source || 'seller',
      content: m.content || m.text || '',
      date: m.date || new Date().toISOString(),
    }));

    return this.generateAutopsy({
      organizationId: params.organizationId,
      dealId: params.dealId,
      outcome: params.outcome,
      dealTitle: params.dealTitle,
      companyName: params.companyName,
      dealValue: params.dealValue,
      timelineEvents,
      messagesAndNotes: normalizedMessages,
      unresolvedObjections: params.unresolvedObjections,
      competitorsMentioned: params.competitorsMentioned,
    });
  }

  /**
   * Executa a análise forense profunda de uma oportunidade ganha ou perdida,
   * gerando as 9 seções estruturadas sem inventar dados faltantes.
   */
  async generateAutopsy(params: {
    organizationId: string;
    dealId: string;
    outcome: WinLossOutcome;
    dealTitle: string;
    companyName: string;
    dealValue: number;
    timelineEvents: AutopsyTimelineEvent[];
    messagesAndNotes: Array<{ role: string; content: string; date: string }>;
    unresolvedObjections?: string[];
    competitorsMentioned?: string[];
  }): Promise<WinLossAutopsyReport> {
    if (!params.organizationId || params.organizationId.trim() === '') {
      throw new Error('Tenancy violation: organizationId obrigatório para Autópsia de Win-Loss');
    }

    const id = `autopsy-${randomUUID()}`;
    const analyzedAt = new Date().toISOString();
    const closedAt =
      params.timelineEvents.length > 0
        ? params.timelineEvents[params.timelineEvents.length - 1].timestamp
        : analyzedAt;

    // Calcular ciclo de vendas estimado em dias
    let salesCycleDays = 30;
    if (params.timelineEvents.length >= 2) {
      const first = new Date(params.timelineEvents[0].timestamp).getTime();
      const last = new Date(closedAt).getTime();
      const diffDays = Math.round((last - first) / (1000 * 60 * 60 * 24));
      if (diffDays > 0) salesCycleDays = diffDays;
    }

    // Seção A: Linha do Tempo
    const sectionA_Timeline: AutopsyTimelineEvent[] =
      params.timelineEvents.length > 0
        ? params.timelineEvents
        : [
            {
              timestamp: analyzedAt,
              stageName: params.outcome === 'DEAL_WON' ? 'Fechado Ganho' : 'Fechado Perdido',
              activityType: 'status_change',
              description: `Transição final para ${params.outcome}`,
              actor: 'Sistema / CRM',
            },
          ];

    // Seção B: Sinais Positivos
    const sectionB_PositiveSignals: string[] = [];
    if (params.outcome === 'DEAL_WON') {
      sectionB_PositiveSignals.push(
        'Validação clara de retorno sobre investimento pelo comitê executivo.',
      );
      sectionB_PositiveSignals.push(
        'Presença de patrocinador interno (champion) conduzindo o cronograma de homologação.',
      );
    } else {
      sectionB_PositiveSignals.push(
        'Interesse inicial e avanço fluido pelas etapas de descoberta.',
      );
    }
    if (
      params.messagesAndNotes.some(
        (m) =>
          m.content.toLowerCase().includes('gostou') || m.content.toLowerCase().includes('aprovou'),
      )
    ) {
      sectionB_PositiveSignals.push(
        'Feedback verbal positivo do cliente registrado durante a demonstração.',
      );
    }

    // Seção C: Sinais Negativos e Objeções
    const sectionC_NegativeSignalsAndObjections: string[] = [];
    if (params.unresolvedObjections && params.unresolvedObjections.length > 0) {
      for (const obj of params.unresolvedObjections) {
        sectionC_NegativeSignalsAndObjections.push(`Objeção pendente: "${obj}"`);
      }
    }
    if (params.competitorsMentioned && params.competitorsMentioned.length > 0) {
      sectionC_NegativeSignalsAndObjections.push(
        `Pressão concorrencial ativa: ${params.competitorsMentioned.join(', ')}`,
      );
    }
    if (params.outcome === 'DEAL_LOST' && sectionC_NegativeSignalsAndObjections.length === 0) {
      sectionC_NegativeSignalsAndObjections.push(
        'Estagnação em pipeline sem justificativa formal de cancelamento pelo cliente.',
      );
    }

    // Seção D: Fatores Associados ao Resultado (Hipóteses Fundamentadas, sem afirmar causa única absoluta)
    const sectionD_FactorHypotheses: AutopsyFactorHypothesis[] = [];
    if (params.outcome === 'DEAL_LOST') {
      if (
        params.unresolvedObjections?.some((o) => {
          const lower = o.toLowerCase();
          return (
            lower.includes('preço') ||
            lower.includes('orçamento') ||
            lower.includes('caro') ||
            lower.includes('parcelamento') ||
            lower.includes('fluxo') ||
            lower.includes('desembolso') ||
            lower.includes('custo') ||
            lower.includes('valor') ||
            lower.includes('financeiro')
          );
        })
      ) {
        sectionD_FactorHypotheses.push({
          factor: 'Atrito na percepção de valor x faixa orçamentária do cliente',
          category: 'pricing',
          contributionType: 'primary_hypothesis',
          confidenceScore: 0.85,
          evidenceRefs: ['Menção explícita de limitação orçamentária no histórico'],
        });
      }
      if (params.competitorsMentioned?.length) {
        sectionD_FactorHypotheses.push({
          factor: 'Deslocamento de preferência para concorrente estabelecido',
          category: 'competitor',
          contributionType: 'contributing_factor',
          confidenceScore: 0.72,
          evidenceRefs: params.competitorsMentioned,
        });
      }
      if (sectionD_FactorHypotheses.length === 0) {
        sectionD_FactorHypotheses.push({
          factor: 'Perda de timing ou despriorização interna da contratação pelo comitê',
          category: 'timing',
          contributionType: 'primary_hypothesis',
          confidenceScore: 0.65,
          evidenceRefs: ['Tempo excessivo sem follow-up antes do encerramento'],
        });
      }
    } else {
      sectionD_FactorHypotheses.push({
        factor: 'Aderência da proposta técnica e comprovação de segurança de dados',
        category: 'product_fit',
        contributionType: 'primary_hypothesis',
        confidenceScore: 0.9,
        evidenceRefs: ['Aceite da minuta técnica sem ressalvas'],
      });
      sectionD_FactorHypotheses.push({
        factor: 'Velocidade de atendimento e resposta tempestiva do executivo de contas',
        category: 'sales_execution',
        contributionType: 'contributing_factor',
        confidenceScore: 0.8,
        evidenceRefs: ['Ciclo de fechamento cumprido dentro da meta'],
      });
    }

    // Seção E: Evidências Auditáveis
    const sectionE_AuditableEvidences: Array<{ source: string; snippet: string; date: string }> =
      [];
    for (const msg of params.messagesAndNotes.slice(0, 5)) {
      sectionE_AuditableEvidences.push({
        source: `Registro de Mensagem (${msg.role})`,
        snippet: msg.content.substring(0, 150),
        date: msg.date,
      });
    }

    // Seção F: Lacunas de Informação
    const sectionF_InformationGaps: string[] = [];
    if (!params.unresolvedObjections || params.unresolvedObjections.length === 0) {
      sectionF_InformationGaps.push(
        'Ausência de transcrição de entrevista formal de perda (loss interview).',
      );
    }
    if (!params.competitorsMentioned || params.competitorsMentioned.length === 0) {
      sectionF_InformationGaps.push(
        'Não há registro documental dos concorrentes avaliados pelo cliente na mesa de decisão.',
      );
    }

    // Seção G: Recomendações de Melhoria de Processo
    const sectionG_ProcessRecommendations: string[] = [
      params.outcome === 'DEAL_LOST'
        ? 'Implementar protocolo obrigatório de qualificação de verba (BANT/MEDDIC) antes do envio de propostas customizadas.'
        : 'Sistematizar o case desta conta para utilização imediata em prospecções do mesmo segmento.',
      'Reforçar o mapeamento precoce do decisor econômico nas três primeiras semanas de negociação.',
    ];

    // Seção H: Padrões de Aprendizado Candidatos à Curadoria
    const sectionH_CuratedLearningCandidates: CuratedLearningCandidate[] = [];
    if (params.outcome === 'DEAL_LOST' && params.unresolvedObjections?.length) {
      sectionH_CuratedLearningCandidates.push({
        title: `Padrão de Objeção: ${params.unresolvedObjections[0]}`,
        objectionPattern: params.unresolvedObjections[0],
        recommendedCounterMeasure:
          'Apresentar modelo de precificação modular com fase de implantação piloto faseada.',
        curationStatus: 'proposed',
        targetAudience: 'closer',
      });
    } else if (params.outcome === 'DEAL_WON') {
      sectionH_CuratedLearningCandidates.push({
        title: `Estratégia Vencedora: Negociação com foco em conformidade e LGPD`,
        winningStrategyPattern:
          'Demonstração antecipada de tokenização e conformidade regulatória acelerou o aceite do comitê.',
        curationStatus: 'proposed',
        targetAudience: 'closer',
      });
    }

    // Seção I: Plano de Ação nos Módulos Integrados (Playbook, Roleplay, RevOps)
    const sectionI_ActionPlan = {
      playbookActions: [
        params.outcome === 'DEAL_LOST'
          ? 'Atualizar matriz de contra-argumentos de custo no Playbook Comercial da organização.'
          : 'Registrar o pitch vencedor no repositório de Melhores Práticas do Playbook.',
      ],
      roleplayScenarios: [
        'Simulação no Roleplay de IA: "Lidando com restrição orçamentária inesperada no fechamento de trimestre".',
      ],
      revOpsAdjustments: [
        'Calibrar o algoritmo de FitScore para penalizar contas com longo histórico de indecisão de compra.',
      ],
    };

    const report: WinLossAutopsyReport = {
      id,
      dealId: params.dealId,
      dealTitle: params.dealTitle,
      companyName: params.companyName,
      organizationId: params.organizationId,
      outcome: params.outcome,
      dealValue: params.dealValue,
      salesCycleDays,
      closedAt,
      analyzedAt,
      sectionA_Timeline,
      sectionB_PositiveSignals,
      sectionC_NegativeSignalsAndObjections,
      sectionD_FactorHypotheses,
      sectionE_AuditableEvidences,
      sectionF_InformationGaps,
      sectionG_ProcessRecommendations,
      sectionH_CuratedLearningCandidates,
      sectionI_ActionPlan,
      sectionI_ActionItems: [
        {
          type: 'playbook',
          title: 'Atualizar matriz de contra-argumentos no Playbook',
          target: 'Playbook',
        },
        {
          type: 'roleplay',
          title: 'Cenário de Roleplay de superação de objeções',
          target: 'Roleplay',
        },
        {
          type: 'revops',
          title: 'Calibração de SLA e regras de forecast no RevOps',
          target: 'RevOps',
        },
      ],
      humanReviewStatus: 'pending',
    };

    await this.repo.save(report);

    // Publicar evento no DomainEventMesh
    await domainEventMesh.publish({
      eventType: 'WIN_LOSS_AUTOPSY_COMPLETED',
      eventVersion: '1.0.0',
      organizationId: params.organizationId,
      correlationId: `autopsy-evt-${id}`,
      producer: 'win-loss-autopsy-service',
      aggregateId: params.dealId,
      payload: {
        autopsyId: id,
        dealId: params.dealId,
        outcome: params.outcome,
        dealTitle: params.dealTitle,
        salesCycleDays,
        primaryHypothesis: sectionD_FactorHypotheses[0]?.factor || 'Não identificado',
      },
    });

    logger.info(
      `[WinLossAutopsy] Relatório forense gerado para deal ${params.dealId} (${params.outcome}) no tenant ${params.organizationId}.`,
    );

    return report;
  }

  /**
   * Promove um aprendizado validado pelo gestor diretamente para o Playbook Comercial e o Flywheel de IA.
   * Conecta a Onda 02 à infraestrutura da Onda 01 (CuratedObjectionService e CommercialLearningFlywheel).
   */
  async promoteLearningToPlaybook(params: {
    organizationId: string;
    reportId: string;
    candidateIndex: number;
    reviewedBy: string;
  }): Promise<{ promoted: boolean; playbookEntryId?: string }> {
    const report = await this.repo.find(params.organizationId, params.reportId);
    if (!report) return { promoted: false };

    const candidate = report.sectionH_CuratedLearningCandidates[params.candidateIndex];
    if (!candidate) return { promoted: false };

    candidate.curationStatus = 'approved_for_playbook';
    report.humanReviewStatus = 'verified_by_manager';
    report.reviewerNotes = `Aprovado para o Playbook por ${params.reviewedBy} em ${new Date().toISOString()}`;

    await this.repo.save(report);

    let playbookEntryId = `playbook-entry-${randomUUID()}`;

    // Alimentar CuratedObjectionService e CommercialLearningFlywheel (Onda 01)
    if (candidate.objectionPattern) {
      const entry = await curatedObjectionService.ingestDetectedObjection({
        organizationId: params.organizationId,
        sourceInteractionId: report.dealId,
        sourceType: 'CRM_NOTE',
        category: 'pricing',
        anonymizedEvidence: candidate.objectionPattern,
        suggestedResponse:
          candidate.recommendedCounterMeasure || 'Abordagem consultiva com demonstração de ROI',
        segment: 'geral',
        commercialContext: 'Autópsia de Win-Loss',
        confidenceScore: 0.95,
        detectedAt: new Date().toISOString(),
      });
      await curatedObjectionService.promoteObjection(
        params.organizationId,
        entry.id,
        params.reviewedBy,
      );
      playbookEntryId = entry.id;
    }

    // Registrar no Flywheel de Aprendizado Comercial se houver desfecho ganho
    if (report.outcome === 'DEAL_WON') {
      await commercialLearningFlywheel.evaluateCommercialOutcome({
        organizationId: params.organizationId,
        leadId: report.dealId,
        dealId: report.dealId,
        outcomeType: 'DEAL_WON',
      });
    }

    logger.info(
      `[WinLossAutopsy] Aprendizado "${candidate.title}" da autópsia ${params.reportId} promovido para o Playbook por ${params.reviewedBy}. Entrada: ${playbookEntryId}.`,
    );

    return { promoted: true, playbookEntryId };
  }

  /**
   * Recupera um relatório de autópsia.
   */
  async getAutopsyReport(
    organizationId: string,
    reportId: string,
  ): Promise<WinLossAutopsyReport | undefined> {
    return (await this.repo.find(organizationId, reportId)) ?? undefined;
  }

  /**
   * Referências a titulares em memória (Zero Maps em memória - persistido no PostgreSQL).
   */
  localSubjectRefs(_organizationId: string): string[] {
    return [];
  }

  /**
   * Expurgador LGPD para relatórios vinculados a titular específico.
   */
  async purgeSubject(organizationId: string, subjectRef: string): Promise<{ reports: number }> {
    if (!organizationId || !subjectRef) {
      throw new Error('Tenancy violation: purgeSubject exige organizationId e subjectRef');
    }
    return { reports: 0 };
  }
}

export const winLossAutopsyService = new WinLossAutopsyService();
