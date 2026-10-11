import { LineChart, TrendingUp, Target, DollarSign } from 'lucide-react';
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

export function ForecastHub() {
  return (
    <div className="flex-1 flex flex-col h-full bg-[var(--bg)] text-[var(--ink)]">
      <CommandCenterHeader title="Forecast de Vendas" icon={LineChart} />

      <div className="flex-1 p-6 space-y-6 overflow-y-auto">
        <div className="mb-4">
          <p className="text-sm text-[var(--ink-2)]">
            Projete seus resultados com base nos dados do CRM
          </p>
        </div>

        <PredictabilityNoDataNotice what="O Forecast de Vendas" />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <KpiCard
            title="Previsão de Fechamento"
            value={NO_DATA_VALUE}
            icon={TrendingUp}
            subtitle={NO_DATA_SUBTITLE}
            variant="default"
          />
          <KpiCard
            title="Gap para a Meta"
            value={NO_DATA_VALUE}
            icon={Target}
            subtitle={NO_DATA_SUBTITLE}
            variant="default"
          />
          <KpiCard
            title="Pipeline Total Ativo"
            value={NO_DATA_VALUE}
            icon={DollarSign}
            subtitle={NO_DATA_SUBTITLE}
            variant="default"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Trajetória de Forecast vs Meta</CardTitle>
            </CardHeader>
            <CardContent className="border-t border-[var(--line)] pt-6">
              <PredictabilityEmptyState
                title="Sem dados de forecast"
                hint="O gráfico aparece quando houver leitura real de forecast e metas."
              />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Probabilidade por Etapa</CardTitle>
            </CardHeader>
            <CardContent className="border-t border-[var(--line)] pt-6">
              <PredictabilityEmptyState
                title="Sem dados por etapa"
                hint="Depende da leitura real do pipeline do CRM."
              />
            </CardContent>
          </Card>
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Top Negócios no Forecast</CardTitle>
            </CardHeader>
            <CardContent className="border-t border-[var(--line)] pt-6">
              <PredictabilityEmptyState
                title="Nenhum negócio exibido"
                hint="Os negócios do CRM aparecerão aqui quando a integração estiver disponível."
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
