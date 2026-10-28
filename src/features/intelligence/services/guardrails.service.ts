import { getTenantId } from '../../../lib/async-context.js';
import {
  assertPiiExternalConsent,
  hasPiiExternalConsent,
  PiiConsentRequiredError,
} from '../../../shared/services/aiPiiConsent.service.js';
import type {
  CreateGuardrailEventData,
  GuardrailEventEntity,
  GuardrailRepository,
} from '../domain/Guardrail.js';
import { prismaGuardrailRepository } from '../infra/PrismaGuardrailRepository.js';

export type { CreateGuardrailEventData, GuardrailEventEntity, GuardrailRepository };

const CPF_REGEX = /\d{3}\.\d{3}\.\d{3}-\d{2}/g;
// AIAGENT-006 (docs/audits/repository-debt-audit/agents/AIAGENT.md): o guard original só
// reconhecia CPF formatado — CNPJ, CPF sem pontuação, e-mail e telefone passavam sem redação.
// Cada padrão abaixo tem seu próprio rótulo de máscara; a ordem de aplicação importa apenas para
// legibilidade do texto final, nunca para correção (os padrões não se sobrepõem: os grupos com
// pontuação nunca formam 11 dígitos consecutivos, então não colidem com CPF_UNFORMATTED_REGEX).
const CNPJ_REGEX = /\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}/g;
// CPF sem pontuação (11 dígitos "soltos") é inerentemente ambíguo com um telefone BR sem
// formatação (DDD + 9 dígitos = 11 dígitos também) — na dúvida, redige como PII de qualquer
// forma; a precisão do rótulo importa menos do que nunca deixar o dado vazar.
const CPF_UNFORMATTED_REGEX = /\b\d{11}\b/g;
const EMAIL_REGEX = /\b[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\b/g;
// Exige um separador literal (parênteses, espaço, ponto ou traço) entre o DDD e o restante do
// número — nunca casa uma sequência de dígitos pura. Sem essa exigência, a flexibilidade interna
// do padrão (DDD opcionalmente com "9" + 4 ou 8 dígitos) permite "deslizar" dentro de uma
// sequência numérica mais longa sem relação com telefone (ex.: um CPF sem pontuação de 11
// dígitos), casando só um pedaço dela e deixando dígitos residuais fora da máscara — a sequência
// pura de 11 dígitos já é coberta, sem essa ambiguidade, por `CPF_UNFORMATTED_REGEX` acima.
const PHONE_REGEX = /(?:\(\d{2}\)\s?|(?:\+55\s?)?\d{2}[\s.-])9?\d{4}-\d{4}/g;

const PII_PATTERNS: Array<{ regex: RegExp; mask: string }> = [
  { regex: CPF_REGEX, mask: '[CPF OCULTADO]' },
  { regex: CNPJ_REGEX, mask: '[CNPJ OCULTADO]' },
  { regex: EMAIL_REGEX, mask: '[E-MAIL OCULTADO]' },
  { regex: PHONE_REGEX, mask: '[TELEFONE OCULTADO]' },
  { regex: CPF_UNFORMATTED_REGEX, mask: '[CPF OCULTADO]' },
];

/**
 * Passo de pós-processamento aplicado a toda saída de IA antes de devolvê-la ao usuário: mascara
 * PII (CPF, CNPJ, e-mail, telefone) que a IA eventualmente tenha alucinado ou copiado do contexto
 * (a Atlas lida com dados de contato reais no CRM, e conteúdo gerado nunca deveria expor esse
 * dado em texto livre).
 */
export function redactSensitiveData(text: string): { text: string; redacted: boolean } {
  let result = text;
  let redacted = false;
  for (const { regex, mask } of PII_PATTERNS) {
    regex.lastIndex = 0;
    if (regex.test(result)) {
      regex.lastIndex = 0;
      result = result.replace(regex, mask);
      redacted = true;
    }
  }
  return { text: result, redacted };
}

export class GuardrailsService {
  constructor(private readonly repository: GuardrailRepository = prismaGuardrailRepository) {}

  /**
   * Registra um evento de telemetria de guardrail (pii_redacted).
   * Best-effort de propósito: se a gravação do evento falhar, a redação em si
   * (o que importa para o usuário) já aconteceu.
   */
  async trackPiiRedactionEvent(source: string, orgId?: string): Promise<void> {
    const organizationId = orgId || getTenantId();
    if (!organizationId) {
      return;
    }
    await this.repository.recordEvent({
      type: 'pii_redacted',
      source,
      organizationId,
    });
  }

  async redactAndTrackPiiLeak(text: string, source: string, orgId?: string): Promise<string> {
    const { text: redactedText, redacted } = redactSensitiveData(text);
    if (!redacted) return redactedText;
    await this.trackPiiRedactionEvent(source, orgId);
    return redactedText;
  }
}

export const guardrailsService = new GuardrailsService();

export async function redactAndTrackPiiLeak(
  text: string,
  source: string,
  orgId?: string,
): Promise<string> {
  return guardrailsService.redactAndTrackPiiLeak(text, source, orgId);
}

export const MAX_PII_PATTERN_LENGTH = 254;

export function createStreamingRedactor(source: string) {
  let buffer = '';
  let redactedAny = false;

  function push(chunk: string): string {
    buffer += chunk;
    if (buffer.length <= MAX_PII_PATTERN_LENGTH) return '';
    const safeLength = buffer.length - MAX_PII_PATTERN_LENGTH;
    const { text: release, redacted } = redactSensitiveData(buffer.slice(0, safeLength));
    if (redacted) redactedAny = true;
    buffer = buffer.slice(safeLength);
    return release;
  }

  async function flush(): Promise<string> {
    const { text: release, redacted } = redactSensitiveData(buffer);
    if (redacted) redactedAny = true;
    buffer = '';
    if (redactedAny) {
      await guardrailsService.trackPiiRedactionEvent(source);
    }
    return release;
  }

  return { push, flush };
}

export interface PiiToken {
  token: string;
  value: string;
}

export function minimizePii(
  text: string,
  values: Array<{ token: string; value: string | null | undefined }>,
): { text: string; applied: PiiToken[] } {
  let result = text;
  const applied: PiiToken[] = [];
  for (const { token, value } of values) {
    if (!value || typeof value !== 'string') continue;
    const cleanValue = value.trim();
    if (!cleanValue || cleanValue.length < 3) continue;
    if (result.includes(cleanValue)) {
      result = result.split(cleanValue).join(token);
      applied.push({ token, value: cleanValue });
    }
  }
  return { text: result, applied };
}

export function rehydratePii(text: string, applied: PiiToken[]): string {
  let result = text;
  for (const { token, value } of applied) {
    result = result.split(token).join(value);
  }
  return result;
}

export { assertPiiExternalConsent, hasPiiExternalConsent, PiiConsentRequiredError };
