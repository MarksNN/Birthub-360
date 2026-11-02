import { AIMessage, type BaseMessage, HumanMessage, SystemMessage } from '@langchain/core/messages';
import type { RunnableConfig } from '@langchain/core/runnables';
import { Annotation, StateGraph } from '@langchain/langgraph';
import type { ChatOpenAI } from '@langchain/openai';
import { z } from 'zod';
import { checkpointer, ensureCheckpointerReady } from '../../../lib/ai/checkpointer.js';
import { getAiModel, logAiUsage } from '../../../lib/ai/gateway.js';
import { getTenantId } from '../../../lib/async-context.js';
import { logger } from '../../../lib/logger.js';
import { assertPiiExternalConsent } from '../services/guardrails.service.js';
import { BDRAgent } from './bdr.agent.js';
import { CloserAgent } from './closer.agent.js';
import { CRMAgent } from './crm.agent.js';
// Lazy + memoizado: monta o cliente só no primeiro uso real, nunca na carga do módulo —
// process.env.GROQ_API_KEY lido numa const de topo de arquivo ficava congelado como vazio se este
// módulo fosse importado antes de `dotenv/config` terminar de rodar. Motor local (Ollama via
// LiteLLM) removido de propósito: processa uma completion por vez nesta máquina, travando o
// roteamento do enxame inteiro por vários segundos a cada decisão. Groq é rápido e não tem esse
// gargalo. Usar ChatOpenAI "cru" (em vez do wrapper AiChatModel do gateway) é o que habilita
// tool-calling/structured output — o wrapper só devolve texto livre, e a decisão de roteamento
// precisa ser JSON confiável.
import { buildModelWithFallback } from './fallback.util.js';
import { OpsAgent } from './ops.agent.js';
import { SDRQualificationAgent } from './sdrQualification.agent.js';
import {
  detectSubSwarm,
  getAllCatalogAgents,
  matchCatalogAgents,
  type SemanticAgentMatch,
  type SemanticRoutingPlan,
  SUB_SWARMS,
  type SubSwarmDomain,
  type SwarmAgentKey,
  semanticRouteMission,
} from './subSwarms.config.js';
import {
  SWARM_CATALOG_TOTAL_AGENTS,
  SWARM_DEFAULT_SUB_SWARM,
  SWARM_IDENTITY,
  SWARM_MAX_STEPS,
  SWARM_OUTPUT_CONTRACT,
  SWARM_UNTRUSTED_CONTENT_GUARD,
} from './swarm.constants.js';

export {
  detectSubSwarm,
  getAllCatalogAgents,
  matchCatalogAgents,
  type SemanticAgentMatch,
  type SemanticRoutingPlan,
  SUB_SWARMS,
  type SubSwarmDomain,
  SWARM_CATALOG_TOTAL_AGENTS,
  SWARM_DEFAULT_SUB_SWARM,
  SWARM_MAX_STEPS,
  type SwarmAgentKey,
  semanticRouteMission,
};

let cachedSupervisorLlm: ReturnType<typeof buildModelWithFallback> | null = null;
function getSupervisorLlm() {
  if (cachedSupervisorLlm) return cachedSupervisorLlm;

  cachedSupervisorLlm = buildModelWithFallback('openai/gpt-oss-20b');
  return cachedSupervisorLlm;
}

export type SwarmRoute = SwarmAgentKey | 'finish';
export type SwarmEventType = 'routing' | 'agent_result' | 'agent_error' | 'final';

export interface SwarmEvent {
  type: SwarmEventType;
  agent: 'supervisor' | SwarmAgentKey;
  content: string;
  step: number;
  reasoning?: string;
  /** Presente apenas em eventos 'routing': qual especialista está prestes a ser acionado. */
  nextAgent?: SwarmAgentKey;
  /** Confiança do supervisor na decisão (0-1). Presente em eventos 'routing'. */
  confidence?: number;
  /** Modelo de IA usado para esta decisão (ex: 'gpt-oss-20b'). Presente em eventos 'routing'. */
  modelUsed?: string;
  /** Custo em tokens desta decisão. Presente em eventos 'routing'. */
  tokensUsed?: number;
  /** Se o roteamento usou fallback heurístico. Presente em eventos 'routing'. */
  fallbackTriggered?: boolean;
  /** Correlation ID para tracing distribuído. Presente em todos os eventos. */
  correlationId?: string;
}

// Limite de saltos entre especialistas antes de forçar a síntese final (evita loops infinitos).
const MAX_STEPS = SWARM_MAX_STEPS;

const AGENT_INFO: Record<
  SwarmAgentKey,
  { label: string; description: string; chooseWhen: string }
