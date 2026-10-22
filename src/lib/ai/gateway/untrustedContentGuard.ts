/**
 * untrustedContentGuard.ts (Passo 025)
 * Sanitização e detecção de injeção de prompt em entradas não confiáveis para o Gateway IA.
 */

export interface UntrustedContentCheckResult {
  hasInjectionRisk: boolean;
  sanitizedContent: string;
  reasons: string[];
}

const INJECTION_PATTERNS = [
  /ignore\s+(all\s+)?(previous|prior)\s+instructions/i,
  /system\s+override/i,
  /disregard\s+(the\s+)?(above|instructions)/i,
  /you\s+are\s+now\s+an?\s+unrestricted/i,
  /drop\s+database/i,
  /exec\s*\(/i,
  /<script[\s>]/i,
];

export class UntrustedContentGuard {
  detectInjection(content: string): UntrustedContentCheckResult {
    const reasons: string[] = [];
    let hasRisk = false;

    for (const pattern of INJECTION_PATTERNS) {
      if (pattern.test(content)) {
        hasRisk = true;
        reasons.push(`Pattern detected: ${pattern.source}`);
      }
    }

    // Sanitiza tags e caracteres de controle perigosos
    const sanitized = content
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '')
      .trim();

    return {
      hasInjectionRisk: hasRisk,
      sanitizedContent: sanitized,
      reasons,
    };
  }
}

export function createUntrustedContentGuard(): UntrustedContentGuard {
  return new UntrustedContentGuard();
}
