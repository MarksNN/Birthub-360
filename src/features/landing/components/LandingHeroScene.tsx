import { lazy, Suspense } from 'react';

const BrandOrb = lazy(() =>
  import('@/components/ui/BrandOrb').then((mod) => ({ default: mod.BrandOrb })),
);

export function LandingHeroScene() {
  return (
    <div className="relative flex h-full flex-col justify-between">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-brand/10 via-transparent to-transparent" />

      <div className="space-y-4 max-w-xl">
        <div className="inline-flex items-center gap-2 rounded-full border border-brand/20 bg-brand/5 px-3 py-1 text-xs font-semibold text-brand">
          <span className="h-1.5 w-1.5 rounded-full bg-brand animate-pulse" />
          Birth Hub 360° One OS
        </div>
        <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-ink leading-tight">
          Dados que Conectam.
          <br />
          Inteligência que Decide.
          <br />
          <span className="text-brand">Resultados que Acontecem.</span>
        </h1>
        <p className="text-base text-ink-muted leading-relaxed">
          O lugar central de inteligência da sua operação comercial: orquestração de leads,
          diagnósticos preditivos e aceleração de receita em tempo real.
        </p>
      </div>

      <div className="my-auto flex items-center justify-center py-8">
        <Suspense fallback={<div className="h-44 w-44 rounded-full bg-muted/20 animate-pulse" />}>
          <BrandOrb size={200} interactive />
        </Suspense>
      </div>

      <div className="grid grid-cols-3 gap-4 border-t border-border-subtle pt-6 text-xs text-ink-muted">
        <div>
          <span className="block font-bold text-ink text-base">50+</span>
          Integrações B2B
        </div>
        <div>
          <span className="block font-bold text-ink text-base">100%</span>
          Isolamento Multi-Tenant
        </div>
        <div>
          <span className="block font-bold text-ink text-base">&lt; 100ms</span>
          Latência de Telemetria
        </div>
      </div>
    </div>
  );
}
