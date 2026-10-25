import type { DynamicStructuredTool } from '@langchain/core/tools';
import {
  churnAnalysisTool,
  competitorAnalysisTool,
  crossSellTool,
  proposalTool,
} from './advancedCommercialTools.js';
import { getObjectionBattlecardTool } from './battlecardTool.js';
import { cadenceTool, forecastTool, pipelineManagementTool } from './commercialTools.js';
import { companyDiscoveryTool } from './companyDiscoveryTool.js';
import { inspectContractReadinessTool } from './contractInspectionTool.js';
import { copywriterTool } from './copywriterTool.js';
import { getLeadContextTool, searchLeadsTool, updateLeadQualificationTool } from './crmTools.js';
import { checkDealHealthTool } from './dealHealthTool.js';
import { cnpjLookupTool, multiCrmSyncTool, slackNotificationTool } from './integrationTools.js';
import { leadEnrichmentTool } from './leadEnrichmentTool.js';
import { marketResearchTool } from './marketResearchTool.js';
import { searchPlaybookTool } from './playbookTool.js';
import { promoteAndEnrichTool } from './promoteAndEnrichTool.js';
import { scriptAndPromptTool } from './scriptAndPromptTool.js';
import { summarizeLeadTool } from './summarizeLeadTool.js';
import { universalEmailTool } from './universalEmailTool.js';
import { universalMeetingsTool } from './universalMeetingsTool.js';
import { universalMessagingTool } from './universalMessagingTool.js';
import { universalNotificationsTool } from './universalNotificationsTool.js';
import { universalOfficeDocsTool } from './universalOfficeDocsTool.js';
import { universalTasksAndNotesTool } from './universalTasksAndNotesTool.js';

export type SwarmRole = 'bdr' | 'sdr' | 'closer' | 'crm' | 'ops' | 'universal';

export type UniversalToolCategory =
  | 'prospecting_enrichment'
  | 'email_intelligence'
  | 'messaging_omnichannel'
  | 'tasks_projects_notes'
  | 'meetings_calendar'
  | 'office_docs_sheets_slides'
  | 'multi_device_notifications'
  | 'scripts_prompts_enablement'
  | 'crm_erp_sync'
  | 'pipeline_revops';

export interface UniversalToolDescriptor {
  name: string;
  category: UniversalToolCategory;
  label: string;
  description: string;
  supportedPlatforms: string[];
  tool: DynamicStructuredTool;
}

