import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  Database,
  PlugZap,
  Plus,
  Search,
  Users,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Badge } from '../../../components/ui/Badge.js';
import { BlockedState, SourceRequiredIcon } from '../../../components/ui/BlockedState.js';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../../../components/ui/Card.js';
import { CommandCenterHeader } from '../../../components/ui/CommandCenterHeader.js';
import { EmptyState } from '../../../components/ui/EmptyState.js';
import { Input } from '../../../components/ui/Input.js';
import { KpiCard } from '../../../components/ui/KpiCard.js';
import { Skeleton } from '../../../components/ui/Skeleton.js';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../../components/ui/Table.js';
import { api } from '../../../lib/api.js';

type ProviderState = {
  id: string;
  configured?: boolean;
  status: string;
  message?: string;
  billable?: boolean;
};

type TenantContact = {
  id: string;
  name: string | null;
  role: string | null;
  department: string | null;
  company?: {
    tradeName?: string | null;
    legalName?: string | null;
    segment?: string | null;
  } | null;
};

type TenantCompany = {
  id: string;
  tradeName?: string | null;
  legalName?: string | null;
  cnpj?: string | null;
  segment?: string | null;
};

type ContactsPage = {
  data: TenantContact[];
  meta: { total: number; page: number; limit: number; totalPages: number };
};

type CompaniesPage = {
  data: TenantCompany[];
  meta: { total: number; page: number; limit: number; totalPages: number };
};

function formatInt(n: number): string {
  return new Intl.NumberFormat('pt-BR').format(n);
}

function providerConnected(p: ProviderState): boolean {
  return p.status === 'authenticated' || p.status === 'ready';
}

