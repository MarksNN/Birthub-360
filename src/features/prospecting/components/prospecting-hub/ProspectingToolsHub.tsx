import { motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, Building2, Mail, MapPin, Newspaper } from 'lucide-react';
import { useEffect, useState } from 'react';
import { GithubIcon as Github } from '../../../../components/ui/icons/GithubIcon.js';
import { LinkedinIcon as Linkedin } from '../../../../components/ui/icons/LinkedinIcon.js';
import { YoutubeIcon as Youtube } from '../../../../components/ui/icons/YoutubeIcon.js';
import { api } from '../../../../lib/api.js';
import { fadeInUp, SPRING_SOFT, staggerContainer, staggerItem } from '../../../../lib/motion.js';
import { ApolloTool } from './tools/ApolloTool.js';
import { GitHubTool } from './tools/GitHubTool.js';
import { GooglePlacesTool } from './tools/GooglePlacesTool.js';
import { HunterTool } from './tools/HunterTool.js';
import { LinkedInTool } from './tools/LinkedInTool.js';
import { NewsTool } from './tools/NewsTool.js';
import type { ToolsStatus } from './tools/shared.js';
import { YoutubeTool } from './tools/YoutubeTool.js';

type ToolId = 'google-places' | 'apollo' | 'hunter' | 'linkedin' | 'github' | 'news' | 'youtube';

const TOOL_TABS: {
  id: ToolId;
  label: string;
  icon: any;
  category: string;
  description: string;
  statusKey: keyof Omit<ToolsStatus, 'providerMode'>;
  iconBg: string;
  iconColor: string;
  accentLine: string;
  textHover: string;
}[] = [
  {
    id: 'google-places',
    label: 'Google Places',
    icon: MapPin,
    category: 'Local & Mapas',
    description:
      'Busca empresas por categoria e região, só via Google Places (New) Text Search — sem outras fontes misturadas.',
    statusKey: 'googlePlaces',
    iconBg: 'bg-sky-50 dark:bg-sky-500/10 border-sky-200/80 dark:border-sky-500/20',
    iconColor: 'text-sky-600 dark:text-sky-400',
    accentLine: 'via-sky-500',
    textHover: 'group-hover:text-sky-600 dark:group-hover:text-sky-400',
  },
  {
    id: 'apollo',
    label: 'Apollo.io',
    icon: Building2,
    category: 'Firmografia & B2B',
    description:
      'Busca firmográfica de empresas por ICP (segmento, porte, região), só via Apollo Organization Search.',
    statusKey: 'apollo',
    iconBg: 'bg-indigo-50 dark:bg-indigo-500/10 border-indigo-200/80 dark:border-indigo-500/20',
    iconColor: 'text-indigo-600 dark:text-indigo-400',
    accentLine: 'via-indigo-500',
    textHover: 'group-hover:text-indigo-600 dark:group-hover:text-indigo-400',
  },
  {
    id: 'hunter',
    label: 'Hunter.io',
    icon: Mail,
    category: 'E-mails & Domínio',
    description:
      'Encontra e verifica e-mails reais de pessoas a partir do domínio de uma empresa, só via Hunter.io.',
    statusKey: 'hunter',
    iconBg: 'bg-orange-50 dark:bg-orange-500/10 border-orange-200/80 dark:border-orange-500/20',
    iconColor: 'text-orange-600 dark:text-orange-400',
    accentLine: 'via-orange-500',
    textHover: 'group-hover:text-orange-600 dark:group-hover:text-orange-400',
  },
  {
    id: 'linkedin',
    label: 'LinkedIn',
    icon: Linkedin,
    category: 'Decisores & Social',
    description:
      'Busca empresas e decisores com perfil real de LinkedIn (via Apollo), mais um gerador de link manual.',
    statusKey: 'apollo',
    iconBg: 'bg-blue-50 dark:bg-blue-500/10 border-blue-200/80 dark:border-blue-500/20',
    iconColor: 'text-blue-600 dark:text-blue-400',
    accentLine: 'via-blue-500',
    textHover: 'group-hover:text-blue-600 dark:group-hover:text-blue-400',
  },
  {
    id: 'github',
    label: 'GitHub',
    icon: Github,
    category: 'Tecnologia & Dev',
    description:
      'Busca organizações públicas no GitHub — sinal de maturidade técnica de uma empresa-alvo. Gratuita, sem chave.',
    statusKey: 'github',
    iconBg: 'bg-purple-50 dark:bg-purple-500/10 border-purple-200/80 dark:border-purple-500/20',
    iconColor: 'text-purple-600 dark:text-purple-400',
    accentLine: 'via-purple-500',
    textHover: 'group-hover:text-purple-600 dark:group-hover:text-purple-400',
  },
  {
    id: 'news',
    label: 'Notícias',
    icon: Newspaper,
    category: 'Imprensa & Mídia',
    description:
      'Menções recentes de imprensa sobre uma empresa via GDELT — gratuita, sem chave, últimos 6 meses.',
    statusKey: 'news',
    iconBg: 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200/80 dark:border-emerald-500/20',
    iconColor: 'text-emerald-600 dark:text-emerald-400',
    accentLine: 'via-emerald-500',
    textHover: 'group-hover:text-emerald-600 dark:group-hover:text-emerald-400',
  },
  {
    id: 'youtube',
    label: 'YouTube',
    icon: Youtube,
    category: 'Vídeo & Conteúdo',
    description:
      'Confere os metadados públicos de um vídeo já encontrado (título, canal, thumbnail) — não é busca por palavra-chave.',
    statusKey: 'youtube',
    iconBg: 'bg-rose-50 dark:bg-rose-500/10 border-rose-200/80 dark:border-rose-500/20',
    iconColor: 'text-rose-600 dark:text-rose-400',
    accentLine: 'via-rose-500',
    textHover: 'group-hover:text-rose-600 dark:group-hover:text-rose-400',
  },
];

