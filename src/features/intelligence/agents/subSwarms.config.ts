import normalizedBirthHubCatalog from '../../job-roles/catalog/agents.normalized.json';

export type SwarmAgentKey = 'sdr' | 'bdr' | 'closer' | 'crm' | 'ops';

export type SubSwarmDomain = 'commercial' | 'marketing' | 'customer_success' | 'operations';

export interface SubSwarmConfig {
  id: SubSwarmDomain;
  label: string;
  description: string;
  primaryAgents: SwarmAgentKey[];
  specialistCapabilities: string[];
  catalogDomains: string[];
}

export const SUB_SWARMS: Record<SubSwarmDomain, SubSwarmConfig> = {
  commercial: {
    id: 'commercial',
    label: 'Sub-Swarm Comercial (Vendas & Fechamento)',
    description:
      'Qualificação de contas, condução de pipeline, negociação com tomadores de decisão e forecast ponderado.',
    primaryAgents: ['sdr', 'bdr', 'closer', 'crm'],
    specialistCapabilities: [
      'lead.read',
      'lead.qualify',
      'deal.read',
      'deal.analyze',
      'deal.move_stage',
      'meeting.schedule',
      'forecast.read',
    ],
    catalogDomains: ['Vendas', 'Executivo'],
  },
  marketing: {
    id: 'marketing',
    label: 'Sub-Swarm Marketing (Atração & Outbound Copy)',
    description:
      'Descoberta de novas contas ICP, enriquecimento com inteligência firmográfica e rascunhos de abordagem consultiva (copy para e-mail e WhatsApp).',
    primaryAgents: ['bdr', 'sdr'],
    specialistCapabilities: ['company.search', 'lead.enrich', 'lead.search', 'copy.draft'],
    catalogDomains: ['Marketing'],
  },
  customer_success: {
    id: 'customer_success',
    label: 'Sub-Swarm Customer Success (Retenção & CS)',
    description:
      'Diagnóstico de estagnação, prevenção ativa de cancelamento (churn), monitoramento de saúde de clientes e planos de retenção.',
    primaryAgents: ['crm', 'ops'],
    specialistCapabilities: ['deal.read', 'company.read', 'churn.analyze', 'knowledge.search'],
    catalogDomains: ['Customer Success'],
  },
  operations: {
    id: 'operations',
    label: 'Sub-Swarm Operações (Ações Multi-Plataforma)',
    description:
      'Disparo de tarefas e notas em plataformas externas (Bitrix24, Trello, Monday, Asana), agendamento de reuniões e notificações multicanal.',
    primaryAgents: ['ops', 'crm'],
    specialistCapabilities: ['bitrix.write', 'bitrix.read', 'meeting.schedule', 'agent.execute'],
    catalogDomains: [
      'Operações',
      'Financeiro',
      'Compliance/Jurídico',
      'Plataforma',
      'Tecnologia',
      'RH',
    ],
  },
};

export interface CatalogAgentSummary {
  code: string;
  name: string;
  domain: string;
  description: string;
  systemPrompt?: string;
  risk?: string;
  hasPrompt?: boolean;
}

export interface SemanticAgentMatch {
  code: string;
  name: string;
  domain: string;
  subSwarm: SubSwarmDomain;
  description: string;
  similarityScore: number;
  matchReason: string;
}

export interface SemanticRoutingPlan {
  mission: string;
  subSwarm: SubSwarmDomain;
  subSwarmConfig: SubSwarmConfig;
  primarySpecialists: SwarmAgentKey[];
  catalogSpecialists: SemanticAgentMatch[];
  recommendedNextAction: SwarmAgentKey;
  reasoning: string;
}

let cachedCatalogAgents: CatalogAgentSummary[] | null = null;

/**
 * Retorna os 379 agentes canônicos do catálogo oficial (memoizado).
 */
export function getAllCatalogAgents(): CatalogAgentSummary[] {
  if (cachedCatalogAgents) return cachedCatalogAgents;

  const rawAgents = (normalizedBirthHubCatalog as any)?.agents ?? [];
  const list: CatalogAgentSummary[] = rawAgents.map((a: any) => ({
    code: a.code,
    name: a.name,
    domain: a.domain,
    description: a.description || '',
    systemPrompt: a.systemPrompt,
    risk: a.risk,
    hasPrompt: Boolean(a.hasPrompt),
  }));
  cachedCatalogAgents = list;
  return list;
}

