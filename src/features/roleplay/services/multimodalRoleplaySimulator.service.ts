import { randomUUID } from 'node:crypto';
import type {
  BuyerPersona,
  BuyerPersonaArchetype,
  IMultimodalRoleplayPort,
  MultimodalRoleplaySession,
  RoleplayEvaluationScore,
  RoleplayTurn,
  SalesMethodologyFramework,
} from '../../../shared/contracts/multimodalRoleplay.contract.js';
import { domainEventMesh } from '../../../lib/queue/domainEventMesh.service.js';
import { logger } from '../../../lib/logger.js';

export class MultimodalRoleplaySimulatorService implements IMultimodalRoleplayPort {
  private sessions = new Map<string, MultimodalRoleplaySession>();

  private defaultPersonas: Record<BuyerPersonaArchetype, BuyerPersona> = {
    cfo_skeptical: {
      id: 'persona-cfo',
      name: 'Dr. Roberto Vasconcelos',
      title: 'Diretor Financeiro (CFO)',
      archetype: 'cfo_skeptical',
      companySize: 'Enterprise (800+ colaboradores)',
      primaryPainPoint: 'Custos operacionais descontrolados e falta de visibilidade financeira',
      hiddenObjection:
        'Incerteza sobre a velocidade real de payback e risco de estouro orçamentário',
      decisionCriteria: [
        'ROI demonstrável em menos de 6 meses',
        'Zero taxa oculta de implementação',
      ],
    },
    cto_pragmatic: {
      id: 'persona-cto',
      name: 'Eng. Juliana Mendes',
      title: 'Diretora de Tecnologia (CTO)',
      archetype: 'cto_pragmatic',
      companySize: 'Mid-Market (350 colaboradores)',
      primaryPainPoint: 'Sistemas legados fragmentados sem APIs confiáveis',
      hiddenObjection: 'Medo de sobrecarregar o time interno com integrações complexas',
      decisionCriteria: ['APIs REST documentadas e seguras', 'SLA de 99.9%'],
    },
    coo_efficiency_obsessed: {
      id: 'persona-coo',
      name: 'Carlos Albuquerque',
      title: 'Diretor de Operações (COO)',
      archetype: 'coo_efficiency_obsessed',
      companySize: 'Enterprise Logística (1200 motoristas/frotas)',
      primaryPainPoint: 'Tempo ocioso entre chamados e lentidão na tomada de decisão',
      hiddenObjection: 'Resistência cultural da equipe operacional a adotar novas ferramentas',
      decisionCriteria: ['Interface intuitiva mobile', 'Treinamento rápido e gamificado'],
    },
    procurement_aggressive: {
      id: 'persona-procurement',
      name: 'Patrícia Rocha',
      title: 'Head de Compras e Suprimentos',
      archetype: 'procurement_aggressive',
      companySize: 'Corporação Multinacional',
      primaryPainPoint:
        'Necessidade de redução de despesas contratadas para atingir metas de savings',
      hiddenObjection:
        'Acredita que todo fornecedor tem margem oculta para conceder 30% de desconto',
      decisionCriteria: [
        'Menor custo total de propriedade (TCO)',
        'Condições de pagamento estendidas',
      ],
    },
  };

  /**
   * Inicia uma sessão de roleplay multimodal com persona e metodologia de vendas escolhidas.
   */
  async startSession(params: {
    organizationId: string;
    sellerId: string;
    framework: SalesMethodologyFramework;
    personaArchetype: BuyerPersonaArchetype;
    industry?: string;
  }): Promise<MultimodalRoleplaySession> {
    if (!params.organizationId || params.organizationId.trim() === '') {
      throw new Error('Tenancy violation: organizationId obrigatório');
    }

    const sessionId = `roleplay-${randomUUID().substring(0, 8)}`;
    const persona =
      this.defaultPersonas[params.personaArchetype] ?? this.defaultPersonas.cfo_skeptical;

    const initialBuyerTurn: RoleplayTurn = {
      turnNumber: 1,
      speaker: 'buyer',
      content: `Olá, sou ${persona.name}, ${persona.title}. Tenho exatamente 15 minutos para entender como sua solução atende às nossas prioridades. Pode começar me explicando o que vocês fazem?`,
      timestamp: new Date().toISOString(),
      detectedObjection: 'Escassez de tempo / Ceticismo inicial',
      talkDurationSeconds: 7,
    };

    const session: MultimodalRoleplaySession = {
      sessionId,
      organizationId: params.organizationId,
      sellerId: params.sellerId,
      persona,
      framework: params.framework,
      status: 'active',
      turns: [initialBuyerTurn],
      startedAt: new Date().toISOString(),
    };

    this.sessions.set(`${params.organizationId}:${sessionId}`, session);

    logger.info(
      `[RoleplaySimulator] Sessão ${sessionId} iniciada para vendedor ${params.sellerId} com persona ${persona.name} (${params.framework}) no tenant ${params.organizationId}.`,
    );

    return session;
  }

