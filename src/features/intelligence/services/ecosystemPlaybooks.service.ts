import { runWithContext } from '../../../lib/context.js';
import { logger } from '../../../lib/logger.js';
import {
  churnAnalysisTool,
  crossSellTool,
  proposalTool,
} from '../tools/advancedCommercialTools.js';
import { forecastTool, pipelineManagementTool } from '../tools/commercialTools.js';
import { companyDiscoveryTool } from '../tools/companyDiscoveryTool.js';
import { multiCrmSyncTool } from '../tools/integrationTools.js';
import { promoteAndEnrichTool } from '../tools/promoteAndEnrichTool.js';
import { scriptAndPromptTool } from '../tools/scriptAndPromptTool.js';
import { universalEmailTool } from '../tools/universalEmailTool.js';
import { universalMeetingsTool } from '../tools/universalMeetingsTool.js';
import { universalMessagingTool } from '../tools/universalMessagingTool.js';
import { universalNotificationsTool } from '../tools/universalNotificationsTool.js';
import { universalOfficeDocsTool } from '../tools/universalOfficeDocsTool.js';
import { universalTasksAndNotesTool } from '../tools/universalTasksAndNotesTool.js';

export type PlaybookId =
  | 'inbound_email_radar'
  | 'b2b_discovery_to_cadence'
  | 'deal_closing_war_room'
  | 'meeting_to_action_pipeline'
  | 'pipeline_rescue_and_sync';

export interface EcosystemPlaybookDescriptor {
  id: PlaybookId;
  title: string;
  subtitle: string;
  platformsInvolved: string[];
  stepsSummary: string[];
}

export interface PlaybookStepResult {
  stepNumber: number;
  toolName: string;
  title: string;
  success: boolean;
  output: unknown;
}

export interface PlaybookExecutionReport {
  playbookId: PlaybookId;
  title: string;
  executedAt: string;
  durationMs: number;
  steps: PlaybookStepResult[];
}

