import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { generateEmailDraft } from '../../../lib/ai/features.js';
import { getTenantId } from '../../../lib/async-context.js';
import { logger } from '../../../lib/logger.js';
import { prisma } from '../../../lib/prisma.js';
import { assertPiiExternalConsent } from '../services/guardrails.service.js';

const copywriterSchema = z.object({
  leadId: z.string().describe('O ID do Lead (obrigatório para salvar a nota internamente)'),
  targetRole: z.string().describe('Cargo ou perfil do decisor (ex: CFO, Gerente de Logística)'),
  icpPainPoint: z.string().describe('A principal dor ou gargalo identificado'),
  tone: z
    .enum(['Persuasivo', 'Consultivo', 'Direto', 'Provocativo'])
    .describe('O tom desejado para a copy'),
});

export const copywriterTool = tool(
  async (args) => {
    const organizationId = getTenantId();
    if (!organizationId) return 'Erro: Contexto de organização ausente.';

    try {
      logger.info({ leadId: args.leadId }, 'Gerando template de cold email via IA');

      const lead = await prisma.lead.findFirst({
        where: { id: args.leadId, organizationId },
        include: { company: true, contact: true },
      });

      let finalCopy: string;
      try {
        await assertPiiExternalConsent(organizationId);
        const contextStr = [
          `Empresa: ${lead?.company?.tradeName || lead?.company?.legalName || 'Prospect B2B'}`,
          lead?.company?.segment && `Segmento: ${lead.company.segment}`,
          `Cargo alvo: ${args.targetRole}`,
          `Dor central: ${args.icpPainPoint}`,
          `Tom exigido: ${args.tone}`,
        ]
          .filter(Boolean)
          .join(' | ');

        finalCopy = await generateEmailDraft(
          contextStr,
          `Agendar conversa executiva de 15 minutos abordando ${args.icpPainPoint} com tom ${args.tone}`,
          [
            { token: '[CONTACT_NAME]', value: lead?.contact?.name },
            { token: '[CONTACT_EMAIL]', value: lead?.contact?.email },
          ],
        );
      } catch {
        const subject = `Ideia para otimizar ${args.icpPainPoint}`;
        const body = `Olá, tudo bem?\n\nSabemos que, como ${args.targetRole}, um dos maiores desafios atuais é lidar com ${args.icpPainPoint}. Na Birth Hub 360, temos ajudado empresas similares a mitigar exatamente isso com tecnologia de ponta.\n\nFaz sentido agendarmos 10 minutos na próxima semana para trocarmos uma ideia sobre como isso impacta sua operação?`;
        finalCopy = `Assunto: ${subject}\n\n${body}`;
      }

      // Salva como uma nota interna para o SDR usar depois. O model `Note` não tem `type`
      // nem `organizationId` (escopo de organização vem do `leadId` -> `lead.organizationId`)
      // e exige `author` — ver padrão em note.service.ts/abTesting.service.ts.
      await prisma.note.create({
        data: {
          content: `[Gerado por IA] Sugestão de Cold Email:\n\n${finalCopy}`,
          author: 'Agente de IA (Copywriter)',
          leadId: args.leadId,
        },
      });

      return `Draft de email gerado com sucesso e salvo no histórico do Lead! Conteúdo gerado:\n\n${finalCopy}`;
    } catch (error: any) {
      logger.error({ err: error, leadId: args.leadId }, 'Erro ao gerar copy do lead');
      return 'Erro ao tentar gerar o draft de email.';
    }
  },
  {
    name: 'generate_cold_email_copy',
    description:
      'Gera uma cópia de email de prospecção fria focada na dor do cliente, salvando automaticamente no histórico do Lead.',
    schema: copywriterSchema,
  },
);
