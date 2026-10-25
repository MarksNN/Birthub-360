import { DynamicStructuredTool } from '@langchain/core/tools';
import { z } from 'zod';
import { getTenantId } from '../../../lib/context.js';
import { logger } from '../../../lib/logger.js';
import { prisma } from '../../../lib/prisma.js';
import {
  generateEmailDraft,
  generateSalesPitch,
  handleSalesObjection,
} from '../../../lib/ai/features.js';
import { generateTextOutput } from '../../../lib/ai/gateway.js';

/**
 * Fábrica de Scripts Comerciais, Copy Multicanal, Battlecards e Prompts Reutilizáveis.
 * Permite que qualquer agente (ou o Swarm) gere scripts de ligação, WhatsApp, e-mail, LinkedIn,
 * contorno de objeções e salve Prompts/CustomAiTools reais na biblioteca da organização.
 */
export const scriptAndPromptTool = new DynamicStructuredTool({
  name: 'script_and_prompt_factory',
  description:
    'Gera scripts comerciais (cold call, WhatsApp, LinkedIn, e-mail, pitch de vendas, contorno de objeções) e cria/salva Prompts ou Ferramentas de IA reutilizáveis (Prompt / CustomAiTool) na biblioteca da organização.',
  schema: z.object({
    artifactType: z
      .enum([
        'cold_call_script',
        'whatsapp_script',
        'linkedin_sequence',
        'email_sequence',
        'sales_pitch',
        'objection_rebuttal',
        'reusable_system_prompt',
      ])
      .describe('Tipo de script comercial ou prompt de IA a gerar.'),
    targetAudienceOrPersona: z
      .string()
      .describe(
        'Cargo do decisor, nicho ou persona alvo (ex: CFO de Indústria, Diretor Comercial SaaS).',
      ),
    objective: z
      .string()
      .describe(
        'Objetivo central do script ou do prompt (ex: agendar demo de 15 min, contornar objeção de preço).',
      ),
    leadId: z
      .string()
      .optional()
      .describe('ID do lead para personalizar com dados reais do CRM (opcional).'),
    saveToPromptLibrary: z
      .boolean()
      .default(true)
      .describe(
        'Se true, salva o artefato gerado na tabela Prompt da organização para reuso por qualquer agente.',
      ),
    promptTitle: z.string().optional().describe('Título para salvar na biblioteca de Prompts.'),
  }),
  func: async ({
    artifactType,
    targetAudienceOrPersona,
    objective,
    leadId,
    saveToPromptLibrary,
    promptTitle,
  }) => {
    try {
      const organizationId = getTenantId();
      if (!organizationId) {
        return JSON.stringify({ error: 'Contexto de organização (tenant) ausente.' });
      }

      let leadContext = '';
      if (leadId) {
        const lead = await prisma.lead.findFirst({
          where: { id: leadId, organizationId },
          include: { company: true, contact: true },
        });
        if (lead) {
          leadContext = `Lead: ${lead.name} | Empresa: ${lead.company?.tradeName || lead.company?.legalName || 'N/A'} | Setor: ${lead.company?.cnae || lead.industry || 'N/A'} | Cargo: ${lead.contact?.role || 'Decisor'}`;
        }
      }

      let generatedContent = '';

      if (artifactType === 'sales_pitch') {
        generatedContent = await generateSalesPitch(
          `${targetAudienceOrPersona}. ${leadContext}`,
          objective,
          organizationId,
        );
      } else if (artifactType === 'objection_rebuttal') {
        generatedContent = await handleSalesObjection(
          objective,
          `${targetAudienceOrPersona}. ${leadContext}`,
          organizationId,
        );
      } else if (artifactType === 'email_sequence') {
        generatedContent = await generateEmailDraft(
          targetAudienceOrPersona,
          leadContext || 'Empresa Prospectada',
          objective,
          organizationId,
        );
      } else {
        const textResult = await generateTextOutput({
          organizationId,
          feature: `script_factory_${artifactType}`,
          systemInstruction:
            'Você é um especialista sênior em Enablement Comercial B2B e Engenharia de Prompts. Crie artefatos altamente práticos, persuasivos, diretos e prontos para uso imediato.',
          prompt: `Tipo de artefato: ${artifactType}\nPersona/Público-alvo: ${targetAudienceOrPersona}\nObjetivo: ${objective}\nContexto do CRM: ${leadContext || 'Uso geral para prospecção/vendas'}\n\nEntregue o roteiro estruturado com abertura, perguntas de diagnóstico (SPIN/BANT), proposta de valor e chamada para ação (CTA) clara.`,
          fallback: () =>
            `# [${artifactType.toUpperCase()}] — ${targetAudienceOrPersona}\n\n**Objetivo:** ${objective}\n${leadContext ? `**Contexto:** ${leadContext}\n` : ''}\n1. **Abertura Quebra-Gelo:** Olá, notei o movimento recente na operação de vocês e gostaria de compartilhar como equipes similares estão acelerando resultados.\n2. **Pergunta de Diagnóstico:** Como vocês priorizam hoje ${objective}?\n3. **Proposta de Valor & CTA:** Podemos alinhar em uma conversa rápida de 15 minutos nesta semana?`,
        });
        generatedContent = textResult.text;
      }

      let savedPromptId: string | null = null;
      if (saveToPromptLibrary) {
        const saved = await prisma.prompt.create({
          data: {
            organizationId,
            title: promptTitle || `[${artifactType}] ${targetAudienceOrPersona.slice(0, 60)}`,
            category: artifactType,
            content: generatedContent,
            tags: [artifactType, 'swarm-generated'],
          },
        });
        savedPromptId = saved.id;
      }

      return JSON.stringify(
        {
          success: true,
          artifactType,
          targetAudienceOrPersona,
          savedPromptId,
          content: generatedContent,
        },
        null,
        2,
      );
    } catch (error) {
      logger.error({ error, artifactType }, 'Erro em scriptAndPromptTool');
      return JSON.stringify({
        error: 'Falha ao gerar script comercial ou prompt.',
        details: error instanceof Error ? error.message : String(error),
      });
    }
  },
});