> = {
  sdr: {
    label: 'SDR Autônomo',
    description:
      'Qualifica um lead no CRM (fit com o ICP, enriquecimento profundo, leitura de e-mails Outlook/M365/Gmail/IMAP para identificar oportunidades, agendamento de reuniões Meet/Teams/Zoom/Calendly, geração de scripts/prompts e battlecards de objeção) e atualiza o status de qualificação.',
    chooseWhen:
      'A missão pede para qualificar/analisar um lead específico que já existe no CRM ou localizar por nome da empresa.',
  },
  bdr: {
    label: 'BDR (Outbound)',
    description:
      'Realiza descoberta B2B de novas empresas (Apollo, Google Places, BrasilAPI), promove e enriquece empresas e decisores no CRM, varre caixas de e-mail (Outlook, Gmail, IMAP) atrás de sinais de compra, gera scripts/prompts comerciais e prepara cadências multicanal (WhatsApp, LinkedIn, E-mail, Telegram).',
    chooseWhen:
      'A missão é sobre prospecção fria, identificação de contas no CRM, priorização por aderência ao ICP ou sugestão de abertura de contato.',
  },
  closer: {
    label: 'Closer Autônomo',
    description:
      'Conduz estratégia de negociação para oportunidades qualificadas: gera propostas comerciais, documentos Word/Google Docs, planilhas Excel/Sheets e apresentações PowerPoint/Slides, sintetiza atas de reuniões (Meet/Teams/Zoom), analisa objeções/battlecards e prontidão contratual. Jamais fecha negócios autonomamente.',
    chooseWhen:
      'A missão envolve oportunidade qualificada, proposta enviada, reunião comercial, piloto, negociação, objeção, decisão ou prontidão contratual. Não use para primeiro contato frio.',
  },
  crm: {
    label: 'Gestor de CRM',
    description:
      'Diagnostica pipeline, forecast ponderado, cross-sell e risco de churn; sincroniza dados com CRMs/ERPs externos (Bitrix24, HubSpot, Pipedrive, RD Station, Monday.com, Omie) e gera relatórios em Excel/Google Sheets.',
    chooseWhen:
      'A missão é sobre uma negociação/deal que já está em andamento (não um lead novo) — risco de estagnação, tempo sem interação, pipeline parado ou reenriquecimento.',
  },
  ops: {
    label: 'Agente de Operações',
    description:
      'Executa e propõe ações operacionais multi-plataforma: cria cards/tarefas e notas no Trello, Monday.com, Bitrix24, ClickUp, Asana, Notion e CRM; gera arquivos Word, Excel (.xlsx), PowerPoint e Google Docs/Sheets/Slides; envia mensagens em WhatsApp, Telegram, Teams, Slack e SMS; e dispara notificações em Pop-up na tela, Push no Celular, Relógio (Smartwatch) e SMS.',
    chooseWhen:
      'A missão pede uma AÇÃO CONCRETA a ser executada agora (agendar, notificar, criar tarefa) — não escolha só para produzir mais uma análise ou opinião.',
  },
};

const SwarmState = Annotation.Root({
  messages: Annotation<BaseMessage[]>({
    reducer: (left, right) => left.concat(right),
    default: () => [],
  }),
  mission: Annotation<string>({
    reducer: (left, right) => right ?? left,
    default: () => '',
  }),
  instruction: Annotation<string>({
    reducer: (left, right) => right ?? left,
    default: () => '',
  }),
  // ID real de Lead do CRM, opcional — ver sdrNode: sem isto, SDRQualificationAgent.run() recebia
  // o texto livre da missão/instrução no lugar de um ID de lead de verdade e a ferramenta de
  // contexto sempre falhava com "lead não encontrado" (IA-003).
  leadId: Annotation<string>({
    reducer: (left, right) => right ?? left,
    default: () => '',
  }),
  subSwarm: Annotation<SubSwarmDomain>({
    reducer: (left, right) => right ?? left,
    default: () => 'commercial',
  }),
  catalogMatches: Annotation<SemanticAgentMatch[]>({
    reducer: (left, right) => (right && right.length > 0 ? right : left),
    default: () => [],
  }),
  selectedCatalogAgent: Annotation<string | null>({
    reducer: (left, right) => right ?? left,
    default: () => null,
  }),
  next: Annotation<SwarmRoute>({
    reducer: (left, right) => right ?? left,
    default: () => 'sdr',
  }),
  completed: Annotation<SwarmAgentKey[]>({
    reducer: (left, right) => [...left, ...right],
    default: () => [],
  }),
  results: Annotation<Partial<Record<SwarmAgentKey, string>>>({
    reducer: (left, right) => ({ ...left, ...right }),
    default: () => ({}),
  }),
  step: Annotation<number>({
    reducer: (left, right) => right ?? left,
    default: () => 0,
  }),
});

type SwarmStateType = typeof SwarmState.State;

function buildEvent(
  type: SwarmEventType,
  agent: SwarmEvent['agent'],
  content: string,
  step: number,
  reasoning?: string,
  nextAgent?: SwarmAgentKey,
  confidence?: number,
  modelUsed?: string,
  tokensUsed?: number,
  fallbackTriggered?: boolean,
  correlationId?: string,
): SwarmEvent {
  return {
    type,
    agent,
    content,
    step,
    reasoning,
    nextAgent,
    confidence,
    modelUsed,
    tokensUsed,
    fallbackTriggered,
    correlationId,
  };
}

function toAiMessage(event: SwarmEvent): AIMessage {
  return new AIMessage({ content: event.content, additional_kwargs: { swarmEvent: event } });
}

