/**
 * Serviço de Inteligência Conversacional e Coaching Comercial
 * Onda 05 — Eixo 13: Análise Conversacional, Talk-to-Listen, Perguntas, Objeções e Próximos Passos
 * Donos: Agente 12 (Voz e Telefonia) & Agente 07 (IA e Automações) & Agente 04 (CRM e BI)
 *
 * DIRETRIZES ÉTICAS E DE SEGURANÇA MANDATÓRIAS (AGENTS.md / Seção 2):
 * - ZERO inferências médicas, psicológicas, de estresse ou burnout.
 * - Baseado puramente em turnos estruturados de fala, perguntas abertas, detecção objetiva de objeções e compromissos.
 * - Multi-tenant estrito por organizationId.
 */

import type {
  ConversationalDynamicMetrics,
  ExplicitObjectionItem,
  MethodologyAdherence,
  NextStepCommitment,
  PostCallCoachingReport,
  QuestionAnalysis,
  RealtimeCoachingHint,
  SpeakerTurn,
} from '../../../shared/contracts/conversationalCoaching.contract.js';
import { logger } from '../../../lib/logger.js';

export interface AnalyzeCallInput {
  organizationId: string;
  callId: string;
  sellerId: string;
  callGoal?: string;
  turns: SpeakerTurn[];
  expectedFramework?: 'SPIN' | 'CHALLENGER' | 'BANT' | 'MEDDPICC' | 'CONSULTATIVE';
}

export class ConversationalIntelligenceService {
  private reports = new Map<string, PostCallCoachingReport>();

  clear(): void {
    this.reports.clear();
  }

  /**
   * Calcula métricas objetivas de dinâmica de fala (Talk-to-Listen, turnos, silêncio).
   */
  public calculateDynamicMetrics(turns: SpeakerTurn[]): ConversationalDynamicMetrics {
    if (!turns || turns.length === 0) {
      return {
        totalDurationSeconds: 0,
        sellerTalkTimeSeconds: 0,
        customerTalkTimeSeconds: 0,
        silenceTimeSeconds: 0,
        overlapTimeSeconds: 0,
        sellerTalkRatio: 0,
        customerTalkRatio: 0,
        totalTurns: 0,
        averageTurnDurationSeconds: 0,
        isEstimate: true,
        diarizationQualityConfidence: 0.5,
      };
    }

    let sellerSeconds = 0;
    let customerSeconds = 0;
    let totalTurnDuration = 0;

    for (const t of turns) {
      const dur = Math.max(0, t.durationSeconds || t.endTimeSeconds - t.startTimeSeconds);
      totalTurnDuration += dur;
      if (t.speaker === 'seller') {
        sellerSeconds += dur;
      } else if (t.speaker === 'customer') {
        customerSeconds += dur;
      }
    }

    const maxEnd = Math.max(...turns.map((t) => t.endTimeSeconds), 0);
    const minStart = Math.min(...turns.map((t) => t.startTimeSeconds), 0);
    const totalDurationSeconds = Math.max(totalTurnDuration, maxEnd - minStart);

    const speechSum = sellerSeconds + customerSeconds;
    const sellerRatio = speechSum > 0 ? Number((sellerSeconds / speechSum).toFixed(2)) : 0;
    const customerRatio = speechSum > 0 ? Number((customerSeconds / speechSum).toFixed(2)) : 0;
    const avgTurn = turns.length > 0 ? Number((totalTurnDuration / turns.length).toFixed(1)) : 0;

    return {
      totalDurationSeconds,
      sellerTalkTimeSeconds: sellerSeconds,
      customerTalkTimeSeconds: customerSeconds,
      silenceTimeSeconds: Math.max(0, totalDurationSeconds - speechSum),
      overlapTimeSeconds: 0,
      sellerTalkRatio: sellerRatio,
      customerTalkRatio: customerRatio,
      totalTurns: turns.length,
      averageTurnDurationSeconds: avgTurn,
      isEstimate: false,
      diarizationQualityConfidence: 0.95,
    };
  }

