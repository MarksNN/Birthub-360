import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { vectorStore } from '../../../lib/ai/vectorStore.js';
import { getTenantId } from '../../../lib/async-context.js';
import { prisma } from '../../../lib/prisma.js';

export const getObjectionBattlecardTool = tool(
  async ({
    objectionCategory,
    query,
  }: {
    objectionCategory: 'Preco' | 'Concorrencia' | 'Timing' | 'Autoridade' | 'Confianca' | 'Geral';
    query?: string;
  }) => {
    const organizationId = getTenantId();
    if (!organizationId) {
      return 'Erro: contexto de organização ausente — não é possível consultar battlecards com segurança.';
    }

    try {
      // 1. Busca primeiro na tabela estruturada de ObjectionMatrixItem da organização
      const dbItems = await prisma.objectionMatrixItem.findMany({
        where: {
          organizationId,
          ...(query
            ? {
                OR: [
                  { objectionTitle: { contains: query, mode: 'insensitive' } },
                  { objectionText: { contains: query, mode: 'insensitive' } },
                  { segment: { contains: query, mode: 'insensitive' } },
                ],
              }
            : {}),
        },
        take: 3,
      });

      if (dbItems.length > 0) {
        const sections = dbItems.map((item, idx) => {
          return [
            `⚔️ BATTLECARD ${idx + 1}: "${item.objectionTitle}" (Segmento: ${item.segment} | Persona: ${item.persona})`,
            `> Objeção Típica: "${item.objectionText}"`,
            `💡 Roteiro de Contorno (Give-Get):`,
            item.responseScript,
            `🛡️ Diferencial Chave / Âncora de Valor:`,
            item.keyDifferentiator,
          ].join('\n');
        });

        return `Matriz de Objeções (Base Cadastrada da Organização):\n\n${sections.join('\n\n---\n\n')}`;
      }

      // 2. Se não encontrar no banco estruturado, consulta o RAG (vectorStore) com busca semântica
      const searchQuery = query
        ? `objeção ${objectionCategory}: ${query}`
        : `como contornar objeção de ${objectionCategory} matriz vendas playbook`;

      const ragResults = await vectorStore.similaritySearch(searchQuery, 3);
      const usable = ragResults.filter((r) => r.similarity == null || r.similarity >= 0.65);

      if (usable.length > 0) {
        const lines = usable.map((r, idx) => {
          const scoreLabel =
            r.similarity != null
              ? `similaridade ${(r.similarity * 100).toFixed(1)}%`
              : 'palavra-chave';
          return [
            `--- Battlecard Playbook ${idx + 1} (Fonte: "${r.documentTitle}", ${scoreLabel}) ---`,
            r.content,
          ].join('\n');
        });

        return `Diretrizes de Battlecard encontradas no Playbook da organização:\n\n${lines.join('\n\n')}\n\nRecomendação: utilize as diretrizes acima citando os argumentos de valor comprovados.`;
      }

      return `Nenhuma diretriz cadastrada ou documento no Playbook encontrado especificamente para a categoria "${objectionCategory}" ${query ? `com o termo "${query}"` : ''}. Recomenda-se aplicar o framework Challenger: investigue o custo da inação e a prioridade de negócio do decisor antes de conceder descontos ou prazos.`;
    } catch (err: any) {
      return `Erro ao consultar matriz de objeções: ${err instanceof Error ? err.message : String(err)}`;
    }
  },
  {
    name: 'get_objection_battlecard',
    description:
      'Consulta a matriz oficial de objeções e battlecards táticos da organização para quebrar hesitações de preço, concorrente, timing, autoridade ou confiança, citando a resposta sugerida e o diferencial chave.',
    schema: z.object({
      objectionCategory: z
        .enum(['Preco', 'Concorrencia', 'Timing', 'Autoridade', 'Confianca', 'Geral'])
        .describe('Categoria central da objeção levantada pelo cliente'),
      query: z
        .string()
        .optional()
        .describe(
          'Texto ou palavra-chave específica da objeção (ex: "muito caro", "já usamos Totvs", "fim de ano")',
        ),
    }),
  },
);
