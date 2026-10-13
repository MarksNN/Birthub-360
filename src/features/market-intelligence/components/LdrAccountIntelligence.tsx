import {
  AlertTriangle,
  Bot,
  Building2,
  Database,
  FileSearch,
  Loader2,
  Search,
  ShieldCheck,
  Target,
  Users,
  Zap,
} from 'lucide-react';
import { type FormEvent, useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';

type Capability = {
  status: 'AVAILABLE' | 'PARTIAL' | 'NOT_AVAILABLE';
  items: unknown[];
  message: string;
};

type LdrAccount = {
  version: string;
  generatedAt: string;
  identity: {
    marketIntelligenceCompanyId: string;
    cnpj: string;
    legalName: string;
    tradeName: string | null;
    branchType: string | null;
    registrationStatus: string | null;
    primaryCnae: string | null;
    primaryCnaeDescription: string | null;
    size: string | null;
    capitalSocial: string | null;
    municipalityIbge: string | null;
    municipality: string | null;
    uf: string | null;
  };
  qualification: {
    status: 'AVAILABLE' | 'NOT_AVAILABLE';
    icpTier: string | null;
    fitScore: number | null;
    reasons: string[];
    taxonomyVersion: string | null;
    calculatedAt: string | null;
  };
  accountScore: {
    status: 'AVAILABLE' | 'PARTIAL' | 'NOT_AVAILABLE';
    total: number | null;
    components: {
      fit: number | null;
      intent: number | null;
      timing: number | null;
      relationship: number | null;
    };
    missingComponents: string[];
    explanation: string;
  };
  signals: Capability;
  decisionMakers: Capability;
  economicGroup: Capability;
  crm: {
    status: string;
    companyId: string | null;
    message: string;
  };
  nextBestAction: {
    status: 'READY' | 'BLOCKED';
    action: unknown | null;
    reasons: string[];
    message: string;
  };
  provenance: {
    source: string;
    sourceVersion?: string | null;
    sourceUrl?: string | null;
    competencia: string;
    datasetHash?: string;
    pipelineVersion?: string;
    companyFields: string;
    icp: string;
    publicContact: string;
    evidencePolicy: string;
  };
};

type LdrResponse = {
  success: boolean;
  data: LdrAccount;
  dataset: {
    competencia: string;
    source: string;
    recordsImported: number;
    recordsActive: number;
    activatedAt: string | null;
  };
};

const number = new Intl.NumberFormat('pt-BR');
const money = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

function formatCnpj(value: string) {
  const normalized = value.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  if (normalized.length !== 14) return value;
  return `${normalized.slice(0, 2)}.${normalized.slice(2, 5)}.${normalized.slice(5, 8)}/${normalized.slice(8, 12)}-${normalized.slice(12)}`;
}

function label(value: string | null | undefined) {
  if (!value) return 'NÃO DISPONÍVEL';
  return value.replaceAll('_', ' ');
}

function scoreLabel(value: number | null) {
  return value === null ? 'N/D' : String(value);
}

function CapabilityCard({
  title,
  capability,
  icon: Icon,
}: {
  title: string;
  capability: Capability;
  icon: typeof Zap;
}) {
  const available = capability.status === 'AVAILABLE';
  const partial = capability.status === 'PARTIAL';
  const tone = available
    ? 'border-[var(--color-heading-success)] bg-[color-mix(in_srgb,var(--color-heading-success)_10%,var(--color-surface))] text-[var(--color-heading-success)]'
    : partial
      ? 'border-[var(--color-heading-gold)] bg-[color-mix(in_srgb,var(--color-heading-gold)_10%,var(--color-surface))] text-[var(--color-heading-gold)]'
      : 'border-line bg-surface-2 text-ink';

  return (
    <article className={`rounded-[var(--radius-card)] border p-4 ${tone}`}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4" />
          <h3 className="text-sm font-black">{title}</h3>
        </div>
        <span className="text-[9px] font-black uppercase tracking-[0.15em]">
          {capability.status.replaceAll('_', ' ')}
        </span>
      </div>
      <p className="mt-3 text-sm leading-5 opacity-80">{capability.message}</p>
    </article>
  );
}

export function LdrAccountIntelligence() {
  const [searchParams] = useSearchParams();
  const [draftCnpj, setDraftCnpj] = useState('');
  const [account, setAccount] = useState<LdrAccount | null>(null);
  const [dataset, setDataset] = useState<LdrResponse['dataset'] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadByCnpj = useCallback(async (raw: string) => {
    const cnpj = raw.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
    if (!cnpj) return;

    setLoading(true);
    setError(null);
    setAccount(null);
    setDataset(null);

    try {
      const response = await fetch(
        `/api/companies/market-intelligence/${encodeURIComponent(cnpj)}/intelligence`,
        {
          credentials: 'include',
        },
      );
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'Falha ao montar Account Intelligence.');
      const result = payload as LdrResponse;
      setAccount(result.data);
      setDataset(result.dataset);
    } catch (reason: any) {
      setError(reason instanceof Error ? reason.message : 'Falha ao montar Account Intelligence.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const fromQuery = searchParams.get('cnpj');
    if (!fromQuery) return;
    setDraftCnpj(fromQuery);
    void loadByCnpj(fromQuery);
  }, [searchParams, loadByCnpj]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    await loadByCnpj(draftCnpj);
  };

  return (
    <div className="space-y-5 p-4 md:p-6 lg:p-8">
      <header className="overflow-hidden rounded-[var(--radius-card)] border border-[var(--color-heading-cyan)] bg-[var(--color-surface)] px-5 py-6 text-[var(--color-text-primary)] md:px-8 md:py-8">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <div className="flex items-center gap-2 text-brand">
              <Bot className="h-5 w-5" />
              <span className="text-[10px] font-black uppercase tracking-[0.2em]">
                LDR · Account Intelligence
              </span>
            </div>
            <h1 className="mt-2 text-3xl font-black tracking-[-0.04em] text-[var(--color-heading-cyan)] md:text-4xl">
              Empresa real → inteligência → próxima ação
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-[var(--color-text-secondary)]">
              Primeiro corte funcional do LDR. Fit, proveniência e cadastro oficial entram como
              evidência; sinais, decisores e ações só aparecem quando houver fonte real e contexto
              do tenant.
            </p>
          </div>
          <div className="flex flex-col items-start gap-3 xl:items-end">
            <div className="rounded-[var(--radius-card)] border border-[var(--color-heading-cyan)] bg-[var(--color-surface-elevated)] px-4 py-3 text-xs text-[var(--color-text-primary)]">
              <div className="flex items-center gap-2 font-black text-[var(--color-text-primary)]">
                <ShieldCheck className="h-4 w-4 text-[var(--color-heading-success)]" /> Sem
                recomendação fabricada
              </div>
              <p className="mt-1">Ausência de dado permanece como NÃO DISPONÍVEL.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                to="/app/market-intelligence/hub"
                className="inline-flex items-center gap-2 rounded-[var(--radius-control)] bg-brand-active px-4 py-2 text-xs font-black text-on-brand hover:brightness-110"
              >
                <Zap className="h-4 w-4" /> Radar / Hub
              </Link>
              <Link
                to="/app/prospect/inteligente"
                className="inline-flex items-center gap-2 rounded-[var(--radius-control)] border border-[var(--color-border-subtle)] bg-[var(--color-surface-elevated)] px-4 py-2 text-xs font-black text-[var(--color-text-primary)] hover:bg-[var(--color-surface-elevated)]"
              >
                Prospecção Inteligente
              </Link>
            </div>
          </div>
        </div>
      </header>

      <form
        onSubmit={submit}
        className="rounded-[var(--radius-card)] border border-[var(--color-heading-cyan)] bg-surface p-5 shadow-[var(--shadow-card)]"
      >
        <label className="block max-w-3xl">
          <span className="text-xs font-black text-ink">CNPJ da empresa</span>
          <div className="mt-1 flex items-center gap-2 rounded-[var(--radius-control)] border border-line px-3 focus-within:border-brand">
            <Search className="h-4 w-4 text-ink-2" />
            <input
              value={draftCnpj}
              onChange={(event) => setDraftCnpj(event.target.value)}
              className="min-w-0 flex-1 bg-transparent py-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-brand"
              placeholder="Digite um CNPJ presente no snapshot 2026-08"
            />
            <button
              type="submit"
              disabled={loading}
              className="my-1.5 inline-flex items-center gap-2 rounded-lg bg-brand-active px-4 py-2 text-xs font-black text-on-brand disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Target className="h-4 w-4" />
              )}
              Montar Account 360
            </button>
          </div>
        </label>
      </form>

      {error && (
        <div
          role="alert"
          className="flex gap-3 rounded-[var(--radius-card)] border border-[var(--color-heading-danger)] bg-[color-mix(in_srgb,var(--color-heading-danger)_10%,var(--color-surface))] p-5 text-sm text-[var(--color-heading-danger)]"
        >
          <AlertTriangle className="h-5 w-5 shrink-0" />
          {error}
        </div>
      )}

      {!account && !error && !loading && (
        <section className="rounded-[var(--radius-card)] border border-dashed border-[var(--color-heading-cyan)] bg-surface p-10 text-center">
          <FileSearch className="mx-auto h-9 w-9 text-brand" />
          <h2 className="mt-3 text-xl font-black text-[var(--color-heading-cyan)]">
            Account 360 aguardando uma empresa
          </h2>
          <p className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-ink-2">
            Consulte um CNPJ real do catálogo. O LDR vai mostrar o que já sabe, o que é derivado e,
            principalmente, o que ainda não pode afirmar.
          </p>
        </section>
      )}

      {account && (
        <>
          <section className="grid gap-4 xl:grid-cols-[1.4fr_.6fr]">
            <article className="rounded-[var(--radius-card)] border border-[var(--color-heading-cyan)] bg-surface p-5 shadow-[var(--shadow-card)] md:p-6">
              <div className="flex items-start gap-3">
                <div className="rounded-[var(--radius-card)] bg-[color-mix(in_srgb,var(--color-heading-gold)_10%,var(--color-surface))] p-3 text-[var(--color-heading-gold)]">
                  <Building2 className="h-6 w-6" />
                </div>
                <div className="min-w-0">
                  <p className="font-mono text-sm font-bold text-ink-2">
                    {formatCnpj(account.identity.cnpj)}
                  </p>
                  <h2 className="mt-1 text-2xl font-black text-[var(--color-heading-cyan)]">
                    {account.identity.legalName}
                  </h2>
                  <p className="mt-1 text-sm text-ink-2">
                    {account.identity.tradeName || 'Sem nome fantasia'} ·{' '}
                    {label(account.identity.municipality)}
                    {account.identity.uf ? `/${account.identity.uf}` : ''}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2 text-[10px] font-black uppercase tracking-[0.1em]">
                    <span className="rounded-full bg-surface-2 px-3 py-1.5 text-ink">
                      {label(account.identity.registrationStatus)}
                    </span>
                    <span className="rounded-full bg-surface-2 px-3 py-1.5 text-ink">
                      {label(account.identity.branchType)}
                    </span>
                    <span className="rounded-full bg-[color-mix(in_srgb,var(--color-heading-gold)_10%,var(--color-surface))] px-3 py-1.5 text-[var(--color-heading-gold)]">
                      ICP {label(account.qualification.icpTier)}
                    </span>
                  </div>
                </div>
              </div>
              <dl className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-[var(--radius-card)] bg-surface-2 p-4">
                  <dt className="text-[10px] font-black uppercase text-ink-2">CNAE</dt>
                  <dd className="mt-1 text-sm font-bold text-ink">
                    {label(account.identity.primaryCnae)}
                  </dd>
                </div>
                <div className="rounded-[var(--radius-card)] bg-surface-2 p-4">
                  <dt className="text-[10px] font-black uppercase text-ink-2">Porte</dt>
                  <dd className="mt-1 text-sm font-bold text-ink">
                    {label(account.identity.size)}
                  </dd>
                </div>
                <div className="rounded-[var(--radius-card)] bg-surface-2 p-4">
                  <dt className="text-[10px] font-black uppercase text-ink-2">Capital social</dt>
                  <dd className="mt-1 text-sm font-bold text-ink">
                    {account.identity.capitalSocial
                      ? money.format(Number(account.identity.capitalSocial))
                      : 'NÃO DISPONÍVEL'}
                  </dd>
                </div>
                <div className="rounded-[var(--radius-card)] bg-surface-2 p-4">
                  <dt className="text-[10px] font-black uppercase text-ink-2">Competência</dt>
                  <dd className="mt-1 text-sm font-bold text-ink">
                    {account.provenance.competencia}
                  </dd>
                </div>
              </dl>
            </article>

            <article className="rounded-[var(--radius-card)] border border-[var(--color-heading-gold)] bg-[color-mix(in_srgb,var(--color-heading-gold)_10%,var(--color-surface))] p-5 md:p-6">
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[var(--color-heading-gold)]">
                Account Score
              </p>
              <div className="mt-2 flex items-end gap-2">
                <span className="text-5xl font-black tracking-[-0.06em] text-[var(--color-heading-gold)]">
                  {scoreLabel(account.accountScore.total)}
                </span>
                <span className="pb-1 text-xs font-bold text-[var(--color-heading-gold)]">
                  /100 · {account.accountScore.status}
                </span>
              </div>
              <p className="mt-3 text-sm leading-5 text-[var(--color-heading-gold)]">
                {account.accountScore.explanation}
              </p>
              <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                {Object.entries(account.accountScore.components).map(([key, value]) => (
                  <div
                    key={key}
                    className="rounded-[var(--radius-control)] bg-[var(--color-surface-elevated)] p-3"
                  >
                    <div className="font-black uppercase text-[var(--color-heading-gold)]">
                      {key}
                    </div>
                    <div className="mt-1 text-lg font-black text-[var(--color-heading-gold)]">
                      {scoreLabel(value)}
                    </div>
                  </div>
                ))}
              </div>
            </article>
          </section>

          <section className="grid gap-3 md:grid-cols-3">
            <CapabilityCard title="Sinais" capability={account.signals} icon={Zap} />
            <CapabilityCard title="Decisores" capability={account.decisionMakers} icon={Users} />
            <CapabilityCard
              title="Grupo econômico"
              capability={account.economicGroup}
              icon={Building2}
            />
          </section>

          <section className="grid gap-4 xl:grid-cols-[1fr_.8fr]">
            <article className="rounded-[var(--radius-card)] border border-[var(--color-heading-cyan)] bg-surface p-5 md:p-6">
              <div className="flex items-center gap-2">
                <Target className="h-5 w-5 text-brand" />
                <h3 className="text-lg font-black text-[var(--color-heading-cyan)]">
                  Por que essa conta tem esse fit?
                </h3>
              </div>
              {account.qualification.reasons.length ? (
                <ul className="mt-4 space-y-2 text-sm text-ink">
                  {account.qualification.reasons.map((reason) => (
                    <li
                      key={reason}
                      className="rounded-[var(--radius-control)] bg-surface-2 px-3 py-2"
                    >
                      {reason}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-3 text-sm text-ink-2">
                  Razões ICP não foram publicadas para esta conta.
                </p>
              )}
              <p className="mt-4 text-sm text-ink-2">
                Taxonomia: {label(account.qualification.taxonomyVersion)} · Campos cadastrais:{' '}
                {account.provenance.companyFields} · ICP: {account.provenance.icp}
              </p>
            </article>

            <article
              className={`rounded-[var(--radius-card)] border p-5 md:p-6 ${account.nextBestAction.status === 'READY' ? 'border-[var(--color-heading-success)] bg-[color-mix(in_srgb,var(--color-heading-success)_10%,var(--color-surface))] text-[var(--color-heading-success)]' : 'border-[var(--color-heading-gold)] bg-[color-mix(in_srgb,var(--color-heading-gold)_10%,var(--color-surface))] text-[var(--color-heading-gold)]'}`}
            >
              <div className="flex items-center gap-2">
                <Bot className="h-5 w-5" />
                <h3 className="text-lg font-black">Next Best Action</h3>
              </div>
              <div className="mt-2 text-xs font-black uppercase tracking-[0.16em]">
                {account.nextBestAction.status}
              </div>
              <p className="mt-3 text-sm leading-6">{account.nextBestAction.message}</p>
              {account.nextBestAction.reasons.length > 0 && (
                <ul className="mt-4 space-y-2 text-xs">
                  {account.nextBestAction.reasons.map((reason) => (
                    <li key={reason}>• {reason}</li>
                  ))}
                </ul>
              )}
            </article>
          </section>

          <section className="rounded-[var(--radius-card)] border border-[var(--color-heading-cyan)] bg-surface p-5 md:p-6">
            <div className="flex items-center gap-2">
              <Database className="h-5 w-5 text-brand" />
              <h3 className="font-black text-[var(--color-heading-cyan)]">
                Proveniência e governança
              </h3>
            </div>
            <div className="mt-4 grid gap-3 text-xs md:grid-cols-4">
              <div>
                <div className="font-black text-ink-2">Fonte</div>
                <div className="mt-1 text-ink">{account.provenance.source}</div>
              </div>
              <div>
                <div className="font-black text-ink-2">Competência</div>
                <div className="mt-1 text-ink">{account.provenance.competencia}</div>
              </div>
              <div>
                <div className="font-black text-ink-2">Política de evidência</div>
                <div className="mt-1 text-ink">{account.provenance.evidencePolicy}</div>
              </div>
              <div>
                <div className="font-black text-ink-2">Contato público</div>
                <div className="mt-1 text-ink">{account.provenance.publicContact}</div>
              </div>
            </div>
            {dataset && (
              <p className="mt-4 text-sm text-ink-2">
                Snapshot ativo: {dataset.competencia} · {number.format(dataset.recordsImported)}{' '}
                importados · {number.format(dataset.recordsActive)} ativos.
              </p>
            )}
          </section>
        </>
      )}
    </div>
  );
}