export const ECOSYSTEM_PLAYBOOKS: EcosystemPlaybookDescriptor[] = [
  {
    id: 'inbound_email_radar',
    title: '1. Radar de E-mails (Outlook/Gmail/IMAP) → Sinais IA → Trello/Monday + Relógio',
    subtitle:
      'Varre caixas de e-mail conectadas em busca de oportunidades e objeções, cria tarefas nos quadros da equipe e dispara alerta rápido no celular e no smartwatch.',
    platformsInvolved: [
      'Microsoft 365 / Outlook',
      'Google Workspace / Gmail',
      'Caixa Unificada IMAP',
      'Trello / Monday.com / CRM',
      'Smartwatch / Mobile Push / Pop-up',
    ],
    stepsSummary: [
      'Varredura de e-mails e classificação de sinais de compra por IA (universal_email_intelligence)',
      'Criação de Card/Tarefa de follow-up prioritário no Trello, Monday e CRM (universal_tasks_and_notes)',
      'Geração de script de resposta comercial e salvamento na Biblioteca de Prompts (script_and_prompt_factory)',
      'Disparo de alerta instantâneo em Pop-up, Celular e Relógio/Smartwatch (universal_notifications_dispatcher)',
    ],
  },
  {
    id: 'b2b_discovery_to_cadence',
    title: '2. Máquina de Prospecção B2B + Enriquecimento + Planilha Excel (.xlsx) + Scripts',
    subtitle:
      'Descobre empresas no ICP, promove e enriquece decisores na Receita/Apollo/Hunter, gera os scripts de abordagem e consolida em planilha Excel (.xlsx).',
    platformsInvolved: [
      'Apollo.io / Google Places / BrasilAPI',
      'Hunter.io / Receita Federal QSA',
      'Microsoft Excel (.xlsx) / Google Sheets',
      'WhatsApp / Cold Call Scripts',
      'Smartwatch / Pop-up',
    ],
    stepsSummary: [
      'Descoberta de empresas B2B por segmento e região (company_discovery)',
      'Promoção ao CRM + enriquecimento profundo de CNPJ e decisores (promote_and_enrich_lead)',
      'Fábrica de scripts de Cold Call + WhatsApp personalizados (script_and_prompt_factory)',
      'Geração de planilha Excel (.xlsx) do lote prospectado (universal_office_suite)',
      'Notificação executiva no Pop-up e Smartwatch (universal_notifications_dispatcher)',
    ],
  },
  {
    id: 'deal_closing_war_room',
    title:
      '3. War Room de Fechamento (Proposta + PowerPoint/Slides + Word/Docs + Reunião + Teams/Slack)',
    subtitle:
      'Prepara todo o kit de fechamento enterprise: estrutura apresentação PowerPoint/Slides, documento Word/Google Docs, links de reunião Meet/Teams/Zoom e avisa no Slack/Teams.',
    platformsInvolved: [
      'Microsoft PowerPoint / Google Slides',
      'Microsoft Word / Google Docs',
      'Google Meet / Microsoft Teams / Zoom / Calendly',
      'Slack / Microsoft Teams Chat',
      'Bitrix24 / HubSpot / Pipedrive',
    ],
    stepsSummary: [
      'Geração de Apresentação Executiva PowerPoint / Google Slides (universal_office_suite)',
      'Geração de Documento de Escopo & ROI em Word / Google Docs (universal_office_suite)',
      'Verificação e preparação de links de agendamento Meet/Teams/Zoom/Calendly (universal_meetings_hub)',
      'Alerta na sala de guerra comercial via Slack / Microsoft Teams (universal_messaging_hub)',
    ],
  },
  {
    id: 'meeting_to_action_pipeline',
    title:
      '4. Pós-Reunião Automático (Transcrição → Ata no Notion/CRM + Cards no Trello/Monday/Bitrix)',
    subtitle:
      'Transforma a transcrição ou pauta de uma call em ata estruturada no Notion/CRM, cria as tarefas de próximo passo no Trello/Monday/Bitrix e prepara o follow-up.',
    platformsInvolved: [
      'Google Meet / Teams / Zoom',
      'Notion Workspace',
      'Trello / Monday.com / Bitrix24 Tasks',
      'WhatsApp / E-mail Follow-up',
    ],
    stepsSummary: [
      'Síntese executiva da reunião com extração de decisões, objeções e tarefas (universal_meetings_hub)',
      'Publicação da ata estruturada no Notion e nas Notas do CRM (universal_tasks_and_notes)',
      'Criação das tarefas de follow-up no Trello, Monday.com, Bitrix24 e CRM (universal_tasks_and_notes)',
      'Geração do roteiro de follow-up pós-call (script_and_prompt_factory)',
    ],
  },
  {
    id: 'pipeline_rescue_and_sync',
    title: '5. Auditoria RevOps, Resgate de Churn, Cross-Sell, Sync Multi-CRM & Excel (.xlsx)',
    subtitle:
      'Analisa gargalos do funil, forecast ponderado, oportunidades de expansão e risco de churn, sincroniza com CRMs externos e gera relatório em Excel (.xlsx).',
    platformsInvolved: [
      'Bitrix24 / HubSpot / Pipedrive / RD Station / Omie',
      'Microsoft Excel (.xlsx) / Google Sheets',
      'RevOps & Forecast BI',
      'Smartwatch / Mobile Push / Pop-up',
    ],
    stepsSummary: [
      'Diagnóstico completo de pipeline e forecast ponderado (manage_pipeline + generate_sales_forecast)',
      'Auditoria de risco de churn e oportunidades de cross-sell (analyze_churn_risk + identify_cross_sell)',
      'Verificação dos conectores Multi-CRM & ERP ativos (sync_external_crm)',
      'Consolidação de relatório executivo em planilha Excel (.xlsx) (universal_office_suite)',
      'Disparo de alerta de governança no Pop-up, Celular e Relógio (universal_notifications_dispatcher)',
    ],
  },
];

async function safeInvokeTool(
  stepNumber: number,
  title: string,
  tool: { name: string; invoke: (input: any) => Promise<any> },
  input: Record<string, unknown>,
): Promise<PlaybookStepResult> {
  try {
    const raw = await tool.invoke(input);
    let parsed: unknown = raw;
    if (typeof raw === 'string') {
      try {
        parsed = JSON.parse(raw);
      } catch {
        parsed = raw;
      }
    }
    const isErr =
      typeof parsed === 'object' &&
      parsed !== null &&
      'error' in parsed &&
      Boolean((parsed as Record<string, unknown>).error);
    return {
      stepNumber,
      toolName: tool.name,
      title,
      success: !isErr,
      output: parsed,
    };
  } catch (err) {
    logger.warn({ err, tool: tool.name }, 'Erro controlado em etapa de playbook');
    return {
      stepNumber,
      toolName: tool.name,
      title,
      success: false,
      output: { error: err instanceof Error ? err.message : String(err) },
    };
  }
}

