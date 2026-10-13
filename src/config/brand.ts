/**
 * Identidade da plataforma — fonte de verdade única em código.
 *
 * Espelha `identidade-visual/birthhub360/` (Brandbook, Manual Visual, Manual de Produto e Catálogo oficiais de 2026). Qualquer texto institucional da aplicação (título da aba,
 * cabeçalho do login, assinatura de e-mail, prompt de IA, splash) sai daqui —
 * não escreva "Birth Hub 360" solto num componente.
 *
 * Antes deste arquivo a identidade vinha de `BRAND_CONFIGS` em
 * `src/contexts/BrandContext.tsx`, um mapa de DUAS marcas trocadas em runtime.
 * A plataforma tem uma marca só agora; o que era "marca ativa" e de fato
 * segmentava conteúdo comercial (playbook, personas, matriz de objeções) virou
 * dado da área comercial, configurável por empresa — ver
 * `src/features/playbook/`.
 *
 * Cores: use os tokens (`bg-brand`, `text-ink`…) em componentes. Os hex abaixo
 * existem para os contextos que não têm CSS — `<meta name="theme-color">`,
 * geração de imagem/PDF, canvas, e-mail transacional.
 */
export const BRAND = {
  id: 'birthhub360',
  /** Nome institucional completo, com o grau. Use em títulos e assinaturas. */
  name: 'Birth Hub 360º',
  /** Sem o grau — para espaços estreitos (sidebar recolhida, chip, breadcrumb). */
  shortName: 'Birth Hub',
  /** O que a plataforma é, em uma linha. */
  slogan: 'Sua central de comando inteligente',
  /** Assinatura completa do brand book (p. 01 e p. 10). */
  tagline:
    'Sua central de comando inteligente: integrando dados, potencializando decisões e acelerando a execução.',
  /** Subtítulo institucional sob o wordmark na tela de entrada (`WelcomeScreen`). */
  ecosystemLabel: 'Ecossistema de Alta Performance',
  description:
    'Ecossistema inteligente e unificado que atua como central de comando 360º para negócios — conectando dados, IA, automações e processos, e transformando o que está disperso em direção clara.',
  /** Os três movimentos da marca: dados → decisões → execução (brand book, p. 02). */
  pillars: ['Inteligência', 'Conexão', 'Execução'] as const,
  /** Valores (brand book, p. 10). Em inglês no original. */
  values: ['Innovation', 'Data Intelligence', 'Efficiency', 'Scalability'] as const,
  colors: {
    /** Azul Neon: Tecnologia, confiança, inovação. Cor padrão de títulos, bordas ativas e destaque */
    neonBlue: '#00D4FF',
    brand: '#00D4FF',
    brandAccent: '#00D4FF',
    /** Rosa Neon: Energia, criatividade, atitude. Destaques, tags, inteligência de mercado e gradientes */
    neonPink: '#FF2D9B',
    pink: '#FF2D9B',
    redViolet: '#FF2D9B',
    /** Dourado Neon: Sofisticação, prosperidade, previsibilidade e métricas */
    neonGold: '#FFC107',
    gold: '#FFC107',
    /** Preto Neon (Fundo): Fundo principal Dark Mode */
    neonBlack: '#0D0D0D',
    obsidian: '#0D0D0D',
    midnight: '#0D0D0D',
    /** Branco Neon (Texto): Textos de corpo, subtítulos e leitura */
    neonWhite: '#F8F9FF',
    white: '#F8F9FF',
    snow: '#F8F9FF',
    blossom: '#F8F9FF',
    /** Fundo de Cards: Superfícies e cartões de conteúdo */
    neonCardBg: '#14141A',
    surface: '#14141A',
    card: '#14141A',
    /** Bordas Glow */
    neonCardBorder: 'rgba(0, 212, 255, 0.22)',
    glowBorder: 'rgba(0, 212, 255, 0.22)',
    /** Tons Light complementares */
    lightPink: '#D91B7C',
    lightBlue: '#0284C7',
    lightGold: '#D97706',
    /** Semânticos complementares */
    sunsetOrange: '#EF4444',
    red: '#EF4444',
    iris: '#FF2D9B',
    orbitBlue: '#00D4FF',
  },
  /**
   * Perfis sociais da plataforma.
   *
   * Vazio de propósito: os perfis que existiam aqui eram os de uma marca anterior
   * (Facebook, Instagram, LinkedIn e YouTube) — canais de outra empresa, que não
   * podem seguir assinando esta plataforma. A lista renderiza sozinha assim que
   * os perfis da Birth Hub 360 forem preenchidos.
   */
  social: [] as ReadonlyArray<{
    href: string;
    label: 'Facebook' | 'Instagram' | 'LinkedIn' | 'YouTube';
  }>,
  /** Crédito institucional exibido na tela de entrada. */
  credit: 'Desenvolvido pelo Coordenador Comercial Marcelo do Nascimento',
  logos: {
    /** Emblema completo. ≥ 96 px. */
    symbol: '/brand/birthhub360-simbolo.svg',
    /** Redução estrutural para ícone/favicon/avatar. 32–96 px. */
    icon: '/brand/birthhub360-icone.svg',
    /** Emblema + logotipo. Assinatura institucional. */
    horizontal: '/brand/birthhub360-logo-horizontal.svg',
  },
} as const;

export type BrandInfo = typeof BRAND;