  /**
   * Analisa a natureza das perguntas feitas pelo vendedor (abertas vs fechadas).
   */
  public analyzeQuestions(turns: SpeakerTurn[]): QuestionAnalysis {
    const sellerTurns = turns.filter((t) => t.speaker === 'seller');
    const openQuestionPatterns = [
      /^(?:como|qual|quais|de que forma|o que|por que|me conta|explica|conte-me)/i,
      /\b(?:como vocês|qual o impacto|o que acontece quando|de que maneira)\b/i,
    ];

    let totalQuestions = 0;
    let openCount = 0;
    let closedCount = 0;
    const sampleOpen: string[] = [];

    for (const t of sellerTurns) {
      const text = t.text.trim();
      const isQuestion = text.endsWith('?') || t.isQuestion;
      if (isQuestion) {
        totalQuestions++;
        const isOpen = openQuestionPatterns.some((pattern) => pattern.test(text));
        if (isOpen) {
          openCount++;
          if (sampleOpen.length < 3) {
            sampleOpen.push(text);
          }
        } else {
          closedCount++;
        }
      }
    }

    const openRatio = totalQuestions > 0 ? Number((openCount / totalQuestions).toFixed(2)) : 0;

    return {
      totalQuestionsAskedBySeller: totalQuestions,
      openQuestionsCount: openCount,
      closedQuestionsCount: closedCount,
      openQuestionRatio: openRatio,
      sampleOpenQuestions: sampleOpen,
    };
  }

  /**
   * Extrai e mapeia objeções explícitas verbalizadas durante a chamada.
   */
  public extractExplicitObjections(turns: SpeakerTurn[]): ExplicitObjectionItem[] {
    const customerTurns = turns.filter((t) => t.speaker === 'customer');
    const objections: ExplicitObjectionItem[] = [];

    const objectionKeywords: Record<
      ExplicitObjectionItem['category'],
      { patterns: RegExp[]; playbookId: string }
    > = {
      price: {
        patterns: [/(?:caro|orçamento|budget|investimento alto|puxado|desconto)/i],
        playbookId: 'playbook-pricing-roi-reframe',
      },
      timing: {
        patterns: [/(?:sem tempo|depois do trimestre|próximo semestre|agora não|muito corrido)/i],
        playbookId: 'playbook-timing-cost-of-inaction',
      },
      competition: {
        patterns: [/(?:já usamos|concorrente|outra ferramenta|proposta da|fornecedor atual)/i],
        playbookId: 'playbook-competitive-differentiation',
      },
      authority: {
        patterns: [
          /(?:preciso falar com o diretor|comitê|aprovação da diretoria|não decido sozinho)/i,
        ],
        playbookId: 'playbook-buying-committee-mapping',
      },
      integration: {
        patterns: [/(?:integração|api|compatível|erp|legado|segurança da informação)/i],
        playbookId: 'playbook-tech-security-architecture',
      },
      security: {
        patterns: [/(?:lgpd|compliance|dados sensíveis|vazamento|soc2|iso)/i],
        playbookId: 'playbook-enterprise-security-compliance',
      },
      priority: {
        patterns: [/(?:não é prioridade|outros projetos na frente|foco em outra área)/i],
        playbookId: 'playbook-priority-alignment',
      },
    };

    for (let i = 0; i < customerTurns.length; i++) {
      const turn = customerTurns[i];
      for (const [categoryKey, config] of Object.entries(objectionKeywords)) {
        const cat = categoryKey as ExplicitObjectionItem['category'];
        const matched = config.patterns.some((p) => p.test(turn.text));
        if (matched) {
          // Verifica se o vendedor respondeu no turno seguinte
          const nextTurn = turns[turns.indexOf(turn) + 1];
          const wasAddressed = Boolean(
            nextTurn && nextTurn.speaker === 'seller' && nextTurn.text.length > 20,
          );

          objections.push({
            objectionId: `obj-${turn.turnId}-${cat}`,
            category: cat,
            explicitQuote: turn.text,
            timestampSeconds: turn.startTimeSeconds,
            playbookReferenceId: config.playbookId,
            suggestedRebuttalSummary: `Consulte argumentos do playbook para contorno de ${cat}`,
            wasAddressedBySeller: wasAddressed,
          });
        }
      }
    }

    return objections;
  }