export function ProspeccaoInteligenteHub() {
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [providers, setProviders] = useState<ProviderState[] | null>(null);
  const [contacts, setContacts] = useState<TenantContact[]>([]);
  const [totalContacts, setTotalContacts] = useState(0);
  const [companies, setCompanies] = useState<TenantCompany[]>([]);
  const [totalCompanies, setTotalCompanies] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    (async () => {
      try {
        const [providerList, contactsPage, companiesPage] = await Promise.all([
          api.get<ProviderState[]>('/api/prospecting/providers'),
          api.get<ContactsPage>('/api/contacts?page=1&limit=25'),
          api.get<CompaniesPage>('/api/companies?page=1&limit=25'),
        ]);
        if (cancelled) return;
        setProviders(Array.isArray(providerList) ? providerList : []);
        const rows = Array.isArray(contactsPage?.data) ? contactsPage.data : [];
        setContacts(rows);
        setTotalContacts(contactsPage?.meta?.total ?? rows.length);
        const companyRows = Array.isArray(companiesPage?.data) ? companiesPage.data : [];
        setCompanies(companyRows);
        setTotalCompanies(companiesPage?.meta?.total ?? companyRows.length);
      } catch (reason: unknown) {
        if (!cancelled) {
          setError(
            reason instanceof Error
              ? reason.message
              : 'Não foi possível carregar prospecção inteligente.',
          );
          setProviders(null);
          setContacts([]);
          setTotalContacts(0);
          setCompanies([]);
          setTotalCompanies(0);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const paidProviders = useMemo(
    () =>
      (providers || []).filter((p) => p.billable || p.id === 'apollo' || p.id === 'googlePlaces'),
    [providers],
  );
  const anyPaidReady = paidProviders.some(providerConnected);
  const anyProviderReady = (providers || []).some(providerConnected);
  const catalogReady = (providers || []).some(
    (p) => p.id === 'cnpjDataset' && providerConnected(p),
  );

  const filtered = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return contacts;
    return contacts.filter((c) => {
      const empresa = c.company?.tradeName || c.company?.legalName || '';
      return [c.name, c.role, c.department, empresa]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q));
    });
  }, [contacts, searchTerm]);

  const providersUnavailable =
    !loading && !error && providers !== null && providers.length > 0 && !anyProviderReady;

  return (
    <div className="flex-1 flex flex-col h-full bg-[var(--bg)] text-[var(--ink)]">
      <CommandCenterHeader
        title="Prospecção Inteligente"
        icon={Search}
        actions={
          <div className="flex gap-2">
            <Link
              to="/app/prospect"
              className="inline-flex items-center h-8 px-3 text-xs font-semibold rounded-xl bg-[#8B7DFF] text-[#13151A]"
            >
              <Plus className="w-4 h-4 mr-2" /> Nova busca B2B
            </Link>
          </div>
        }
      />
      <div className="flex-1 p-6 space-y-6 overflow-y-auto">
        <div className="mb-4">
          <h2 className="text-xl font-bold">Motor de Descoberta de Decisores</h2>
          <p className="text-sm text-[var(--ink-2)]">
            Contatos e empresas do tenant + estado real dos provedores — sem listas ou KPIs
            inventados.
          </p>
          <div className="mt-3 flex flex-wrap gap-2 text-xs">
            <Link
              to="/app/market-intelligence/hub"
              className="rounded-full border border-[var(--line)] px-3 py-1.5 text-[var(--ink-2)] hover:text-[var(--ink)]"
            >
              Radar MI
            </Link>
            <Link
              to="/app/market-intelligence"
              className="rounded-full border border-[var(--line)] px-3 py-1.5 text-[var(--ink-2)] hover:text-[var(--ink)]"
            >
              LDR
            </Link>
            <Link
              to="/app/prospect"
              className="rounded-full border border-[var(--line)] px-3 py-1.5 text-[var(--ink-2)] hover:text-[var(--ink)]"
            >
              Hub de Prospecção
            </Link>
          </div>
        </div>

        {loading && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-28 rounded-2xl" />
            ))}
          </div>
        )}

        {!loading && error && (
          <div
            role="alert"
            className="flex items-center gap-2 text-sm text-critical py-4 px-3 rounded-xl border border-critical/30 bg-critical/5"
          >
            <AlertTriangle className="w-4 h-4 shrink-0" /> {error}
          </div>
        )}

        {!loading && !error && providersUnavailable && (
          <BlockedState
            tone="warning"
            icon={SourceRequiredIcon}
            title="Provedores de prospecção não conectados"
            description="Nenhum provedor autenticado ou catálogo pronto neste ambiente. Configure as chaves e o modo hybrid, ou use o Hub de Prospecção para validar conexões — a tela não exibe decisores fictícios."
            actionLabel="Abrir Hub de Prospecção"
            onAction={() => window.location.assign('/app/prospect')}
          />
        )}

        {!loading && !error && !providersUnavailable && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <KpiCard
                title="Contatos no tenant"
                value={formatInt(totalContacts)}
                trend={{
                  value: `${formatInt(totalCompanies)} empresas no CRM`,
                  isPositive: totalContacts > 0 || totalCompanies > 0,
                }}
                icon={Users}
                subtitle="Fontes: /api/contacts + /api/companies"
                variant="default"
              />
              <KpiCard
                title="Provedores prontos"
                value={formatInt((providers || []).filter(providerConnected).length)}
                trend={{
                  value: anyPaidReady
                    ? 'Há provedor pago autenticado/pronto'
                    : catalogReady
                      ? 'Catálogo CNPJ pronto; pagos não autenticados'
                      : 'Sem autenticação paga confirmada',
                  isPositive: anyProviderReady,
                }}
                icon={CheckCircle2}
                subtitle="Estado de /api/prospecting/providers"
                variant="default"
              />
              <KpiCard
                title="Provedores configurados"
                value={formatInt((providers || []).filter((p) => p.configured).length)}
                trend={{
                  value: 'Configurado ≠ autenticado',
                  isPositive: true,
                }}
                icon={Database}
                subtitle="Sem créditos ou bounce inventados"
                variant="default"
              />
            </div>

            {(providers || []).length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <PlugZap className="w-4 h-4" /> Estado dos provedores
                  </CardTitle>
                  <CardDescription>
                    Configuração não comprova autenticação nem créditos.
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-2 border-t border-[var(--line)] pt-4">
                  {(providers || []).map((p) => (
                    <Badge key={p.id} variant="outline" className="text-xs font-mono">
                      {p.id}: {p.status}
                      {p.configured === false ? ' · não configurado' : ''}
                    </Badge>
                  ))}
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="w-4 h-4" /> Empresas do tenant (CRM)
                </CardTitle>
                <CardDescription>
                  Contas reais da organização. Account 360 usa o id do CRM — só listamos o que
                  existe no tenant.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 border-t border-[var(--line)] pt-4">
                {companies.length === 0 ? (
                  <EmptyState
                    title="Nenhuma empresa no CRM deste tenant"
                    description="Aprove contas pelo LDR ou descubra no Hub de Prospecção. Esta tela não inventa empresas."
                    actionLabel="Abrir LDR"
                    onAction={() => window.location.assign('/app/market-intelligence')}
                    icon={<Building2 className="w-8 h-8 text-[#8B7DFF]" />}
                  />
                ) : (
                  companies.map((co) => (
                    <div
                      key={co.id}
                      className="p-3.5 rounded-xl bg-[var(--surface-2)] border border-[var(--line)] flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <div className="font-semibold text-sm truncate">
                          {co.tradeName || co.legalName || 'Empresa sem nome'}
                        </div>
                        <p className="text-xs text-[var(--ink-2)] mt-0.5 truncate">
                          {[co.segment, co.cnpj].filter(Boolean).join(' · ') || 'Sem segmento/CNPJ'}
                        </p>
                      </div>
                      <div className="flex gap-2 shrink-0">
                        {co.cnpj ? (
                          <Link
                            to={`/app/market-intelligence?cnpj=${encodeURIComponent(co.cnpj)}`}
                            className="inline-flex items-center h-8 px-3 text-xs font-semibold rounded-xl border border-white/10"
                          >
                            LDR
                          </Link>
                        ) : null}
                        <Link
                          to={`/app/market-intelligence/accounts/${co.id}`}
                          className="inline-flex items-center h-8 px-3 text-xs font-semibold rounded-xl bg-[#8B7DFF] text-[#13151A]"
                        >
                          Account 360
                        </Link>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <CardTitle>Contatos do tenant</CardTitle>
                    <CardDescription>
                      Decisores descobertos via providers aparecem após buscas reais no Hub de
                      Prospecção; aqui listamos o CRM do tenant.
                    </CardDescription>
                  </div>
                  <div className="relative w-full sm:w-72">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--ink-3)]" />
                    <Input
                      type="text"
                      placeholder="Filtrar por nome, cargo ou empresa..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0 border-t border-[var(--line)]">
                {filtered.length === 0 ? (
                  <div className="p-4">
                    <EmptyState
                      title="Nenhum contato neste tenant"
                      description="Não há contatos persistidos para esta organização, ou o filtro não encontrou coincidências. Rode uma busca B2B real no Hub de Prospecção — esta tela não preenche nomes fictícios."
                      actionLabel="Ir para Hub de Prospecção"
                      onAction={() => window.location.assign('/app/prospect')}
                      icon={<Users className="w-8 h-8 text-[#8B7DFF]" />}
                    />
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Contato</TableHead>
                        <TableHead>Cargo</TableHead>
                        <TableHead>Empresa</TableHead>
                        <TableHead>Segmento</TableHead>
                        <TableHead className="text-right">Ação</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filtered.map((c) => (
                        <TableRow key={c.id}>
                          <TableCell className="font-semibold text-sm">
                            {c.name || 'Sem nome'}
                          </TableCell>
                          <TableCell className="text-xs text-[var(--ink-2)]">
                            {c.role || c.department || '—'}
                          </TableCell>
                          <TableCell className="text-xs font-medium">
                            {c.company?.tradeName || c.company?.legalName || '—'}
                          </TableCell>
                          <TableCell>
                            {c.company?.segment ? (
                              <Badge variant="outline" className="text-xs">
                                {c.company.segment}
                              </Badge>
                            ) : (
                              <span className="text-xs text-[var(--ink-3)]">—</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <Link
                              to="/app/prospect"
                              className="inline-flex items-center h-8 px-3 text-xs font-semibold rounded-xl bg-[#8B7DFF] text-[#13151A]"
                            >
                              Abrir Hub
                            </Link>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
