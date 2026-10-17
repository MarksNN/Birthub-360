/**
 * Contrato de composição para ingestão de insights de chamadas e reuniões de campo
 * na detecção de riscos de negociação (Commercial Intelligence).
 * Permite que features (ex: mobile) emitam insights sem importar
 * internals de commercial-intelligence diretamente (regra no-cross-feature-imports).
 *
 * A implementação concreta é registrada no container de DI em `src/shared/di/setup.ts`.
 */
export interface LiveCallInsightInput {
  callId: string;
  dealId: string;
  timestamp: Date;
  sentimentScore: number;
  objectionCategory?: string | null;
  competitorMentioned?: string | null;
  suggestedRebuttal?: string | null;
}

export interface LiveCallRiskPort {
  ingestLiveCallInsight(
    organizationId: string,
    insight: LiveCallInsightInput,
    now?: Date,
    options?: { notify?: boolean },
  ): Promise<unknown>;
}
