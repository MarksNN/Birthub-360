import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { cleanAndParseJson, getAiModel } from '../../../lib/ai/gateway.js';
import { logAiUsage } from '../../../lib/ai/usage-log.js';
import { logger } from '../../../lib/logger.js';
import type {
  GenerateApproachInput,
  GeneratedApproachResult,
  SocialSellingChannel,
  SocialSellingTone,
} from '../domain/socialSelling.types.js';

export class SocialSellingApproachService {
  async generateApproach(
    organizationId: string,
    userId: string,
    input: GenerateApproachInput,
  ): Promise<GeneratedApproachResult> {
    const channel: SocialSellingChannel = input.channel || 'linkedin';
    const tone: SocialSellingTone = input.tone || 'consultivo';
    const company = input.targetCompany?.trim() || 'empresa-alvo';
    const role = input.targetRole?.trim() || 'Decisor Comercial';
    const segment = input.segment?.trim() || 'B2B Corporativo';
    const trigger =
      input.triggerEvent?.trim() || 'Crescimento e eficiência operacional da área comercial';

    const systemPrompt = `Você é o estrategista de Social Selling e Prospecção Consultiva do Birth Hub 360°.
Sua missão é estruturar abordagens comerciais de altíssima relevância, sem clichês, sem spam e orientadas a valor para decisores de negócios.

Diretrizes:
- Canal: ${channel.toUpperCase()} (adapte comprimento e formatação adequadamente).
- Tom: ${tone.toUpperCase()}.
- Nunca use jargões vazios ("espero que este e-mail o encontre bem", "gostaria de 15 minutos do seu tempo").
- O foco deve ser o diagnóstico de gargalos operacionais, perda de leads e previsibilidade de receita.

Formato de Saída (JSON Estrito):
{
  "headline": "Título instigante da abordagem",
  "hook": "Gancho inicial conectando ao contexto do segmento/cargo",
  "body": "Desenvolvimento do valor e desafio comum da operação",
  "callToAction": "Pergunta aberta ou convite de baixo atrito para diálogo",
  "fullMessage": "Texto completo compilado e pronto para envio"
}`;

    const userPrompt = `Gere uma abordagem para:
- Empresa: ${company}
- Cargo do Decisor: ${role}
- Segmento: ${segment}
- Fato Relevante / Gatilho: ${trigger}`;

    const model = getAiModel('local-llama3-fast', 0.4, 'social-selling-outreach');

    const startTime = Date.now();

    try {
      const response = await model.invoke([
        new SystemMessage(systemPrompt),
        new HumanMessage(userPrompt),
      ]);

      const content =
        typeof response.content === 'string' ? response.content : JSON.stringify(response.content);
      const parsed = cleanAndParseJson<Partial<GeneratedApproachResult>>(content);

      const headline = parsed.headline || `Estratégia comercial e previsibilidade para ${company}`;
      const hook =
        parsed.hook ||
        `Olá! Acompanhando o cenário de ${segment}, percebo o desafio crescente de manter o pipeline previsível.`;
      const body =
        parsed.body ||
        `Muitas operações enfrentam gargalos no repasse entre pré-vendas e fechamento, gerando perda silenciosa de oportunidades qualificadas.`;
      const callToAction =
        parsed.callToAction ||
        `Como vocês têm estruturado a governança e o diagnóstico desses leads hoje?`;
      const fullMessage = parsed.fullMessage || `${hook}\n\n${body}\n\n${callToAction}`;

      const usage = response.response_metadata?.tokenUsage ?? {
        totalTokens: 320,
        promptTokens: 160,
        completionTokens: 160,
      };
      const totalTokens = usage.totalTokens;

      // Registro FinOps de consumo via logAiUsage (vinculado a organizationId e userId)
      try {
        await logAiUsage({
          model: 'local-llama3-fast',
          usage,
          latencyMs: Math.max(1, Date.now() - startTime),
          promptId: 'social-selling-outreach',
        });
      } catch (logErr) {
        logger.warn(
          { error: logErr },
          'Falha no log de uso FinOps de Social Selling (best-effort)',
        );
      }

      return {
        headline,
        hook,
        body,
        callToAction,
        fullMessage,
        channel,
        tone,
        modelUsed: 'local-llama3-fast',
        estimatedTokens: totalTokens,
      };
    } catch (error) {
      logger.error(
        {
          error,
          organizationId,
          input,
        },
        'Erro ao gerar abordagem de Social Selling via AI Gateway',
      );
      throw error;
    }
  }
}

export const socialSellingApproachService = new SocialSellingApproachService();