// Exportado só para teste unitário direto da validação de forma da decisão do supervisor.
export const supervisorDecisionSchema = z.object({
  action: z
    .enum(['sdr', 'bdr', 'closer', 'crm', 'ops', 'finish'])
    .describe(
      'Qual especialista deve atuar a seguir, ou "finish" se a missão já foi suficientemente atendida.',
    ),
  subSwarm: z
    .enum(['commercial', 'marketing', 'customer_success', 'operations'])
    .optional()
    .describe('Sub-Swarm temático direcionado para a etapa.'),
  catalogAgentCode: z
    .string()
    .optional()
    .describe(
      'Código de um dos 379 agentes do catálogo selecionado pelo roteamento semântico, se aplicável.',
    ),
  instruction: z
    .string()
    .default('')
    .describe(
      'Instrução objetiva e ESPECÍFICA em português para o especialista escolhido: diga exatamente o que analisar/fazer e com base em que dado da missão. String vazia se action for "finish".',
    ),
  reasoning: z
    .string()
    .default('')
    .describe(
      'Uma frase curta explicando por que este especialista (e não outro) foi escolhido agora.',
    ),
});

type SupervisorDecision = z.infer<typeof supervisorDecisionSchema>;

// Exportado só para teste unitário direto do roteamento de contingência. Recebe a missão original
// para usar como instrução de contingência — antes disto, todo fallback (parsing falhou, guard
// interceptou) mandava um texto fixo e genérico pro especialista ("produza um resultado
// objetivo"), descartando o pedido real do usuário justamente nos casos em que o roteamento por
// IA não pôde ser confiado.
export function fallbackDecision(
  completed: SwarmAgentKey[],
  hasLeadId: boolean,
  mission: string = '',
  subSwarm?: SubSwarmDomain,
): SupervisorDecision {
  const activeSubSwarm = subSwarm || (mission ? detectSubSwarm(mission) : 'commercial');
  let order: SwarmAgentKey[];

  if (activeSubSwarm === 'marketing') {
    order = hasLeadId ? ['bdr', 'sdr', 'ops', 'crm'] : ['bdr', 'ops', 'crm'];
  } else if (activeSubSwarm === 'customer_success') {
    order = ['crm', 'ops', 'closer'];
  } else if (activeSubSwarm === 'operations') {
    order = ['ops', 'crm', 'bdr'];
  } else {
    order = hasLeadId ? ['sdr', 'bdr', 'closer', 'crm', 'ops'] : ['bdr', 'closer', 'crm', 'ops'];
  }

  const pending = order.find((agent) => !completed.includes(agent));
  if (!pending) {
    return {
      action: 'finish',
      instruction: '',
      reasoning: 'Todos os especialistas relevantes já atuaram.',
    };
  }
  return {
    action: pending,
    instruction:
      mission.trim() ||
      'Analise a missão do usuário com os dados disponíveis e produza um resultado objetivo.',
    reasoning:
      'Roteamento sequencial de contingência (resposta do supervisor não pôde ser interpretada).',
  };
}

// Trava determinística: nunca aciona o Agente SDR sem um leadId real, mesmo que o LLM do
// supervisor "esqueça" a instrução do prompt e escolha 'sdr' de qualquer forma — sdrNode
// dependeria de get_lead_context com um ID que não existe e queimaria uma rodada inteira do
// enxame só para produzir o mesmo erro que dava pra prever aqui. Exportado para teste unitário.
export function enforceLeadGuard(
  decision: SupervisorDecision,
  context: Pick<SwarmStateType, 'leadId' | 'completed' | 'mission'> & {
    subSwarm?: SubSwarmDomain;
  },
): SupervisorDecision {
  if (decision.action !== 'sdr' || context.leadId) {
    return decision;
  }
  const rerouted = fallbackDecision(
    context.completed,
    false,
    context.mission,
    context.subSwarm ?? decision.subSwarm,
  );
  const note = 'SDR não pode ser acionado: nenhum leadId foi informado para esta missão.';
  return {
    ...rerouted,
    reasoning: rerouted.reasoning ? `${note} ${rerouted.reasoning}` : note,
  };
}

// Correlation ID para tracing distribuído do supervisor: baseado no thread_id do checkpoint
// (`${tenant}:${sid}`, montado em executeMission/executeMissionStream) e timestamp.
// Decisão do Agente 07 (opção b) — ver
// .agents/handoffs/onda-52/07-para-00-correlationid-supervisor-thread-id.md.
export function buildSwarmCorrelationId(config?: RunnableConfig, now: number = Date.now()): string {
  const raw = config?.configurable?.thread_id;
  const threadId = typeof raw === 'string' && raw ? raw : 'no-thread';
  return `swarm-${threadId}-${now}`;
}

/**
 * Nó de roteamento semântico dinâmico que conecta a missão aos Sub-Swarms temáticos
 * e aos 379 especialistas do catálogo oficial da plataforma.
 */
