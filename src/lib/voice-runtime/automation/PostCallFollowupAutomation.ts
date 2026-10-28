import { logger } from '../../logger.js';
import type { IntentAnalysisResult } from '../intelligence/IntentEngine.js';
import { observability } from '../Observability.js';
import type { VoiceSession } from '../types.js';

export interface PostCallFollowupResult {
  sessionId: string;
  tenantId: string;
  summary: string;
  primaryIntent: string;
  recommendedAction: string;
  taskSuggested: {
    title: string;
    description: string;
    dueDateDays: number;
    priority: 'Alta' | 'Média' | 'Baixa';
  };
  followupDraft?: {
    channel: 'whatsapp' | 'email' | 'call';
    content: string;
  };
  createdAt: number;
}

export class PostCallFollowupAutomation {
  /**
   * Processa a automação de pós-chamada com base no histórico da sessão de voz e intenções detectadas.
   */
  public async processSession(
    session: VoiceSession,
    detectedIntents: IntentAnalysisResult[] = [],
  ): Promise<PostCallFollowupResult> {
    observability.logEvent(session.sessionId, 'POST_CALL_FOLLOWUP_STARTED', {
      agentId: session.agentId,
      turnsCount: session.history.length,
    });

    const userTurns = session.history.filter((t) => t.role === 'user');

    // Determina a intenção predominante
    const latestIntent =
      detectedIntents.length > 0
        ? detectedIntents[detectedIntents.length - 1].primaryIntent
        : 'Outro';

    let recommendedAction = 'Fazer acompanhamento de rotina sobre a chamada.';
    let priority: 'Alta' | 'Média' | 'Baixa' = 'Média';
    let dueDateDays = 1;
    let followupChannel: 'whatsapp' | 'email' | 'call' = 'whatsapp';

    if (latestIntent === 'Agendamento') {
      recommendedAction = 'Confirmar data e horário da reunião e enviar convite de agenda.';
      priority = 'Alta';
      dueDateDays = 1;
    } else if (latestIntent === 'Financeiro') {
      recommendedAction = 'Enviar proposta comercial atualizada e condições de pagamento.';
      priority = 'Alta';
      dueDateDays = 1;
      followupChannel = 'email';
    } else if (latestIntent === 'Objeção') {
      recommendedAction = 'Enviar case de sucesso ou material complementar para contornar objeção.';
      priority = 'Alta';
      dueDateDays = 2;
    } else if (latestIntent === 'Suporte') {
      recommendedAction = 'Verificar resolução do chamado técnico e retornar ao cliente.';
      priority = 'Alta';
      dueDateDays = 1;
    } else if (latestIntent === 'Desistência') {
      recommendedAction = 'Registrar motivo de perda e agendar recontato em 60 dias.';
      priority = 'Baixa';
      dueDateDays = 60;
    }

    const transcriptExcerpt = userTurns
      .map((t) => t.content)
      .join(' | ')
      .slice(0, 300);

    const taskSuggested = {
      title: `Follow-up Pós-Chamada [${session.callerId || 'Lead'}]: ${latestIntent}`,
      description: `Atendimento via Agente de Voz (${session.agentId}).\nIntenção: ${latestIntent}.\nResumo falas: ${transcriptExcerpt}`,
      dueDateDays,
      priority,
    };

    const followupDraft = {
      channel: followupChannel,
      content: `Olá! Conforme conversamos em nossa chamada recente, estou enviando os detalhes para seguirmos com: ${recommendedAction.toLowerCase()}`,
    };

    const result: PostCallFollowupResult = {
      sessionId: session.sessionId,
      tenantId: session.tenantId,
      summary: `Chamada concluída com ${session.history.length} turnos. Intenção principal: ${latestIntent}.`,
      primaryIntent: latestIntent,
      recommendedAction,
      taskSuggested,
      followupDraft,
      createdAt: Date.now(),
    };

    observability.logEvent(session.sessionId, 'POST_CALL_FOLLOWUP_COMPLETED', {
      primaryIntent: latestIntent,
      priority,
      recommendedAction,
    });

    logger.info(
      { sessionId: session.sessionId, tenantId: session.tenantId, primaryIntent: latestIntent },
      '[PostCallFollowupAutomation] Automação pós-chamada gerada com sucesso.',
    );

    return result;
  }
}

export const postCallFollowupAutomation = new PostCallFollowupAutomation();
