/**
 * Gerador e Verificador de Documentos de Proposta em PDF (Passo 63 / Agente 17)
 * Geração de buffer e assinatura digital de integridade via SHA-256.
 */

import { createHash } from 'crypto';

export interface GeneratedProposal {
  proposalId: string;
  pdfBuffer: Buffer;
  sha256Hash: string;
  generatedAt: string;
}

export class ProposalDocumentService {
  public generateProposal(proposalId: string, content: string): GeneratedProposal {
    const pdfBuffer = Buffer.from(`%PDF-1.4 Mocked Content for ${proposalId}: ${content}`);
    const sha256Hash = createHash('sha256').update(pdfBuffer).digest('hex');

    return {
      proposalId,
      pdfBuffer,
      sha256Hash,
      generatedAt: new Date().toISOString(),
    };
  }

  public verifyIntegrity(pdfBuffer: Buffer, expectedHash: string): boolean {
    const computed = createHash('sha256').update(pdfBuffer).digest('hex');
    return computed === expectedHash;
  }
}

export const proposalDocument = new ProposalDocumentService();