async function semanticRouterNode(state: SwarmStateType, config?: RunnableConfig) {
  const subSwarm =
    state.subSwarm && state.subSwarm !== 'commercial'
      ? state.subSwarm
      : detectSubSwarm(state.mission);

  const catalogMatches = matchCatalogAgents(state.mission, subSwarm, { topK: 3 });
  const correlationId = buildSwarmCorrelationId(config);

  const topMatch = catalogMatches[0];
  const content = topMatch
    ? `Roteamento semântico dinâmico: Sub-Swarm '${SUB_SWARMS[subSwarm].label}' ativado. Especialista sugerido do catálogo amplo (${SWARM_CATALOG_TOTAL_AGENTS} agentes): ${topMatch.name} (${topMatch.code}) [Aderência: ${Math.round(topMatch.similarityScore * 100)}%].`
    : `Roteamento semântico dinâmico: Sub-Swarm '${SUB_SWARMS[subSwarm].label}' ativado com especialistas primários.`;

  return {
    subSwarm,
    catalogMatches,
    messages: [
      toAiMessage(
        buildEvent(
          'routing',
          'supervisor',
          content,
          0,
          topMatch?.matchReason || `Sub-Swarm ${subSwarm}`,
          undefined,
          0.9,
          undefined,
          undefined,
          false,
          correlationId,
        ),
      ),
    ],
  };
}

export async function supervisorNode(state: SwarmStateType, config?: RunnableConfig) {
  const step = state.step + 1;

  if (step > MAX_STEPS) {
    const reasoning = `Limite de ${MAX_STEPS} etapas do enxame atingido. Terminação determinística de ciclo garantida.`;
    return {
      step,
      next: 'finish' as const,
      instruction: '',
      messages: [
        toAiMessage(
          buildEvent(
            'routing',
            'supervisor',
            `Encerrando o roteamento: ${reasoning} Preparando síntese final.`,
            step,
            reasoning,
            undefined,
            1.0,
            undefined,
            undefined,
            false,
            buildSwarmCorrelationId(config),
          ),
        ),
      ],
    };
  }

  const completedList =
    state.completed.length > 0
      ? state.completed.map((agent) => AGENT_INFO[agent].label).join(', ')
      : 'nenhum ainda';
  const resultsSummary =
    (Object.entries(state.results) as [SwarmAgentKey, string][])
      .map(([agent, content]) => `- ${AGENT_INFO[agent].label}: ${content.slice(0, 400)}`)
      .join('\n') || 'Nenhum resultado produzido até agora.';

  // Derivado de AGENT_INFO (não hardcoded) — um especialista novo adicionado ali aparece aqui
  // automaticamente.
  const agentKeys = Object.keys(AGENT_INFO) as SwarmAgentKey[];

  const activeSubSwarm =
    state.subSwarm && state.subSwarm !== 'commercial'
      ? state.subSwarm
      : detectSubSwarm(state.mission);
  const subSwarmConfig = SUB_SWARMS[activeSubSwarm];
  const subSwarmContextLine = `Sub-Swarm detectado para esta missão: ${subSwarmConfig.label} — Especialistas prioritários: ${subSwarmConfig.primaryAgents.join(', ')}.`;

  const leadContextLine = state.leadId
    ? `Lead ID disponível para esta missão: ${state.leadId} (o especialista 'sdr' pode usá-lo).`
    : `Nenhum Lead ID foi informado para esta missão — NÃO escolha 'sdr' enquanto isso não mudar, pois ele depende de um lead real do CRM e sempre falharia sem um ID.`;

  const catalogMatches =
    state.catalogMatches && state.catalogMatches.length > 0
      ? state.catalogMatches
      : matchCatalogAgents(state.mission, activeSubSwarm, { topK: 3 });

  const catalogSpecialistsBlock =
    catalogMatches.length > 0
      ? `\n<especialistas_catalogo_amplo_379>\nEspecialistas recomendados do catálogo de ${SWARM_CATALOG_TOTAL_AGENTS} agentes para esta missão:\n${catalogMatches
          .map(
            (m) =>
              `- '${m.code}' (${m.name} - Domínio: ${m.domain}): ${m.description} [Score: ${m.similarityScore}]`,
          )
          .join('\n')}\n</especialistas_catalogo_amplo_379>`
      : '';

  const systemPrompt = `${SWARM_IDENTITY} Você é o Supervisor: coordena ${agentKeys.length} especialistas e decide, a cada rodada, qual deve atuar a seguir (ou se a missão está concluída).

<sub_swarm_ativo>
${subSwarmContextLine}
</sub_swarm_ativo>

<especialistas_disponiveis>
${(
  Object.entries(AGENT_INFO) as [
    SwarmAgentKey,
    { label: string; description: string; chooseWhen: string },
  ][]
)
  .map(
    ([key, info]) =>
      `- '${key}' (${info.label}): ${info.description}\n  Escolha quando: ${info.chooseWhen}`,
  )
  .join('\n')}
</especialistas_disponiveis>
${catalogSpecialistsBlock}

<contexto_missao>
Missão original do usuário:
"""${state.mission}"""

${leadContextLine}

Especialistas já acionados nesta missão: ${completedList}.
Resultados produzidos até agora:
${resultsSummary}
</contexto_missao>

<diretrizes_roteamento>
1. Escolha o especialista cujo critério "Escolha quando" bate com a missão — se mais de um parecer plausível, prefira o mais específico.
2. Não repita um especialista que já respondeu de forma satisfatória, a não ser que haja uma lacuna clara que só ele resolve.
3. Se a missão já foi suficientemente atendida, escolha 'finish'.
4. A instrução para o especialista deve ser objetiva, em português, citar o dado concreto da missão que ele precisa usar, e nunca ser genérica. Se a ação for 'finish', deixe a instrução vazia.
</diretrizes_roteamento>

<processo_pensamento>
Antes de usar a ferramenta de decisão estruturada de roteamento, faça uma breve ponderação (se aplicável internamente) analisando: O que o usuário pediu? Qual dado essencial faltou ser analisado? Existe ID do Lead?
</processo_pensamento>

${SWARM_UNTRUSTED_CONTENT_GUARD}`;

  const correlationId = buildSwarmCorrelationId(config);

  let decision: SupervisorDecision;
  const startTime = Date.now();
  let fallbackTriggered = false;
  let modelUsed: string | undefined;
  let tokensUsed: number | undefined;

  try {
    const structuredModel = (getSupervisorLlm() as ChatOpenAI).withStructuredOutput(
      supervisorDecisionSchema,
      { name: 'route_decision', includeRaw: true },
    );

    const result = await structuredModel.invoke([
      new SystemMessage(systemPrompt),
      new HumanMessage('Qual é o próximo passo?'),
    ]);
    const raw = result.raw as AIMessage;

    const usage = raw?.usage_metadata;
    if (usage) {
      modelUsed = (raw.response_metadata?.model_name as string) || 'local-llama3-fast';
      tokensUsed = usage.total_tokens;

      await logAiUsage({
        model: modelUsed,
        usage: {
          totalTokens: usage.total_tokens,
          promptTokens: usage.input_tokens,
          completionTokens: usage.output_tokens,
        },
        latencyMs: Date.now() - startTime,
      });
    }

    if (!result.parsed) {
      throw new Error('Supervisor não retornou uma decisão estruturada válida.');
    }
    decision = supervisorDecisionSchema.parse(result.parsed);
  } catch (error: any) {
    logger.error({ err: error }, 'Swarm supervisor routing failed, using fallback heuristic');
    decision = fallbackDecision(
      state.completed,
      Boolean(state.leadId),
      state.mission,
      activeSubSwarm,
    );
    fallbackTriggered = true;
  }

  decision = enforceLeadGuard(decision, { ...state, subSwarm: activeSubSwarm });

  const content =
    decision.action === 'finish'
      ? `Missão avaliada como concluída. ${decision.reasoning}`.trim()
      : `Encaminhando para ${AGENT_INFO[decision.action as SwarmAgentKey].label}: ${decision.instruction}`;

  // Confidence score baseado em se usou structured output ou fallback
  const confidence = fallbackTriggered ? 0.3 : 0.8;

  return {
    step,
    subSwarm: activeSubSwarm,
    selectedCatalogAgent: decision.catalogAgentCode || null,
    next: decision.action,
    instruction: decision.instruction,
    messages: [
      toAiMessage(
        buildEvent(
          'routing',
          'supervisor',
          content,
          step,
          decision.reasoning,
          decision.action === 'finish' ? undefined : decision.action,
          confidence,
          modelUsed,
          tokensUsed,
          fallbackTriggered,
          correlationId,
        ),
      ),
    ],
  };
}

