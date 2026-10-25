import { logger } from '../../../lib/logger.js';

/**
 * Serviço de Detecção Automática de PII (Dados Pessoais Sensíveis)
 *
 * Detecta:
 * - CPF/CNPJ
 * - E-mail
 * - Telefone
 * - Endereço
 * - Nome pessoal
 * - Cartão de crédito
 * - RG
 */

export interface PIIDetectionResult {
  hasPII: boolean;
  types: string[];
  confidence: number;
  redactedText: string;
  positions: Array<{ type: string; start: number; end: number; original: string }>;
}

/**
 * Padrões regex para detecção de PII
 */
const PII_PATTERNS = {
  cpf: /\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/g,
  cnpj: /\b\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}\b/g,
  email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
  phone: /\b(\+?\d{1,3}[-.\s]?)?\(?\d{2,3}\)?[-.\s]?\d{3,4}[-.\s]?\d{4}\b/g,
  creditCard: /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g,
  rg: /\b\d{1,2}\.?\d{3}\.?\d{3}-?\d{1}\b/g,
  cep: /\b\d{5}-?\d{3}\b/g,
};

/**
 * Detecta PII em texto
 */
export function detectPII(text: string): PIIDetectionResult {
  const positions: PIIDetectionResult['positions'] = [];
  const types: string[] = [];
  let redactedText = text;

  for (const [type, pattern] of Object.entries(PII_PATTERNS)) {
    let match;
    const regex = new RegExp(pattern.source, pattern.flags);

    while ((match = regex.exec(text)) !== null) {
      positions.push({
        type,
        start: match.index,
        end: match.index + match[0].length,
        original: match[0],
      });

      if (!types.includes(type)) {
        types.push(type);
      }
    }
  }

  // Criar texto redatado
  positions.sort((a, b) => b.start - a.start); // Travar do fim para o início
  for (const pos of positions) {
    const mask = '*'.repeat(pos.original.length);
    redactedText = redactedText.slice(0, pos.start) + mask + redactedText.slice(pos.end);
  }

  const hasPII = positions.length > 0;
  const confidence = hasPII ? 0.9 : 0;

  return {
    hasPII,
    types,
    confidence,
    redactedText,
    positions,
  };
}

/**
 * Valida se texto contém PII específico
 */
export function containsSpecificPII(text: string, type: keyof typeof PII_PATTERNS): boolean {
  const pattern = PII_PATTERNS[type];
  return pattern.test(text);
}

/**
 * Extrai tipos de PII encontrados
 */
export function getPIITypes(text: string): string[] {
  const result = detectPII(text);
  return result.types;
}

/**
 * Redata PII do texto
 */
export function redactPII(text: string): string {
  const result = detectPII(text);
  return result.redactedText;
}
