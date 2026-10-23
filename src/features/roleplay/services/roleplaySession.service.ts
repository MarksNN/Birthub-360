/**
 * Serviço de Sessão de Roleplay Comercial (Passo 38 / Agente 07)
 * Persiste sessões de simulação com transcrições sanitizadas e notas de desempenho.
 */

import { logger } from '../../../lib/logger.js';
import { piiTokenizer } from '../../../lib/security/piiTokenizer.service.js';

export interface RoleplaySessionData {
  id: string;
  organizationId: string;
  userId: string;
  persona: string;
  transcript: string;
  score: number;
  notes: string;
  createdAt: string;
}

export class RoleplaySessionService {
  public async saveSession(
    organizationId: string,
    userId: string,
    persona: string,
    rawTranscript: string,
    score: number,
    notes: string,
  ): Promise<RoleplaySessionData> {
    const { tokenizedText: sanitizedTranscript } = piiTokenizer.tokenize(
      organizationId,
      rawTranscript,
    );

    const session: RoleplaySessionData = {
      id: `rps-${Date.now()}`,
      organizationId,
      userId,
      persona,
      transcript: sanitizedTranscript,
      score,
      notes,
      createdAt: new Date().toISOString(),
    };

    logger.info({ sessionId: session.id, persona }, 'Sessão de roleplay persistida com sucesso');
    return session;
  }
}

export const roleplaySessionService = new RoleplaySessionService();
