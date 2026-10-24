import type { DynamicStructuredTool } from '@langchain/core/tools';
import {
  churnAnalysisTool,
  competitorAnalysisTool,
  crossSellTool,
  proposalTool,
} from './advancedCommercialTools.js';
import { cadenceTool, forecastTool, pipelineManagementTool } from './commercialTools.js';
import { companyDiscoveryTool } from './companyDiscoveryTool.js';
import { copywriterTool } from './copywriterTool.js';
import { cnpjLookupTool, multiCrmSyncTool, slackNotificationTool } from './integrationTools.js';
import { leadEnrichmentTool } from './leadEnrichmentTool.js';
import { promoteAndEnrichTool } from './promoteAndEnrichTool.js';
import { scriptAndPromptTool } from './scriptAndPromptTool.js';
import { universalEmailTool } from './universalEmailTool.js';
import { universalMeetingsTool } from './universalMeetingsTool.js';
import { universalMessagingTool } from './universalMessagingTool.js';
import { universalNotificationsTool } from './universalNotificationsTool.js';
import { universalOfficeDocsTool } from './universalOfficeDocsTool.js';
import { universalTasksAndNotesTool } from './universalTasksAndNotesTool.js';

export type SwarmRole = 'bdr' | 'sdr' | 'closer' | 'crm' | 'ops' | 'universal';

/**
 * Catálogo unificado de ferramentas reutilizáveis para o Swarm e para qualquer Agente Autônomo isolado.
 */
export function getAllUniversalTools(): DynamicStructuredTool[] {
  return [
    companyDiscoveryTool,
    promoteAndEnrichTool,
    leadEnrichmentTool,
    cnpjLookupTool,
    universalEmailTool,
    universalMessagingTool,
    universalTasksAndNotesTool,
    universalMeetingsTool,
    universalOfficeDocsTool,
    universalNotificationsTool,
    scriptAndPromptTool,
    copywriterTool,
    cadenceTool,
    pipelineManagementTool,
    forecastTool,
    proposalTool,
    competitorAnalysisTool,
    crossSellTool,
    churnAnalysisTool,
    multiCrmSyncTool,
    slackNotificationTool,
  ];
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
        universalOfficeDocsTool,
        universalNotificationsTool,
      ];
    case 'universal':
    default:
      return getAllUniversalTools();
  }
}
