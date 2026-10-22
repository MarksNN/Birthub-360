import React from 'react';

export interface ConfidenceIntervalData {
  p10: number;
  p50: number;
  p90: number;
}

export interface HorizonProjectionData {
  horizonDays: number;
  expectedRevenue: number | null;
  confidenceInterval: ConfidenceIntervalData | null;
  status: 'ok' | 'insufficient_data';
}

export interface PredictiveCockpitPayload {
  status: 'ok' | 'insufficient_data';
  currentPeriod: string;
  closedWonRevenue: number;
  weightedPipelineRevenue: number;
  modelConfidence: string;
  projections: {
    days30: HorizonProjectionData;
    days90: HorizonProjectionData;
    days180: HorizonProjectionData;
  } | null;
}

export interface PredictiveRevenueCockpitProps {
  loading?: boolean;
  data?: PredictiveCockpitPayload | null;
  error?: string | null;
}

export const PredictiveRevenueCockpit: React.FC<PredictiveRevenueCockpitProps> = ({
  loading,
  data,
  error,
}) => {
  if (loading) {
    return (
      <div data-testid="predictive-loading" className="p-6 space-y-4 animate-pulse">
        <div className="h-8 bg-muted rounded w-1/3"></div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="h-32 bg-muted rounded"></div>
          <div className="h-32 bg-muted rounded"></div>
          <div className="h-32 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        data-testid="predictive-error"
        className="p-6 border border-destructive/50 bg-destructive/10 rounded-lg text-destructive"
      >
        <h3 className="font-semibold text-lg">Erro ao carregar projeções</h3>
        <p className="text-sm">{error}</p>
      </div>
    );
  }

  if (!data || data.status === 'insufficient_data' || !data.projections) {
    return (
      <div
        data-testid="predictive-empty"
        className="p-8 text-center border border-dashed rounded-lg bg-card/50 space-y-3"
      >
        <h3 className="text-lg font-semibold text-foreground">
          Histórico Insuficiente para Projeção Confiável
        </h3>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          Para garantir rigor estatístico e evitar falsas previsões, o Oráculo de Receita exige um
          histórico mínimo de 10 negócios ganhos nos últimos 24 meses.
        </p>
        <span className="inline-block px-3 py-1 bg-amber-500/10 text-amber-600 rounded-full text-xs font-medium">
          Status: INSUFFICIENT_DATA
        </span>
      </div>
    );
  }

  const { days30, days90, days180 } = data.projections;

  return (
    <div
      data-testid="predictive-ready"
      className="p-6 space-y-6 bg-card rounded-xl border shadow-sm"
    >
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b pb-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground">
            Oráculo de Receita Preditiva
          </h2>
          <p className="text-xs text-muted-foreground">
            Projeções empíricas baseadas em dispersão histórica real (P10 / P50 / P90)
          </p>
        </div>
        <span className="px-3 py-1 bg-emerald-500/10 text-emerald-600 font-semibold text-xs rounded-full">
          Modelo: {data.modelConfidence}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* 30 Dias */}
        <div className="p-4 rounded-lg border bg-background/50 space-y-2">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Horizonte 30 Dias
          </span>
          <div className="text-2xl font-bold text-foreground">
            R$ {(days30.expectedRevenue ?? 0).toLocaleString('pt-BR')}
          </div>
          {days30.confidenceInterval && (
            <div className="text-xs text-muted-foreground flex justify-between pt-1 border-t">
              <span>P10: R$ {days30.confidenceInterval.p10.toLocaleString('pt-BR')}</span>
              <span>P90: R$ {days30.confidenceInterval.p90.toLocaleString('pt-BR')}</span>
            </div>
          )}
        </div>

        {/* 90 Dias */}
        <div className="p-4 rounded-lg border bg-background/50 space-y-2">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Horizonte 90 Dias
          </span>
          <div className="text-2xl font-bold text-foreground">
            R$ {(days90.expectedRevenue ?? 0).toLocaleString('pt-BR')}
          </div>
          {days90.confidenceInterval && (
            <div className="text-xs text-muted-foreground flex justify-between pt-1 border-t">
              <span>P10: R$ {days90.confidenceInterval.p10.toLocaleString('pt-BR')}</span>
              <span>P90: R$ {days90.confidenceInterval.p90.toLocaleString('pt-BR')}</span>
            </div>
          )}
        </div>

        {/* 180 Dias */}
        <div className="p-4 rounded-lg border bg-background/50 space-y-2">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Horizonte 180 Dias
          </span>
          <div className="text-2xl font-bold text-foreground">
            R$ {(days180.expectedRevenue ?? 0).toLocaleString('pt-BR')}
          </div>
          {days180.confidenceInterval && (
            <div className="text-xs text-muted-foreground flex justify-between pt-1 border-t">
              <span>P10: R$ {days180.confidenceInterval.p10.toLocaleString('pt-BR')}</span>
              <span>P90: R$ {days180.confidenceInterval.p90.toLocaleString('pt-BR')}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