  /**
   * Avalia a aderência prática a frameworks de vendas (SPIN, BANT, etc).
   */
  public evaluateMethodology(
    turns: SpeakerTurn[],
    framework: MethodologyAdherence['framework'] = 'SPIN',
  ): MethodologyAdherence {
    const sellerText = turns
      .filter((t) => t.speaker === 'seller')
      .map((t) => t.text)
      .join(' ');

    const criteriaMap: Record<
      MethodologyAdherence['framework'],
      { criterion: string; pattern: RegExp }[]
    > = {
      SPIN: [
        {
          criterion: 'Perguntas de Situação (Contexto atual)',
          pattern: /(?:como funciona|qual o cenário|atualmente como)/i,
        },
        {
          criterion: 'Perguntas de Problema (Dores operacionais)',
          pattern: /(?:qual a maior dificuldade|onde mais trava|o que tem sido um gargalo)/i,
        },
        {
          criterion: 'Perguntas de Implicação (Impacto financeiro ou de risco)',
          pattern: /(?:qual o custo disso|quanto tempo perde|qual o risco de manter)/i,
        },
        {
          criterion: 'Perguntas de Necessidade de Solução (Benefício concreto)',
          pattern: /(?:se conseguíssemos resolver|quão útil seria|o quanto facilitaria)/i,
        },
      ],
      BANT: [
        {
          criterion: 'Budget (Capacidade orçamentária)',
          pattern: /(?:orçamento|verba|investimento previsto|faixa de valor)/i,
        },
        {
          criterion: 'Authority (Poder de decisão)',
          pattern: /(?:quem mais participa da decisão|quem assina|comitê)/i,
        },
        {
          criterion: 'Need (Necessidade premente)',
          pattern: /(?:prioridade estratégica|dor central|urgência)/i,
        },
        {
          criterion: 'Timeline (Prazo de implementação)',
          pattern: /(?:quando pretendem iniciar|prazo limite|go-live)/i,
        },
      ],
      CHALLENGER: [
        {
          criterion: 'Teach (Insights de mercado diferenciados)',
          pattern: /(?:tendência de mercado|dados do setor|estudo recente)/i,
        },
        {
          criterion: 'Tailor (Adaptação ao contexto do interlocutor)',
          pattern: /(?:especificamente no seu caso|para a sua área|no seu modelo)/i,
        },
        {
          criterion: 'Take Control (Condução firme do processo comercial)',
          pattern: /(?:o próximo passo recomendado|nossa experiência mostra que)/i,
        },
      ],
      MEDDPICC: [
        {
          criterion: 'Metrics (Métricas quantificáveis)',
          pattern: /(?:kpi|métrica|porcentagem de ganho|redução de custo)/i,
        },
        {
          criterion: 'Economic Buyer (Comprador econômico identificado)',
          pattern: /(?:cfo|diretor financeiro|responsável pelo budget)/i,
        },
        {
          criterion: 'Decision Criteria (Critérios formais de escolha)',
          pattern: /(?:quais os critérios para escolha|requisitos mandatórios)/i,
        },
        {
          criterion: 'Decision Process (Fluxo formal de aprovação)',
          pattern: /(?:etapas para aprovação|processo de compras)/i,
        },
      ],
      CONSULTATIVE: [
        {
          criterion: 'Diagnóstico aprofundado',
          pattern: /(?:compreender a raiz|entender o processo|diagnosticar)/i,
        },
        {
          criterion: 'Alinhamento de expectativas',
          pattern: /(?:expectativa com o projeto|critério de sucesso)/i,
        },
        {
          criterion: 'Construção conjunta de solução',
          pattern: /(?:em conjunto|construirmos juntos|adaptarmos)/i,
        },
      ],
    };

    const criteriaList = criteriaMap[framework] || criteriaMap.SPIN;
    let verifiedCount = 0;
    const checkedCriteria = criteriaList.map((c) => {
      const verified = c.pattern.test(sellerText);
      if (verified) verifiedCount++;
      return {
        criterion: c.criterion,
        verified,
        evidenceSnippet: verified ? 'Evidência identificada na condução do diálogo' : undefined,
      };
    });

    const score = Math.round((verifiedCount / criteriaList.length) * 100);

    return {
      framework,
      adherenceScore: score,
      criteriaChecked: checkedCriteria,
    };
  }