  /**
   * Submete a fala/resposta do vendedor e gera a réplica dinâmica do comprador simulado.
   */
  async submitTurn(params: {
    organizationId: string;
    sessionId: string;
    sellerMessage: string;
    talkDurationSeconds: number;
  }): Promise<{ session: MultimodalRoleplaySession; buyerReply: string }> {
    const key = `${params.organizationId}:${params.sessionId}`;
    const session = this.sessions.get(key);

    if (!session) {
      throw new Error(`Sessão ${params.sessionId} não encontrada.`);
    }

    if (session.status !== 'active') {
      throw new Error(`Sessão ${params.sessionId} já se encontra encerrada.`);
    }

    const turnNumber = session.turns.length + 1;

    // Detecção heurística de técnica do vendedor
    let technique = 'GENERAL_PITCH';
    const msg = params.sellerMessage.toLowerCase();
    if (
      msg.includes('quanto custa') ||
      msg.includes('qual o custo') ||
      msg.includes('custo mensal') ||
      msg.includes('qual o impacto') ||
      msg.includes('se nada for feito')
    ) {
      technique = 'IMPLICATION_QUESTION';
    } else if (msg.includes('como funciona hoje') || msg.includes('qual o processo atual')) {
      technique = 'SITUATION_QUESTION';
    } else if (msg.includes('se resolvermos') || msg.includes('qual seria o ganho')) {
      technique = 'NEED_PAYOFF_QUESTION';
    } else if (
      msg.includes('próximo passo') ||
      msg.includes('podemos agendar') ||
      msg.includes('demonstração')
    ) {
      technique = 'NEXT_STEP_PROPOSITION';
    }

    const sellerTurn: RoleplayTurn = {
      turnNumber,
      speaker: 'seller',
      content: params.sellerMessage,
      timestamp: new Date().toISOString(),
      methodologyTechniqueUsed: technique,
      talkDurationSeconds: params.talkDurationSeconds,
    };

    session.turns.push(sellerTurn);

    // Geração da réplica do comprador simulado
    let buyerReply = '';
    if (technique === 'IMPLICATION_QUESTION') {
      buyerReply = `Essa é uma boa pergunta. Hoje estimamos um desperdício direto de R$ 40 mil por mês por falta de integração. Mas me diga: em quanto tempo sua plataforma se paga?`;
    } else if (technique === 'NEXT_STEP_PROPOSITION') {
      buyerReply = `Concordo que faz sentido aprofundar. Se você me trouxer uma análise detalhada desse ROI na quinta-feira às 14h, posso envolver nossa liderança operacional.`;
    } else {
      buyerReply = `Entendo o que você faz, mas já ouvimos promessas parecidas de outros sistemas que demoraram seis meses para rodar. Como garantem que com vocês será diferente?`;
    }

    const buyerTurn: RoleplayTurn = {
      turnNumber: turnNumber + 1,
      speaker: 'buyer',
      content: buyerReply,
      timestamp: new Date().toISOString(),
      detectedObjection:
        technique === 'NEXT_STEP_PROPOSITION' ? undefined : 'Incerteza de implementação / Prazo',
      talkDurationSeconds: 8,
    };

    session.turns.push(buyerTurn);
    return { session, buyerReply };
  }

