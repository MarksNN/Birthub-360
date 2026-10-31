import { v4 as uuidv4 } from 'uuid';
import { generateStructuredOutput, UntrustedContentGuard } from '../../../../lib/ai/gateway.js';
import { logger } from '../../../../lib/logger.js';
import type {
  CommercialAgentResultV3,
  CommercialV3AgentId,
  CommercialV3Artifact,
  CommercialV3Evidence,
  CommercialV3Handoff,
} from '../contracts/commercialAgentV3.types.js';
import { commercialAgentResultV3Schema } from '../contracts/commercialAgentResultV3.schema.js';
import { commercialAgentV3Registry } from './commercialAgentV3Registry.service.js';
import { commercialContextBuilder } from './commercialContextBuilder.service.js';

export interface DispatchCommercialMissionInput {
  agentId: CommercialV3AgentId;
  skillIds?: string[];
  mission: string;
  organizationId: string;
  userId?: string;
  correlationId?: string;
  allowOperational?: boolean;
}

export class CommercialAgentV3OrchestratorService {
  public async dispatchMission(
    input: DispatchCommercialMissionInput,
  ): Promise<CommercialAgentResultV3> {
    const missionId = `mission-${uuidv4().slice(0, 8)}`;
    const correlationId = input.correlationId || `corr-${uuidv4().slice(0, 8)}`;
    const agentEntry = commercialAgentV3Registry.getAgent(input.agentId);

    if (!agentEntry) {
      throw new Error(`Agente ${input.agentId} inválido no catálogo V3.1.`);
    }

    // 1. Guard contra prompt injection em inputs não confiáveis
    const guard = createUntrustedContentGuard();
    const injectionCheck = guard.detectInjection(input.mission);
    const safeMission = injectionCheck.sanitizedContent;

    // 2. Determinar skillIds (se vazio, seleciona a primeira skill essencial do agente)
    const agentSkills = commercialAgentV3Registry.listSkills(input.agentId);
    const chosenSkillIds =
      input.skillIds && input.skillIds.length > 0
        ? input.skillIds
        : [agentSkills[0]?.id || `comercial.${input.agentId}.padrao`];

    // 3. Montar contexto sob demanda com bootstrap consultivo
    const contextResult = await commercialContextBuilder.buildContext(
      input.agentId,
      chosenSkillIds,
    );

    // 4. Modos e Operações: por padrão de segurança, o modo é CONSULTIVO
    const mode = input.allowOperational ? 'OPERACIONAL' : 'CONSULTIVO';
    const performed = false; // Ações operacionais reais exigem executor com validação de idempotência

    // 5. Mapear handoffs sugeridos para o especialista
    const handoffCandidates = commercialAgentV3Registry.getHandoffCandidates(input.agentId);
    const handoffs: CommercialV3Handoff[] = handoffCandidates.slice(0, 2).map(([to, reason]) => ({
      to: to as CommercialV3AgentId,
      reason,
      payloadRef: null,
      viaSupervisor: true,
    }));

    // 6. Criador do fallback seguro consultivo
    const buildConsultiveEnvelope = (customSummary?: string): CommercialAgentResultV3 => {
      const evidence: CommercialV3Evidence[] = [
        {
          sourceType: 'USER_INPUT',
          reference: `Solicitação autenticada org:${input.organizationId}`,
          claim: safeMission.slice(0, 250),
          verification: 'USER_REPORTED',
          observedAt: new Date().toISOString(),
        },
      ];

      const artifacts: CommercialV3Artifact[] = [
        {
          artifactType: 'ANALYSIS',
          name: `Análise Comercial V3.1 — ${agentEntry.name}`,
          state: 'DRAFT_NOT_SENT',
          payload: {
            agentId: input.agentId,
            objective: safeMission,
            skillsInvolved: chosenSkillIds,
            loadedPlaybooks: contextResult.state.loadedPlaybooks,
            executionMode: mode,
            consultiveHypothesis:
              'Ações reais no CRM ou disparo de mensagens dependem de confirmação de elegibilidade e canal.',
          },
        },
      ];

      const resumoHumano =
        customSummary ||
        `[${agentEntry.name}] Análise consultiva concluída para a demanda comercial. Nenhuma alteração real ou envio de mensagem foi realizado sem confirmação de opt-out e alçada.`;

      return {
        schemaVersion: '3.1',
        agentId: input.agentId,
        missionId,
        correlationId,
        status: 'COMPLETED',
        mode,
        skillIds: chosenSkillIds,
        summary: `Atendimento consultivo pelo agente ${agentEntry.name} com ${chosenSkillIds.length} habilidade(s) ativada(s).`,
        resumo_humano: resumoHumano.slice(0, 600),
        artifacts,
        evidence,
        hypotheses: [
          'Dados foram declarados pelo usuário e requerem validação nas fontes oficiais da organização.',
        ],
        missingData: [
          'Verificação de opt-out/supressão em tempo real pendente de executor operacional.',
        ],
        compliance: {
          channel: 'NONE',
          sendEligible: false,
          reason: 'Modo consultivo seguro: ausência de envio real de mensagens externas.',
          checks: [
            {
              check: 'OPT_OUT',
              state: 'UNKNOWN',
              reason: 'Lista de supressão não consultada no modo consultivo.',
              evidenceRef: null,
            },
            {
              check: 'LEGAL_BASIS',
              state: 'UNKNOWN',
              reason: 'Base legal para contato não homologada.',
              evidenceRef: null,
            },
          ],
          signals: {
            whatsappOptIn: 'UNKNOWN',
            optOutSuppression: 'UNKNOWN',
            touchHistory: 'UNKNOWN',
            businessHours: 'UNKNOWN',
            timezone: 'America/Sao_Paulo',
          },
        },
        approvalPending: {
          required: false,
          status: 'NOT_REQUIRED',
          action: null,
          approverRole: null,
          requestId: null,
          reason: 'Nenhuma ação operacional sensível solicitada.',
        },
        handoffs,
        execution: {
          actionType: 'NONE',
          performed,
          state: 'NONE',
          executionId: null,
          idempotencyKey: null,
          toolCalls: [],
        },
        metrics: {
          skillsCount: chosenSkillIds.length,
          playbooksLoaded: contextResult.state.loadedPlaybooks.length,
        },
        nextStep:
          'Apresentar análise ao usuário e solicitar autorização antes de qualquer ação operacional.',
      };
    };

    // 7. Tentativa de geração com LLM via AI Gateway estruturado
    let rawResult: CommercialAgentResultV3;
    try {
      rawResult = await generateStructuredOutput<CommercialAgentResultV3>({
        organizationId: input.organizationId,
        feature: 'commercial-v3',
        systemInstruction: contextResult.systemContext,
        prompt: `Demanda comercial do usuário:\n"${safeMission}"\n\nResponda estritamente no schema V3.1 com schemaVersion="3.1", agentId="${input.agentId}", status="COMPLETED", mode="CONSULTIVO", resumo_humano legível de até 600 caracteres, sendEligible=false e execution.performed=false.`,
        fallback: () => buildConsultiveEnvelope(),
      });
    } catch (err: unknown) {
      logger.warn(
        { err },
        'AI Gateway indisponível ou em erro; utilizando envelope consultivo seguro.',
      );
      rawResult = buildConsultiveEnvelope();
    }

    // 8. Normalização e garantias de segurança do Core V3.1
    if (rawResult.mode === 'CONSULTIVO' || !input.allowOperational) {
      rawResult.mode = 'CONSULTIVO';
      if (rawResult.execution) {
        rawResult.execution.performed = false;
        rawResult.execution.state = 'NONE';
      }
      if (rawResult.compliance) {
        rawResult.compliance.sendEligible = false;
      }
    }

    if (!rawResult.schemaVersion) rawResult.schemaVersion = '3.1';
    if (!rawResult.agentId) rawResult.agentId = input.agentId;
    if (!rawResult.missionId) rawResult.missionId = missionId;
    if (!rawResult.correlationId) rawResult.correlationId = correlationId;
    if (!rawResult.handoffs || rawResult.handoffs.length === 0) rawResult.handoffs = handoffs;
    if (!rawResult.resumo_humano || rawResult.resumo_humano.length > 600) {
      rawResult.resumo_humano = (
        rawResult.resumo_humano ||
        rawResult.summary ||
        'Atendimento comercial concluído.'
      )
        .slice(0, 597)
        .concat('...');
    }

    // 9. Validação estrita do schema Zod
    const validation = commercialAgentResultV3Schema.safeParse(rawResult);
    if (!validation.success) {
      logger.warn(
        { errors: validation.error.format() },
        'Resultado de LLM falhou no schema estrito Zod; aplicando fallback seguro verificado.',
      );
      return buildConsultiveEnvelope();
    }

    return validation.data as CommercialAgentResultV3;
  }
}

export const commercialAgentV3Orchestrator = new CommercialAgentV3OrchestratorService();
