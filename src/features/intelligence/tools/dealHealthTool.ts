import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { getTenantId } from '../../../lib/async-context.js';
import { fromPrismaLeadStatus } from '../../../lib/enumMap.js';
import { prisma } from '../../../lib/prisma.js';
import { minimizePii } from '../services/guardrails.service.js';

export const checkDealHealthTool = tool(
  async ({
    leadId,
    staleDaysThreshold = 7,
    limit = 5,
  }: {
    leadId?: string;
    staleDaysThreshold?: number;
    limit?: number;
  }) => {
    const organizationId = getTenantId();
    if (!organizationId) {
      return 'Erro: contexto de organização ausente — não é possível avaliar a saúde do deal.';
    }

    try {
      if (leadId) {
        const lead = await prisma.lead.findFirst({
          where: { id: leadId, organizationId, deletedAt: null },
          include: {
            company: true,
            contact: true,
            activities: {
              where: { deletedAt: null },
              orderBy: { date: 'desc' },
              take: 3,
            },
            internalNotes: {
              orderBy: { createdAt: 'desc' },
              take: 3,
            },
          },
        });

        if (!lead) {
          return `Erro: Lead ${leadId} não encontrado no CRM desta organização.`;
        }

        const now = Date.now();
        const lastActivityDate = lead.lastInteraction ?? lead.updatedAt;
        const diffMs = now - new Date(lastActivityDate).getTime();
        const idleDays = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));

        let riskLevel: 'Saudável' | 'Atenção' | 'Crítico';
        if (idleDays <= 3) {
          riskLevel = 'Saudável';
        } else if (idleDays <= staleDaysThreshold) {
          riskLevel = 'Atenção';
        } else {
          riskLevel = 'Crítico';
        }

        const companyName =
          lead.company?.tradeName ?? lead.company?.legalName ?? 'Empresa não informada';
        const contactName = lead.contact?.name ?? 'Contato não informado';
        const dealAmount = Number(lead.amount ?? 0);
        const dealProbability = lead.probability ?? lead.score ?? 50;

        let diagnostic = `🏥 DIAGNÓSTICO DO DEAL: ${companyName}\n`;
        diagnostic += `- ID: ${lead.id}\n`;
        diagnostic += `- Estágio: ${fromPrismaLeadStatus(lead.status)}\n`;
        diagnostic += `- Valor Estimado: R$ ${dealAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n`;
        diagnostic += `- Probabilidade/Score: ${dealProbability}%\n`;
        diagnostic += `- Status de Risco: ${riskLevel} (${idleDays} dia(s) sem novas interações)\n`;
        diagnostic += `- Contato Principal: ${contactName} (${lead.contact?.role ?? 'Cargo não informado'})\n`;

        if (lead.activities.length > 0) {
          diagnostic += `\nÚltimas Atividades Registradas:\n`;
          for (const act of lead.activities) {
            diagnostic += `  * [${act.status}] ${act.type}: ${act.observations ?? 'Sem observações'} (${new Date(act.date).toLocaleDateString('pt-BR')})\n`;
          }
        } else {
          diagnostic += `\nNenhuma atividade recente registrada no CRM.\n`;
        }

        if (lead.contact?.name) {
          diagnostic = minimizePii(diagnostic, [
            { token: '[NOME_DO_CONTATO]', value: lead.contact.name },
          ]).text;
        }

        return diagnostic;
      }

      // Se nenhum leadId específico foi passado, busca os deals abertos mais estagnados da organização
      const cutoffDate = new Date(Date.now() - staleDaysThreshold * 24 * 60 * 60 * 1000);
      const staleLeads = await prisma.lead.findMany({
        where: {
          organizationId,
          deletedAt: null,
          status: {
            notIn: ['Negocios_Ganhos', 'Negocios_Perdidos', 'Lead_Desqualificado'],
          },
          OR: [
            { lastInteraction: { lt: cutoffDate } },
            { lastInteraction: null, updatedAt: { lt: cutoffDate } },
          ],
        },
        include: { company: true, contact: true },
        orderBy: { updatedAt: 'asc' },
        take: Math.min(Math.max(limit, 1), 10),
      });

      if (staleLeads.length === 0) {
        return `Nenhum deal estagnado (sem interação há mais de ${staleDaysThreshold} dias) encontrado no pipeline. O fluxo de oportunidades está ativo.`;
      }

      let summary = `⚠️ Encontrados ${staleLeads.length} deals com risco de estagnação no pipeline:\n\n`;
      for (const l of staleLeads) {
        const lastDate = l.lastInteraction ?? l.updatedAt;
        const idle = Math.floor(
          (Date.now() - new Date(lastDate).getTime()) / (1000 * 60 * 60 * 24),
        );
        const cName = l.company?.tradeName ?? l.company?.legalName ?? 'Empresa sem nome';
        summary += `- ID: ${l.id} | Empresa: ${cName} | Estágio: ${fromPrismaLeadStatus(l.status)} | Valor: R$ ${Number(l.amount ?? 0).toLocaleString('pt-BR')} | Parado há: ${idle} dias\n`;
      }
      summary += `\nRecomendação: utilize get_lead_context ou summarize_lead_history com o ID desejado para estruturar a abordagem de resgate.`;

      return summary;
    } catch (err: any) {
      return `Erro ao consultar saúde do pipeline: ${err instanceof Error ? err.message : String(err)}`;
    }
  },
  {
    name: 'check_deal_health',
    description:
      'Avalia o nível de risco, dias de estagnação (aging) e histórico recente de um negócio/deal específico no CRM, ou lista os negócios estagnados do funil quando nenhum leadId é fornecido.',
    schema: z.object({
      leadId: z
        .string()
        .optional()
        .describe('ID do Lead específico para obter raio-X detalhado de saúde do deal'),
      staleDaysThreshold: z
        .number()
        .min(1)
        .max(90)
        .optional()
        .describe('Limite de dias sem interação para considerar o deal em risco (padrão 7)'),
      limit: z
        .number()
        .min(1)
        .max(10)
        .optional()
        .describe(
          'Máximo de deals estagnados para retornar quando leadId não for informado (padrão 5)',
        ),
    }),
  },
);