  /**
   * Conclui a sessão e calcula as métricas pedagógicas objetivas com base na metodologia de vendas.
   */
  async evaluateSession(params: {
    organizationId: string;
    sessionId: string;
  }): Promise<RoleplayEvaluationScore> {
    const key = `${params.organizationId}:${params.sessionId}`;
    const session = this.sessions.get(key);

    if (!session) {
      throw new Error(`Sessão ${params.sessionId} não encontrada.`);
    }

    // Cálculo da proporção de fala (Talk / Listen Ratio)
    let sellerTime = 0;
    let buyerTime = 0;
    let hasImplication = false;
    let hasNextStep = false;
    let turnCount = 0;

    for (const turn of session.turns) {
      if (turn.speaker === 'seller') {
        sellerTime += turn.talkDurationSeconds;
        turnCount++;
        if (turn.methodologyTechniqueUsed === 'IMPLICATION_QUESTION') hasImplication = true;
        if (turn.methodologyTechniqueUsed === 'NEXT_STEP_PROPOSITION') hasNextStep = true;
      } else {
        buyerTime += turn.talkDurationSeconds;
      }
    }

    const totalTime = sellerTime + buyerTime;
    const talkListenRatio = totalTime > 0 ? Number((sellerTime / totalTime).toFixed(2)) : 0.5;

    // Avaliação pedagógica estruturada
    const needDiscoveryScore = hasImplication ? 92 : 70;
    const activeListeningScore = talkListenRatio <= 0.55 ? 90 : 65;
    const objectionHandlingScore = 85;
    const valueArticulationScore = hasImplication ? 88 : 72;
    const nextStepAlignmentScore = hasNextStep ? 95 : 60;

    const compositeScore = Math.round(
      needDiscoveryScore * 0.25 +
        activeListeningScore * 0.2 +
        objectionHandlingScore * 0.2 +
        valueArticulationScore * 0.2 +
        nextStepAlignmentScore * 0.15,
    );

    const awardedXp = compositeScore >= 80 ? 200 : 100;

    const evaluation: RoleplayEvaluationScore = {
      framework: session.framework,
      needDiscoveryScore,
      activeListeningScore,
      objectionHandlingScore,
      valueArticulationScore,
      nextStepAlignmentScore,
      compositeScore,
      talkListenRatio,
      awardedXp,
      feedbackSummary:
        compositeScore >= 80
          ? `Excelente domínio metodológico de ${session.framework}. Proporção equilibrada de escuta ativa (${Math.round(talkListenRatio * 100)}% de fala) e clara condução para o próximo passo comercial.`
          : `Desempenho satisfatório, porém é necessário investir mais tempo em perguntas de implicação antes de propor a solução.`,
      actionableTips: [
        'Aprofundar nos custos invisíveis de inação do cliente antes de discutir valores.',
        'Sempre assegurar data e horário específicos para o próximo compromisso comercial.',
      ],
    };

    session.status = 'completed';
    session.evaluation = evaluation;
    session.completedAt = new Date().toISOString();

    await domainEventMesh.publish({
      eventType: 'MULTIMODAL_ROLEPLAY_EVALUATED',
      eventVersion: '1.0.0',
      organizationId: params.organizationId,
      correlationId: `eval-${session.sessionId}`,
      producer: 'multimodal-roleplay-simulator',
      aggregateId: session.sessionId,
      payload: {
        sellerId: session.sellerId,
        framework: session.framework,
        compositeScore,
        awardedXp,
      },
    });

    logger.info(
      `[RoleplaySimulator] Sessão ${session.sessionId} avaliada. Nota: ${compositeScore}/100. XP concedido: ${awardedXp}.`,
    );

    return evaluation;
  }

  async getSession(
    organizationId: string,
    sessionId: string,
  ): Promise<MultimodalRoleplaySession | null> {
    return this.sessions.get(`${organizationId}:${sessionId}`) ?? null;
  }

  clear(): void {
    this.sessions.clear();
  }
}

export const multimodalRoleplaySimulatorService = new MultimodalRoleplaySimulatorService();
