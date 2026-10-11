import { Layers, Calculator, BarChart4, AlertCircle } from 'lucide-react';
import { CommandCenterHeader } from '../../../components/ui/CommandCenterHeader.js';
import { Card, CardHeader, CardTitle, CardContent } from '../../../components/ui/Card.js';
import { KpiCard } from '../../../components/ui/KpiCard.js';
import {
  NO_DATA_SUBTITLE,
  NO_DATA_VALUE,
  PredictabilityEmptyState,
  PredictabilityNoDataNotice,
} from './PredictabilityNoData.js';

// P0 #693 (Agente 02): valores em R$ fixos removidos — sem API, a tela mostra "Sem dados".
// Plugar leitura real quando a PR B do Agente 04 (crm overview + goals/forecast) for mergeada.

export function PipelinePonderadoHub() {
  return (
    <div className="flex-1 flex flex-col h-full bg-[var(--bg)] text-[var(--ink)]">
      <CommandCenterHeader title="Pipeline Ponderado" icon={Layers} />

      <div className="flex-1 p-6 space-y-6 overflow-y-auto">
        <div className="mb-4">
          <p className="text-sm text-[var(--ink-2)]">
            O valor do seu funil ajustado pela probabilidade de fechamento
          </p>
        </div>

        <PredictabilityNoDataNotice what="O Pipeline Ponderado" />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <KpiCard
            title="Valor Bruto do Funil"
            value={NO_DATA_VALUE}
            icon={BarChart4}
            subtitle={NO_DATA_SUBTITLE}
            variant="default"
          />
          <KpiCard
            title="Valor Ponderado"
            value={NO_DATA_VALUE}
            icon={Calculator}
            subtitle={NO_DATA_SUBTITLE}
            variant="default"
          />
          <KpiCard
            title="Risco Calculado"
            value={NO_DATA_VALUE}
            icon={AlertCircle}
            subtitle={NO_DATA_SUBTITLE}
            variant="default"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Cálculo por Etapa do Pipeline</CardTitle>
            </CardHeader>
            <CardContent className="border-t border-[var(--line)] pt-6">
              <PredictabilityEmptyState
                title="Sem dados do pipeline"
                hint="O cálculo por etapa aparece quando houver leitura real do CRM."
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
