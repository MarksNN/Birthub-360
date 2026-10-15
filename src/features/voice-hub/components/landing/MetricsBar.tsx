import type React from 'react';

interface MetricItem {
  value: string;
  label: string;
  detail: string;
}

const METRICS: MetricItem[] = [
  { value: '50+', label: 'Conectores & APIs', detail: 'Bitrix24 via REST/Webhooks e CRMs' },
  { value: '360°', label: 'Visão do Cliente', detail: 'Da prospecção ao fechamento' },
  { value: '10x', label: 'Velocidade de Decisão', detail: 'Diagnósticos e IA assistida' },
  { value: '99.9%', label: 'Disponibilidade', detail: 'Arquitetura resiliente e segura' },
];

export function MetricsBar(): React.ReactElement {
  return (
    <section className="py-10 bg-midnight/90 border-b border-white/5 text-left">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {METRICS.map((metric) => (
            <div key={metric.label} className="space-y-1">
              <div className="text-3xl sm:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-brand to-amber-300">
                {metric.value}
              </div>
              <div className="text-sm font-semibold text-white/90">{metric.label}</div>
              <div className="text-xs text-white/50">{metric.detail}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