// Monta o sessionId (chave de AgentMemory) de cada especialista do enxame incluindo o leadId
// quando disponível, por dois motivos:
// 1. Sem isso, duas missões diferentes cujo primeiro acionamento de um mesmo especialista caía no
//    mesmo `state.step` (ex.: sempre 1 na primeira chamada) geravam o MESMO sessionId
//    (`swarm-bdr-1`), e a segunda missão sobrescrevia (via updateMemory/findFirst+update) a
//    AgentMemory da primeira — colisão entre leads sem relação alguma.
// 2. `AgentMemory` (prisma/schema.prisma) ainda não tem coluna estruturada `leadId`/`contactId`,
//    então `eraseDataSubject` (LGPD) não consegue localizar sessões de um titular. Embutir
//    `lead_${leadId}` no sessionId dá uma correlação recuperável por string enquanto essa migração
//    (proposta em .agents/handoffs/onda-6/01A-para-07-agentmemory-sem-vinculo-titular.md) não é
//    aplicada pelo Agente 01A.
function swarmSessionId(
  role: 'sdr' | 'bdr' | 'closer' | 'crm' | 'ops',
  state: SwarmStateType,
): string {
  return state.leadId
    ? `swarm-${role}-lead_${state.leadId}-${state.step}`
    : `swarm-${role}-${state.step}`;
}

