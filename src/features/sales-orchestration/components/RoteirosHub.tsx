import {
  Check,
  Copy,
  Mail,
  MessageSquare,
  MessageSquareText,
  Phone,
  Plus,
  Sparkles,
  Users,
} from 'lucide-react';
import { useState } from 'react';
import { Badge } from '../../../components/ui/Badge.js';
import { Button } from '../../../components/ui/Button.js';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/Card.js';
import { CommandCenterHeader } from '../../../components/ui/CommandCenterHeader.js';
import { KpiCard } from '../../../components/ui/KpiCard.js';
import {
  DemoBadge,
  NO_API_SUBTITLE,
  OrchestrationEmptyState,
  OrchestrationStatusBanner,
} from './DemoDataNotice.js';
import { useOrchestrationOverview } from './useOrchestrationOverview.js';

export function RoteirosHub() {
  const { data, isTemplate, noRealData, loading, error, reload } = useOrchestrationOverview();
  const roteiros = data?.roteiros ?? [];
  const [selectedCanal, setSelectedCanal] = useState<string>('Todos');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const canais = ['Todos', 'Telefone', 'WhatsApp', 'Reunião'];

  const filtered = roteiros.filter((r) => selectedCanal === 'Todos' || r.canal === selectedCanal);

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => {
      setCopiedId(null);
    }, 2000);
  };

  const getCanalIcon = (canal: string) => {
    switch (canal) {
      case 'Telefone':
        return <Phone className="w-4 h-4 text-[var(--nav-c-red)]" />;
      case 'WhatsApp':
        return <MessageSquare className="w-4 h-4 text-[var(--nav-c-green)]" />;
      case 'Reunião':
        return <Users className="w-4 h-4 text-[var(--nav-c-blue)]" />;
      default:
        return <Mail className="w-4 h-4 text-[var(--nav-c-iris)]" />;
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[var(--bg)] text-[var(--ink)]">
      <CommandCenterHeader
        title="Roteiros de Abordagem"
        icon={MessageSquareText}
        actions={
          <div className="flex gap-2">
            <Button
              variant="default"
              size="sm"
              disabled
              title="Em breve — criação ainda não disponível"
            >
              <Plus className="w-4 h-4 mr-2" /> Novo Roteiro
            </Button>
          </div>
        }
      />

      <div className="flex-1 p-6 space-y-6 overflow-y-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold">Biblioteca de Scripts Comerciais</h2>
            <p className="text-sm text-[var(--ink-2)]">
              Modelos validados com ganchos de atenção, perguntas de diagnóstico e técnicas
              comprovadas de fechamento.
            </p>
          </div>
        </div>

        <OrchestrationStatusBanner
          isTemplate={isTemplate}
          noRealData={noRealData}
          error={error}
          onRetry={reload}
        />

        {/* KPIs (P0 #693: sem números fixos — só API ou “Indisponível”) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <KpiCard
            title="Roteiros Listados"
            value={loading || error ? '—' : String(roteiros.length)}
            icon={MessageSquareText}
            subtitle={isTemplate ? 'Modelos de exemplo' : 'Cadastrados na organização'}
            variant="default"
          />
          <KpiCard
            title="Taxa de Conexão Média"
            value="Indisponível"
            icon={Sparkles}
            subtitle={NO_API_SUBTITLE}
            variant="default"
          />
          <KpiCard
            title="Variáveis Dinâmicas"
            value="Indisponível"
            icon={Check}
            subtitle={NO_API_SUBTITLE}
            variant="default"
          />
        </div>

        {/* Filtro por Canal */}
        <div className="flex gap-2">
          {canais.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setSelectedCanal(c)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                selectedCanal === c
                  ? 'bg-[var(--nav-c-blue)] text-white shadow-sm'
                  : 'bg-[var(--surface-2)] text-[var(--ink-2)] hover:text-[var(--ink)] border border-[var(--line)]'
              }`}
            >
              {c}
            </button>
          ))}
        </div>

        {/* Grid de Roteiros */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-pulse">
            <div className="h-56 bg-[var(--surface-2)] rounded-xl" />
            <div className="h-56 bg-[var(--surface-2)] rounded-xl" />
          </div>
        ) : error ? null : filtered.length === 0 ? (
          <OrchestrationEmptyState
            title={
              roteiros.length === 0 ? 'Nenhum roteiro cadastrado' : 'Nenhum roteiro neste canal'
            }
            hint={
              roteiros.length === 0
                ? 'Ainda não há roteiros cadastrados para a organização.'
                : 'Escolha outro canal.'
            }
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filtered.map((rot) => (
              <Card key={rot.id} className="flex flex-col justify-between">
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded bg-[var(--surface-2)] border border-[var(--line)]">
                          {getCanalIcon(rot.canal)}
                          {rot.canal}
                        </span>
                        <Badge variant="outline" className="text-xs">
                          {rot.fase}
                        </Badge>
                        <DemoBadge show={isTemplate} />
                      </div>
                      <CardTitle className="text-base">{rot.titulo}</CardTitle>
                    </div>
                    <Badge
                      variant="default"
                      className="bg-[var(--nav-c-green)]/10 text-[var(--nav-c-green)] text-xs"
                    >
                      {rot.taxaSucesso === null
                        ? 'Eficácia indisponível'
                        : `${rot.taxaSucesso}% eficácia`}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="border-t border-[var(--line)] pt-4">
                  <div className="p-3 rounded-lg bg-[var(--surface-2)] border border-[var(--line)] font-mono text-xs text-[var(--ink)] mb-4 whitespace-pre-wrap leading-relaxed">
                    {rot.corpoTexto}
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[10px] text-[var(--ink-3)] font-semibold uppercase">
                        Variáveis:
                      </span>
                      {rot.variaveis.map((v) => (
                        <span
                          key={v}
                          className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--surface)] border border-[var(--line)] text-[var(--nav-c-blue)]"
                        >
                          {`{${v}}`}
                        </span>
                      ))}
                    </div>

                    <Button
                      variant={copiedId === rot.id ? 'outline' : 'default'}
                      size="sm"
                      onClick={() => handleCopy(rot.id, rot.corpoTexto)}
                      className="ml-2 shrink-0"
                    >
                      {copiedId === rot.id ? (
                        <>
                          <Check className="w-3.5 h-3.5 mr-1 text-[var(--nav-c-green)]" /> Copiado!
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5 mr-1" /> Copiar Roteiro
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
