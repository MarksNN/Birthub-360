import type { ComponentType } from 'react';
import { SoundFX } from '../../lib/soundEffects.js';
import { cn } from '../../lib/utils.js';

/* Novo primitivo — navegação em cards grandes (ícone + título + subtítulo), usado como troca de
   aba/seção quando cada opção carrega contexto suficiente pra merecer um card em vez de um tab
   de texto simples (ex.: home do portal, hub de relatórios). */
export interface TabCardItem {
  id: string;
  icon: ComponentType<{ className?: string }>;
  title: string;
  subtitle?: string;
}

export function TabNavCards({
  items,
  activeId,
  onSelect,
}: {
  items: TabCardItem[];
  activeId: string;
  onSelect: (id: string) => void;
}) {
  return (
    <div role="tablist" className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
      {items.map((item) => {
        const active = item.id === activeId;
        return (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={active}
            onMouseEnter={() => {
              SoundFX.play('hover');
            }}
            onClick={() => {
              SoundFX.play('navigate');
              onSelect(item.id);
            }}
            className={cn(
              'group relative flex items-center gap-3.5 overflow-hidden rounded-2xl border border-line bg-surface p-4 px-5 text-left shadow-sm transition-all duration-300 hover:scale-[1.02] hover:-translate-y-0.5 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-bg cursor-pointer',
              active
                ? 'border-brand/60 bg-surface-elevated shadow-md'
                : 'hover:border-line-strong hover:bg-surface-interactive hover:shadow-md',
            )}
          >
            <span
              aria-hidden="true"
              className={cn(
                'absolute inset-x-0 top-0 h-[2px] transition-all duration-300',
                active
                  ? 'bg-gradient-to-r from-brand to-brand-2'
                  : 'bg-transparent group-hover:bg-brand/20',
              )}
            />
            <span
              aria-hidden="true"
              className={cn(
                'flex h-11 w-11 shrink-0 items-center justify-center rounded-[13px] border transition-all duration-300 group-hover:scale-110 group-hover:rotate-3',
                active
                  ? 'scale-105 bg-brand text-on-brand border-transparent shadow-sm'
                  : 'bg-brand/10 text-brand border-transparent group-hover:bg-brand/20',
              )}
            >
              <item.icon className="h-[22px] w-[22px]" />
            </span>
            <span className="min-w-0">
              <span
                className={cn(
                  'block text-[15.5px] font-bold tracking-tight transition-colors group-hover:text-ink',
                  active ? 'text-ink font-extrabold' : 'text-ink-2',
                )}
              >
                {item.title}
              </span>
              {item.subtitle && (
                <span className="mt-0.5 block text-[11px] leading-snug text-ink-2 opacity-80">
                  {item.subtitle}
                </span>
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
}