/**
 * Mapeia um domínio do catálogo amplo (379 agentes) para um dos 4 Sub-Swarms temáticos.
 */
export function mapDomainToSubSwarm(domain: string): SubSwarmDomain {
  const normalized = (domain || '').trim().toLowerCase();
  if (normalized.includes('market')) return 'marketing';
  if (normalized.includes('customer') || normalized.includes('suporte')) return 'customer_success';
  if (normalized.includes('venda') || normalized.includes('executiv')) return 'commercial';
  return 'operations';
}

/**
 * Classificador semântico heurístico de missão para seleção do Sub-Swarm mais adequado.
 * Permite ao Supervisor direcionar a priorização de especialistas com base na intenção do usuário.
 */
export function detectSubSwarm(mission: string): SubSwarmDomain {
  const text = (mission || '').toLowerCase();

  // Padrões de CS / Retenção
  if (
    text.includes('churn') ||
    text.includes('cancelamento') ||
    text.includes('retenção') ||
    text.includes('retencao') ||
    text.includes('saúde da conta') ||
    text.includes('health score') ||
    text.includes('insatisfação')
  ) {
    return 'customer_success';
  }

  // Padrões de Marketing / Copy / Atração
  if (
    text.includes('copy') ||
    text.includes('rascunho de email') ||
    text.includes('rascunho de whatsapp') ||
    text.includes('redigir mensagem') ||
    text.includes('primeiro contato') ||
    text.includes('campanha') ||
    text.includes('prospecção fria') ||
    text.includes('outbound copy')
  ) {
    return 'marketing';
  }

  // Padrões de Operações / Tarefas externas
  if (
    text.includes('criar tarefa') ||
    text.includes('criar card') ||
    text.includes('sincronizar trello') ||
    text.includes('sincronizar monday') ||
    text.includes('push') ||
    text.includes('pop-up') ||
    text.includes('notificação') ||
    text.includes('notificar') ||
    text.includes('smartwatch') ||
    text.includes('tarefa no crm')
  ) {
    return 'operations';
  }

  // Padrão: Comercial (pipeline, negociação, lead, forecast, proposta)
  return 'commercial';
}

export function getSubSwarmSpecialists(domain: SubSwarmDomain): SwarmAgentKey[] {
  return SUB_SWARMS[domain]?.primaryAgents ?? ['sdr', 'bdr', 'closer', 'crm', 'ops'];
}

export function getSubSwarmCapabilities(domain: SubSwarmDomain): string[] {
  return SUB_SWARMS[domain]?.specialistCapabilities ?? [];
}

/**
 * Roteamento semântico dinâmico que seleciona os especialistas mais aderentes do catálogo
 * dos 379 agentes da plataforma para uma dada missão e Sub-Swarm.
 */
