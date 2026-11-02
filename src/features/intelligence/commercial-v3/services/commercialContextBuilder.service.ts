import fs from 'node:fs/promises';
import path from 'node:path';
import type { CommercialV3AgentId } from '../contracts/commercialAgentV3.types.js';
import { commercialAgentV3Registry } from './commercialAgentV3Registry.service.js';

export interface ContextBuildResult {
  systemContext: string;
  state: {
    agentId: CommercialV3AgentId;
    indexInjected: boolean;
    schemaReady: boolean;
    loadedPlaybooks: string[];
    missingPlaybooks: string[];
    operationalAllowedByBootstrap: boolean;
  };
}

export class CommercialContextBuilderService {
  private assetsRoot: string;

  constructor() {
    this.assetsRoot = commercialAgentV3Registry.getAssetsRoot();
  }

  public async buildContext(
    agentId: CommercialV3AgentId,
    skillIds: string[] = [],
  ): Promise<ContextBuildResult> {
    const agentEntry = commercialAgentV3Registry.getAgent(agentId);
    if (!agentEntry) {
      throw new Error(`Agente desconhecido no catálogo V3.1: ${agentId}`);
    }

    const agentSkills = commercialAgentV3Registry.listSkills(agentId);
    const existingSkillsMap = new Map(agentSkills.map((s) => [s.id, s]));

    for (const sid of skillIds) {
      if (!existingSkillsMap.has(sid)) {
        throw new Error(`SkillId não pertence ao agente ${agentId} ou inexiste: ${sid}`);
      }
    }

    // 1. Carregar Core Compartilhado
    const corePath = path.join(this.assetsRoot, '00_CORE', 'CORE_COMPARTILHADO_V3_1.txt');
    const coreContent = await fs.readFile(corePath, 'utf-8');

    // 2. Carregar Prompt do Especialista
    const promptPath = path.join(this.assetsRoot, agentEntry.prompt);
    const promptContent = await fs.readFile(promptPath, 'utf-8');

    // 3. Injetar Índice Obrigatório de Habilidades
    const indexChunk =
      'ÍNDICE OBRIGATÓRIO DE SKILLS (não é grant):\n' + JSON.stringify(agentSkills, null, 2);

    // 4. Injetar Contrato Obrigatório
    const contractNoticeChunk =
      'CONTRATO OBRIGATÓRIO JSON V3.1: resumo_humano sempre (máx 600 caracteres), UNKNOWN quando sem comprovação, nenhuma ação real sem backend.';

    const chunks: string[] = [coreContent, promptContent, indexChunk, contractNoticeChunk];

    // 5. Playbooks associados às skills solicitadas
    const playbooksList = commercialAgentV3Registry.getPlaybooks(agentId);
    const playbookMap = new Map(playbooksList.map((p) => [p.id, p]));

    const targetedPlaybookIds = Array.from(
      new Set(
        skillIds
          .map((sid) => existingSkillsMap.get(sid)?.playbookId)
          .filter((pid): pid is string => Boolean(pid)),
      ),
    ).sort((left, right) => left.localeCompare(right));

    const loadedPlaybooks: string[] = [];
    const missingPlaybooks: string[] = [];

    for (const pbId of targetedPlaybookIds) {
      const pbMeta = playbookMap.get(pbId);
      if (!pbMeta) {
        chunks.push(
          `PLAYBOOK AUSENTE ${pbId}: usar CONTINGÊNCIA CONSULTIVA do prompt, não executar ação real.`,
        );
        missingPlaybooks.push(pbId);
        continue;
      }

      const playbookPath = path.join(this.assetsRoot, pbMeta.path);
      try {
        const pbContent = await fs.readFile(playbookPath, 'utf-8');
        chunks.push(`PLAYBOOK ${pbId}:\n${pbContent}`);
        loadedPlaybooks.push(pbId);
      } catch {
        chunks.push(
          `PLAYBOOK AUSENTE ${pbId}: usar CONTINGÊNCIA CONSULTIVA do prompt, não executar ação real.`,
        );
        missingPlaybooks.push(pbId);
      }
    }

    const fullContext = chunks.join('\n\n---\n\n');

    return {
      systemContext: fullContext,
      state: {
        agentId,
        indexInjected: true,
        schemaReady: true,
        loadedPlaybooks,
        missingPlaybooks,
        operationalAllowedByBootstrap: false,
      },
    };
  }
}

export const commercialContextBuilder = new CommercialContextBuilderService();
