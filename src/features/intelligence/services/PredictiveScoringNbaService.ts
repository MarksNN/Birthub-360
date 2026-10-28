import {
  cleanAndParseJson,
  generateEmbedding,
  getAiModel,
  litellmProvider,
  logAiUsage,
} from '../../../lib/ai/gateway.js';
import { logger } from '../../../lib/logger.js';
import { prisma } from '../../../lib/prisma.js';
import {
  searchSimilarWonDealsInQdrant,
  VECTOR_DIMENSION,
} from '../../../lib/qdrant/funnelVectorStore.ts';
import type { NextBestActionResult } from '../../activities/services/next-best-action.service.js';
import {
  computeLookalikeScore,
  type LookalikeScoreResult,
} from '../../prospecting/services/lookalike-scoring.service.js';

export interface PredictiveLeadScoreResult {
  leadId: string;
  organizationId: string;
  predictiveScore: number;
  fitScore: number;
  qdrantVectorScore: number | null;
  pgvectorLookalikeScore: number | null;
  qdrantMatchesCount: number;
  confidence: number;
  modelVersion: string;
  calculatedAt: number;
}

export interface PredictiveNbaParams {
  leadId: string;
  organizationId: string;
  leadName: string;
  companyName?: string;
  stage: string;
  recentNotes?: string;
  lastInteractionDaysAgo?: number;
}

export class PredictiveScoringNbaService {
  /**
   * Conecta a busca vetorial Qdrant + pgvector ao funil de vendas para calcular o Lead Scoring preditivo.
   */
  public async computePredictiveScore(
    leadId: string,
    organizationId: string,
  ): Promise<PredictiveLeadScoreResult> {
    const lead = await prisma.lead.findFirst({
      where: { id: leadId, organizationId },
      include: { company: true },
    });

    if (!lead) {
      throw new Error(`Lead ${leadId} não encontrado para a organização ${organizationId}`);
    }

    const fitScore = (lead as any).fitScore ?? 50;
    let qdrantVectorScore: number | null = null;
    let qdrantMatchesCount = 0;
    let pgvectorScore: number | null = null;

    // 1. Busca similaridade vetorial via Qdrant se houver empresa associada
    if (lead.companyId) {
      try {
        const companyText = `${lead.company?.tradeName || ''} | ${lead.company?.segment || ''} | ${lead.company?.cnae || ''}`;
        if (companyText.trim().length > 5) {
          const vector = await generateEmbedding(companyText);
          if (vector.length === VECTOR_DIMENSION) {
            const matches = await searchSimilarWonDealsInQdrant(organizationId, vector, 5);
            if (matches.length > 0) {
              qdrantMatchesCount = matches.length;
              const sum = matches.reduce((acc, m) => acc + m.similarity, 0);
              qdrantVectorScore = Math.round((sum / matches.length) * 100);
            }
          }
        }
      } catch (err: any) {
        logger.warn({ err, leadId }, '[PredictiveScoring] Falha ao consultar Qdrant.');
      }

      // 2. Fallback / Complemento com pgvector lookalike score
      try {
        const lookalikeRes: LookalikeScoreResult | null = await computeLookalikeScore(
          lead.companyId,
          organizationId,
        );
        if (lookalikeRes) {
          pgvectorScore = Math.round(lookalikeRes.score * 100);
        }
      } catch (err: any) {
        logger.warn({ err, leadId }, '[PredictiveScoring] Falha ao consultar pgvector lookalike.');
      }
    }

    // 3. Composição ponderada do Score Preditivo final
    let vectorContribution = 0;
    let vectorWeight = 0;

    if (qdrantVectorScore !== null) {
      vectorContribution += qdrantVectorScore * 0.6;
      vectorWeight += 0.6;
    }
    if (pgvectorScore !== null) {
      vectorContribution += pgvectorScore * 0.4;
      vectorWeight += 0.4;
    }

    const finalVectorScore = vectorWeight > 0 ? vectorContribution / vectorWeight : null;

    // Score final: 50% Fit firmográfico determinístico + 50% Similaridade Vetorial (Qdrant/pgvector)
    const predictiveScore =
      finalVectorScore !== null ? Math.round(fitScore * 0.5 + finalVectorScore * 0.5) : fitScore;

    const confidence = finalVectorScore !== null ? 0.9 : 0.6;

    // Atualiza o lead no banco de dados com o novo score preditivo
    await prisma.lead.update({
      where: { id: leadId },
      data: { score: predictiveScore },
    });

    return {
      leadId,
      organizationId,
      predictiveScore,
      fitScore,
      qdrantVectorScore,
      pgvectorLookalikeScore: pgvectorScore,
      qdrantMatchesCount,
      confidence,
      modelVersion: 'v2-predictive-qdrant',
      calculatedAt: Date.now(),
    };
  }

  /**
   * Gera a Next Best Action (NBA) para um lead do funil conectando LiteLLM ao contexto de vendas.
   */
  public async generateNextBestAction(params: PredictiveNbaParams): Promise<NextBestActionResult> {
    const startTime = Date.now();
    const systemPrompt = `Você é o Diretor de Operações de Vendas (RevOps & AI Copilot).
Analise o estado atual do lead no funil de vendas e determine a PRÓXIMA MELHOR AÇÃO (Next Best Action - NBA).
Seja extremamente prático e orientado a fechamento de negócios.

Retorne APENAS um JSON válido no formato:
{
  "recommendedAction": "Ação recomendada em 1 frase",
  "actionType": "task" | "meeting" | "email" | "whatsapp" | "proposal_revision" | "escalation",
  "priority": "Alta" | "Média" | "Baixa",
  "suggestedDueDateDays": 1,
  "suggestedMessageTemplate": "Modelo de mensagem em português",
  "keyRiskDetected": "Risco identificado se houver",
  "summaryBulletPoints": ["Ponto 1", "Ponto 2"]
}`;

    const userPrompt = `Lead: ${params.leadName} (${params.companyName || 'Empresa não informada'})
Etapa no Funil: ${params.stage}
Última interação há: ${params.lastInteractionDaysAgo ?? 0} dias
Anotações/Histórico: ${params.recentNotes || 'Sem anotações recentes.'}`;

    // Tenta primeiro utilizar o LiteLLM provider se estiver configurado
    if (litellmProvider.isConfigured()) {
      try {
        const response: any = await litellmProvider.chatCompletion({
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          temperature: 0.2,
          resolvedModel: 'litellm/qwen2.5-coder',
          agentContext: 'predictive-nba',
          timeoutMs: 15000,
        });

        const textContent = response?.choices?.[0]?.message?.content || (response as any)?.content;
        if (textContent) {
          return cleanAndParseJson<NextBestActionResult>(textContent);
        }
      } catch (err: any) {
        logger.warn(
          { err },
          '[PredictiveNba] LiteLLM indisponível, recorrendo ao AI Gateway padrão.',
        );
      }
    }

    // Fallback gracioso para getAiModel (OpenAI / Gemini / Ollama via AI Gateway)
    const model = getAiModel('local-llama3-fast', 0.2, 'predictive-nba');
    const response = await model.invoke([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ] as any);

    await logAiUsage({
      model: response.response_metadata?.model ?? 'local-llama3-fast',
      usage: response.response_metadata?.tokenUsage ?? {
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
      },
      latencyMs: Date.now() - startTime,
      promptId: 'predictive-nba',
    });

    return cleanAndParseJson<NextBestActionResult>(response.content as string);
  }
}

export const predictiveScoringNbaService = new PredictiveScoringNbaService();