// Adapters que executam os sub-agentes com a instrução lapidada pelo supervisor (não mais o texto cru do roteamento).
async function sdrNode(state: SwarmStateType) {
  // SDRQualificationAgent.run() espera um ID real de Lead do CRM (usa a ferramenta get_lead_context,
  // que faz um lookup exato por id) — nunca texto livre. Antes desta correção, este node passava
  // state.instruction (a instrução em português lapidada pelo supervisor) no lugar do leadId, e a
  // qualificação sempre falhava com "Lead não encontrado no CRM" (IA-003).
  if (!state.leadId) {
    const content =
      'Não foi possível qualificar: nenhum lead foi informado para esta missão. Informe o ID do lead relacionado para que o Agente SDR busque o contexto real no CRM.';
    return {
      completed: ['sdr'] as SwarmAgentKey[],
      results: { sdr: content },
      messages: [toAiMessage(buildEvent('agent_error', 'sdr', content, state.step))],
    };
  }
  try {
    const agent = new SDRQualificationAgent();
    const result = await agent.run(
      state.leadId,
      swarmSessionId('sdr', state),
      state.instruction || undefined,
    );
    // Sem isto, uma falha real (ex: trava de consentimento LGPD, erro do grafo) — que
    // SDRQualificationAgent.run() já reporta como `{ success: false, error }` — caía no
    // fallback de baixo e o enxame relatava "Análise concluída sem detalhamento textual." como
    // se tivesse dado certo. mesmo padrão de checagem já usado em bdrNode/closerNode/crmNode/opsNode.
    if (result.error) {
      throw new Error(result.error);
    }
    const content =
      'detailedLog' in result && result.detailedLog
        ? result.detailedLog
        : 'Análise concluída sem detalhamento textual.';
    return {
      completed: ['sdr'] as SwarmAgentKey[],
      results: { sdr: content },
      messages: [toAiMessage(buildEvent('agent_result', 'sdr', content, state.step))],
    };
  } catch (error: any) {
    const message = error instanceof Error ? error.message : 'Falha desconhecida no Agente SDR.';
    logger.error({ err: error }, 'Swarm SDR node failed');
    return {
      completed: ['sdr'] as SwarmAgentKey[],
      results: { sdr: `Erro: ${message}` },
      messages: [
        toAiMessage(
          buildEvent(
            'agent_error',
            'sdr',
            `O Agente SDR encontrou um problema: ${message}`,
            state.step,
          ),
        ),
      ],
    };
  }
}

async function bdrNode(state: SwarmStateType) {
  const instruction = state.instruction || state.mission;
  try {
    const agent = new BDRAgent();
    const result = await agent.run(instruction, swarmSessionId('bdr', state));
    if (result.error) {
      throw new Error(result.error);
    }
    const content = result.qualification || 'Análise concluída sem detalhamento textual.';
    return {
      completed: ['bdr'] as SwarmAgentKey[],
      results: { bdr: content },
      messages: [toAiMessage(buildEvent('agent_result', 'bdr', content, state.step))],
    };
  } catch (error: any) {
    const message = error instanceof Error ? error.message : 'Falha desconhecida no Agente BDR.';
    logger.error({ err: error }, 'Swarm BDR node failed');
    return {
      completed: ['bdr'] as SwarmAgentKey[],
      results: { bdr: `Erro: ${message}` },
      messages: [
        toAiMessage(
          buildEvent(
            'agent_error',
            'bdr',
            `O Agente BDR encontrou um problema: ${message}`,
            state.step,
          ),
        ),
      ],
    };
  }
}

async function closerNode(state: SwarmStateType) {
  const instruction = state.instruction || state.mission;
  try {
    const agent = new CloserAgent();
    const result = await agent.run(instruction, swarmSessionId('closer', state));
    if (result.error) {
      throw new Error(result.error);
    }
    const content = result.closePlan || 'Plano de fechamento concluído sem detalhamento textual.';
    return {
      completed: ['closer'] as SwarmAgentKey[],
      results: { closer: content },
      messages: [toAiMessage(buildEvent('agent_result', 'closer', content, state.step))],
    };
  } catch (error: any) {
    const message = error instanceof Error ? error.message : 'Falha desconhecida no Closer.';
    logger.error({ err: error }, 'Swarm Closer node failed');
    return {
      completed: ['closer'] as SwarmAgentKey[],
      results: { closer: `Erro: ${message}` },
      messages: [
        toAiMessage(
          buildEvent(
            'agent_error',
            'closer',
            `O Closer encontrou um problema: ${message}`,
            state.step,
          ),
        ),
      ],
    };
  }
}

async function crmNode(state: SwarmStateType) {
  const instruction = state.instruction || state.mission;
  try {
    const agent = new CRMAgent();
    const result = await agent.run(instruction, swarmSessionId('crm', state));
    if (result.error) {
      throw new Error(result.error);
    }
    const content = result.action || 'Análise concluída sem detalhamento textual.';
    return {
      completed: ['crm'] as SwarmAgentKey[],
      results: { crm: content },
      messages: [toAiMessage(buildEvent('agent_result', 'crm', content, state.step))],
    };
  } catch (error: any) {
    const message = error instanceof Error ? error.message : 'Falha desconhecida no Agente de CRM.';
    logger.error({ err: error }, 'Swarm CRM node failed');
    return {
      completed: ['crm'] as SwarmAgentKey[],
      results: { crm: `Erro: ${message}` },
      messages: [
        toAiMessage(
          buildEvent(
            'agent_error',
            'crm',
            `O Agente de CRM encontrou um problema: ${message}`,
            state.step,
          ),
        ),
      ],
    };
  }
}

