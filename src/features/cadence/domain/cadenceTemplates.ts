export interface CadenceJourneyTemplate {
  id: string;
  name: string;
  targetBrand: 'Birth Hub 360' | 'Birth Hub 360' | 'Ambas';
  category: 'Outbound' | 'Inbound' | 'Reativação' | 'Fechamento' | 'Nutrição';
  description: string;
  persona: string;
  touches: {
    order: number;
    channel: 'email' | 'whatsapp' | 'voice';
    delayHoursFromPrevious: number;
    maxAttempts?: number;
    /** Ver `CadenceTouch.fallbackTouchOrder` em `domain/cadence.ts` — cadência adaptativa (item 26): desvio de rota só quando ESTE toque esgota tentativas por falha real do canal, nunca por falta de resposta. */
    fallbackTouchOrder?: number;
    templateRef: string;
    stepTitle: string;
  }[];
}

export const DEFAULT_PLAYBOOK_TEMPLATES: CadenceJourneyTemplate[] = [
  {
    id: 'outbound-frio-logistica',
    name: 'Outbound Frio Logística',
    targetBrand: 'Ambas',
    category: 'Outbound',
    persona: 'Diretores de Logística, Gerentes de Frota e Decisores Operacionais de Transporte',
    description:
      'Cadência fria multicanal (WhatsApp, E-mail e Ligação SDR) focada em redução de custos com combustível, controle de sinistros e telemetria para transportadoras e operadores logísticos.',
    touches: [
      {
        order: 1,
        channel: 'whatsapp',
        delayHoursFromPrevious: 0,
        stepTitle: 'Quebra-Gelo WhatsApp Operacional',
        templateRef:
          'Olá {{contact_name}}, tudo bem? Vi que você lidera as operações na {{company_name}}. Desenvolvemos um benchmark de redução de sinistros e economia de combustível em transportadoras que tem gerado até 12% de economia operacional. Vale uma troca rápida de 10 minutos?',
      },
      {
        order: 2,
        channel: 'email',
        delayHoursFromPrevious: 4,
        stepTitle: 'Estudo de Caso & ROI Logístico',
        templateRef:
          'Assunto: Benchmark de Eficiência Logística para a {{company_name}}\n\nOlá {{contact_name}},\n\nComplementando minha mensagem, compartilhamos com operações semelhantes à {{company_name}} nossa análise de telemetria e segurança rodoviária com resultados em menos de 45 dias.\n\nPodemos agendar uma breve conversa esta semana?',
      },
      {
        order: 3,
        channel: 'voice',
        delayHoursFromPrevious: 24,
        stepTitle: 'Ligação de Conexão SDR',
        templateRef:
          'Contato telefônico consultivo para validar o dimensionamento da frota da transportadora e dores com rotas críticas.',
      },
      {
        order: 4,
        channel: 'whatsapp',
        delayHoursFromPrevious: 48,
        stepTitle: 'Vídeo Demonstrativo de Telemetria',
        templateRef:
          '{{contact_name}}, gravei uma demonstração rápida de 1 minuto mostrando como a plataforma alerta o gestor sobre infrações e manutenções preditivas. Consegue dar uma olhada?',
      },
      {
        order: 5,
        channel: 'email',
        delayHoursFromPrevious: 72,
        stepTitle: 'Convite para Teste Piloto & Agenda',
        templateRef:
          'Assunto: Proposta de Piloto Operacional — {{company_name}}\n\nOlá {{contact_name}},\n\nCaso queira avaliar a aderência em 3 veículos da sua frota sem custo de implantação, você pode selecionar o melhor horário na minha agenda:\n\n👉 {{booking_link}}\n\nAbraço,\nEquipe Comercial',
      },
    ],
  },
  {
    id: 'reativacao-perdidos',
    name: 'Reativação de Perdidos',
    targetBrand: 'Ambas',
    category: 'Reativação',
    persona: 'Leads e oportunidades perdidas nos últimos meses por timing, preço ou prioridade',
    description:
      'Sequência de resgate para reaquecer leads perdidos com abordagem empática, novidades do produto e condição comercial exclusiva de reativação.',
    touches: [
      {
        order: 1,
        channel: 'whatsapp',
        delayHoursFromPrevious: 0,
        stepTitle: 'Retomada de Contato Empática',
        templateRef:
          'Olá {{contact_name}}! Estava revendo nossas conversas sobre a operação da {{company_name}}. Sei que na época o timing não era o ideal. Como estão os projetos da frota para este trimestre?',
      },
      {
        order: 2,
        channel: 'email',
        delayHoursFromPrevious: 24,
        stepTitle: 'Atualizações de Produto & Novo Modelo',
        templateRef:
          'Assunto: Novidades operacionais e novo formato para a {{company_name}}\n\nOlá {{contact_name}},\n\nDesde nosso último contato, implementamos melhorias significativas na telemetria e uma nova política comercial com implantação facilitada.\n\nSeria produtivo batermos um papo de 15 minutos para atualizar seu cenário?',
      },
      {
        order: 3,
        channel: 'voice',
        delayHoursFromPrevious: 48,
        stepTitle: 'Ligação SDR de Reativação',
        templateRef:
          'Ligação rápida para entender se as dores operacionais anteriores ainda persistem e apresentar condições exclusivas.',
      },
      {
        order: 4,
        channel: 'whatsapp',
        delayHoursFromPrevious: 96,
        stepTitle: 'Condição Especial de Retomada',
        templateRef:
          '{{contact_name}}, conseguimos liberar uma condição especial sem taxa de adesão para retomarmos a parceria com a {{company_name}} ainda este mês. Consegue falar 5 minutinhos hoje?',
      },
    ],
  },
  {
    id: 'passagem-bastao-sdr-closer',
    name: 'Passagem de Bastão SDR/Closer',
    targetBrand: 'Ambas',
    category: 'Fechamento',
    persona: 'Leads qualificados e reuniões agendadas que necessitam de confirmação e passagem para o Closer',
    description:
      'Fluxo de passagem de bastão garantindo presença do decisor (anti no-show), envio de briefing pré-call e alinhamento com o especialista de fechamento.',
    touches: [
      {
        order: 1,
        channel: 'whatsapp',
        delayHoursFromPrevious: 0,
        stepTitle: 'Confirmação e Apresentação do Closer',
        templateRef:
          'Olá {{contact_name}}! Reunião agendada com sucesso! Quem irá conduzir nossa conversa será nosso especialista de contas estratégicas. Ele já está a par de todos os detalhes da {{company_name}}.',
      },
      {
        order: 2,
        channel: 'email',
        delayHoursFromPrevious: 2,
        stepTitle: 'Pauta Executiva & Acesso à Sala',
        templateRef:
          'Assunto: Confirmação de Demonstração & Pauta Executiva — {{company_name}}\n\nOlá {{contact_name}},\n\nPara garantir máximo aproveitamento do seu tempo, segue o link da sala e a pauta da nossa reunião:\n\n1. Diagnóstico do cenário atual da frota\n2. Demonstração prática da solução\n3. Simulação de ROI e próximos passos\n\nLink da reunião: {{meeting_url}}\n\nNos falamos em breve!',
      },
      {
        order: 3,
        channel: 'whatsapp',
        delayHoursFromPrevious: 20,
        stepTitle: 'Lembrete Pré-Call (Anti No-Show)',
        templateRef:
          'Oi {{contact_name}}, passando para confirmar nossa reunião hoje às {{meeting_time}}. Segue o link de acesso direto: {{meeting_url}}. Nos vemos lá!',
      },
      {
        order: 4,
        channel: 'voice',
        delayHoursFromPrevious: 24,
        stepTitle: 'Call de Execução e Follow-up Closer',
        templateRef:
          'Reunião de apresentação comercial e envio imediato de proposta formal com os termos alinhados.',
      },
    ],
  },
];