const UNIVERSAL_TOOL_CATALOG: UniversalToolDescriptor[] = [
  {
    name: companyDiscoveryTool.name,
    category: 'prospecting_enrichment',
    label: 'Descoberta de Empresas B2B',
    description: companyDiscoveryTool.description,
    supportedPlatforms: ['Apollo.io', 'Google Places', 'BrasilAPI', 'Receita Federal'],
    tool: companyDiscoveryTool,
  },
  {
    name: promoteAndEnrichTool.name,
    category: 'prospecting_enrichment',
    label: 'Promoção ao CRM + Enriquecimento de Decisores',
    description: promoteAndEnrichTool.description,
    supportedPlatforms: ['CRM Interno', 'Receita Federal / QSA', 'Apollo.io', 'Hunter.io'],
    tool: promoteAndEnrichTool,
  },
  {
    name: leadEnrichmentTool.name,
    category: 'prospecting_enrichment',
    label: 'Enriquecimento Profundo de Lead/Empresa',
    description: leadEnrichmentTool.description,
    supportedPlatforms: ['BrasilAPI', 'CNAE / Receita Federal', 'Inteligência de Mercado IA'],
    tool: leadEnrichmentTool,
  },
  {
    name: cnpjLookupTool.name,
    category: 'prospecting_enrichment',
    label: 'Consulta Cadastral CNPJ (Receita Federal)',
    description: cnpjLookupTool.description,
    supportedPlatforms: ['BrasilAPI', 'Receita Federal'],
    tool: cnpjLookupTool,
  },
  {
    name: marketResearchTool.name,
    category: 'prospecting_enrichment',
    label: 'Pesquisa de Mercado e Sinais Web',
    description: marketResearchTool.description,
    supportedPlatforms: ['Tavily', 'Serper', 'Brave Search', 'Exa'],
    tool: marketResearchTool,
  },
  {
    name: universalEmailTool.name,
    category: 'email_intelligence',
    label: 'Inteligência Universal de E-mails & Oportunidades',
    description: universalEmailTool.description,
    supportedPlatforms: [
      'Caixa Unificada IMAP/SMTP/Webhooks',
      'Microsoft 365 / Outlook Graph API',
      'Google Workspace / Gmail API',
      'Zoho / SendGrid / Postmark / Mailgun',
    ],
    tool: universalEmailTool,
  },
  {
    name: universalMessagingTool.name,
    category: 'messaging_omnichannel',
    label: 'Hub Omnichannel de Mensageria & Chat',
    description: universalMessagingTool.description,
    supportedPlatforms: [
      'WhatsApp Business (Z-API / Evolution / Meta Cloud)',
      'Telegram Bot API',
      'Microsoft Teams',
      'Slack',
      'SMS / Mensagem de Texto (Twilio / Zenvia / Webhook)',
    ],
    tool: universalMessagingTool,
  },
  {
    name: universalTasksAndNotesTool.name,
    category: 'tasks_projects_notes',
    label: 'Gestão Universal de Tarefas, Projetos e Notas',
    description: universalTasksAndNotesTool.description,
    supportedPlatforms: [
      'Trello',
      'Monday.com',
      'Bitrix24 Tasks',
      'ClickUp',
      'Asana',
      'Notion',
      'CRM Interno (Activity & Note)',
    ],
    tool: universalTasksAndNotesTool,
  },
  {
    name: universalMeetingsTool.name,
    category: 'meetings_calendar',
    label: 'Hub Universal de Reuniões, Agendamento e Atas IA',
    description: universalMeetingsTool.description,
    supportedPlatforms: [
      'Google Calendar / Google Meet',
      'Microsoft Teams Meetings',
      'Zoom',
      'Calendly',
      'PublicBookingLink Nativo',
    ],
    tool: universalMeetingsTool,
  },
  {
    name: universalOfficeDocsTool.name,
    category: 'office_docs_sheets_slides',
    label: 'Suite Universal Office & Google Workspace',
    description: universalOfficeDocsTool.description,
    supportedPlatforms: [
      'Microsoft Word (.docx) / Google Docs',
      'Microsoft Excel (.xlsx) / Google Sheets / CSV',
      'Microsoft PowerPoint (.pptx) / Google Slides',
      'Base de Conhecimento Vetorial (RAG)',
    ],
    tool: universalOfficeDocsTool,
  },
  {
    name: universalNotificationsTool.name,
    category: 'multi_device_notifications',
    label: 'Dispatcher de Notificações Multi-Dispositivo',
    description: universalNotificationsTool.description,
    supportedPlatforms: [
      'Pop-up / Toast em Tempo Real (SSE)',
      'Push no Celular (Android Capacitor / iOS / FCM)',
      'Smartwatch / Relógio (Apple Watch / WearOS Glance)',
      'Alerta SMS de Urgência',
    ],
    tool: universalNotificationsTool,
  },
  {
    name: scriptAndPromptTool.name,
    category: 'scripts_prompts_enablement',
    label: 'Fábrica de Scripts Comerciais & Prompts Reutilizáveis',
    description: scriptAndPromptTool.description,
    supportedPlatforms: [
      'Cold Call Scripts (SPIN / Challenger)',
      'Sequências de WhatsApp / LinkedIn / E-mail',
      'Sales Pitches & Contorno de Objeções',
      'Biblioteca de Prompts (Prompt / CustomAiTool)',
    ],
    tool: scriptAndPromptTool,
  },
  {
    name: copywriterTool.name,
    category: 'scripts_prompts_enablement',
    label: 'Copywriter B2B com Proteção LGPD',
    description: copywriterTool.description,
    supportedPlatforms: ['E-mail Outbound', 'Notas do CRM'],
    tool: copywriterTool,
  },
  {
    name: multiCrmSyncTool.name,
    category: 'crm_erp_sync',
    label: 'Sincronizador Multi-CRM & ERP',
    description: multiCrmSyncTool.description,
    supportedPlatforms: [
      'Bitrix24',
      'HubSpot',
      'Pipedrive',
      'RD Station CRM',
      'Monday.com CRM',
      'Omie ERP',
      'CRM Interno',
    ],
    tool: multiCrmSyncTool,
  },
  {
    name: pipelineManagementTool.name,
    category: 'pipeline_revops',
    label: 'Diagnóstico e Gestão de Pipeline',
    description: pipelineManagementTool.description,
    supportedPlatforms: ['CRM Interno', 'RevOps Analytics'],
    tool: pipelineManagementTool,
  },
  {
    name: forecastTool.name,
    category: 'pipeline_revops',
    label: 'Forecast Ponderado de Receita',
    description: forecastTool.description,
    supportedPlatforms: ['CRM Interno', 'BI Comercial'],
    tool: forecastTool,
  },
  {
    name: cadenceTool.name,
    category: 'pipeline_revops',
    label: 'Orquestrador de Cadência Multicanal',
    description: cadenceTool.description,
    supportedPlatforms: ['Cadências Comerciais', 'Fila de Aprovação Humana (AIPendingAction)'],
    tool: cadenceTool,
  },
  {
    name: proposalTool.name,
    category: 'pipeline_revops',
    label: 'Gerador Inteligente de Propostas Comerciais',
    description: proposalTool.description,
    supportedPlatforms: ['ProposalAiService', 'CRM Interno'],
    tool: proposalTool,
  },
  {
    name: competitorAnalysisTool.name,
    category: 'pipeline_revops',
    label: 'Inteligência Competitiva & Battlecards',
    description: competitorAnalysisTool.description,
    supportedPlatforms: ['Matriz de Objeções', 'Battlecards IA'],
    tool: competitorAnalysisTool,
  },
  {
    name: crossSellTool.name,
    category: 'pipeline_revops',
    label: 'Mapeamento de Cross-Sell & Upsell',
    description: crossSellTool.description,
    supportedPlatforms: ['CRM Interno', ' Expansão de Contas'],
    tool: crossSellTool,
  },
  {
    name: churnAnalysisTool.name,
    category: 'pipeline_revops',
    label: 'Análise Preditiva de Risco de Churn',
    description: churnAnalysisTool.description,
    supportedPlatforms: ['Deal Health Snapshots', 'Retenção de Clientes'],
    tool: churnAnalysisTool,
  },
  {
    name: searchLeadsTool.name,
    category: 'crm_erp_sync',
    label: 'Busca de Leads no CRM',
    description: searchLeadsTool.description,
    supportedPlatforms: ['CRM Interno'],
    tool: searchLeadsTool,
  },
  {
    name: getLeadContextTool.name,
    category: 'crm_erp_sync',
    label: 'Contexto Completo de Lead',
    description: getLeadContextTool.description,
    supportedPlatforms: ['CRM Interno'],
    tool: getLeadContextTool,
  },
  {
    name: summarizeLeadTool.name,
    category: 'crm_erp_sync',
    label: 'Resumo Histórico de Interações do Lead',
    description: summarizeLeadTool.description,
    supportedPlatforms: ['CRM Interno'],
    tool: summarizeLeadTool,
  },
  {
    name: checkDealHealthTool.name,
    category: 'pipeline_revops',
    label: 'Health Check de Negociação',
    description: checkDealHealthTool.description,
    supportedPlatforms: ['Copiloto Deal Health'],
    tool: checkDealHealthTool,
  },
  {
    name: inspectContractReadinessTool.name,
    category: 'pipeline_revops',
    label: 'Inspeção de Prontidão Contratual',
    description: inspectContractReadinessTool.description,
    supportedPlatforms: ['CLM / Contratos'],
    tool: inspectContractReadinessTool,
  },
  {
    name: searchPlaybookTool.name,
    category: 'scripts_prompts_enablement',
    label: 'Busca Semântica no Playbook e Base de Conhecimento',
    description: searchPlaybookTool.description,
    supportedPlatforms: ['RAG Playbook', 'Base de Conhecimento'],
    tool: searchPlaybookTool,
  },
  {
    name: getObjectionBattlecardTool.name,
    category: 'scripts_prompts_enablement',
    label: 'Battlecard de Contorno de Objeções',
    description: getObjectionBattlecardTool.description,
    supportedPlatforms: ['Matriz de Objeções'],
    tool: getObjectionBattlecardTool,
  },
  {
    name: updateLeadQualificationTool.name,
    category: 'crm_erp_sync',
    label: 'Atualização de Qualificação e Score no CRM',
    description: updateLeadQualificationTool.description,
    supportedPlatforms: ['CRM Interno'],
    tool: updateLeadQualificationTool,
  },
];

