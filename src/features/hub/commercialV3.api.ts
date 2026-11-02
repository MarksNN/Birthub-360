import { api } from '../../lib/api.js';
import type {
  CommercialAgentCatalogEntry,
  CommercialAgentResultV3,
  CommercialPlaybookMetadata,
  CommercialSkillDefinition,
  CommercialV3AgentId,
} from '../intelligence/commercial-v3/contracts/commercialAgentV3.types.js';

export interface CommercialV3AgentDetailResponse {
  agent: CommercialAgentCatalogEntry;
  skillsCount: number;
  skills: CommercialSkillDefinition[];
  playbooksCount: number;
  playbooks: CommercialPlaybookMetadata[];
  handoffs: Array<[string, string, string]>;
}

export interface BuildCommercialV3ContextInput {
  agentId: CommercialV3AgentId;
  skillIds?: string[];
}

export interface DispatchCommercialV3MissionInput {
  agentId: CommercialV3AgentId;
  mission: string;
  skillIds?: string[];
  correlationId?: string;
}

export interface EvaluateRedteamInput {
  agentId?: CommercialV3AgentId;
  all?: boolean;
}

export const commercialV3Api = {
  listAgents: () =>
    api.get<{ success: boolean; data: CommercialAgentCatalogEntry[] }>(
      '/api/agent/commercial-v3/agents',
    ),

  getAgent: (agentId: CommercialV3AgentId) =>
    api.get<{ success: boolean; data: CommercialV3AgentDetailResponse }>(
      `/api/agent/commercial-v3/agents/${agentId}`,
    ),

  getPlaybook: (agentId: CommercialV3AgentId, playbookId: string) =>
    api.get<{ success: boolean; data: { playbook: CommercialPlaybookMetadata; content: string } }>(
      `/api/agent/commercial-v3/playbooks/${agentId}/${playbookId}`,
    ),

  listSkills: (agentId?: CommercialV3AgentId) => {
    const query = agentId ? `?agentId=${agentId}` : '';
    return api.get<{ success: boolean; total: number; data: CommercialSkillDefinition[] }>(
      `/api/agent/commercial-v3/skills${query}`,
    );
  },

  getExecutionPolicy: () =>
    api.get<{ success: boolean; data: Record<string, unknown> }>('/api/agent/commercial-v3/policy'),

  buildContext: (data: BuildCommercialV3ContextInput) =>
    api.post<{
      success: boolean;
      data: {
        systemContext: string;
        state: {
          agentId: CommercialV3AgentId;
          indexInjected: boolean;
          schemaReady: boolean;
          loadedPlaybooks: string[];
          missingPlaybooks: string[];
          operationalAllowedByBootstrap: boolean;
        };
      };
    }>('/api/agent/commercial-v3/context', data),

  dispatchMission: (data: DispatchCommercialV3MissionInput) =>
    api.post<{ success: boolean; data: CommercialAgentResultV3 }>(
      '/api/agent/commercial-v3/dispatch',
      data,
    ),

  evaluateRedteam: (data: EvaluateRedteamInput) =>
    api.post<{ success: boolean; data: unknown }>(
      '/api/agent/commercial-v3/evaluate-redteam',
      data,
    ),
};
