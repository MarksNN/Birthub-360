import { Target, Trophy, ArrowUpRight } from 'lucide-react';
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

export function MetasHub() {
  return (
    <div className="flex-1 flex flex-col h-full bg-[var(--bg)] text-[var(--ink)]">
      <CommandCenterHeader title="Metas e Projeções" icon={Target} />

      <div className="flex-1 p-6 space-y-6 overflow-y-auto">
        <div className="mb-4">
          <p className="text-sm text-[var(--ink-2)]">
            Acompanhamento de cotas e performance do time
          </p>
        </div>

        <PredictabilityNoDataNotice what="Metas e Projeções" />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <KpiCard
            title="Meta Global do Mês"
            value={NO_DATA_VALUE}
            icon={Target}
            subtitle={NO_DATA_SUBTITLE}
            variant="default"
          />
          <KpiCard
            title="Total Atingido"
            value={NO_DATA_VALUE}
            icon={Trophy}
            subtitle={NO_DATA_SUBTITLE}
            variant="default"
          />
          <KpiCard
            title="Pace (Ritmo Atual)"
            value={NO_DATA_VALUE}
            icon={ArrowUpRight}
            subtitle={NO_DATA_SUBTITLE}
            variant="default"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Atingimento por Vendedor</CardTitle>
            </CardHeader>
            <CardContent className="border-t border-[var(--line)] pt-6">
              <PredictabilityEmptyState
                title="Sem metas cadastradas"
                hint="As metas por vendedor aparecem quando houver leitura real de metas."
              />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Metas por Equipe</CardTitle>
            </CardHeader>
            <CardContent className="border-t border-[var(--line)] pt-6">
              <PredictabilityEmptyState
                title="Sem dados de equipe"
                hint="Depende da leitura real de metas e do CRM."
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
