import { describe, it, expect } from 'vitest';
import { detectPII, redactPII } from '../../../src/lib/ai/guardrails/pii.guard.js';

describe('Guardrails PII - Email Allowlist and Tokenized Redaction', () => {
  describe('detectPII allowlist behavior', () => {
    it('permite e-mails corporativos @birthhub360.com e @birthhub360.com.br sem bloquear', () => {
      const result1 = detectPII('Contato comercial: suporte@birthhub360.com');
      expect(result1.blocked).toBe(false);
      expect(result1.matches).toHaveLength(0);

      const result2 = detectPII('Contato comercial: seu.email@birthhub360.com.br');
      expect(result2.blocked).toBe(false);
      expect(result2.matches).toHaveLength(0);
    });

    it('permite e-mails de teste e documentação @example.com para suportar o Golden Dataset', () => {
      const result = detectPII('Usuário de teste: lead.qa@example.com');
      expect(result.blocked).toBe(false);
      expect(result.matches).toHaveLength(0);
    });

    it('é case-insensitive para os domínios permitidos', () => {
      const result1 = detectPII('ADMIN@BIRTHHUB360.COM');
      const result2 = detectPII('TEST@EXAMPLE.COM');
      expect(result1.blocked).toBe(false);
      expect(result2.blocked).toBe(false);
    });

    it('bloqueia e-mails externos não autorizados', () => {
      const result = detectPII('Enviar proposta para cliente@empresaexterna.com');
      expect(result.blocked).toBe(true);
      expect(result.matches).toContain('cliente@empresaexterna.com');
    });

    it('não permite subdomínios não explicitamente autorizados', () => {
      const result = detectPII('Phishing test: attacker@sub.example.com');
      expect(result.blocked).toBe(true);
      expect(result.matches).toContain('attacker@sub.example.com');
    });

    it('não permite domínios com prefixo similar', () => {
      const result = detectPII('Fake domain: test@fakeexample.com');
      expect(result.blocked).toBe(true);
      expect(result.matches).toContain('test@fakeexample.com');
    });
  });

  describe('redactPII allowlist and tokenized replacement', () => {
    it('preserva e-mails @birthhub360.com e @example.com intactos no texto', () => {
      const text = 'Atendimento em contato@birthhub360.com e doc em guide@example.com';
      const { redacted, matches } = redactPII(text);
      expect(redacted).toBe(text);
      expect(matches).toHaveLength(0);
    });

    it('redige e-mails externos e substitui todas as ocorrências', () => {
      const text = 'Notificar alerta@externo.com e repetir para alerta@externo.com';
      const { redacted, matches } = redactPII(text);
      expect(redacted).toBe('Notificar [EMAIL_REDACTED] e repetir para [EMAIL_REDACTED]');
      expect(matches).toEqual(['alerta@externo.com', 'alerta@externo.com']);
    });

    it('não sofre de colisão de substrings ao redigir e-mails parecidos', () => {
      const text = 'Contatar junior.dev@empresa.com e dev@empresa.com';
      const { redacted, matches } = redactPII(text);
      expect(redacted).toBe('Contatar [EMAIL_REDACTED] e [EMAIL_REDACTED]');
      expect(redacted).not.toContain('junior.');
      expect(matches).toContain('junior.dev@empresa.com');
      expect(matches).toContain('dev@empresa.com');
    });

    it('lida corretamente com texto misto contendo e-mails autorizados e não autorizados', () => {
      const text = 'De suporte@birthhub360.com para lead@gmail.com (referência: ref@example.com)';
      const { redacted, matches } = redactPII(text);
      expect(redacted).toBe('De suporte@birthhub360.com para [EMAIL_REDACTED] (referência: ref@example.com)');
      expect(matches).toEqual(['lead@gmail.com']);
    });
  });
});
