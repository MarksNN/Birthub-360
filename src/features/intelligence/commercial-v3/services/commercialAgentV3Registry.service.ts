import fs from 'node:fs';
import path from 'node:path';
import type {
  CommercialAgentCatalogEntry,
  CommercialPlaybookMetadata,
  CommercialSkillDefinition,
  CommercialV3AgentId,
} from '../contracts/commercialAgentV3.types.js';

const resolveAssetsRoot = (): string => {
  const candidates = [
    path.resolve(process.cwd(), 'src/features/intelligence/commercial-v3/assets'),
    typeof __dirname !== 'undefined'
      ? path.resolve(__dirname, '../src/features/intelligence/commercial-v3/assets')
      : '',
    typeof __dirname !== 'undefined' ? path.resolve(__dirname, '../assets') : '',
  ].filter(Boolean);

  for (const candidate of candidates) {
    if (fs.existsSync(path.join(candidate, '03_CATALOGO', 'INDICE_GERAL_463.json'))) {
      return candidate;
    }
  }

  return path.resolve(process.cwd(), 'src/features/intelligence/commercial-v3/assets');
};

const ASSETS_ROOT = resolveAssetsRoot();

interface RawCatalog {
  schemaVersion: string;
  agents: CommercialAgentCatalogEntry[];
  skills: CommercialSkillDefinition[];
}

export class CommercialAgentV3RegistryService {
  private static instance: CommercialAgentV3RegistryService;
  private catalog: RawCatalog | null = null;
  private agentIndices: Map<
    CommercialV3AgentId,
    { skills: CommercialSkillDefinition[]; playbooks: CommercialPlaybookMetadata[] }
  > = new Map();
  private handoffs: Record<string, Array<[string, string, string]>> = {};
  private executionPolicy: Record<string, unknown> = {};

  private constructor() {
    this.loadCatalog();
  }

  public static getInstance(): CommercialAgentV3RegistryService {
    if (!CommercialAgentV3RegistryService.instance) {
      CommercialAgentV3RegistryService.instance = new CommercialAgentV3RegistryService();
    }
    return CommercialAgentV3RegistryService.instance;
  }

  private loadCatalog(): void {
    const catalogPath = path.join(ASSETS_ROOT, '03_CATALOGO', 'INDICE_GERAL_463.json');
    if (fs.existsSync(catalogPath)) {
      this.catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf-8')) as RawCatalog;
    }

    const handoffsPath = path.join(ASSETS_ROOT, '08_METADATA', 'HANDOFFS_CANDIDATOS.json');
    if (fs.existsSync(handoffsPath)) {
      this.handoffs = JSON.parse(fs.readFileSync(handoffsPath, 'utf-8'));
    }

    const policyPath = path.join(ASSETS_ROOT, '03_CONTRATOS', 'EXECUTION_POLICY_V3_1.json');
    if (fs.existsSync(policyPath)) {
      this.executionPolicy = JSON.parse(fs.readFileSync(policyPath, 'utf-8'));
    }

    if (this.catalog?.agents) {
      for (const agent of this.catalog.agents) {
        const indexPath = path.join(ASSETS_ROOT, agent.index);
        if (fs.existsSync(indexPath)) {
          const rawIndex = JSON.parse(fs.readFileSync(indexPath, 'utf-8'));
          this.agentIndices.set(agent.id, {
            skills: (rawIndex.skills || []).map((s: CommercialSkillDefinition) => ({
              ...s,
              agentId: agent.id,
            })),
            playbooks: rawIndex.playbooks,
          });
        }
      }
    }
  }

  public listAgents(): CommercialAgentCatalogEntry[] {
    return this.catalog?.agents ?? [];
  }

  public getAgent(agentId: CommercialV3AgentId): CommercialAgentCatalogEntry | undefined {
    return this.catalog?.agents.find((a) => a.id === agentId);
  }

  public listSkills(agentId?: CommercialV3AgentId): CommercialSkillDefinition[] {
    if (agentId) {
      return this.agentIndices.get(agentId)?.skills ?? [];
    }
    return this.catalog?.skills ?? [];
  }

  public getSkill(skillId: string): CommercialSkillDefinition | undefined {
    return this.catalog?.skills.find((s) => s.id === skillId);
  }

  public getPlaybooks(agentId: CommercialV3AgentId): CommercialPlaybookMetadata[] {
    return this.agentIndices.get(agentId)?.playbooks ?? [];
  }

  public getPlaybookContent(
    agentId: CommercialV3AgentId,
    playbookId: string,
  ): { playbook: CommercialPlaybookMetadata; content: string } | null {
    const playbooks = this.getPlaybooks(agentId);
    const pb = playbooks.find((p) => p.id === playbookId);
    if (!pb) return null;

    const fullPath = path.join(ASSETS_ROOT, pb.path);
    if (!fs.existsSync(fullPath)) return null;

    const content = fs.readFileSync(fullPath, 'utf-8');
    return {
      playbook: pb,
      content,
    };
  }

  public getHandoffCandidates(agentId: CommercialV3AgentId): Array<[string, string, string]> {
    return this.handoffs[agentId] ?? [];
  }

  public getExecutionPolicy(): Record<string, unknown> {
    return this.executionPolicy;
  }

  public getAssetsRoot(): string {
    return ASSETS_ROOT;
  }
}

export const commercialAgentV3Registry = CommercialAgentV3RegistryService.getInstance();