export const CADENCE_JOURNEY_TEMPLATES: CadenceJourneyTemplate[] = [
  ...DEFAULT_PLAYBOOK_TEMPLATES,
  {
    id: 'outbound-frota-pesada-can',
    name: 'Outbound B2B Frota Pesada (Telemetria CAN & Diesel - Birth Hub 360)',
    targetBrand: 'Birth Hub 360',
    category: 'Outbound',
    persona: 'Diretores de Operações, Gerentes de Logística e Gestores de Frota Pesada',
    description:
      'Cadência focada em transportadoras e frotas de carga pesada, explorando economia real de diesel (8-12%), auditoria de freadas/RPM e telemetria CAN.',
    touches: [
      {
        order: 1,
        channel: 'whatsapp',
        delayHoursFromPrevious: 0,
        stepTitle: 'Diagnóstico Consultivo WhatsApp',
        templateRef:
          'Olá {{contact_name}}! Notei que você gerencia a operação na {{company_name}}. Desenvolvemos uma auditoria de telemetria CAN na Birth Hub 360 que reduz em média 9.4% o consumo de diesel e sinistros em frotas pesadas. Gostaria de ver o benchmark do seu segmento?',
      },
      {
        order: 2,
        channel: 'email',
        delayHoursFromPrevious: 4,
        stepTitle: 'Estudo de Caso & ROI Diesel',
        templateRef:
          'Assunto: Benchmark de Redução de Combustível — {{company_name}} & Birth Hub 360\n\nOlá {{contact_name}},\n\nComplementando minha mensagem no WhatsApp, estou compartilhando nosso estudo de caso com telemetria direta na rede CAN do caminhão. Conseguimos identificar ponto morto excessivo, banguela eletrônica e frenagens bruscas em tempo real.\n\nPodemos fazer uma call rápida de 15 minutos para avaliar a aderência na sua frota?',
      },
      {
        order: 3,
        channel: 'voice',
        delayHoursFromPrevious: 24,
        stepTitle: 'Ligação de Qualificação SDR',
        templateRef:
          'Ligação do SDR da Birth Hub 360 apresentando diagnósticos de risco e convidando o decisor para uma demonstração com o especialista de engenharia de telemetria.',
      },
      {
        order: 4,
        channel: 'whatsapp',
        delayHoursFromPrevious: 48,
        stepTitle: 'Demonstração em Vídeo & Prova de Conceito',
        templateRef:
          '{{contact_name}}, gravei um vídeo de 1 minuto mostrando como o painel de inteligência da Birth Hub 360 avisa o gestor no momento exato de uma infração de telemetria. Consegue dar uma olhada rápida hoje?',
      },
      {
        order: 5,
        channel: 'email',
        delayHoursFromPrevious: 72,
        stepTitle: 'Link de Agendamento Direto',
        templateRef:
          'Assunto: Próximos passos para teste piloto na {{company_name}}\n\nOlá {{contact_name}},\n\nSei que a rotina operacional é corrida. Caso faça sentido avaliar a implantação de um teste piloto em 3 a 5 veículos da sua frota sem custo de adesão, escolha o melhor horário diretamente na minha agenda:\n\n👉 {{booking_link}}\n\nUm abraço,\nEquipe Birth Hub 360',
      },
    ],
  },
  {
    id: 'inbound-speed-lead-birthhub360',
    name: 'Inbound Speed Lead (Contato Rápido Antifurto & Rastreamento - Birth Hub 360)',
    targetBrand: 'Birth Hub 360',
    category: 'Inbound',
    persona: 'Proprietários de Frotas Leves, Vãs, Utilitários e Compradores de Segurança Veicular',
    description:
      'Sequência de ultra-velocidade para converter leads que solicitaram cotação no site em menos de 5 minutos, garantindo alta taxa de conversão.',
    touches: [
      {
        order: 1,
        channel: 'whatsapp',
        delayHoursFromPrevious: 0,
        // Adaptativo (item 26): número de WhatsApp inválido geralmente significa que o telefone
        // cadastrado está errado — insistir com uma ligação (order 2) para o MESMO número
        // provavelmente falha de novo. Pula direto para o e-mail (order 3).
        fallbackTouchOrder: 3,
        stepTitle: 'Boas-vindas Instantâneas WhatsApp',
        templateRef:
          'Olá {{contact_name}}! Recebemos sua solicitação de cotação de rastreamento veicular e antifurto na Birth Hub 360. Para qual tipo de veículo e cidade você precisa de cobertura imediata?',
      },
      {
        order: 2,
        channel: 'voice',
        delayHoursFromPrevious: 1,
        stepTitle: 'Ligação Rápida de Atendimento',
        templateRef:
          'Ligação automática de atendimento para dimensionar a quantidade de rastreadores, botão de pânico e central 24h com pronta resposta.',
      },
      {
        order: 3,
        channel: 'email',
        delayHoursFromPrevious: 24,
        stepTitle: 'Tabela de Planos & Cobertura Nacional',
        templateRef:
          'Assunto: Cotação de Rastreamento Veicular Birth Hub 360 para {{company_name}}\n\nOlá {{contact_name}},\n\nConforme conversamos, segue anexo nossa proposta comercial com cobertura nacional 4G/GPS, bloqueio remoto e assistência 24h com equipe de pronta resposta armada.\n\nFicou com alguma dúvida sobre a instalação?',
      },
      {
        order: 4,
        channel: 'whatsapp',
        delayHoursFromPrevious: 48,
        stepTitle: 'Validação de Fechamento com Condição Especial',
        templateRef:
          'Oi {{contact_name}}, conseguimos uma condição especial de instalação gratuita para os veículos da {{company_name}} se fecharmos a ativação esta semana. O que acha de finalizarmos o cadastro?',
      },
    ],
  },
  {
    id: 'reativacao-no-show',
    name: 'Reativação de No-Show / Call Perdida (Resgate com Voice + WhatsApp)',
    targetBrand: 'Ambas',
    category: 'Reativação',
    persona: 'Leads que agendaram reunião mas não compareceram',
    description:
      'Fluxo empático e automatizado para recuperar leads que faltaram à call agendada sem parecer invasivo.',
    touches: [
      {
        order: 1,
        channel: 'whatsapp',
        delayHoursFromPrevious: 0,
        stepTitle: 'WhatsApp Empático pós-falta',
        templateRef:
          'Olá {{contact_name}}! Imaginei que imprevistos operacionais urgentes tenham surgido no horário da nossa reunião hoje. Sem problemas! Quer reagendar para amanhã ou prefere que eu ligue no final da tarde?',
      },
      {
        order: 2,
        channel: 'email',
        delayHoursFromPrevious: 24,
        stepTitle: 'Resumo em Vídeo & Remarcação',
        templateRef:
          'Assunto: Reagendamento de demonstração — {{company_name}}\n\nOlá {{contact_name}},\n\nPara adiantar seu tempo, gravei uma visão geral da plataforma (3 minutos). Se quiser escolher um novo horário no seu ritmo, basta acessar meu calendário:\n\n👉 {{booking_link}}',
      },
      {
        order: 3,
        channel: 'voice',
        delayHoursFromPrevious: 48,
        stepTitle: 'Ligação de Checagem do SDR',
        templateRef:
          'Ligação curta e educada para checar se o projeto de monitoramento de frotas continua sendo prioridade para este trimestre.',
      },
    ],
  },
  {
    id: 'aceleracao-pos-proposta',
    name: 'Aceleração Pós-Proposta & Fechamento (Follow-up Decisores & ROI)',
    targetBrand: 'Ambas',
    category: 'Fechamento',
    persona: 'Decisores em fase final de avaliação de proposta comercial',
    description:
      'Cadência focada em encurtar o ciclo de vendas após o envio da proposta, eliminando objeções com o comitê financeiro.',
    touches: [
      {
        order: 1,
        channel: 'whatsapp',
        delayHoursFromPrevious: 24,
        stepTitle: 'Checagem de Recebimento de Proposta',
        templateRef:
          'Olá {{contact_name}}, conseguiu avaliar a proposta comercial que enviamos ontem? Gostaria de esclarecer algum ponto sobre o cronograma de instalação ou modelo de comodato?',
      },
      {
        order: 2,
        channel: 'email',
        delayHoursFromPrevious: 72,
        stepTitle: 'Resumo Executivo para Comitê Financeiro',
        templateRef:
          'Assunto: Resumo Executivo e Payback Estimado — {{company_name}}\n\nOlá {{contact_name}},\n\nPreparei um resumo de 1 página destacando o payback projetado de 3.2 meses para a sua diretoria financeira aprovar o investimento.\n\nPrecisa de mais alguma documentação técnica para o contrato?',
      },
      {
        order: 3,
        channel: 'voice',
        delayHoursFromPrevious: 120,
        stepTitle: 'Call de Alinhamento Contratual (Closer)',
        templateRef:
          'Ligação do Closer para alinhamento dos dados cadastrais, minuta contratual e agendamento dos técnicos de campo.',
      },
    ],
  },
  {
    id: 'nutricao-boas-praticas',
    name: 'Nutrição & Boas Práticas (Educação Continuada de Frotas & Upsell)',
    targetBrand: 'Ambas',
    category: 'Nutrição',
    persona: 'Leads em maturação ou clientes com potencial de ampliação de frota',
    description:
      'Sequência educativa de longo prazo enviando dicas de gestão de frotas, legislação e telemetria avançada.',
    touches: [
      {
        order: 1,
        channel: 'email',
        delayHoursFromPrevious: 0,
        stepTitle: 'Guia de Prevenção de Sinistros',
        templateRef:
          'Assunto: [Guia] 5 práticas para zerar acidentes e roubos de carga na {{company_name}}\n\nOlá {{contact_name}},\n\nSeparamos um guia com as melhores práticas de auditoria de motoristas e cercas eletrônicas que nossos clientes usam para reduzir sinistros em até 70%. Boa leitura!',
      },
      {
        order: 2,
        channel: 'whatsapp',
        delayHoursFromPrevious: 72,
        stepTitle: 'Dica Prática de Telemetria',
        templateRef:
          'Olá {{contact_name}}! Sabia que 60% do desgaste prematuro de pneus e freios ocorre por excesso de velocidade em curvas? Nossos sensores de telemetria alertam a cabine na hora. Quer saber mais?',
      },
      {
        order: 3,
        channel: 'email',
        delayHoursFromPrevious: 168,
        stepTitle: 'Convite para Sessão Executiva',
        templateRef:
          'Assunto: Convite — Novas tecnologias de telemetria CAN 2026\n\nOlá {{contact_name}},\n\nGostaria de convidá-lo para uma sessão executiva de 20 minutos com nosso diretor de produto para apresentar as novidades do nosso módulo de IA comercial e operacional.',
      },
    ],
  },
];
