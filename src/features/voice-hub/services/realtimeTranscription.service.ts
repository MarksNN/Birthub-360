/**
 * Transcrição de Áudio em Tempo Real com Mascaramento de PII em Voo (Passo 59 / Agente 12)
 */

import { piiTokenizer } from '../../../lib/security/piiTokenizer.service.js';

export class RealtimeTranscriptionService {
  public transcribeAndMask(
    organizationId: string,
    rawTranscript: string,
  ): {
    sanitizedText: string;
    hasPii: boolean;
  } {
    const { tokenizedText, tokensCount } = piiTokenizer.tokenize(organizationId, rawTranscript);
    return {
      sanitizedText: tokenizedText,
      hasPii: tokensCount > 0,
    };
  }
}

export const realtimeTranscription = new RealtimeTranscriptionService();