async function opsNode(state: SwarmStateType) {
  const instruction = state.instruction || state.mission;
  try {
    const agent = new OpsAgent();
    const result = await agent.run(
      instruction,
      swarmSessionId('ops', state),
      state.leadId || undefined,
    );
    if (result.error) {
      throw new Error(result.error);
    }
    const content = result.output || 'Ação concluída sem detalhamento textual.';
    return {
      completed: ['ops'] as SwarmAgentKey[],
      results: { ops: content },
      messages: [toAiMessage(buildEvent('agent_result', 'ops', content, state.step))],
    };
  } catch (error: any) {
    const message =
      error instanceof Error ? error.message : 'Falha desconhecida no Agente de Operações.';
    logger.error({ err: error }, 'Swarm Ops node failed');
    return {
      completed: ['ops'] as SwarmAgentKey[],
      results: { ops: `Erro: ${message}` },
      messages: [
        toAiMessage(
          buildEvent(
            'agent_error',
            'ops',
            `O Agente de Operações encontrou um problema: ${message}`,
            state.step,
          ),
        ),
      ],
    };
  }
}

async function finishNode(state: SwarmStateType) {
  const resultsSummary = (Object.entries(state.results) as [SwarmAgentKey, string][])
    .map(([agent, content]) => `${AGENT_INFO[agent].label}:\n${content}`)
    .join('\n\n');

  if (!resultsSummary) {
    const content = 'Nenhum especialista precisou ser acionado para esta missão.';
    return { messages: [toAiMessage(buildEvent('final', 'supervisor', content, state.step))] };
  }

  let synthesis: string;
  try {
    const model = getAiModel('local-llama3-fast', 0.2, 'supervisor-synthesis');
    const response = await model.invoke([
      new SystemMessage(
        `${SWARM_IDENTITY} Você é o Supervisor de Operações (RevOps) encerrando a missão. Com base na missão do usuário e nos resultados retornados pelo seu esquadrão de especialistas de elite, escreva uma Síntese Executiva brutalmente honesta e visualmente deslumbrante.

<diretrizes_comportamento>
1. Nunca comece com "Aqui está o resumo...". Vá direto ao ponto.
2. Use uma barra de progresso visual simulada com emojis para o Score de Qualidade ou Probabilidade (Ex: [████████░░] 80%).
3. Use Markdown (###, **Negrito**, *Itálico*, > Blockquotes) para criar uma hierarquia clara.
</diretrizes_comportamento>

<processo_pensamento>
Antes de estruturar a resposta, reflita via tag <thought>:
1. Qual o maior bloqueador revelado pelos especialistas?
2. Qual o Score de Viabilidade mais realista, agregando a visão do SDR/BDR/Closer?
3. Qual a ação imediata que fará o negócio avançar agora?
</processo_pensamento>

<estrutura_output_final>
### 🚁 Visão Panorâmica
[O que descobrimos de fato? Resuma o cenário em 1 ou 2 frases curtas de alto impacto. Qual a temperatura geral do negócio?]
**Score de Viabilidade:** [████████░░] 80%

---

### 🚨 Gargalos e Riscos (Red Flags)
- [Alerte para o principal risco estrutural ou ausência crítica, ex: "Falta validação do CFO"]
- [Qualquer outro bloqueador imediato]

---

### 🎯 Diretriz Estratégica (Ação Imediata)
> **[Qual o ÚNICO próximo passo matador que a equipe deve executar AGORA?]**
[Indique de quem é a bola: BDR, Closer, ou Marketing, e o que exatamente deve ser feito para destravar a oportunidade]
</estrutura_output_final>

${SWARM_OUTPUT_CONTRACT}

${SWARM_UNTRUSTED_CONTENT_GUARD}`,
      ),
      new HumanMessage(
        `Missão original: ${state.mission}\n\nIntel recebida dos especialistas:\n${resultsSummary}`,
      ),
    ]);
    synthesis = response.content.trim() || resultsSummary;
  } catch (error: any) {
    logger.error({ err: error }, 'Swarm synthesis failed, falling back to raw results');
    synthesis = resultsSummary;
  }

  return {
    messages: [toAiMessage(buildEvent('final', 'supervisor', synthesis, state.step))],
  };
}

function routerCondition(state: SwarmStateType): SwarmRoute {
  return state.next;
}

const workflow = new StateGraph(SwarmState)
  .addNode('semanticRouter', semanticRouterNode)
  .addNode('supervisor', supervisorNode)
  .addNode('sdr', sdrNode)
  .addNode('bdr', bdrNode)
  .addNode('closer', closerNode)
  .addNode('crm', crmNode)
  .addNode('ops', opsNode)
  .addNode('finish', finishNode)
  .addEdge('__start__', 'semanticRouter')
  .addEdge('semanticRouter', 'supervisor')
  .addConditionalEdges('supervisor', routerCondition, {
    sdr: 'sdr',
    bdr: 'bdr',
    closer: 'closer',
    crm: 'crm',
    ops: 'ops',
    finish: 'finish',
  })
  .addEdge('sdr', 'supervisor')
  .addEdge('bdr', 'supervisor')
  .addEdge('closer', 'supervisor')
  .addEdge('crm', 'supervisor')
  .addEdge('ops', 'supervisor')
  .addEdge('finish', '__end__');

