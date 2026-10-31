export type SwarmAgentKey = 'sdr' | 'bdr' | 'closer' | 'crm' | 'ops';

export type SubSwarmDomain = 'commercial' | 'marketing' | 'customer_success' | 'operations';

export interface SubSwarmConfig {
  id: SubSwarmDomain;
  label: string;
  description: string;
  primaryAgents: SwarmAgentKey[];
  specialistCapabilities: string[];
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
  },
  marketing: {
    id: 'marketing',
    label: 'Sub-Swarm Marketing (Atração & Outbound Copy)',
    description:
      'Descoberta de novas contas ICP, enriquecimento com inteligência firmográfica e rascunhos de abordagem consultiva (copy para e-mail e WhatsApp).',
    primaryAgents: ['bdr', 'sdr'],
    specialistCapabilities: ['company.search', 'lead.enrich', 'lead.search', 'copy.draft'],
  },
  customer_success: {
    id: 'customer_success',
    label: 'Sub-Swarm Customer Success (Retenção & CS)',
    description:
      'Diagnóstico de estagnação, prevenção ativa de cancelamento (churn), monitoramento de saúde de clientes e planos de retenção.',
    primaryAgents: ['crm', 'ops'],
    specialistCapabilities: ['deal.read', 'company.read', 'churn.analyze', 'knowledge.search'],
  },
  operations: {
    id: 'operations',
    label: 'Sub-Swarm Operações (Ações Multi-Plataforma)',
    description:
      'Disparo de tarefas e notas em plataformas externas (Bitrix24, Trello, Monday, Asana), agendamento de reuniões e notificações multicanal.',
    primaryAgents: ['ops', 'crm'],
    specialistCapabilities: ['bitrix.write', 'bitrix.read', 'meeting.schedule', 'agent.execute'],
  },
};

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
