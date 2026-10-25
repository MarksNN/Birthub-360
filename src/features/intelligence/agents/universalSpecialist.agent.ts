import { BaseAgent } from './base.agent.js';
import {
  appendLearnedStyle,
  SWARM_IDENTITY,
  SWARM_OUTPUT_CONTRACT,
  SWARM_UNTRUSTED_CONTENT_GUARD,
} from './swarm.constants.js';
import {
  getAllUniversalTools,
  type UniversalToolCategory,
} from '../tools/capabilityToolRegistry.js';

export interface UniversalSpecialistOptions {
  agentCode?: string;
  agentTitle?: string;
  customSystemPrompt?: string | null;
  categories?: UniversalToolCategory[];
  toolNames?: string[];
  temperature?: number;
}

/**
 * Agente Autônomo Universal Reutilizável.
 * Permite que qualquer agente individual da plataforma (incluindo os 379 agentes do catálogo de cargos
 * ou agentes customizados) execute missões com acesso direto a todo o catálogo de ferramentas universais:
 * - Prospecção e Enriquecimento (Apollo, Google Places, BrasilAPI, Hunter)
 * - E-mail Multi-Provedor (Outlook/M365, Gmail, IMAP/SMTP) + Classificação de Oportunidades
 * - Mensageria (WhatsApp, Telegram, Teams, Slack, SMS)
 * - Tarefas e Notas (Trello, Monday.com, Bitrix24, ClickUp, Asana, Notion, CRM)
 * - Reuniões e Atas IA (Google Meet, Teams, Zoom, Calendly)
 * - Suite Office & Google Workspace (Word/Docs, Excel/Sheets .xlsx, PowerPoint/Slides)
 * - Notificações Multi-Device (Pop-up/Toast, Push Celular, Smartwatch/Relógio, SMS)
 * - Fábrica de Scripts e Prompts Reutilizáveis
 */
export class UniversalSpecialistAgent extends BaseAgent {
  protected agentType: string;
  protected temperature: number;
  private readonly agentTitle: string;
  private readonly customSystemPrompt: string | null;
  private readonly categories?: UniversalToolCategory[];
  private readonly toolNames?: string[];

  constructor(options: UniversalSpecialistOptions = {}) {
    super();
    this.agentType = options.agentCode
      ? `AGENT_${options.agentCode.toUpperCase()}`
      : 'UNIVERSAL_SPECIALIST';
    this.agentTitle = options.agentTitle || 'Especialista Autônomo Universal';
    this.customSystemPrompt = options.customSystemPrompt ?? null;
    this.categories = options.categories;
    this.toolNames = options.toolNames;
    this.temperature = options.temperature ?? 0.35;
  }

  protected buildSystemPrompt(learnedStyle: string | null): string {
    const personaBlock = this.customSystemPrompt
      ? `<persona_especialista>\n${this.customSystemPrompt}\n</persona_especialista>`
      : `Você é o ${this.agentTitle} da Birth Hub 360 — um agente autônomo equipado com ferramentas corporativas multi-plataforma.`;

    const base = `${SWARM_IDENTITY} ${personaBlock}

<capacidades_ecossistema>
Você possui acesso direto às ferramentas universais da organização:
1. Prospecção & Enriquecimento: 'company_discovery', 'promote_and_enrich_lead', 'enrich_lead_data', 'lookup_cnpj_receita', 'web_market_research'.
2. Inteligência de E-mail Multi-Provedor (Outlook/M365, Gmail, Caixa Unificada IMAP): 'universal_email_intelligence'.
3. Mensageria Omnichannel (WhatsApp, Telegram, Microsoft Teams, Slack, SMS): 'universal_messaging_hub'.
4. Tarefas, Projetos & Notas (Trello, Monday.com, Bitrix24, ClickUp, Asana, Notion, CRM): 'universal_tasks_and_notes'.
5. Reuniões & Calendário (Google Meet, Microsoft Teams, Zoom, Calendly, Síntese de Transcrição): 'universal_meetings_hub'.
6. Suite Office & Google Workspace (Word/Docs, Excel/Sheets .xlsx, PowerPoint/Slides): 'universal_office_suite'.
7. Notificações Multi-Dispositivo (Pop-up na Tela, Push no Celular, Relógio/Smartwatch, SMS): 'universal_notifications_dispatcher'.
8. Fábrica de Scripts Comerciais & Prompts Reutilizáveis: 'script_and_prompt_factory', 'generate_cold_email_copy'.
9. Sincronização Multi-CRM & ERP (Bitrix24, HubSpot, Pipedrive, RD Station, Monday, Omie): 'sync_external_crm'.
</capacidades_ecossistema>

<diretrizes_execucao>
1. Priorize SEMPRE invocar as ferramentas reais antes de formular sua síntese.
2. Nunca invente IDs, métricas ou confirmações de envio externo — reporte exatamente o que as ferramentas retornarem.
3. Entregue a resposta final bem estruturada em Markdown executivo, destacando o que foi executado/gerado em cada plataforma.
</diretrizes_execucao>

${SWARM_OUTPUT_CONTRACT}

${SWARM_UNTRUSTED_CONTENT_GUARD}`;

    return appendLearnedStyle(base, learnedStyle);
  }

  protected buildHumanMessage(input: string): string {
    return `Missão para execução autônoma:\n${input}`;
  }

  override async run(inputData: string, sessionId?: string) {
    const selectedTools = getAllUniversalTools({
      categories: this.categories,
      toolNames: this.toolNames,
    });

    const result = await this.runWithTools(inputData, selectedTools, sessionId);
    return {
      output: result.output as string | undefined,
      error: result.error,
      sessionId: result.sessionId,
      toolsCount: selectedTools.length,
    };
  }
}
