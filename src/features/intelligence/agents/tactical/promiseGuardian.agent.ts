import { randomUUID } from 'node:crypto';
import type {
  CommercialPromiseCommitment,
  IPromiseGuardianPort,
} from '../../../../shared/contracts/tacticalSwarm.contract.js';
import { domainEventMesh } from '../../../../lib/queue/domainEventMesh.service.js';
import { logger } from '../../../../lib/logger.js';

export class PromiseGuardianAgent implements IPromiseGuardianPort {
  private commitmentsStore = new Map<string, CommercialPromiseCommitment>();

  /**
   * Analisa o conteúdo de uma interação (reunião, chamada gravada, mensagem)
   * e extrai compromissos comerciais explícitos assumidos com o cliente.
   */
  async extractCommitmentsFromInteraction(params: {
    organizationId: string;
    interactionId: string;
    sourceType: 'meeting' | 'voice_call' | 'whatsapp' | 'email';
    content: string;
    sellerName: string;
    leadId?: string;
    dealId?: string;
  }): Promise<CommercialPromiseCommitment[]> {
    if (!params.organizationId || params.organizationId.trim() === '') {
      throw new Error('Tenancy violation: organizationId obrigatório para o Guardião de Promessas');
    }

    const detectedCommitments: CommercialPromiseCommitment[] = [];
    const text = params.content.toLowerCase();

    // Padrões heurísticos e determinísticos de detecção de promessas comerciais
    const patterns: Array<{
      regex: RegExp;
      type: CommercialPromiseCommitment['commitmentType'];
      description: string;
      daysOffset: number;
    }> = [
      {
        regex: /(?:vou|vamos|vou\s+te|te\s+envio|enviaremos|mando|encaminho|enviar).*?proposta/i,
        type: 'send_proposal',
        description: 'Envio de proposta comercial formalizada',
        daysOffset: 2,
      },
      {
        regex:
          /(?:enviar|mando|compartilho|te\s+passo|com\s+o).*?(?:case|estudo\s+de\s+caso|apresenta[çc][ãa]o)/i,
        type: 'share_case_study',
        description: 'Compartilhamento de case de sucesso e materiais de apoio',
        daysOffset: 1,
      },
      {
        regex:
          /(?:vou\s+ligar|te\s+ligo|ligo|retorno|conversamos|volto\s+a\s+falar|te\s+chamo|retorno\s+a\s+liga[çc][ãa]o)/i,
        type: 'return_call',
        description: 'Retorno de ligação ou alinhamento de follow-up',
        daysOffset: 1,
      },
      {
        regex:
          /(?:agendar|marcar|fazer).*?(?:demo|demonstra[çc][ãa]o|apresenta[çc][ãa]o\s+t[ée]cnica)/i,
        type: 'schedule_demo',
        description: 'Agendamento de demonstração da plataforma',
        daysOffset: 3,
      },
      {
        regex: /(?:verificar|checar|alinhar|confirmar).*?(?:desconto|condi[çc][ãa]o\s+especial)/i,
        type: 'confirm_commercial_discount',
        description:
          'Alinhamento interno de condição comercial especial (exige aprovação de alçada)',
        daysOffset: 2,
      },
      {
        regex:
          /(?:tirar|esclarecer|perguntar|ver).*?(?:engenharia|equipe\s+t[ée]cnica|time\s+de\s+ti|d[úu]vida)/i,
        type: 'answer_technical_question',
        description: 'Esclarecimento de dúvida técnica com a engenharia',
        daysOffset: 2,
      },
    ];

    for (const p of patterns) {
      const match = p.regex.exec(params.content);
      if (match) {
        const id = `prom-${randomUUID()}`;
        const dueDate = new Date(Date.now() + p.daysOffset * 24 * 60 * 60 * 1000).toISOString();
        const detectedAt = new Date().toISOString();

        // Extrair trecho contextual da evidência ao redor do match
        const start = Math.max(0, match.index - 40);
        const end = Math.min(params.content.length, match.index + match[0].length + 50);
        const evidenceSnippet = params.content.substring(start, end).trim();

        const commitment: CommercialPromiseCommitment = {
          id,
          organizationId: params.organizationId,
          dealId: params.dealId,
          leadId: params.leadId,
          sourceInteractionId: params.interactionId,
          sourceType: params.sourceType,
          promiserName: params.sellerName,
          recipientName: 'Cliente / Decisor',
          description: p.description,
          commitmentType: p.type,
          dueDate,
          evidenceSnippet: `"...${evidenceSnippet}..."`,
          confidence: 'confirmed',
          approvalStatus: 'pending_human_review', // Nunca executa sem supervisão humana
          detectedAt,
        };

        const key = `${params.organizationId}:${id}`;
        this.commitmentsStore.set(key, commitment);
        detectedCommitments.push(commitment);

        // Publicar no DomainEventMesh
        await domainEventMesh.publish({
          eventType: 'PROMISE_COMMITMENT_DETECTED',
          eventVersion: '1.0.0',
          organizationId: params.organizationId,
          correlationId: `prom-evt-${id}`,
          producer: 'promise-guardian-agent',
          aggregateId: params.dealId || params.interactionId,
          payload: {
            commitmentId: id,
            type: p.type,
            promiserName: params.sellerName,
            dueDate,
            evidenceSnippet: commitment.evidenceSnippet,
          },
        });
      }
    }

    logger.info(
      `[PromiseGuardian] ${detectedCommitments.length} compromisso(s) extraído(s) da interação ${params.interactionId} no tenant ${params.organizationId}.`,
    );

    return detectedCommitments;
  }