// AI-002 (onda 32): checkpointer real (Postgres, compartilhado — src/lib/ai/checkpointer.ts).
const swarmApp = workflow.compile({ checkpointer });

export class SwarmOrchestrator {
  async executeMission(mission: string, sessionId?: string, leadId?: string) {
    const sid = sessionId || `swarm-mission-${Date.now()}`;
    // thread_id prefixado pelo tenant (AI-002, onda 20). `sessionId` chega cru do corpo da
    // requisição HTTP (POST /swarm/mission) — sem o prefixo, duas organizações que
    // (coincidentemente ou não) mandassem o mesmo sessionId reaproveitariam o checkpoint uma
    // da outra, já que o checkpointer deste grafo é compartilhado por todo o processo.
    const config = {
      configurable: { thread_id: `${getTenantId() ?? 'unknown-tenant'}:${sid}` },
      recursionLimit: 25,
    };

    try {
      // AI-007 (parte 3): mesmo gate fail-closed já em vigor em base.agent.ts/
      // sdrQualification.agent.ts/ops.agent.ts — até esta correção, o próprio Supervisor
      // (supervisorNode/finishNode, abaixo) enviava `mission` em texto livre (que chega cru do
      // corpo de POST /swarm/mission, digitado por um operador humano, e pode conter PII de um
      // titular real) direto a um provedor de IA externo (getSupervisorLlm/getAiModel), sem
      // passar pela mesma checagem de base legal LGPD que os especialistas do enxame (sdrNode
      // etc.) já aplicam individualmente. Checado uma vez aqui, antes do grafo começar a rodar
      // — os nodes dos especialistas mantêm suas próprias checagens (defesa em profundidade,
      // e cobrem o caminho em que são chamados fora deste orquestrador).
      assertPiiExternalConsent(getTenantId());
      // AI-002 (onda 32): garante que as tabelas do checkpointer Postgres existam antes da
      // primeira invocação real deste processo — memoizado.
      await ensureCheckpointerReady();
      const finalState = await swarmApp.invoke(
        { messages: [new HumanMessage(mission)], mission, leadId: leadId || '' },
        config,
      );
      return finalState.messages as BaseMessage[];
    } catch (error: any) {
      logger.error({ err: error, sessionId: sid }, 'Swarm execution failed');
      throw error;
    }
  }

  async executeMissionStream(
    mission: string,
    sessionId: string,
    onChunk: (event: SwarmEvent) => void,
    leadId?: string,
  ) {
    const sid = sessionId || `swarm-mission-${Date.now()}`;
    // Mesmo motivo do prefixo em executeMission acima.
    const config = {
      configurable: { thread_id: `${getTenantId() ?? 'unknown-tenant'}:${sid}` },
      recursionLimit: 25,
    };

    try {
      // Mesmo gate de executeMission acima — a variante em streaming passa pelo mesmo
      // supervisorNode/finishNode e precisa da mesma checagem antes de começar a emitir chunks.
      assertPiiExternalConsent(getTenantId());
      await ensureCheckpointerReady();
      const stream = await swarmApp.stream(
        { messages: [new HumanMessage(mission)], mission, leadId: leadId || '' },
        config,
      );

      for await (const chunk of stream) {
        const nodeName = Object.keys(chunk)[0];
        const nodeData = chunk[nodeName as keyof typeof chunk] as
          | { messages?: BaseMessage[] }
          | undefined;
        const msgs = nodeData?.messages;
        if (msgs && msgs.length > 0) {
          const lastMsg = msgs[msgs.length - 1] as AIMessage;
          const event =
            (lastMsg.additional_kwargs?.swarmEvent as SwarmEvent | undefined) ??
            buildEvent('agent_result', 'supervisor', String(lastMsg.content ?? ''), 0);
          onChunk(event);
        }
      }
    } catch (error: any) {
      logger.error({ err: error, sessionId: sid }, 'Swarm stream execution failed');
      throw error;
    }
  }

  /**
   * Executa uma missão especializada usando a Suíte Comercial V3.1 (19 especialistas, 463 habilidades).
   * Integração de envelope seguro V3.1 e garantia de isolamento multi-tenant fail-closed.
   */
  async executeCommercialV3Specialist(
    agentId: import('../commercial-v3/contracts/commercialAgentV3.types.js').CommercialV3AgentId,
    mission: string,
    options?: {
      organizationId?: string;
      playbookId?: string;
      contextPayload?: Record<string, unknown>;
      sessionId?: string;
    },
  ) {
    const { commercialAgentV3Orchestrator } = await import(
      '../commercial-v3/services/commercialAgentV3Orchestrator.service.js'
    );
    const orgId = options?.organizationId || getTenantId() || 'org_default';
    assertPiiExternalConsent(orgId);

    return commercialAgentV3Orchestrator.dispatchMission({
      agentId,
      organizationId: orgId,
      mission,
    });
  }
}

export const SupervisorAgent = SwarmOrchestrator;
export type SupervisorAgent = SwarmOrchestrator;
