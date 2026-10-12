import { AlertCircle, CheckCircle, Database } from 'lucide-react';
import type React from 'react';
import type { EnrichmentSource } from './types.js';

interface LeadCardEnrichmentBadgeProps {
  source?: EnrichmentSource;
  confidence?: 'ALTA' | 'MEDIA' | 'BAIXA';
}

export function LeadCardEnrichmentBadge({
  source = 'APOLLO',
  confidence = 'ALTA',
}: LeadCardEnrichmentBadgeProps): React.ReactElement {
  const confidenceConfig = {
    ALTA: { color: 'text-emerald-500', icon: CheckCircle, label: 'Enriquecimento Verificado' },
    MEDIA: { color: 'text-amber-500', icon: AlertCircle, label: 'Validação Parcial' },
    BAIXA: { color: 'text-rose-500', icon: AlertCircle, label: 'Requer Checagem Manual' },
  }[confidence];

  const Icon = confidenceConfig.icon;

  return (
    <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-[#F8F9FF]/50">
      <Database className="w-3 h-3 text-brand" />
      <span>
        Fonte: <strong className="text-slate-700 dark:text-[#F8F9FF]/80">{source}</strong>
      </span>
      <span>•</span>
      <span className={`inline-flex items-center gap-1 ${confidenceConfig.color} font-medium`}>
        <Icon className="w-3 h-3" />
        {confidenceConfig.label}
      </span>
    </div>
  );
}
