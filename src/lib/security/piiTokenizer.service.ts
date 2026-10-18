import { randomUUID } from 'node:crypto';
import { logger } from '../logger.js';

const CPF_REGEX = /\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/g;
const CNPJ_REGEX = /\b\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}\b/g;
const PHONE_REGEX = /\b(?:\+?55\s?)?(?:\(?\d{2}\)?\s?)?(?:9\d{4}|\d{4})[-.\s]?\d{4}\b/g;
const EMAIL_REGEX = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g;

export interface TokenizedResult {
  tokenizedText: string;
  tokensCount: number;
  sessionId: string;
  tokenTypes: string[];
}

export class PiiTokenizerService {
  // Mapa de sessões: key = `${organizationId}:${sessionId}` -> token -> valor original
  private sessionTokenStore = new Map<string, Map<string, string>>();
  private sessionExpirations = new Map<string, number>();
  private static DEFAULT_SESSION_TTL_MS = 60 * 60 * 1000; // 1 hora

  /**
   * Tokeniza informações pessoais identificáveis de forma reversível e segura.
   * Os dados reais são substituídos por pseudo-tokens opacos antes de qualquer envio ao modelo de IA.
   */
  tokenize(
    organizationId: string,
    text: string,
    options?: { sessionId?: string; purpose?: string; ttlMs?: number },
  ): TokenizedResult {
    if (!organizationId || organizationId.trim() === '') {
      throw new Error('Tenancy violation: PiiTokenizer exige organizationId');
    }

    const sessionId = options?.sessionId || `sess-${randomUUID()}`;
    const storeKey = `${organizationId}:${sessionId}`;
    const tokenMap = new Map<string, string>();
    const tokenTypes: string[] = [];
    let counter = 1;

    let tokenized = text;

    // 1. CPF
    tokenized = tokenized.replace(CPF_REGEX, (match) => {
      const token = `[CPF_TOKEN_${counter++}]`;
      tokenMap.set(token, match);
      tokenTypes.push('CPF');
      return token;
    });

    // 2. CNPJ
    tokenized = tokenized.replace(CNPJ_REGEX, (match) => {
      const token = `[CNPJ_TOKEN_${counter++}]`;
      tokenMap.set(token, match);
      tokenTypes.push('CNPJ');
      return token;
    });

    // 3. E-mail
    tokenized = tokenized.replace(EMAIL_REGEX, (match) => {
      const token = `[EMAIL_TOKEN_${counter++}]`;
      tokenMap.set(token, match);
      tokenTypes.push('EMAIL');
      return token;
    });

    // 4. Telefone
    tokenized = tokenized.replace(PHONE_REGEX, (match) => {
      const token = `[PHONE_TOKEN_${counter++}]`;
      tokenMap.set(token, match);
      tokenTypes.push('PHONE');
      return token;
    });

    this.sessionTokenStore.set(storeKey, tokenMap);
    this.sessionExpirations.set(
      storeKey,
      Date.now() + (options?.ttlMs || PiiTokenizerService.DEFAULT_SESSION_TTL_MS),
    );

    logger.info(
      {
        organizationId,
        sessionId,
        tokensGenerated: tokenMap.size,
        types: Array.from(new Set(tokenTypes)),
      },
      'PiiTokenizer: Texto anonimizado com tokens reversíveis por sessão',
    );

    return {
      tokenizedText: tokenized,
      tokensCount: tokenMap.size,
      sessionId,
      tokenTypes: Array.from(new Set(tokenTypes)),
    };
  }

  /**
   * Reconstitui os dados reais na resposta retornada pela IA apenas se a requisição
   * estiver autorizada para a organização e sessão corretas.
   */
  detokenize(organizationId: string, sessionId: string, textWithTokens: string): string {
    const storeKey = `${organizationId}:${sessionId}`;
    const expiresAt = this.sessionExpirations.get(storeKey);

    if (!expiresAt || Date.now() > expiresAt) {
      this.sessionTokenStore.delete(storeKey);
      this.sessionExpirations.delete(storeKey);
      logger.warn(
        { organizationId, sessionId },
        'PiiTokenizer: Tentativa de reconstituição em sessão expirada ou inexistente',
      );
      return textWithTokens;
    }

    const tokenMap = this.sessionTokenStore.get(storeKey);
    if (!tokenMap || tokenMap.size === 0) {
      return textWithTokens;
    }

    let restored = textWithTokens;
    for (const [token, original] of tokenMap.entries()) {
      restored = restored.replaceAll(token, original);
    }

    logger.info(
      { organizationId, sessionId, tokensRestored: tokenMap.size },
      'PiiTokenizer: Reconstituição autorizada de PII concluída com sucesso',
    );

    return restored;
  }

  /**
   * Mascaramento irreversível para desidentificação definitiva (ex.: geração de logs,
   * armazenamento de evidências públicas ou expurgo de dados).
   */
  maskIrreversible(text: string): string {
    return text
      .replace(CPF_REGEX, '[CPF_OCULTO]')
      .replace(CNPJ_REGEX, '[CNPJ_OCULTO]')
      .replace(EMAIL_REGEX, '[EMAIL_OCULTO]')
      .replace(PHONE_REGEX, '[TELEFONE_OCULTO]');
  }

  clearSession(organizationId: string, sessionId: string): void {
    const storeKey = `${organizationId}:${sessionId}`;
    this.sessionTokenStore.delete(storeKey);
    this.sessionExpirations.delete(storeKey);
  }

  clear(): void {
    this.sessionTokenStore.clear();
    this.sessionExpirations.clear();
  }
}

export const piiTokenizer = new PiiTokenizerService();
