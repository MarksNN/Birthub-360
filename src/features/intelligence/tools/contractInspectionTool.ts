import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { getTenantId } from '../../../lib/async-context.js';
import { prisma } from '../../../lib/prisma.js';
import { minimizePii } from '../services/guardrails.service.js';

export const inspectContractReadinessTool = tool(
  async ({ leadId }: { leadId: string }) => {
    const organizationId = getTenantId();
    if (!organizationId) {
      return 'Erro: contexto de organização ausente — não é possível inspecionar contrato.';
    }

    try {
      const lead = await prisma.lead.findFirst({
        where: { id: leadId, organizationId, deletedAt: null },
        include: {
          company: true,
          contact: true,
        },
      });

      if (!lead) {
        return `Erro: Lead ${leadId} não encontrado no CRM desta organização.`;
      }

      // Consulta se existem propostas comerciais (CrmCommercialDocument) vinculadas a este lead
      const documents = await prisma.crmCommercialDocument.findMany({
        where: { leadId, organizationId, deletedAt: null },
        orderBy: { updatedAt: 'desc' },
        take: 3,
      });

      // Validação de dados cadastrais essenciais
      const company = lead.company;
      const contact = lead.contact;

      const hasCompanyName = Boolean(company?.tradeName || company?.legalName);
      const hasCnpj = Boolean(company?.cnpj);
      const hasSignerName = Boolean(contact?.name);
      const hasSignerEmail = Boolean(contact?.email);
      const hasAmount = Boolean(lead.amount && Number(lead.amount) > 0);

      const checklist: string[] = [
        hasCompanyName
          ? '✅ Razão Social / Fantasia preenchida'
          : '❌ Falta Razão Social / Fantasia',
        hasCnpj
          ? '✅ CNPJ da empresa cadastrado'
          : '⚠️ CNPJ da empresa ausente (necessário para formalização)',
        hasSignerName ? '✅ Nome do signatário identificado' : '❌ Falta Nome do Signatário',
        hasSignerEmail
          ? '✅ E-mail do signatário cadastrado'
          : '❌ Falta E-mail corporativo do signatário',
        hasAmount
          ? `✅ Valor da negociação definido (R$ ${Number(lead.amount).toLocaleString('pt-BR')})`
          : '⚠️ Valor da negociação não preenchido ou zerado',
      ];

      let readinessScore = 0;
      if (hasCompanyName) readinessScore += 25;
      if (hasCnpj) readinessScore += 25;
      if (hasSignerName && hasSignerEmail) readinessScore += 30;
      if (hasAmount) readinessScore += 20;

      let result = `📄 RELATÓRIO DE PRONTIDÃO CONTRATUAL — LEAD ${lead.id}\n`;
      result += `Empresa: ${company?.tradeName ?? company?.legalName ?? 'Sem nome'}\n`;
      result += `Contato / Signatário: ${contact?.name ?? 'Não informado'} (${contact?.role ?? 'Cargo não informado'})\n`;
      result += `Índice de Prontidão: ${readinessScore}%\n\n`;
      result += `Checklist Documental:\n${checklist.join('\n')}\n\n`;

      if (documents.length > 0) {
        result += `Propostas Comerciais Vinculadas no CRM (${documents.length}):\n`;
        for (const doc of documents) {
          result += `  * [${doc.status}] Proposta ${doc.number} ("${doc.title}") - Total: R$ ${doc.total.toLocaleString('pt-BR')} (Criada em: ${doc.createdAt.toLocaleDateString('pt-BR')})\n`;
        }
      } else {
        result += `Nenhuma proposta comercial (CrmCommercialDocument) emitida no CRM para este lead até o momento.\n`;
      }

      if (readinessScore < 80) {
        result += `\n🚨 AVISO DE GOVERNANÇA: Contrato não está pronto para despacho. Colete os dados cadastrais faltantes antes de submeter para assinatura eletrônica.`;
      } else {
        result += `\n✨ STATUS: Dados cadastrais completos para elaboração e envio de minuta contratual.`;
      }

      if (contact?.name) {
        result = minimizePii(result, [{ token: '[NOME_DO_CONTATO]', value: contact.name }]).text;
      }

      return result;
    } catch (err: any) {
      return `Erro ao inspecionar prontidão contratual: ${err instanceof Error ? err.message : String(err)}`;
    }
  },
  {
    name: 'inspect_contract_readiness',
    description:
      'Inspeciona a completude dos dados cadastrais (CNPJ, signatário, e-mail, propostas vinculadas) para emissão de contrato ou verificação de status de minuta comercial. Ferramenta de leitura estrita; nunca gera assinaturas nem altera status de leads.',
    schema: z.object({
      leadId: z.string().describe('ID do Lead para verificação de prontidão contratual'),
    }),
  },
);