/**
 * Retorna os metadados completos do catálogo de ferramentas universais.
 */
export function getUniversalToolCatalog() {
  return UNIVERSAL_TOOL_CATALOG.map(({ tool, ...meta }) => meta);
}

/**
 * Retorna todas as ferramentas universais instanciadas, opcionalmente filtradas por categorias ou nomes.
 */
export function getAllUniversalTools(options?: {
  categories?: UniversalToolCategory[];
  toolNames?: string[];
}): DynamicStructuredTool[] {
  let list = UNIVERSAL_TOOL_CATALOG;
  if (options?.categories && options.categories.length > 0) {
    const allowed = new Set(options.categories);
    list = list.filter((item) => allowed.has(item.category));
  }
  if (options?.toolNames && options.toolNames.length > 0) {
    const allowedNames = new Set(options.toolNames);
    list = list.filter((item) => allowedNames.has(item.name));
  }
  return list.map((item) => item.tool);
}

/**
 * Retorna o kit de ferramentas adequado para cada especialidade do Swarm,
 * mantendo as ferramentas universais acessíveis quando necessário.
 */
export function getToolsForSwarmRole(role: SwarmRole): DynamicStructuredTool[] {
  switch (role) {
    case 'bdr':
      return [
        companyDiscoveryTool,
        promoteAndEnrichTool,
        leadEnrichmentTool,
        cnpjLookupTool,
        universalEmailTool,
        universalMessagingTool,
        scriptAndPromptTool,
        universalTasksAndNotesTool,
        universalNotificationsTool,
      ];
    case 'sdr':
      return [
        leadEnrichmentTool,
        promoteAndEnrichTool,
        copywriterTool,
        scriptAndPromptTool,
        cadenceTool,
        universalEmailTool,
        universalMessagingTool,
        universalMeetingsTool,
        universalTasksAndNotesTool,
        universalNotificationsTool,
      ];
    case 'closer':
      return [
        proposalTool,
        competitorAnalysisTool,
        universalEmailTool,
        universalMeetingsTool,
        universalOfficeDocsTool,
        universalMessagingTool,
        scriptAndPromptTool,
        universalTasksAndNotesTool,
        universalNotificationsTool,
        slackNotificationTool,
      ];
    case 'crm':
      return [
        pipelineManagementTool,
        forecastTool,
        crossSellTool,
        churnAnalysisTool,
        multiCrmSyncTool,
        universalTasksAndNotesTool,
        universalOfficeDocsTool,
        universalNotificationsTool,
      ];
    case 'ops':
      return [
        cnpjLookupTool,
        multiCrmSyncTool,
        slackNotificationTool,
        universalMessagingTool,
        universalTasksAndNotesTool,
        universalMeetingsTool,
        universalOfficeDocsTool,
        universalNotificationsTool,
      ];
    case 'universal':
    default:
      return getAllUniversalTools();
  }
}