export function matchCatalogAgents(
  mission: string,
  preferredSubSwarm?: SubSwarmDomain,
  options?: { topK?: number; minScore?: number },
): SemanticAgentMatch[] {
  const topK = options?.topK ?? 3;
  const minScore = options?.minScore ?? 0.15;
  const targetSubSwarm = preferredSubSwarm ?? detectSubSwarm(mission);

  const agents = getAllCatalogAgents();
  if (agents.length === 0) return [];

  // Normalização e extração de termos de busca da missão (com suporte a acrônimos como a/b -> ab)
  const normalizedMission = (mission || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/a\/b/g, 'ab ab-test');

  const rawTerms = normalizedMission
    .replace(/[^\w\s-]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length >= 2);

  // Termos irrelevantes / stop words
  const stopWords = new Set([
    'para',
    'com',
    'uma',
    'um',
    'das',
    'dos',
    'por',
    'mais',
    'como',
    'este',
    'esta',
    'fazer',
    'pede',
    'qual',
    'quem',
    'onde',
    'quando',
  ]);
  const terms = rawTerms.filter((w) => !stopWords.has(w));

  const scored: SemanticAgentMatch[] = [];

  for (const agent of agents) {
    const agentSubSwarm = mapDomainToSubSwarm(agent.domain);

    const agentText = `${agent.code} ${agent.name} ${agent.description} ${agent.domain}`
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');

    const nameNorm = agent.name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
    const codeNorm = agent.code
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');

    let score = 0;
    const matchedTerms: string[] = [];

    // Bônus se o agente pertencer ao Sub-Swarm prioritário da missão
    if (agentSubSwarm === targetSubSwarm) {
      score += 0.2;
    }

    // Match léxico-semântico com os termos da missão (com stemming para plurais)
    for (const term of terms) {
      const singularTerm = term.endsWith('s') && term.length > 3 ? term.slice(0, -1) : term;
      const rootTerm = term.length > 4 ? term.slice(0, 4) : term;

      const matchedInName =
        nameNorm.includes(term) ||
        codeNorm.includes(term) ||
        nameNorm.includes(singularTerm) ||
        codeNorm.includes(singularTerm);

      const matchedInText =
        agentText.includes(term) ||
        agentText.includes(singularTerm) ||
        (rootTerm.length >= 4 && agentText.includes(rootTerm));

      if (matchedInName) {
        matchedTerms.push(term);
        score += 0.4;
      } else if (matchedInText) {
        matchedTerms.push(term);
        score += 0.18;
      }
    }

    // Bônus para agentes com prompt executável pronto
    if (agent.hasPrompt) {
      score += 0.05;
    }

    const normalizedScore = Math.min(1, Math.round(score * 100) / 100);

    if (normalizedScore >= minScore) {
      const matchReason =
        matchedTerms.length > 0
          ? `Aderência semântica com termos [${matchedTerms.slice(0, 3).join(', ')}] no domínio ${agent.domain}`
          : `Especialista prioritário alinhado ao Sub-Swarm ${agentSubSwarm}`;

      scored.push({
        code: agent.code,
        name: agent.name,
        domain: agent.domain,
        subSwarm: agentSubSwarm,
        description: agent.description,
        similarityScore: normalizedScore,
        matchReason,
      });
    }
  }

  // Ordena por score decrescente
  scored.sort((a, b) => b.similarityScore - a.similarityScore);

  // Se nenhum atingir o minScore, retorna os primeiros especialistas do Sub-Swarm com score base
  if (scored.length === 0) {
    const fallbackAgents = agents
      .filter((a) => mapDomainToSubSwarm(a.domain) === targetSubSwarm)
      .slice(0, topK);

    return fallbackAgents.map((a) => ({
      code: a.code,
      name: a.name,
      domain: a.domain,
      subSwarm: targetSubSwarm,
      description: a.description,
      similarityScore: 0.2,
      matchReason: `Especialista de referência do catálogo para o Sub-Swarm ${targetSubSwarm}`,
    }));
  }

  return scored.slice(0, topK);
}

/**
 * Gera um plano de roteamento semântico de alto nível conectando a intenção da missão
 * ao Sub-Swarm e aos especialistas adequados do catálogo dos 379 agentes.
 */
export function semanticRouteMission(
  mission: string,
  options?: { topK?: number },
): SemanticRoutingPlan {
  const subSwarm = detectSubSwarm(mission);
  const subSwarmConfig = SUB_SWARMS[subSwarm];
  const primarySpecialists = getSubSwarmSpecialists(subSwarm);
  const catalogSpecialists = matchCatalogAgents(mission, subSwarm, options);

  const recommendedNextAction = primarySpecialists[0] || 'bdr';
  const topAgent = catalogSpecialists[0];

  const reasoning = topAgent
    ? `Sub-Swarm ${subSwarmConfig.label} selecionado. Especialista sugerido do catálogo: ${topAgent.name} (${topAgent.code}) com score ${topAgent.similarityScore}.`
    : `Sub-Swarm ${subSwarmConfig.label} selecionado com especialistas primários [${primarySpecialists.join(', ')}].`;

  return {
    mission,
    subSwarm,
    subSwarmConfig,
    primarySpecialists,
    catalogSpecialists,
    recommendedNextAction,
    reasoning,
  };
}
