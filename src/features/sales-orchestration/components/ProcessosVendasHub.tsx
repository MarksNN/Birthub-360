import { useState } from 'react';
import { Network, Zap, CheckCircle, ShieldAlert, Plus, Search } from 'lucide-react';
import { CommandCenterHeader } from '../../../components/ui/CommandCenterHeader.js';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from '../../../components/ui/Card.js';
import { KpiCard } from '../../../components/ui/KpiCard.js';
import { Button } from '../../../components/ui/Button.js';
import { Badge } from '../../../components/ui/Badge.js';
import { Input } from '../../../components/ui/Input.js';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../../components/ui/Table.js';
import {
  DemoBadge,
  NO_API_SUBTITLE,
  OrchestrationEmptyState,
  OrchestrationStatusBanner,
} from './DemoDataNotice.js';
import { formatMetric, useOrchestrationOverview } from './useOrchestrationOverview.js';

export function ProcessosVendasHub() {
  const { data, isTemplate, loading, error, reload } = useOrchestrationOverview();
  const processos = data?.processos ?? [];
  const [searchTerm, setSearchTerm] = useState('');

  const filtered = processos.filter(
    (p) =>
      p.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.categoria.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  return (
    <div className="flex-1 flex flex-col h-full bg-[var(--bg)] text-[var(--ink)]">
      <CommandCenterHeader
        title="Processos de Vendas"
        icon={Network}
        actions={
          <div className="flex gap-2">
            <Button
              variant="default"
              size="sm"
              disabled
              title="Em breve — criação ainda não disponível"
            >
              <Plus className="w-4 h-4 mr-2" /> Novo Processo (SOP)
            </Button>
          </div>
        }
      />

      <div className="flex-1 p-6 space-y-6 overflow-y-auto">
        <div>
          <h2 className="text-xl font-bold">Procedimentos Operacionais Padrão (SOPs)</h2>
          <p className="text-sm text-[var(--ink-2)]">
            Regras de governança de vendas, SLAs de primeiro toque, políticas de distribuição e
            critérios claros de avanço.
          </p>
        </div>

        <OrchestrationStatusBanner isTemplate={isTemplate} error={error} onRetry={reload} />

        {/* KPIs (P0 #693: sem números fixos — só API ou “Indisponível”) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <KpiCard
            title="Speed-to-Lead (Média)"
            value={formatMetric(data?.kpis.speedToLeadMin, ' min')}
            icon={Zap}
            subtitle={NO_API_SUBTITLE}
            variant="default"
          />
          <KpiCard
            title="Conformidade de SLA"
            value="Indisponível"
            icon={CheckCircle}
            subtitle={NO_API_SUBTITLE}
            variant="default"
          />
          <KpiCard
            title="Descartes sem Justificativa"
            value="Indisponível"
            icon={ShieldAlert}
            subtitle={NO_API_SUBTITLE}
            variant="default"
          />
        </div>

        {/* Lista de Processos em Tabela */}
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <CardTitle>Catálogo de Processos Registrados</CardTitle>
                <CardDescription>
                  Critérios e gatilhos automatizados em vigor na operação comercial.
                </CardDescription>
              </div>
              <div className="relative w-full sm:w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--ink-3)]" />
                <Input
                  type="text"
                  placeholder="Filtrar por código ou nome..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0 border-t border-[var(--line)]">
            {loading ? (
              <div className="p-8 text-center text-sm text-[var(--ink-3)]">
                Carregando procedimentos...
              </div>
            ) : error ? (
              <div className="p-8 text-center text-sm text-[var(--ink-3)]">
                Processos indisponíveis — falha ao carregar dados da API.
              </div>
            ) : filtered.length === 0 ? (
              <div className="p-6">
                <OrchestrationEmptyState
                  title={
                    processos.length === 0
                      ? 'Nenhum processo cadastrado'
                      : 'Nenhum processo encontrado'
                  }
                  hint={
                    processos.length === 0
                      ? 'Ainda não há SOPs cadastrados para a organização.'
                      : 'Ajuste o filtro.'
                  }
                />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Código</TableHead>
                    <TableHead>Nome do Procedimento</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead>Gatilho Operacional</TableHead>
                    <TableHead>SLA Máximo</TableHead>
                    <TableHead>Responsável</TableHead>
                    <TableHead className="text-right">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-mono font-bold text-xs text-[var(--nav-c-blue)]">
                        {item.codigo}
                      </TableCell>
                      <TableCell className="font-medium text-sm text-[var(--ink)]">
                        {item.nome}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {item.categoria}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-[var(--ink-2)] max-w-xs">
                        {item.gatilho}
                      </TableCell>
                      <TableCell className="text-xs font-semibold text-[var(--nav-c-gold)]">
                        {item.slaMaximo}
                      </TableCell>
                      <TableCell className="text-xs text-[var(--ink-2)]">
                        {item.responsavel}
                      </TableCell>
                      <TableCell className="text-right space-x-1">
                        <DemoBadge show={isTemplate} />
                        <Badge
                          variant="default"
                          className="bg-[var(--nav-c-green)]/10 text-[var(--nav-c-green)]"
                        >
                          {item.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
