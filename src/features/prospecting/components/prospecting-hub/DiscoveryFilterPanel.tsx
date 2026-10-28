import { AnimatePresence, motion } from 'framer-motion';
import {
  ChevronDown,
  ChevronUp,
  Cpu,
  Database,
  Loader2,
  Plus,
  Search,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import { useState } from 'react';
import { fadeIn } from '../../../../lib/motion.js';
import {
  ESTADO_OPTIONS,
  PORTE_OPTIONS,
  TECNOLOGIA_OPTIONS,
} from '../../../../shared/constants/icp-options.js';
import type { ProspectCriteria } from '../../services/prospecting.service.js';
import { PersonaForm, SegmentDetailsForm, TurboField } from './TurboCriteriaForms.js';

type PersonaOption = {
  label: string;
  nivel: string;
  titles: string;
  seniorities: readonly string[];
};

export function DiscoveryFilterPanel({
  criteria,
  setCriteria,
  activeSegments,
  activePersonaOptions,
  cities,
  showAdvanced,
  setShowAdvanced,
  isSearching,
  discoverError,
  onDiscover,
  onInterpret,
  isInterpreting,
  interpretationMessage,
}: {
  criteria: ProspectCriteria;
  setCriteria: (criteria: ProspectCriteria) => void;
  activeSegments: readonly string[];
  activePersonaOptions: readonly PersonaOption[];
  cities: string[];
  showAdvanced: boolean;
  setShowAdvanced: (updater: (v: boolean) => boolean) => void;
  isSearching: boolean;
  discoverError: string | null;
  onDiscover: () => void;
  onInterpret: (query: string, mode: 'automatic' | 'groq' | 'local', model?: string) => void;
  isInterpreting: boolean;
  interpretationMessage: string | null;
}) {
  const [query, setQuery] = useState('');
  const [aiMode, setAiMode] = useState<'automatic' | 'groq' | 'local'>('automatic');
  const [aiModel, setAiModel] = useState('');
  const [aiConsent, setAiConsent] = useState(false);
  const cargos = criteria.decisorCargos ?? [];

  const addCargoRow = () => setCriteria({ ...criteria, decisorCargos: [...cargos, ''] });

  const updateCargoRow = (index: number, value: string) => {
    const next = [...cargos];
    next[index] = value;
    setCriteria({ ...criteria, decisorCargos: next });
  };

  const removeCargoRow = (index: number) => {
    setCriteria({ ...criteria, decisorCargos: cargos.filter((_, i) => i !== index) });
  };

  const addPersonaSuggestion = (persona: PersonaOption) => {
    const titles = persona.titles
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);
    const existing = new Set(cargos.map((c) => c.trim().toLowerCase()).filter(Boolean));
    const additions = titles.filter((t) => !existing.has(t.toLowerCase()));
    if (additions.length === 0) return;
    setCriteria({ ...criteria, decisorCargos: [...cargos, ...additions] });
  };

  return (
    <div
      data-accent="cyan"
      className="bh-platform-card xl:col-span-4 bg-surface p-6 sm:p-8 rounded-2xl border border-line shadow-sm relative overflow-hidden flex flex-col h-full xl:max-h-[900px]"
    >
      <div className="flex items-center gap-2 mb-6 relative z-10">
        <div className="w-8 h-8 rounded-lg bg-brand/10 flex items-center justify-center text-brand-ink dark:text-brand">
          <Database size={18} />
        </div>
        <h2 className="font-display font-bold text-xl text-ink">🗺️ Motor de Busca Turbo</h2>
      </div>
      <p className="text-xs text-ink-2 mb-3 relative z-10">
        Busca real via Google Maps, OpenStreetMap e Apollo quando as integrações estão habilitadas.
      </p>

      <div className="space-y-4 relative z-10 flex-1 overflow-y-auto pr-2">
        <div className="space-y-3 p-3 rounded-xl border border-line bg-surface-2/50">
          <span className="block text-[10px] tracking-wider font-bold uppercase text-ink-2">
            ICP (Perfil de Cliente Ideal)
          </span>

          <div>
            <label
              htmlFor="discovery-segmento"
              className="block text-[10px] tracking-wider font-bold uppercase mb-1.5 text-ink-2"
            >
              Segmento
            </label>
            <input
              id="discovery-segmento"
              type="text"
              list="discovery-segmento-suggestions"
              placeholder="Ex: mercado, academia, matadouro... (em branco = todos)"
              className="w-full p-3 bg-surface rounded-xl border border-line outline-none focus:border-brand focus:ring-1 focus:ring-brand transition-colors text-sm font-medium text-ink placeholder-ink-2"
              value={criteria.segmento || ''}
              onChange={(e) => setCriteria({ ...criteria, segmento: e.target.value })}
            />
            <datalist id="discovery-segmento-suggestions">
              {activeSegments.map((seg) => (
                <option key={seg} value={seg} />
              ))}
            </datalist>
          </div>

          <SegmentDetailsForm criteria={criteria} setCriteria={setCriteria} />

          <div>
            <div>
              <label
                htmlFor="discovery-porte"
                className="block text-[10px] tracking-wider font-bold uppercase mb-1.5 text-ink-2"
              >
                Tamanho (nº funcionários)
              </label>
              <select
                id="discovery-porte"
                className="w-full p-3 bg-surface rounded-xl border border-line outline-none focus:border-brand focus:ring-1 focus:ring-brand transition-colors text-sm font-medium text-ink"
                value={criteria.porte || ''}
                onChange={(e) => setCriteria({ ...criteria, porte: e.target.value || undefined })}
              >
                {PORTE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label
                htmlFor="discovery-estado"
                className="block text-[10px] tracking-wider font-bold uppercase mb-1.5 text-ink-2"
              >
                Estado
              </label>
              <select
                id="discovery-estado"
                className="w-full p-3 bg-surface rounded-xl border border-line outline-none focus:border-brand focus:ring-1 focus:ring-brand transition-colors text-sm font-medium text-ink"
                value={criteria.estado || ''}
                onChange={(e) => {
                  const estado = e.target.value;
                  setCriteria({
                    ...criteria,
                    estado,
                    localizacao: criteria.cidade
                      ? `${criteria.cidade}, ${estado}`
                      : estado || criteria.localizacao,
                  });
                }}
              >
                <option value="">Todos os estados</option>
                {ESTADO_OPTIONS.map((uf) => (
                  <option key={uf} value={uf}>
                    {uf}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label
                htmlFor="discovery-cidade"
                className="block text-[10px] tracking-wider font-bold uppercase mb-1.5 text-ink-2"
              >
                Cidade (opcional)
              </label>
              {cities.length > 0 ? (
                <select
                  id="discovery-cidade"
                  className="w-full p-3 bg-surface rounded-xl border border-line outline-none focus:border-brand focus:ring-1 focus:ring-brand transition-colors text-sm font-medium text-ink"
                  value={criteria.cidade || ''}
                  onChange={(e) => {
                    const cidade = e.target.value;
                    setCriteria({
                      ...criteria,
                      cidade: cidade || undefined,
                      localizacao: cidade
                        ? criteria.estado
                          ? `${cidade}, ${criteria.estado}`
                          : cidade
                        : criteria.estado || '',
                    });
                  }}
                >
                  <option value="">Todas as cidades</option>
                  {cities.map((city) => (
                    <option key={city} value={city}>
                      {city}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  id="discovery-cidade"
                  type="text"
                  placeholder="Selecione um estado..."
                  className="w-full p-3 bg-surface rounded-xl border border-line outline-none focus:border-brand focus:ring-1 focus:ring-brand transition-colors text-sm font-medium text-ink placeholder-ink-2"
                  value={criteria.cidade || ''}
                  onChange={(e) => {
                    const cidade = e.target.value;
                    setCriteria({
                      ...criteria,
                      cidade,
                      localizacao: cidade
                        ? criteria.estado
                          ? `${cidade}, ${criteria.estado}`
                          : cidade
                        : criteria.estado || '',
                    });
                  }}
                />
              )}
            </div>
          </div>

          <div>
            <label
              htmlFor="discovery-palavra-chave"
              className="block text-[10px] tracking-wider font-bold uppercase mb-1.5 text-ink-2"
            >
              Palavra-chave
            </label>
            <input
              id="discovery-palavra-chave"
              type="text"
              placeholder="Ex: refrigerated, cargo, fleet"
              value={criteria.palavrasChave || ''}
              onChange={(e) =>
                setCriteria({ ...criteria, palavrasChave: e.target.value || undefined })
              }
              className="w-full p-3 bg-surface rounded-xl border border-line outline-none focus:border-brand focus:ring-1 focus:ring-brand transition-colors text-sm font-medium text-ink"
            />
            <p className="text-[10px] text-ink-2 mt-1">
              Separadas por vírgula — somam ao segmento na busca da Apollo.
            </p>
          </div>

          <div>
            <label
              htmlFor="discovery-faturamento-min"
              className="block text-[10px] tracking-wider font-bold uppercase mb-1.5 text-ink-2"
            >
              Faturamento Anual Estimado (USD)
            </label>
            <div className="flex gap-2">
              <input
                id="discovery-faturamento-min"
                type="number"
                placeholder="Mínimo"
                value={criteria.faturamentoMin ?? ''}
                onChange={(e) =>
                  setCriteria({
                    ...criteria,
                    faturamentoMin: e.target.value ? Number(e.target.value) : undefined,
                  })
                }
                className="w-full p-3 bg-surface rounded-xl border border-line outline-none focus:border-brand focus:ring-1 focus:ring-brand transition-colors text-sm font-medium text-ink"
              />
              <input
                type="number"
                placeholder="Máximo"
                value={criteria.faturamentoMax ?? ''}
                onChange={(e) =>
                  setCriteria({
                    ...criteria,
                    faturamentoMax: e.target.value ? Number(e.target.value) : undefined,
                  })
                }
                className="w-full p-3 bg-surface rounded-xl border border-line outline-none focus:border-brand focus:ring-1 focus:ring-brand transition-colors text-sm font-medium text-ink"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="discovery-faturamento-mensal-min"
              className="block text-[10px] tracking-wider font-bold uppercase mb-1.5 text-ink-2"
            >
              Faturamento Mensal Estimado (USD)
            </label>
            <div className="flex gap-2">
              <input
                id="discovery-faturamento-mensal-min"
                type="number"
                placeholder="Mínimo"
                value={criteria.faturamentoMensalMin ?? ''}
                onChange={(e) =>
                  setCriteria({
                    ...criteria,
                    faturamentoMensalMin: e.target.value ? Number(e.target.value) : undefined,
                  })
                }
                className="w-full p-3 bg-surface rounded-xl border border-line outline-none focus:border-brand focus:ring-1 focus:ring-brand transition-colors text-sm font-medium text-ink"
              />
              <input
                type="number"
                placeholder="Máximo"
                value={criteria.faturamentoMensalMax ?? ''}
                onChange={(e) =>
                  setCriteria({
                    ...criteria,
                    faturamentoMensalMax: e.target.value ? Number(e.target.value) : undefined,
                  })
                }
                className="w-full p-3 bg-surface rounded-xl border border-line outline-none focus:border-brand focus:ring-1 focus:ring-brand transition-colors text-sm font-medium text-ink"
              />
            </div>
            <p className="text-[10px] text-ink-2 mt-1">
              Convertido para faixa anual (×12) — a Apollo só reconhece faturamento anual.
            </p>
          </div>

          <div>
            <label
              htmlFor="discovery-icp-detalhe"
              className="block text-[10px] tracking-wider font-bold uppercase mb-1.5 text-ink-2"
            >
              Detalhes adicionais (opcional)
            </label>
            <textarea
              id="discovery-icp-detalhe"
              placeholder="Ex: sofrem com roubo de carga, frota própria..."
              className="w-full p-3 bg-surface rounded-xl border border-line outline-none focus:border-brand focus:ring-1 focus:ring-brand transition-colors text-sm font-medium text-ink placeholder-ink-2 resize-none"
              rows={2}
              value={criteria.icp || ''}
              onChange={(e) => setCriteria({ ...criteria, icp: e.target.value })}
            />
          </div>
        </div>

        <div>
          <span className="block text-[10px] tracking-wider font-bold uppercase mb-1.5 text-ink-2">
            Cargos adicionais do decisor
          </span>

          {activePersonaOptions.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-2">
              {activePersonaOptions.map((persona) => (
                <button
                  key={persona.label}
                  type="button"
                  title={persona.nivel}
                  onClick={() => addPersonaSuggestion(persona)}
                  className="px-2 py-1 rounded-md text-[11px] font-medium border border-line bg-surface text-ink-2 hover:border-brand/40 hover:text-brand transition-colors"
                >
                  + {persona.label}
                </button>
              ))}
            </div>
          )}

          <div className="space-y-2">
            <AnimatePresence initial={false}>
              {cargos.map((cargo, index) => (
                <motion.div
                  key={index}
                  variants={fadeIn}
                  initial="hidden"
                  animate="show"
                  exit="hidden"
                  className="flex gap-2"
                >
                  <input
                    aria-label={`Cargo do decisor ${index + 1}`}
                    type="text"
                    placeholder="Ex: Diretor de Logística"
                    value={cargo}
                    onChange={(e) => updateCargoRow(index, e.target.value)}
                    className="w-full p-3 bg-surface-2 rounded-xl border border-line outline-none focus:border-brand focus:ring-1 focus:ring-brand transition-colors text-sm font-medium text-ink placeholder-ink-2"
                  />
                  <button
                    type="button"
                    onClick={() => removeCargoRow(index)}
                    aria-label={`Remover cargo ${index + 1}`}
                    className="shrink-0 w-11 flex items-center justify-center rounded-xl border border-line text-ink-2 hover:border-danger/50 hover:text-danger-active dark:hover:text-danger transition-colors"
                  >
                    <X size={16} />
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>

            <button
              type="button"
              onClick={addCargoRow}
              className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-dashed border-line text-xs font-bold text-ink-2 hover:border-brand/40 hover:text-brand transition-colors"
            >
              <Plus size={14} /> Adicionar cargo
            </button>
          </div>
        </div>

        <PersonaForm criteria={criteria} setCriteria={setCriteria} />
        <TurboField
          id="turbo-cnpj"
          label="CNPJ (consulta cadastral exata)"
          value={criteria.cnpj}
          onChange={(value) => setCriteria({ ...criteria, cnpj: value || undefined })}
        />

        <div>
          <label
            htmlFor="discovery-pesquisar"
            className="block text-[10px] tracking-wider font-bold uppercase mb-1.5 text-ink-2"
          >
            Pesquisar por nome ou empresa
          </label>
          <div className="relative">
            <Search
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-2 pointer-events-none"
            />
            <input
              id="discovery-pesquisar"
              type="search"
              placeholder="Ex: Transportadora ABC, armazém..."
              value={criteria.nomeEmpresa || ''}
              onChange={(e) =>
                setCriteria({ ...criteria, nomeEmpresa: e.target.value || undefined })
              }
              onKeyDown={(e) => e.key === 'Enter' && onDiscover()}
              className="w-full py-3 pl-9 pr-3 bg-surface-2 rounded-xl border border-line outline-none focus:border-brand focus:ring-1 focus:ring-brand transition-colors text-sm font-medium text-ink"
            />
          </div>
          <p className="text-[10px] text-ink-2 mt-1">
            Refina Google Maps, Apollo e OpenStreetMap pelo nome informado.
          </p>
        </div>

        <fieldset className="space-y-3 border-t border-line pt-3">
          <legend className="text-sm font-semibold text-ink">Pesquisa em linguagem natural</legend>
          <TurboField
            id="turbo-query"
            label="Descreva sua pesquisa"
            maxLength={2000}
            value={query}
            onChange={setQuery}
          />
          <label htmlFor="turbo-ai-mode" className="block text-xs text-ink-2">
            Provedor de IA
            <select
              id="turbo-ai-mode"
              value={aiMode}
              onChange={(e) => setAiMode(e.target.value as typeof aiMode)}
              className="w-full p-3 rounded-xl bg-surface border border-line text-ink"
            >
              <option value="automatic">Automático</option>
              <option value="groq">Groq</option>
              <option value="local">Local (Ollama)</option>
            </select>
          </label>
          <TurboField
            id="turbo-ai-model"
            label="Modelo de IA (opcional)"
            maxLength={120}
            value={aiModel}
            onChange={setAiModel}
          />
          <p className="text-sm leading-[1.7] text-ink-2">
            Deixe vazio para seleção automática. O modelo precisa estar disponível no provedor; Groq
            exige preço cadastrado. Consulte os modelos em Central de provedores → Testar conexões
            autorizadas.
          </p>
          <label className="flex gap-2 text-xs text-ink-2">
            <input
              type="checkbox"
              checked={aiConsent}
              onChange={(e) => setAiConsent(e.target.checked)}
            />
            Autorizo enviar somente esta descrição ao provedor de IA escolhido. Não inclua dados
            pessoais ou segredos.
          </label>
          <button
            type="button"
            disabled={
              !aiConsent ||
              !query.trim() ||
              query.length > 2000 ||
              aiModel.length > 120 ||
              isInterpreting ||
              isSearching
            }
            onClick={() => onInterpret(query, aiMode, aiModel.trim() || undefined)}
            className="w-full p-3 rounded-xl border border-line text-sm text-ink disabled:opacity-50"
          >
            {isInterpreting ? 'Interpretando...' : 'Interpretar e preencher filtros'}
          </button>
          {interpretationMessage && (
            <p role="status" className="text-xs text-ink-2">
              {interpretationMessage}
            </p>
          )}
          <p className="text-sm leading-[1.7] text-ink-2">
            Confira os filtros preenchidos antes de pesquisar. A IA interpreta a solicitação; dados
            empresariais vêm das fontes consultadas.
          </p>
        </fieldset>
        <fieldset className="space-y-3 border-t border-line pt-3">
          <legend className="text-sm font-semibold text-ink">Fontes e custo</legend>
          <label htmlFor="turbo-search-mode" className="block text-xs text-ink-2">
            Modo de pesquisa
            <select
              id="turbo-search-mode"
              value={criteria.modoPesquisa ?? 'economico'}
              onChange={(e) =>
                setCriteria({
                  ...criteria,
                  modoPesquisa: e.target.value as ProspectCriteria['modoPesquisa'],
                })
              }
              className="w-full p-3 rounded-xl bg-surface border border-line text-ink"
            >
              <option value="economico">Econômico</option>
              <option value="equilibrado">Equilibrado</option>
              <option value="completo">Completo</option>
            </select>
          </label>
          <label className="flex gap-2 text-xs text-ink-2">
            <input
              type="checkbox"
              checked={!!criteria.autorizarPagos}
              onChange={(e) => setCriteria({ ...criteria, autorizarPagos: e.target.checked })}
            />
            Autorizar provedores que podem consumir créditos, dentro dos limites configurados.
          </label>
          <p className="text-sm leading-[1.7] text-ink-2">
            Sem autorização, operações pagas não são executadas. O modo não garante gratuidade ou
            completude. Os resultados são ampliados pela próxima página, respeitando cotas.
          </p>
        </fieldset>
        <button
          type="button"
          className="py-2 text-xs text-ink-2 underline"
          disabled={isSearching}
          onClick={() =>
            setCriteria({
              segmento: '',
              localizacao: '',
              quantidade: 20,
              modoPesquisa: 'economico',
              autorizarPagos: false,
            })
          }
        >
          Limpar todos os filtros
        </button>
        <button
          type="button"
          aria-expanded={showAdvanced}
          onClick={() => setShowAdvanced((v) => !v)}
          className="flex items-center justify-between w-full text-[10px] tracking-wider font-bold uppercase text-ink-2 hover:text-brand transition-colors pt-2"
        >
          <span className="flex items-center gap-1.5">
            <SlidersHorizontal size={12} /> Filtros Avançados (Apollo.io)
          </span>
          {showAdvanced ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>

        {showAdvanced && (
          <div className="space-y-4 pt-1">
            {(['dominios', 'dominiosExcluir', 'organizacaoIds', 'funcionariosFaixas'] as const).map(
              (key, index) => (
                <TurboField
                  key={key}
                  id={`apollo-${key}`}
                  label={
                    [
                      'Domínios (separados por vírgula)',
                      'Excluir domínios (separados por vírgula)',
                      'IDs de organizações Apollo (separados por vírgula)',
                      'Faixas de funcionários (ex.: 11,50;51,200)',
                    ][index]
                  }
                  value={(criteria.apolloFiltros?.[key] ?? []).join(
                    key === 'funcionariosFaixas' ? ';' : ',',
                  )}
                  onChange={(value) =>
                    setCriteria({
                      ...criteria,
                      apolloFiltros: {
                        ...criteria.apolloFiltros,
                        [key]: value.split(key === 'funcionariosFaixas' ? ';' : ','),
                      },
                    })
                  }
                />
              ),
            )}
            {(
              [
                'financiamentoTotalMin',
                'financiamentoTotalMax',
                'ultimaRodadaMin',
                'ultimaRodadaMax',
              ] as const
            ).map((key, index) => (
              <TurboField
                key={key}
                id={`apollo-${key}`}
                label={
                  [
                    'Financiamento total mínimo (USD)',
                    'Financiamento total máximo (USD)',
                    'Última rodada mínima (USD)',
                    'Última rodada máxima (USD)',
                  ][index]
                }
                type="number"
                value={criteria.apolloFiltros?.[key]}
                onChange={(value) =>
                  setCriteria({
                    ...criteria,
                    apolloFiltros: {
                      ...criteria.apolloFiltros,
                      [key]: value ? Number(value) : undefined,
                    },
                  })
                }
              />
            ))}
            <details className="space-y-2">
              <summary className="cursor-pointer py-2 text-sm font-semibold text-ink">
                Pesos do score ICP
              </summary>
              <p className="text-sm leading-[1.7] text-ink-2">
                Pesos relativos entre os critérios efetivamente avaliados. Dados não confirmados
                recebem zero pontos.
              </p>
              {(
                [
                  ['segment', 'Segmento'],
                  ['state', 'Estado'],
                  ['city', 'Cidade'],
                  ['annualRevenue', 'Faturamento anual'],
                  ['foundedYear', 'Fundação'],
                  ['technologies', 'Tecnologias'],
                  ['decisionMakerTitles', 'Cargo do decisor'],
                ] as const
              ).map(([key, label]) => (
                <TurboField
                  key={key}
                  id={`icp-weight-${key}`}
                  label={label}
                  type="number"
                  value={criteria.icpPesos?.[key] ?? 1}
                  onChange={(value) =>
                    setCriteria({
                      ...criteria,
                      icpPesos: {
                        ...criteria.icpPesos,
                        [key]: Math.min(100, Math.max(0, Number(value) || 0)),
                      },
                    })
                  }
                />
              ))}
            </details>
            <p className="text-sm leading-[1.7] text-ink-2">
              Filtros Apollo dependem das permissões do plano. Filtros brasileiros são avaliados
              pelas fontes cadastrais, não enviados ao Apollo.
            </p>
            <div>
              <label
                htmlFor="discovery-ano-min"
                className="block text-[10px] tracking-wider font-bold uppercase mb-1.5 text-ink-2"
              >
                Ano de Fundação (Mín e Máx)
              </label>
              <div className="flex gap-2">
                <input
                  id="discovery-ano-min"
                  type="number"
                  placeholder="De"
                  value={criteria.anoFundacaoMin ?? ''}
                  onChange={(e) =>
                    setCriteria({
                      ...criteria,
                      anoFundacaoMin: e.target.value ? Number(e.target.value) : undefined,
                    })
                  }
                  className="w-full p-3 bg-surface-2 rounded-xl border border-line outline-none focus:border-brand focus:ring-1 focus:ring-brand transition-colors text-sm font-medium text-ink"
                />
                <input
                  aria-label="Ano máximo de fundação"
                  type="number"
                  placeholder="Até"
                  value={criteria.anoFundacaoMax ?? ''}
                  onChange={(e) =>
                    setCriteria({
                      ...criteria,
                      anoFundacaoMax: e.target.value ? Number(e.target.value) : undefined,
                    })
                  }
                  className="w-full p-3 bg-surface-2 rounded-xl border border-line outline-none focus:border-brand focus:ring-1 focus:ring-brand transition-colors text-sm font-medium text-ink"
                />
              </div>
              <p className="text-[10px] text-ink-2 mt-1">
                A Apollo não filtra por ano nativamente — buscamos mais candidatos e filtramos
                localmente por fundação real.
              </p>
            </div>
            <div>
              <span
                id="tech-included-label"
                className="block text-[10px] tracking-wider font-bold uppercase mb-1.5 text-ink-2"
              >
                Tecnologias Utilizadas
              </span>
              {/* Toolbar de chips toggle (não campos de formulário) — <fieldset> não traria
                  ganho real de acessibilidade aqui, só estilo. */}
              {/* biome-ignore lint/a11y/useSemanticElements: ver comentário acima */}
              <div
                role="group"
                aria-labelledby="tech-included-label"
                className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto p-2 bg-surface-2 rounded-xl border border-line"
              >
                {TECNOLOGIA_OPTIONS.map((opt) => {
                  const selected = (criteria.tecnologias || '')
                    .split(',')
                    .filter(Boolean)
                    .includes(opt.value);
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => {
                        const current = (criteria.tecnologias || '').split(',').filter(Boolean);
                        const next = selected
                          ? current.filter((v) => v !== opt.value)
                          : [...current, opt.value];
                        setCriteria({
                          ...criteria,
                          tecnologias: next.length ? next.join(',') : undefined,
                        });
                      }}
                      className={`px-2 py-1 rounded-md text-[11px] font-medium border transition-colors ${selected ? 'bg-brand-active border-brand-active text-on-brand' : 'bg-surface border-line text-ink-2 hover:border-brand/40'}`}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
              <p className="text-[10px] text-ink-2 mt-1">
                Lista curada e validada contra a API — a Apollo só filtra por identificador interno,
                não por nome livre.
              </p>
            </div>
            <div>
              <p className="text-sm leading-[1.7] text-ink-2">
                Exclusão de tecnologias indisponível no contrato atual Apollo.
              </p>
              <span
                id="tech-excluded-label"
                className="block text-[10px] tracking-wider font-bold uppercase mb-1.5 text-ink-2"
              >
                Excluir Tecnologias
              </span>
              {/* Toolbar de chips toggle (não campos de formulário) — <fieldset> não traria
                  ganho real de acessibilidade aqui, só estilo. */}
              {/* biome-ignore lint/a11y/useSemanticElements: ver comentário acima */}
              <div
                role="group"
                aria-labelledby="tech-excluded-label"
                className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto p-2 bg-surface-2 rounded-xl border border-line"
              >
                {TECNOLOGIA_OPTIONS.map((opt) => {
                  const selected = (criteria.tecnologiasExcluir || '')
                    .split(',')
                    .filter(Boolean)
                    .includes(opt.value);
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      aria-pressed={selected}
                      disabled
                      title="Filtro indisponível no contrato atual Apollo"
                      onClick={() => {
                        const current = (criteria.tecnologiasExcluir || '')
                          .split(',')
                          .filter(Boolean);
                        const next = selected
                          ? current.filter((v) => v !== opt.value)
                          : [...current, opt.value];
                        setCriteria({
                          ...criteria,
                          tecnologiasExcluir: next.length ? next.join(',') : undefined,
                        });
                      }}
                      className={`px-2 py-1 rounded-md text-[11px] font-medium border transition-colors ${selected ? 'bg-btn-danger border-btn-danger text-[#F8F9FF]' : 'bg-surface-2 border-line text-ink-2 hover:border-danger/50'}`}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
              <p className="text-[10px] text-ink-2 mt-1">
                Útil para descartar empresas que já usam a solução de um concorrente, por exemplo.
              </p>
            </div>
            <div>
              <label
                htmlFor="discovery-localizacao-excluir"
                className="block text-[10px] tracking-wider font-bold uppercase mb-1.5 text-ink-2"
              >
                Excluir Localização
              </label>
              <input
                id="discovery-localizacao-excluir"
                type="text"
                placeholder="Ex: São Paulo, Minas Gerais"
                value={criteria.localizacaoExcluir || ''}
                onChange={(e) =>
                  setCriteria({ ...criteria, localizacaoExcluir: e.target.value || undefined })
                }
                className="w-full p-3 bg-surface-2 rounded-xl border border-line outline-none focus:border-brand focus:ring-1 focus:ring-brand transition-colors text-sm font-medium text-ink"
              />
              <p className="text-[10px] text-ink-2 mt-1">
                Cidades/estados a descartar, separados por vírgula.
              </p>
            </div>
            <label className="flex items-center gap-2 cursor-pointer text-sm text-ink-2 pt-1">
              <input
                type="checkbox"
                checked={!!criteria.apenasCapitalAberto}
                disabled
                title="Filtro indisponível no contrato atual Apollo"
                onChange={(e) =>
                  setCriteria({ ...criteria, apenasCapitalAberto: e.target.checked || undefined })
                }
                className="rounded border-line text-brand focus:ring-brand"
              />
              Somente capital aberto — indisponível no contrato atual Apollo
            </label>
          </div>
        )}
      </div>

      <div className="pt-6 mt-2 relative z-10 border-t border-line">
        <button
          type="button"
          id="btn-discover"
          onClick={onDiscover}
          disabled={isSearching}
          className="w-full bg-brand text-on-brand py-4 rounded-xl font-bold hover:brightness-110 disabled:opacity-80 transition-colors flex items-center justify-center gap-2 shadow-lg shadow-brand/20"
        >
          {isSearching ? (
            <>
              <Loader2 className="animate-spin" size={20} /> <span>⏳ Buscando...</span>
            </>
          ) : (
            <>
              <Cpu size={20} /> <span>🚀 Encontrar Leads Ideais</span>
            </>
          )}
        </button>
        {discoverError && (
          <p role="alert" className="text-xs text-danger-active dark:text-ink mt-2">
            {discoverError}
          </p>
        )}
      </div>
    </div>
  );
}