/**
 * Grade de ferramentas de prospecção independentes — uma por API — no mesmo padrão de
 * `IntelligenceHub.tsx` (grid de cards → abre a ferramenta escolhida → botão "Voltar"). Cada
 * ferramenta chama só a integração que representa, sem o encadeamento multi-provider da aba
 * "Radar Discovery".
 */
export function ProspectingToolsHub() {
  const [activeTool, setActiveTool] = useState<ToolId | null>(null);
  const [status, setStatus] = useState<ToolsStatus | null>(null);

  useEffect(() => {
    api
      .get<ToolsStatus>('/api/prospecting/tools/status')
      .then(setStatus)
      .catch(() => setStatus(null));
  }, []);

  if (activeTool === null) {
    return (
      <div className="space-y-6">
        <header>
          <div className="text-[11px] font-bold uppercase tracking-wider text-[#D97706] dark:text-[#FFC107]">
            Fontes & Conectores
          </div>
          <h2 className="font-display text-2xl font-bold text-ink tracking-tight mt-0.5">
            Ferramentas de Prospecção
          </h2>
          <p className="text-sm text-ink-2 mt-1 max-w-2xl">
            Execute consultas e enriquecimento em canais e bases de dados externas isoladamente, sem
            misturar com as outras fontes.
          </p>
        </header>

        <motion.nav
          aria-label="Ferramentas de Prospecção"
          variants={staggerContainer()}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4"
        >
          {TOOL_TABS.map((tool) => {
            const Icon = tool.icon;
            const configured = status?.[tool.statusKey]?.configured;
            return (
              <motion.button
                key={tool.id}
                type="button"
                variants={staggerItem}
                whileHover={{ y: -4 }}
                whileTap={{ scale: 0.98 }}
                transition={SPRING_SOFT}
                onClick={() => setActiveTool(tool.id)}
                className="text-left cursor-pointer group h-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand rounded-2xl"
              >
                <div className="h-full relative overflow-hidden rounded-2xl p-5 flex flex-col justify-between bg-surface border border-line hover:border-line-strong hover:shadow-lg transition-all duration-300">
                  {/* Top highlight accent */}
                  <div
                    className={`absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent ${tool.accentLine} to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300`}
                  />

                  <div>
                    {/* Header: Icon + Category + Badge */}
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div
                        className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 transition-transform duration-300 group-hover:scale-110 shadow-sm ${tool.iconBg} ${tool.iconColor}`}
                      >
                        <Icon size={18} strokeWidth={2} />
                      </div>

                      {status && configured === false ? (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase bg-warn/15 text-warning-active dark:text-warning border border-warn/30">
                          Não configurado
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold tracking-wide bg-ok/15 text-ok-active dark:text-ok border border-ok/30 flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-ok animate-pulse" />
                          Pronto
                        </span>
                      )}
                    </div>

                    {/* Category pill */}
                    <div className="text-[10px] font-semibold uppercase tracking-wider text-ink-2/80 mb-1">
                      {tool.category}
                    </div>

                    {/* Title */}
                    <h3
                      className={`font-display text-base font-bold text-ink ${tool.textHover} transition-colors tracking-tight`}
                    >
                      {tool.label}
                    </h3>

                    {/* Description */}
                    <p className="mt-1.5 text-xs leading-relaxed text-ink-2 line-clamp-3 font-normal">
                      {tool.description}
                    </p>
                  </div>

                  {/* Footer Action */}
                  <div
                    className={`mt-4 pt-3.5 border-t border-line flex items-center justify-between text-xs font-semibold text-ink-2 ${tool.textHover} transition-colors`}
                  >
                    <span>Acessar ferramenta</span>
                    <ArrowRight className="w-3.5 h-3.5 transition-transform duration-300 group-hover:translate-x-1" />
                  </div>
                </div>
              </motion.button>
            );
          })}
        </motion.nav>
      </div>
    );
  }

  // TOOL_TABS lista exaustivamente todo ToolId (7 entradas, uma por variante do union) e
  // activeTool !== null é garantido pelo return antecipado acima — o .find() sempre encontra.
  // TS não expressa essa exaustividade porque TOOL_TABS é um array, não um Record<ToolId, ...>.
  // biome-ignore lint/style/noNonNullAssertion: ver comentário acima
  const activeMeta = TOOL_TABS.find((t) => t.id === activeTool)!;
  const configured = status?.[activeMeta.statusKey]?.configured ?? false;

  return (
    <div className="space-y-6">
      <button
        type="button"
        onClick={() => setActiveTool(null)}
        className="flex items-center gap-2 text-ink-2 hover:text-ink transition-colors group cursor-pointer"
      >
        <div className="p-2 rounded-xl bg-surface-2 border border-line group-hover:bg-surface transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </div>
        <span className="font-bold text-sm">Voltar às Ferramentas</span>
      </button>

      <motion.div key={activeTool} initial="hidden" animate="show" variants={fadeInUp}>
        {activeTool === 'google-places' && <GooglePlacesTool configured={configured} />}
        {activeTool === 'apollo' && <ApolloTool configured={configured} />}
        {activeTool === 'hunter' && <HunterTool configured={configured} />}
        {activeTool === 'linkedin' && <LinkedInTool configured={configured} />}
        {activeTool === 'github' && <GitHubTool configured={configured} />}
        {activeTool === 'news' && <NewsTool configured={configured} />}
        {activeTool === 'youtube' && <YoutubeTool configured={configured} />}
      </motion.div>
    </div>
  );
}