  /**
   * Extrai compromissos de próximos passos combinados explicitamente.
   */
  public extractNextSteps(turns: SpeakerTurn[]): NextStepCommitment[] {
    const commitments: NextStepCommitment[] = [];
    const commitmentPatterns = [
      {
        type: 'meeting_scheduled' as const,
        pattern: /(?:agendar|combinado na|terça|quarta|quinta|sexta|às \d+h|próxima semana)/i,
        desc: 'Reunião ou retorno agendado com data/horário',
      },
      {
        type: 'proposal_to_send' as const,
        pattern: /(?:enviar proposta|mandar a minuta|enviar o material|compartilhar o cálculo)/i,
        desc: 'Envio de proposta comercial ou detalhamento técnico',
      },
    ];

    for (const turn of turns) {
      for (const item of commitmentPatterns) {
        if (item.pattern.test(turn.text)) {
          commitments.push({
            commitmentType: item.type,
            description: item.desc,
            explicitlyConfirmed: true,
            evidenceQuote: turn.text,
          });
          break;
        }
      }
    }

    return commitments;
  }

  /**
   * Gera o relatório completo de Coaching Pós-Chamada com sugestões pedagógicas integradas ao Roleplay.
   */
  public async generatePostCallReport(input: AnalyzeCallInput): Promise<PostCallCoachingReport> {
    const dynamics = this.calculateDynamicMetrics(input.turns);
    const questions = this.analyzeQuestions(input.turns);
    const objections = this.extractExplicitObjections(input.turns);
    const methodology = this.evaluateMethodology(input.turns, input.expectedFramework);
    const commitments = this.extractNextSteps(input.turns);

    const pedagogicalRecommendations: PostCallCoachingReport['pedagogicalRecommendations'] = [];

    // Recomendação 1: Talk-to-Listen
    if (dynamics.sellerTalkRatio > 0.65) {
      pedagogicalRecommendations.push({
        title: 'Espaço para Escuta Ativa',
        description: `Sua participação foi de ${Math.round(dynamics.sellerTalkRatio * 100)}%. Considere ampliar perguntas abertas para permitir maior tempo de fala do cliente.`,
        category: 'active_listening',
        recommendedRoleplayExercise: {
          scenarioId: 'roleplay-active-listening-warmup',
          framework: 'SPIN',
          targetFocus: 'Ampliação de escuta ativa e perguntas de implicação',
        },
      });
    }

    // Recomendação 2: Perguntas Abertas
    if (questions.openQuestionRatio < 0.4 && questions.totalQuestionsAskedBySeller > 0) {
      pedagogicalRecommendations.push({
        title: 'Aprofundamento com Perguntas Abertas',
        description:
          'A maioria das perguntas foi fechada (sim/não). Perguntas que começam com "Como" ou "Qual" geram maior diagnóstico do negócio.',
        category: 'discovery_questions',
        recommendedRoleplayExercise: {
          scenarioId: 'roleplay-open-question-clinic',
          framework: 'SPIN',
          targetFocus: 'Formulação de perguntas de necessidade e implicação',
        },
      });
    }

    // Recomendação 3: Objeções não contornadas
    const unaddressed = objections.filter((o) => !o.wasAddressedBySeller);
    if (unaddressed.length > 0) {
      pedagogicalRecommendations.push({
        title: 'Contorno de Objeções Latentes',
        description: `Identificamos ${unaddressed.length} objeção(ões) explícitas que não receberam resposta imediata (ex: ${unaddressed[0].category}).`,
        category: 'objection_handling',
        recommendedRoleplayExercise: {
          scenarioId: `roleplay-objection-${unaddressed[0].category}`,
          framework: input.expectedFramework || 'SPIN',
          targetFocus: `Superação pedagógica de objeção de ${unaddressed[0].category}`,
        },
      });
    }

    // Recomendação 4: Próximos passos
    if (commitments.length === 0) {
      pedagogicalRecommendations.push({
        title: 'Garantia de Compromisso de Fechamento',
        description:
          'A conversa não terminou com uma data ou ação definida. Recomenda-se ancorar sempre data e horário antes de finalizar.',
        category: 'next_step_closing',
        recommendedRoleplayExercise: {
          scenarioId: 'roleplay-next-step-closing-mastery',
          framework: 'CONSULTATIVE',
          targetFocus: 'Fechamento consultivo e ancoragem de compromisso mútuo',
        },
      });
    }

    const report: PostCallCoachingReport = {
      reportId: `coaching-${input.callId}`,
      organizationId: input.organizationId,
      callId: input.callId,
      sellerId: input.sellerId,
      callGoal: input.callGoal,
      dynamics,
      questions,
      objections,
      methodology,
      commitments,
      pedagogicalRecommendations,
      sourcesAndLimitations: [
        'Métricas baseadas em transcrição e diarização de turnos autorizada.',
        'Recomendações exclusivamente pedagógicas; não representam diagnóstico psicológico ou avaliação clínica.',
        'Proporções de fala são referenciais e variam conforme o objetivo de cada etapa da venda.',
      ],
      generatedAt: new Date().toISOString(),
    };

    this.reports.set(report.reportId, report);
    logger.info(
      { reportId: report.reportId, orgId: input.organizationId },
      'Post-call coaching report generated successfully',
    );
    return report;
  }

