import { useState } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, Database, Loader2, RefreshCw, Search, UserPlus } from 'lucide-react';
import type { FitScoreResult } from '../../services/enrichment.service.js';
import type { DiscoverResult, ProspectCandidate } from '../../services/prospecting.service.js';
import { SoundFX } from '../../../../lib/soundEffects.js';
import { CandidateCard } from './CandidateCard.js';
import { SearchExecutionPanel } from './SearchExecutionPanel.js';
import { TurboProvidersPanel } from './TurboProvidersPanel.js';

interface PromoteResult {
  lead: { id: string };
  fit?: FitScoreResult;
  enrichment?: {
    company: { googleRating?: number; googleReviewsCount?: number; observations?: string };
    apolloContacts?: Array<{
      name: string;
      title: string | null;
      email: string | null;
      phone?: string | null;
      linkedin_url?: string | null;
    }>;
  };
}

export function DiscoveryResultsPanel({
  candidates,
  filteredCandidates,
  isSearching,
  searchResult,
  onCancel,
  resultFilter,
  setResultFilter,
  apolloError,
  isSavingBatch,
  onSaveAll,
  onExport,
  selectedCandidates,
  toggleSelectAll,
  toggleSelect,
  onBulkSave,
  onBulkEnrich,
  promotingKey,
  promoted,
  onPromoteCandidate,
  onDiscoverMore,
  rejectingKey,
  onRejectCandidate,
}: {
  candidates: ProspectCandidate[];
  filteredCandidates: Array<{ c: ProspectCandidate; i: number }>;
  isSearching: boolean;
  searchResult: DiscoverResult | null;
  onCancel: () => void;
  resultFilter: string;
  setResultFilter: (value: string) => void;
  apolloError: string | null;
  isSavingBatch: boolean;
  onSaveAll: () => void;
  onExport: (
    format: 'xlsx' | 'csv',
    columns: number[],
    target: 'companies' | 'decisionMakers',
  ) => void;
  selectedCandidates: Set<number>;
  toggleSelectAll: () => void;
  toggleSelect: (idx: number) => void;
  onBulkSave: () => void;
  onBulkEnrich: () => void;
  promotingKey: string | null;
  promoted: Record<string, PromoteResult>;
  onPromoteCandidate: (candidate: ProspectCandidate, idx: number) => void;
  /** Busca a próxima página do ranking da Apollo e soma aos resultados já exibidos, em vez de
   * repetir sempre o topo do ranking numa nova busca com os mesmos filtros. */
  onDiscoverMore: () => void;
  rejectingKey: string | null;
  onRejectCandidate: (candidate: ProspectCandidate, idx: number) => void;
}) {
  const [exportTarget, setExportTarget] = useState<'companies' | 'decisionMakers'>('companies');
  const [exportColumns, setExportColumns] = useState<number[]>(
    Array.from({ length: 14 }, (_, i) => i),
  );
  const columns =
    exportTarget === 'companies'
      ? [
          'Nome',
          'Razão social',
          'CNPJ',
          'Segmento',
          'Porte',
          'Localização',
          'Website',
          'E-mails',
          'Telefone',
          'LinkedIn',
          'Decisores',
          'Fonte',
          'Score ICP',
          'Completude',
        ]
      : [
          'Nome',
          'Cargo',
          'Empresa',
          'LinkedIn',
          'E-mail profissional',
          'Telefone profissional',
          'Fonte do e-mail',
        ];
  return (
    <div className="xl:col-span-8 flex flex-col h-full">
      <div className="flex items-center justify-between mb-4 gap-4 flex-wrap">
        <h2 className="font-display font-bold text-2xl text-ink">✨ Resultados</h2>
        {candidates.length > 0 && (
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => {
                SoundFX.play('click');
                onSaveAll();
              }}
              disabled={isSavingBatch}
              className="bg-brand text-on-brand px-4 py-2 rounded-xl text-xs font-bold hover:brightness-110 active:scale-95 transition-all shadow-[0_2px_10px_rgba(0,229,255,0.3)] hover:shadow-glow-brand flex items-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              <UserPlus size={14} /> {isSavingBatch ? 'Salvando Lista...' : 'Salvar Lista de Leads'}
            </button>
            <button
              type="button"
              onClick={() => {
                SoundFX.play('click');
                onExport('xlsx', exportColumns, exportTarget);
              }}
              className="bg-emerald-600 text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-emerald-700 active:scale-95 transition-all shadow-sm flex items-center gap-2 cursor-pointer"
            >
              <Database size={14} /> Exportar Excel
            </button>
            <button
              type="button"
              onClick={() => onExport('csv', exportColumns, exportTarget)}
              className="px-4 py-2 rounded-xl border border-line text-xs text-ink"
            >
              Exportar CSV
            </button>
            <span className="bg-surface-2 text-ink-2 px-3 py-1 rounded-full text-xs font-bold">
              🎯 {filteredCandidates.length}/{candidates.length} Candidatos
            </span>
          </div>
        )}
      </div>

      <TurboProvidersPanel />
      {candidates.length > 0 && (
        <details className="mb-4 text-xs text-ink-2">
          <summary className="cursor-pointer py-2">
            Configurar exportação e selecionar colunas
          </summary>
          <label htmlFor="export-target" className="block py-2">
            Exportar
            <select
              id="export-target"
              value={exportTarget}
              onChange={(e) => {
                const target = e.target.value as typeof exportTarget;
                setExportTarget(target);
                setExportColumns(
                  Array.from({ length: target === 'companies' ? 14 : 7 }, (_, i) => i),
                );
              }}
              className="ml-2 p-2 rounded-lg border border-line bg-surface text-ink"
            >
              <option value="companies">Empresas</option>
              <option value="decisionMakers">Decisores</option>
            </select>
          </label>
          <div className="flex flex-wrap gap-3">
            {columns.map((column, index) => (
              <label key={column} className="flex gap-1 items-center">
                <input
                  type="checkbox"
                  checked={exportColumns.includes(index)}
                  onChange={(e) =>
                    setExportColumns((prev) =>
                      e.target.checked ? [...prev, index] : prev.filter((i) => i !== index),
                    )
                  }
                />
                {column}
              </label>
            ))}
          </div>
        </details>
      )}
      {searchResult && !isSearching && (
        <div
          className="mb-4 rounded-xl border border-line bg-surface p-4 text-xs text-ink-2 space-y-2"
          aria-live="polite"
        >
          <p>Execução: {searchResult.searchId}</p>
          <SearchExecutionPanel key={searchResult.searchId} searchId={searchResult.searchId} />
          <p>
            {candidates.length} empresas · CNPJ informado:{' '}
            {candidates.filter((c) => c.cnpjGuess).length} · Telefone:{' '}
            {candidates.filter((c) => c.phone).length} · E-mail:{' '}
            {candidates.filter((c) => c.emails?.length).length} · Decisores:{' '}
            {candidates.reduce((sum, c) => sum + (c.decisionMakers?.length ?? 0), 0)}
          </p>
          <p>
            WhatsApp confirmado: indisponível. Consumo de créditos não fornecido nesta resposta.
          </p>
          {(searchResult.partialFailures ?? []).map((failure, i) => (
            <p key={i} className="text-warning-active dark:text-warning">
              Falha parcial {failure.provider}: {failure.message}
            </p>
          ))}
          {(searchResult.filterWarnings ?? []).map((warning, i) => (
            <p key={i} className="text-warning-active dark:text-warning">
              {warning}
            </p>
          ))}
          <p>
            Dados Google Places são apenas para consulta: excluídos da seleção, CRM e exportação.
            Exportação usa resultados filtrados ou a seleção atual.
          </p>
        </div>
      )}
      {candidates.length > 0 && !isSearching && (
        <div className="relative mb-4">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-ink-2" />
          <input
            aria-label="Filtrar resultados por nome, segmento ou cidade"
            type="text"
            placeholder="⚡ Filtrar resultados instantaneamente por nome, segmento, cidade..."
            value={resultFilter}
            onChange={(e) => setResultFilter(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 bg-surface border border-line rounded-xl text-sm focus:ring-2 focus:ring-brand/20 focus:border-brand transition-colors outline-none"
          />
        </div>
      )}

      {apolloError && !isSearching && (
        <div className="mb-4 p-3 bg-warning/10 border border-warning/30 rounded-xl text-xs text-warning-active dark:text-warning flex items-start gap-2">
          <AlertTriangle size={14} className="mt-0.5 shrink-0" />
          Falha parcial Apollo.io: {apolloError}
        </div>
      )}

      {isSearching ? (
        <div className="flex-1 bg-surface rounded-2xl border border-line shadow-sm flex flex-col items-center justify-center p-10 min-h-[400px]">
          <Loader2 size={32} className="animate-spin text-brand" aria-hidden="true" />
          <p role="status" className="text-sm text-ink mt-4">
            Pesquisa em andamento. Aguardando resposta dos provedores autorizados.
          </p>
          <button
            type="button"
            onClick={onCancel}
            className="mt-4 px-4 py-2 border border-line rounded-xl text-sm text-ink"
          >
            Cancelar espera
          </button>
        </div>
      ) : candidates.length > 0 ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          <div className="flex flex-wrap items-center gap-3 bg-surface p-3 rounded-xl border border-line mb-4">
            <input
              type="checkbox"
              className="rounded border-line text-brand focus:ring-brand"
              aria-label="Selecionar todos os resultados reutilizáveis visíveis"
              checked={
                filteredCandidates.some(({ c }) => c.source !== 'googlePlaces') &&
                filteredCandidates
                  .filter(({ c }) => c.source !== 'googlePlaces')
                  .every(({ i }) => selectedCandidates.has(i))
              }
              onChange={toggleSelectAll}
            />
            <span className="text-xs text-ink-2 font-bold">
              {selectedCandidates.size} selecionados
            </span>

            <div className="h-4 w-px bg-line mx-2" />

            <button
              type="button"
              onClick={() => {
                SoundFX.play('click');
                onBulkSave();
              }}
              disabled={selectedCandidates.size === 0 || isSavingBatch}
              className="text-[10px] font-bold bg-surface-2 hover:bg-line text-ink px-3 py-1.5 rounded-lg active:scale-95 transition-all disabled:opacity-50 cursor-pointer shadow-sm"
            >
              Salvar em Massa
            </button>
            <button
              type="button"
              onClick={() => {
                SoundFX.play('confirm');
                onBulkEnrich();
              }}
              disabled={selectedCandidates.size === 0 || isSavingBatch}
              className="text-[10px] font-bold bg-brand text-on-brand px-3 py-1.5 rounded-lg active:scale-95 transition-all disabled:opacity-50 hover:brightness-110 cursor-pointer shadow-sm"
            >
              Enriquecer em Massa
            </button>
          </div>

          {filteredCandidates.length === 0 && (
            <div className="bg-surface backdrop-blur-xl rounded-2xl border border-dashed border-line p-8 text-center text-sm text-ink-2">
              🔍 Nenhum candidato bate com &quot;{resultFilter}&quot;.
            </div>
          )}
          {filteredCandidates.map(({ c, i }) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <CandidateCard
                candidate={c}
                onPromote={() => onPromoteCandidate(c, i)}
                // isSavingBatch também desabilita: sem isso, dava pra clicar
                // "Enriquecer e Adicionar" no MESMO candidato que uma promoção em
                // massa já estava processando, disparando duas chamadas concorrentes
                // a /api/prospecting/promote e duplicando a Company/Lead no CRM.
                isPromoting={promotingKey === `discovery-${i}` || isSavingBatch}
                promoted={!!promoted[`discovery-${i}`]}
                promotedResult={promoted[`discovery-${i}`]}
                isSelected={selectedCandidates.has(i)}
                onToggleSelect={() => toggleSelect(i)}
                onReject={() => onRejectCandidate(c, i)}
                isRejecting={rejectingKey === `discovery-${i}`}
              />
            </motion.div>
          ))}

          <button
            type="button"
            onClick={() => {
              SoundFX.play('click');
              onDiscoverMore();
            }}
            disabled={isSearching}
            className="w-full py-3 rounded-xl border border-dashed border-line text-xs font-bold text-ink-2 hover:text-brand hover:border-brand/40 active:scale-[0.99] transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
          >
            {isSearching ? <Loader2 className="animate-spin" size={14} /> : <RefreshCw size={14} />}
            Buscar mais resultados (próxima página)
          </button>
        </motion.div>
      ) : (
        <div className="flex-1 bg-surface rounded-2xl border border-dashed border-line flex flex-col items-center justify-center p-10 min-h-[400px]">
          <div className="bg-surface-2 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-5">
            <Search className="text-ink-2" size={32} />
          </div>
          <h3 className="font-black text-xl text-ink mb-2">🔍 Nenhum lead encontrado</h3>
          <p className="text-sm text-ink-2 text-center max-w-sm">
            Preencha os critérios de ICP ao lado e busque oportunidades reais via OpenStreetMap e
            bases públicas, com Apollo opcional.
          </p>
        </div>
      )}
    </div>
  );
}
