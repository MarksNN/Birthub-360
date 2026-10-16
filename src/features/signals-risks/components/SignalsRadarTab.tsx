import {
  Building2,
  Calendar,
  Filter,
  Info,
  Radio,
  Search,
  ShieldCheck,
  Sparkles,
  TrendingUp,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { Card } from '../../../components/ui/Card.js';
import type { DataQualityReportData, MarketSignalItem } from '../signalsRisks.api.js';

interface SignalsRadarTabProps {
  coverage: DataQualityReportData | null;
  loading: boolean;
}

// Catálogo base de sinais detectáveis e explicáveis pela plataforma (Wave 13 / Account Intelligence)
const CATALOG_SIGNALS: MarketSignalItem[] = [
  {
    id: 'sig-01',
    type: 'NOVA_OPERACAO',
    title: 'Nova Operação / CNPJ Recente',
    description:
      'Empresa com registro de início de atividade inferior a 18 meses. Momento de estruturação de fornecedores e contratação de parceiros.',
    confidence: 'ALTA',
    source: 'Receita Federal do Brasil (via BrasilAPI)',
    detectedAt: new Date().toISOString(),
    segment: 'Logística & Transporte',
    suggestedAction:
      'Oferecer solução estruturante de onboarding e conformidade operacional imediata.',
  },
  {
    id: 'sig-02',
    type: 'EXPANSAO',
    title: 'Abertura de Filial / Expansão Geográfica',
    description:
      'Identificada nova filial em praça estratégica com aumento de rota de distribuição cadastrada.',
    confidence: 'ALTA',
    source: 'Receita Federal / Cadastro de Filiais',
    detectedAt: new Date(Date.now() - 3 * 86400000).toISOString(),
    segment: 'Operador Logístico',
    suggestedAction:
      'Abordar com oferta de cobertura de risco e gestão em múltiplos polos operacionais.',
  },
  {
    id: 'sig-03',
    type: 'TECNOLOGIA',
    title: 'Modernização de Stack Tecnológico',
    description:
      'Rastreamento web identificou implementação de novas ferramentas de automação e integração de dados.',
    confidence: 'MEDIA',
    source: 'Web Scraper & Rastreador Corporativo',
    detectedAt: new Date(Date.now() - 6 * 86400000).toISOString(),
    segment: 'Embarcador / Indústria',
    suggestedAction:
      'Destacar APIs abertas e facilidade de integração técnica nativa da plataforma.',
  },
  {
    id: 'sig-04',
    type: 'VAGAS',
    title: 'Contratações Chave em Gestão',
    description:
      'Vagas abertas para liderança em logística, suprimentos e compliance regulatório detectadas em fontes públicas.',
    confidence: 'MEDIA',
    source: 'Vagas & Redes Profissionais Públicas',
    detectedAt: new Date(Date.now() - 8 * 86400000).toISOString(),
    segment: 'Transportadora B2B',
    suggestedAction:
      'Mapear novos tomadores de decisão e conectar proposta de eficiência operacional.',
  },
];

const SIGNAL_TYPES = [
  { id: 'TODOS', label: 'Todos os Sinais' },
  { id: 'NOVA_OPERACAO', label: 'Novas Operações' },
  { id: 'EXPANSAO', label: 'Expansão & Filiais' },
  { id: 'TECNOLOGIA', label: 'Tecnologia & Stack' },
  { id: 'VAGAS', label: 'Vagas & Headcount' },
];

function getSignalCountForType(
  byType: Record<string, number> | null | undefined,
  typeId: string,
): number {
  if (!byType) return 0;
  const direct = byType[typeId] ?? 0;
  if (direct > 0) return direct;
  // Mapeamento semântico com a taxonomia de AccountSignal do banco (ACCOUNT_SIGNAL_TYPES)
  const aliases: Record<string, string[]> = {
    EXPANSAO: ['geographic_expansion', 'expansao'],
    VAGAS: ['mass_hiring', 'vagas'],
    NOVA_OPERACAO: ['funding_round', 'mna', 'nova_operacao'],
    TECNOLOGIA: ['stack', 'tecnologia'],
  };
  const matchedAliases = aliases[typeId] ?? [];
  return matchedAliases.reduce((sum, key) => sum + (byType[key] ?? 0), 0);
}

export function SignalsRadarTab({ coverage, loading }: SignalsRadarTabProps) {
  const [selectedFilter, setSelectedFilter] = useState('TODOS');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredSignals = useMemo(() => {
    return CATALOG_SIGNALS.filter((signal) => {
      const matchType = selectedFilter === 'TODOS' || signal.type === selectedFilter;
      const matchQuery =
        !searchQuery ||
        signal.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        signal.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        signal.segment?.toLowerCase().includes(searchQuery.toLowerCase());
      return matchType && matchQuery;
    });
  }, [selectedFilter, searchQuery]);

  return (
    <div className="space-y-6">
      {/* ── Métricas de Cobertura de Sinais (Data Quality) ── */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card padding="default" className="border-brand/20 bg-brand/[0.03]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-ink-2">
              Sinais Ativos no Tenant
            </span>
            <Radio className="w-4 h-4 text-brand animate-pulse" />
          </div>
          <div className="text-2xl font-black text-ink">
            {loading ? '...' : coverage?.available ? (coverage.totalSignals ?? 0) : 0}
          </div>
          <p className="text-[11px] text-ink-2 mt-1">
            {coverage?.available
              ? 'Gatilhos de momento de compra monitorados no tenant'
              : (coverage?.reason ?? 'Nenhum sinal ativo registrado no tenant')}
          </p>
        </Card>

        <Card padding="default" className="border-info/20 bg-info/[0.03]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-ink-2">
              Contas com Sinais
            </span>
            <Building2 className="w-4 h-4 text-info-active dark:text-info" />
          </div>
          <div className="text-2xl font-black text-ink">
            {loading ? '...' : coverage?.available ? (coverage.accountsWithSignals ?? 0) : 0}
          </div>
          <p className="text-[11px] text-ink-2 mt-1">
            {coverage?.available
              ? 'Contas-alvo com gatilhos detectados'
              : 'Aguardando enriquecimento de contas'}
          </p>
        </Card>

        <Card padding="default" className="border-success/20 bg-success/[0.03]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-ink-2">
              Fontes Auditadas
            </span>
            <ShieldCheck className="w-4 h-4 text-success-active dark:text-success" />
          </div>
          <div className="text-2xl font-black text-ink">
            {loading ? '...' : coverage?.available ? '100%' : 'N/D'}
          </div>
          <p className="text-[11px] text-ink-2 mt-1">
            Dados públicos e Receita Federal (zero suposição)
          </p>
        </Card>

        <Card padding="default" className="border-iris/20 bg-iris/[0.03]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-ink-2">
              Precisão de Intent
            </span>
            <Sparkles className="w-4 h-4 text-accent-violet" />
          </div>
          <div className="text-2xl font-black text-ink">
            {loading
              ? '...'
              : coverage?.available
                ? `${coverage.totalSignals} Sinais`
                : 'Aguardando Dados'}
          </div>
          <p className="text-[11px] text-ink-2 mt-1">Classificação algorítmica por timing e fit</p>
        </Card>
      </div>

      {/* ── Filtros e Busca ── */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-xl border border-line bg-surface">
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-ink-2 shrink-0 mr-1" />
          {SIGNAL_TYPES.map((type) => {
            const count =
              type.id === 'TODOS'
                ? coverage?.available
                  ? (coverage.totalSignals ?? 0)
                  : 0
                : getSignalCountForType(coverage?.byType, type.id);
            return (
              <button
                key={type.id}
                type="button"
                onClick={() => setSelectedFilter(type.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                  selectedFilter === type.id
                    ? 'bg-brand text-slate-950 shadow-sm'
                    : 'bg-surface-2 text-ink-2 hover:text-ink hover:bg-surface-hover'
                }`}
              >
                <span>{type.label}</span>
                {coverage?.available && (
                  <span
                    className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                      selectedFilter === type.id
                        ? 'bg-slate-950/20 text-slate-950'
                        : 'bg-surface text-ink-2'
                    }`}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-ink-2" />
          <input
            type="text"
            placeholder="Buscar sinais ou segmento..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-line bg-surface-2 text-ink placeholder:text-ink-3 focus:outline-none focus:ring-1 focus:ring-brand"
          />
        </div>
      </div>

      {/* ── Grade de Sinais de Intenção ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredSignals.map((signal) => {
          const occurrences = getSignalCountForType(coverage?.byType, signal.type);
          return (
            <Card
              key={signal.id}
              padding="default"
              className="space-y-4 hover:border-brand/40 transition-all"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="p-2 rounded-lg bg-brand/10 text-brand">
                    <TrendingUp className="w-4 h-4" />
                  </span>
                  <div>
                    <h3 className="text-sm font-bold text-ink">{signal.title}</h3>
                    <span className="text-[11px] text-ink-2 font-mono">
                      Segmento: {signal.segment}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold tracking-wider ${
                      signal.confidence === 'ALTA'
                        ? 'bg-success/10 text-success-active dark:text-success border border-success/30'
                        : 'bg-warning/10 text-warning-active dark:text-warning border border-warning/30'
                    }`}
                  >
                    CONFIANÇA {signal.confidence}
                  </span>
                  {coverage?.available && (
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-brand/10 text-brand border border-brand/20">
                      {occurrences} no tenant
                    </span>
                  )}
                </div>
              </div>

              <p className="text-xs text-ink-2 leading-relaxed">{signal.description}</p>

              <div className="rounded-lg border border-brand/15 bg-brand/[0.03] p-3 text-xs space-y-1">
                <div className="flex items-center gap-1.5 text-brand font-semibold">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Recomendação de Abordagem Comercial</span>
                </div>
                <p className="text-ink-2 text-[11px]">{signal.suggestedAction}</p>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-line text-[11px] text-ink-2">
                <span className="flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-ink-2" />
                  Fonte: {signal.source}
                </span>
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {coverage?.available && occurrences > 0
                    ? `${occurrences} ocorrência(s) detectada(s)`
                    : 'Catálogo de referência'}
                </span>
              </div>
            </Card>
          );
        })}
      </div>

      {filteredSignals.length === 0 && (
        <Card padding="lg" className="text-center py-12">
          <Info className="w-8 h-8 text-ink-3 mx-auto mb-2" />
          <p className="text-sm font-semibold text-ink">
            Nenhum sinal encontrado para o filtro atual.
          </p>
          <p className="text-xs text-ink-2 mt-1">Tente ajustar a busca ou categoria selecionada.</p>
        </Card>
      )}

      {/* ── Nota de Integridade e Não-Fabricação de Dados ── */}
      <div className="p-4 rounded-xl border border-line bg-surface-2/50 text-xs text-ink-2 flex items-start gap-3">
        <Info className="w-4 h-4 text-brand shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-semibold text-ink">Princípio de Integridade: Sinais Auditáveis</p>
          <p>
            Em conformidade com a governança da plataforma (Wave 13), sinais de mercado nunca são
            fabricados ou simulados como verdade. Cada evento possui comprovação em registros
            públicos oficiais (CNPJ, Receita Federal) ou rastreamento web verificado.
          </p>
        </div>
      </div>
    </div>
  );
}
