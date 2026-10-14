import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Loader2 } from 'lucide-react';
import type React from 'react';
import { useEffect, useState } from 'react';

export interface PaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  /** Total de itens, mostrado ao lado do número de páginas (ex.: "10.450 contatos"). */
  totalItems?: number;
  /** Rótulo no plural pro totalItems (ex.: "contatos", "empresas"). */
  itemLabel?: string;
  /** Tamanho da página atual. */
  pageSize?: number;
  /** Callback para alterar o tamanho da página. */
  onPageSizeChange?: (size: number) => void;
  /** Opções de tamanho de página disponíveis (default: [20, 50, 100]). */
  pageSizeOptions?: number[];
  /** Indica se os dados estão sendo carregados assincronamente. */
  loading?: boolean;
}

/**
 * Paginação assíncrona com suporte a grandes volumes de dados (10.000+ registros).
 * Suporta seletor de limite por página, navegação rápida (primeira/última página)
 * e salto direto de página.
 */
export function Pagination({
  page,
  totalPages,
  onPageChange,
  totalItems,
  itemLabel,
  pageSize,
  onPageSizeChange,
  pageSizeOptions = [20, 50, 100],
  loading = false,
}: PaginationProps) {
  const [jumpPage, setJumpPage] = useState(String(page));

  useEffect(() => {
    setJumpPage(String(page));
  }, [page]);

  if (totalPages <= 1) return null;

  const handleJumpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseInt(jumpPage, 10);
    if (!Number.isNaN(parsed)) {
      const clamped = Math.max(1, Math.min(totalPages, parsed));
      if (clamped !== page) {
        onPageChange(clamped);
      }
      setJumpPage(String(clamped));
    } else {
      setJumpPage(String(page));
    }
  };

  const formattedTotal = typeof totalItems === 'number' ? totalItems.toLocaleString('pt-BR') : null;

  return (
    <div className="p-4 border-t border-line bg-surface-2/50 flex flex-wrap items-center justify-between gap-4">
      {/* Informações da página e total */}
      <div className="flex items-center gap-3">
        {loading && <Loader2 className="w-3.5 h-3.5 animate-spin text-brand shrink-0" />}
        <span className="text-xs text-ink-2 font-semibold">
          Página {page} de {Math.max(1, totalPages)}
          {typeof totalItems === 'number' && itemLabel ? ` · ${formattedTotal} ${itemLabel}` : ''}
        </span>

        {/* Seletor de registros por página */}
        {onPageSizeChange && pageSize && (
          <div className="flex items-center gap-1.5 ml-2 pl-3 border-l border-line text-xs text-ink-2">
            <label htmlFor="pagination-page-size" className="font-medium text-[11px]">
              Exibir:
            </label>
            <select
              id="pagination-page-size"
              value={pageSize}
              disabled={loading}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              className="bg-surface border border-line rounded-lg px-2 py-1 text-xs font-semibold text-ink focus:outline-none focus:ring-1 focus:ring-brand cursor-pointer"
            >
              {pageSizeOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt} / pág
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Controles de navegação */}
      <div className="flex items-center gap-2">
        {/* Formulário de pulo direto de página para grandes volumes */}
        {totalPages > 3 && (
          <form
            onSubmit={handleJumpSubmit}
            className="flex items-center gap-1.5 mr-2 text-xs text-ink-2"
          >
            <label htmlFor="pagination-jump-input" className="sr-only">
              Ir para a página
            </label>
            <span className="text-[11px] font-medium hidden sm:inline">Ir para:</span>
            <input
              id="pagination-jump-input"
              type="number"
              min={1}
              max={totalPages}
              value={jumpPage}
              disabled={loading}
              onChange={(e) => setJumpPage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleJumpSubmit(e);
                }
              }}
              onBlur={handleJumpSubmit}
              className="w-14 bg-surface border border-line rounded-lg px-2 py-1 text-xs font-semibold text-ink text-center focus:outline-none focus:ring-1 focus:ring-brand [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
            <button type="submit" className="sr-only">
              Pular
            </button>
          </form>
        )}

        {/* Botão Primeira Página */}
        {totalPages > 2 && (
          <button
            type="button"
            disabled={page === 1 || loading}
            onClick={() => onPageChange(1)}
            title="Primeira página"
            className="p-2 rounded-xl bg-surface/70 backdrop-blur-md border border-line text-ink-2 hover:bg-surface-elevated hover:shadow-sm active:scale-95 disabled:hover:scale-100 hover:scale-[1.02] disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 cursor-pointer text-xs font-semibold"
          >
            <ChevronsLeft className="w-4 h-4" />
          </button>
        )}

        {/* Botão Anterior */}
        <button
          type="button"
          disabled={page === 1 || loading}
          onClick={() => onPageChange(Math.max(1, page - 1))}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-surface/70 backdrop-blur-md border border-line text-ink-2 hover:bg-surface-elevated hover:shadow-sm active:scale-95 disabled:hover:scale-100 hover:scale-[1.02] disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 cursor-pointer text-xs font-semibold"
        >
          <ChevronLeft className="w-4 h-4" /> <span className="hidden sm:inline">Anterior</span>
        </button>

        {/* Botão Próxima */}
        <button
          type="button"
          disabled={page === totalPages || totalPages === 0 || loading}
          onClick={() => onPageChange(Math.min(totalPages, page + 1))}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-surface/70 backdrop-blur-md border border-line text-ink-2 hover:bg-surface-elevated hover:shadow-sm active:scale-95 disabled:hover:scale-100 hover:scale-[1.02] disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 cursor-pointer text-xs font-semibold"
        >
          <span className="hidden sm:inline">Próxima</span> <ChevronRight className="w-4 h-4" />
        </button>

        {/* Botão Última Página */}
        {totalPages > 2 && (
          <button
            type="button"
            disabled={page === totalPages || totalPages === 0 || loading}
            onClick={() => onPageChange(totalPages)}
            title="Última página"
            className="p-2 rounded-xl bg-surface/70 backdrop-blur-md border border-line text-ink-2 hover:bg-surface-elevated hover:shadow-sm active:scale-95 disabled:hover:scale-100 hover:scale-[1.02] disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 cursor-pointer text-xs font-semibold"
          >
            <ChevronsRight className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}