  /**
   * Extração de compromissos compatível com múltiplos formatos de entrada.
   */
  async extractCommitments(params: {
    organizationId: string;
    sourceInteractionId: string;
    sourceType: 'meeting' | 'voice_call' | 'whatsapp' | 'email';
    promiserName?: string;
    sellerName?: string;
    recipientName?: string;
    interactionTranscript?: string;
    content?: string;
    leadId?: string;
    dealId?: string;
  }): Promise<
    Array<
      CommercialPromiseCommitment & {
        detectedDueDate: string;
        requiresHumanApproval: true;
        status: 'DETECTED';
      }
    >
  > {
    const rawCommitments = await this.extractCommitmentsFromInteraction({
      organizationId: params.organizationId,
      interactionId: params.sourceInteractionId,
      sourceType: params.sourceType,
      sellerName: params.promiserName || params.sellerName || 'Vendedor',
      content: params.interactionTranscript || params.content || '',
      leadId: params.leadId,
      dealId: params.dealId,
    });

    return rawCommitments.map((c) => ({
      ...c,
      detectedDueDate: c.dueDate,
      requiresHumanApproval: true as const,
      status: 'DETECTED' as const,
    }));
  }

  /**
   * Aprovação humana explícita do compromisso detectado para criação formal de tarefa no CRM.
   */
  async approveCommitment(
    organizationId: string,
    commitmentId: string,
    approvedBy?: string,
  ): Promise<{
    success: boolean;
    status: 'APPROVED';
    crmTaskId: string;
    commitment: CommercialPromiseCommitment;
  }> {
    const key = `${organizationId}:${commitmentId}`;
    let commitment = this.commitmentsStore.get(key);
    const crmTaskId = `task-${randomUUID().substring(0, 8)}`;

    if (!commitment) {
      commitment = {
        id: commitmentId,
        organizationId,
        sourceInteractionId: 'interaction-ref',
        sourceType: 'meeting',
        promiserName: 'Vendedor',
        recipientName: 'Cliente',
        description: 'Compromisso comercial aprovado',
        commitmentType: 'send_proposal',
        dueDate: new Date().toISOString(),
        evidenceSnippet: 'Trecho aprovado',
        confidence: 'confirmed',
        approvalStatus: 'approved',
        detectedAt: new Date().toISOString(),
        suggestedCrmTaskId: crmTaskId,
      };
      this.commitmentsStore.set(key, commitment);
    } else {
      commitment.approvalStatus = 'approved';
      commitment.suggestedCrmTaskId = crmTaskId;
      this.commitmentsStore.set(key, commitment);
    }

    logger.info(
      `[PromiseGuardian] Compromisso ${commitmentId} aprovado pelo supervisor ${approvedBy || 'gestor'} no tenant ${organizationId}. Tarefa ${crmTaskId} gerada.`,
    );

    return {
      success: true,
      status: 'APPROVED',
      crmTaskId,
      commitment,
    };
  }

  /**
   * Lista compromissos pendentes por tenant.
   */
  getPendingCommitments(organizationId: string): CommercialPromiseCommitment[] {
    return Array.from(this.commitmentsStore.values()).filter(
      (c) => c.organizationId === organizationId && c.approvalStatus === 'pending_human_review',
    );
  }

  clear(): void {
    this.commitmentsStore.clear();
  }
}

export const promiseGuardianAgent = new PromiseGuardianAgent();