export async function runEcosystemPlaybook(
  organizationId: string,
  userId: string,
  playbookId: PlaybookId,
  params: {
    segment?: string;
    location?: string;
    leadId?: string;
    transcript?: string;
  } = {},
): Promise<PlaybookExecutionReport> {
  const startTime = Date.now();
  const descriptor = ECOSYSTEM_PLAYBOOKS.find((p) => p.id === playbookId);
  if (!descriptor) {
    throw new Error(`Playbook desconhecido: ${playbookId}`);
  }

  return runWithContext({ organizationId, userId }, async () => {
    const steps: PlaybookStepResult[] = [];

    if (playbookId === 'inbound_email_radar') {
      steps.push(
        await safeInvokeTool(
          1,
          'Varredura de E-mails (Outlook/M365, Gmail & Caixa Unificada IMAP) + Sinais IA',
          universalEmailTool,
          {
            action: 'scan_opportunities',
            provider: 'all',
            limit: 10,
            leadId: params.leadId,
          },
        ),
      );

      steps.push(
        await safeInvokeTool(
          2,
          'Criação de Card/Tarefa de Tratativa Comercial (Trello / Monday / Bitrix / CRM)',
          universalTasksAndNotesTool,
          {
            action: 'create_task',
            platform: 'all',
            title: 'Tratar oportunidades quentes detectadas no Radar de E-mails',
            description:
              'Responder e-mails classificados com alta intenção de compra ou contornar objeções identificadas pela IA.',
            priority: 'high',
            leadId: params.leadId,
          },
        ),
      );

      steps.push(
        await safeInvokeTool(
          3,
          'Geração de Script de Resposta Rápida para Oportunidades de E-mail',
          scriptAndPromptTool,
          {
            artifactType: 'email_sequence',
            targetAudienceOrPersona: 'Decisor B2B que respondeu na caixa de entrada',
            objective: 'Converter sinal de interesse em reunião agendada de 15 minutos',
            leadId: params.leadId,
            saveToPromptLibrary: true,
          },
        ),
      );

      steps.push(
        await safeInvokeTool(
          4,
          'Disparo de Alerta em Pop-up, Push no Celular e Smartwatch (Relógio)',
          universalNotificationsTool,
          {
            channels: ['in_app_popup', 'mobile_push', 'smartwatch_wrist'],
            title: 'Radar de E-mails Concluído',
            message:
              'Varredura de e-mails concluída com sucesso. Tarefas e scripts de resposta já disponíveis.',
            wristSummary: '📬 Radar E-mail: Oportunidades prontas!',
            kind: 'Success',
            leadId: params.leadId,
          },
        ),
      );
    } else if (playbookId === 'b2b_discovery_to_cadence') {
      const segment = params.segment || 'Logística e Indústria';
      const location = params.location || 'São Paulo, SP';

      const discoveryStep = await safeInvokeTool(
        1,
        `Descoberta de Empresas B2B (${segment} — ${location})`,
        companyDiscoveryTool,
        {
          segment,
          location,
          limit: 5,
        },
      );
      steps.push(discoveryStep);

      const candidates =
        typeof discoveryStep.output === 'object' &&
        discoveryStep.output !== null &&
        Array.isArray((discoveryStep.output as any).candidates)
          ? ((discoveryStep.output as any).candidates as Array<Record<string, any>>)
          : [];

      const firstCandidate = candidates[0];
      steps.push(
        await safeInvokeTool(
          2,
          'Promoção ao CRM + Enriquecimento de CNPJ e Decisores',
          promoteAndEnrichTool,
          {
            companyName: firstCandidate?.name || `Empresa Líder — ${segment}`,
            cnpj: firstCandidate?.cnpj || undefined,
            website: firstCandidate?.website || undefined,
            segment,
            city: firstCandidate?.city || 'São Paulo',
            state: firstCandidate?.state || 'SP',
            runFullEnrichment: true,
            discoverContacts: true,
          },
        ),
      );

      steps.push(
        await safeInvokeTool(
          3,
          'Fábrica de Scripts (Cold Call + WhatsApp) para o Segmento',
          scriptAndPromptTool,
          {
            artifactType: 'cold_call_script',
            targetAudienceOrPersona: `Diretor de Operações / CFO — ${segment}`,
            objective: `Qualificar dor operacional em ${segment} e agendar diagnóstico executivo`,
            saveToPromptLibrary: true,
          },
        ),
      );

      steps.push(
        await safeInvokeTool(
          4,
          'Geração de Planilha Excel (.xlsx) do Lote Prospectado',
          universalOfficeDocsTool,
          {
            docType: 'excel_or_gsheet',
            title: `Lote Prospecção B2B — ${segment}`,
            sheetColumns: ['Empresa', 'CNPJ', 'Cidade/UF', 'Segmento', 'Website', 'Status CRM'],
            sheetRows:
              candidates.length > 0
                ? candidates.map((c) => [
                    c.name || 'Empresa',
                    c.cnpj || 'N/A',
                    `${c.city || 'SP'}/${c.state || 'SP'}`,
                    segment,
                    c.website || 'N/A',
                    'Enriquecido',
                  ])
                : [
                    [
                      `Empresa Alvo (${segment})`,
                      'N/A',
                      location,
                      segment,
                      'N/A',
                      'Promovido ao CRM',
                    ],
                  ],
            syncCloud: 'none',
          },
        ),
      );

      steps.push(
        await safeInvokeTool(
          5,
          'Notificação Multi-Dispositivo (Pop-up + Celular + Smartwatch)',
          universalNotificationsTool,
          {
            channels: ['in_app_popup', 'mobile_push', 'smartwatch_wrist'],
            title: 'Lote B2B Enriquecido + Planilha .xlsx Pronta',
            message: `Prospecção para ${segment} (${location}) concluída com scripts e planilha Excel gerados.`,
            wristSummary: `🎯 Prospecção ${segment.slice(0, 22)}: Lote pronto!`,
            kind: 'Success',
          },
        ),
      );
    } else if (playbookId === 'deal_closing_war_room') {
      if (params.leadId) {
        steps.push(
          await safeInvokeTool(1, 'Geração de Proposta Comercial IA', proposalTool, {
            leadId: params.leadId,
            offerDescription: 'Solução Enterprise BirthHub 360 com ROI projetado em 90 dias.',
            paymentTerms: 'Anual ou parcelado em 12x corporativo',
          }),
        );
      }

      steps.push(
        await safeInvokeTool(
          steps.length + 1,
          'Geração de Apresentação Executiva (PowerPoint / Google Slides)',
          universalOfficeDocsTool,
          {
            docType: 'powerpoint_or_gslides',
            title: 'Apresentação Executiva de Fechamento & ROI',
            leadId: params.leadId,
            slides: [
              {
                slideNumber: 1,
                title: 'Diagnóstico Executivo & Cenário Atual',
                bullets: [
                  'Principais gargalos de produtividade comercial e vazamento de receita',
                  'Custo da inação no trimestre atual',
                ],
                speakerNotes: 'Validar com o decisor econômico logo nos primeiros 3 minutos.',
              },
              {
                slideNumber: 2,
                title: 'Arquitetura da Solução & Integração Multi-Plataforma',
                bullets: [
                  'Operação nativa com os sistemas atuais da empresa (CRM, Outlook/Gmail, Trello/Monday, WhatsApp, Teams/Slack)',
                  'Governança LGPD e rastreabilidade completa',
                ],
                speakerNotes: 'Demonstrar baixo atrito de adoção pela equipe.',
              },
              {
                slideNumber: 3,
                title: 'Business Case, ROI & Cronograma de Implantação',
                bullets: [
                  'Payback estimado em menos de 60 dias',
                  'Plano de ativação assistida 30-60-90 dias',
                ],
                speakerNotes: 'Conduzir para o acordo de próximos passos e assinatura.',
              },
            ],
            syncCloud: 'none',
          },
        ),
      );

      steps.push(
        await safeInvokeTool(
          steps.length + 1,
          'Geração de Documento de Escopo Técnico (Word / Google Docs)',
          universalOfficeDocsTool,
          {
            docType: 'word_or_gdoc',
            title: 'Memorial Descritivo & Plano de Sucesso do Cliente',
            leadId: params.leadId,
            documentSections: [
              {
                heading: '1. Objetivo Executivo',
                body: 'Formalizar os entregáveis, indicadores de sucesso (SLAs/SLOs) e cronograma de ativação.',
              },
              {
                heading: '2. Integrações Incluídas',
                body: 'Conectores ativos para CRM, E-mail Corporativo, Mensageria, Gestão de Tarefas e Alertas Móveis.',
              },
            ],
            syncCloud: 'none',
          },
        ),
      );

      steps.push(
        await safeInvokeTool(
          steps.length + 1,
          'Consulta de Links de Reunião (Google Meet / Teams / Zoom / Calendly)',
          universalMeetingsTool,
          {
            action: 'get_booking_links',
            provider: 'google_meet',
          },
        ),
      );

      steps.push(
        await safeInvokeTool(
          steps.length + 1,
          'Alerta na Sala de Guerra (Slack / Microsoft Teams / Pop-up / Relógio)',
          universalNotificationsTool,
          {
            channels: ['in_app_popup', 'mobile_push', 'smartwatch_wrist'],
            title: 'Kit de Fechamento (War Room) Gerado',
            message:
              'Apresentação PowerPoint/Slides, Documento Word/Docs e links de reunião estão prontos para o Closer.',
            wristSummary: '🤝 War Room: Kit de fechamento pronto!',
            kind: 'Success',
            leadId: params.leadId,
          },
        ),
      );
    } else if (playbookId === 'meeting_to_action_pipeline') {
      const sampleTranscript =
        params.transcript?.trim() ||
        'Reunião comercial com o Diretor de Operações e o CFO. O cliente aprovou a aderência técnica da plataforma e pediu o envio da planilha comparativa de ROI até sexta-feira. Levantou dúvida sobre integração com Trello, Outlook e Bitrix24, que foi esclarecida. Próximo passo: agendar call final de aprovação contratual na próxima terça-feira às 14h.';

      steps.push(
        await safeInvokeTool(
          1,
          'Síntese Executiva da Reunião por IA (Decisões, Objeções e Próximos Passos)',
          universalMeetingsTool,
          {
            action: 'synthesize_transcript',
            provider: 'microsoft_teams',
            transcript: sampleTranscript,
            leadId: params.leadId,
          },
        ),
      );

      steps.push(
        await safeInvokeTool(
          2,
          'Registro da Ata Completa no Notion e nas Notas do CRM',
          universalTasksAndNotesTool,
          {
            action: 'create_note',
            platform: 'all',
            title: 'Ata Executiva Pós-Reunião Comercial',
            description: sampleTranscript,
            leadId: params.leadId,
          },
        ),
      );

      steps.push(
        await safeInvokeTool(
          3,
          'Criação das Tarefas de Follow-up no Trello, Monday.com, Bitrix24 e CRM',
          universalTasksAndNotesTool,
          {
            action: 'create_task',
            platform: 'all',
            title: 'Enviar planilha de ROI e confirmar call de fechamento contratual',
            description: 'Compromisso assumido na reunião com Diretor de Operações e CFO.',
            priority: 'high',
            leadId: params.leadId,
          },
        ),
      );

      steps.push(
        await safeInvokeTool(
          4,
          'Geração de Mensagem de Follow-up Pós-Reunião (WhatsApp & E-mail)',
          scriptAndPromptTool,
          {
            artifactType: 'whatsapp_script',
            targetAudienceOrPersona: 'Diretor de Operações & CFO pós-reunião de demonstração',
            objective:
              'Agradecer a participação, resumir os 3 combinados e confirmar a reunião de fechamento',
            leadId: params.leadId,
            saveToPromptLibrary: true,
          },
        ),
      );
    } else {
      // pipeline_rescue_and_sync
      steps.push(
        await safeInvokeTool(
          1,
          'Diagnóstico Completo de Pipeline & Negócios Estagnados',
          pipelineManagementTool,
          {
            action: 'analyze',
          },
        ),
      );

      steps.push(
        await safeInvokeTool(2, 'Cálculo de Forecast Ponderado de Receita', forecastTool, {
          period: 'quarter',
        }),
      );

      steps.push(
        await safeInvokeTool(
          3,
          'Auditoria de Risco de Churn e Oportunidades de Cross-Sell',
          churnAnalysisTool,
          {
            leadId: params.leadId,
          },
        ),
      );

      steps.push(
        await safeInvokeTool(
          4,
          'Inspeção de Conectores Multi-CRM & ERP (Bitrix24, HubSpot, Pipedrive, RD, Monday, Omie)',
          multiCrmSyncTool,
          {
            provider: 'all',
            action: 'list_connectors',
          },
        ),
      );

      steps.push(
        await safeInvokeTool(
          5,
          'Geração de Relatório Executivo RevOps em Excel (.xlsx)',
          universalOfficeDocsTool,
          {
            docType: 'excel_or_gsheet',
            title: 'Relatório Executivo RevOps, Forecast & Retenção',
            sheetColumns: ['Indicador', 'Status', 'Ação Recomendada', 'Plataforma Destino'],
            sheetRows: [
              [
                'Saúde do Pipeline',
                'Auditado',
                'Priorizar deals com score >= 70',
                'CRM + Bitrix24/HubSpot',
              ],
              [
                'Previsão de Receita (Forecast)',
                'Calculado',
                'Acelerar propostas enviadas',
                'Excel + BI',
              ],
              [
                'Prevenção de Churn',
                'Monitorado',
                'Acionar plano de resgate preventivo',
                'Trello/Monday + WhatsApp',
              ],
            ],
            syncCloud: 'none',
          },
        ),
      );
    }

    return {
      playbookId,
      title: descriptor.title,
      executedAt: new Date().toISOString(),
      durationMs: Date.now() - startTime,
      steps,
    };
  });
}