  /**
   * Fornece sugestão discreta e não intrusiva durante a chamada.
   */
  public generateRealtimeHint(
    organizationId: string,
    callId: string,
    currentSpeaker: 'seller' | 'customer',
    currentSellerTalkStreakSeconds: number,
    recentObjection?: ExplicitObjectionItem,
  ): RealtimeCoachingHint | null {
    if (recentObjection && !recentObjection.wasAddressedBySeller) {
      return {
        hintId: `hint-obj-${Date.now()}`,
        organizationId,
        callId,
        category: 'objection_unanswered',
        message: `O cliente apontou objeção de ${recentObjection.category}. Considere explorar o impacto antes de avançar.`,
        priority: 'medium',
        timestampSeconds: Date.now() / 1000,
      };
    }

    if (currentSpeaker === 'seller' && currentSellerTalkStreakSeconds > 120) {
      return {
        hintId: `hint-listen-${Date.now()}`,
        organizationId,
        callId,
        category: 'listen_more',
        message:
          'Você está falando há mais de 2 minutos. Que tal abrir espaço para uma pergunta de checagem?',
        priority: 'low',
        timestampSeconds: Date.now() / 1000,
      };
    }

    return null;
  }

  public getReport(reportId: string, organizationId: string): PostCallCoachingReport | null {
    const report = this.reports.get(reportId);
    if (!report || report.organizationId !== organizationId) {
      return null;
    }
    return report;
  }
}

export const conversationalIntelligenceService = new ConversationalIntelligenceService();
