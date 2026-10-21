import { describe, expect, it } from 'vitest';
import { redactPiiIncludingCnpj, redactResidualPii } from '../../../../src/shared/security/piiRedaction.js';

describe('redactPiiIncludingCnpj — telefone BR sem resíduos (parecer 24 P4-3)', () => {
  it.each([
    '+55 11 91234-5678',
    '(11) 91234-5678',
    '11912345678',
    '+5511912345678',
    '+55 (11) 98765-4321',
    '11 9 8765 4321',
    '(11) 3456-7890',
  ])('%s → só o marcador, sem + nem DDD residual', (phone) => {
    const r = redactPiiIncludingCnpj(`ligar ${phone} hoje`);
    expect(r.redactedText).toBe('ligar [TELEFONE REDIGIDO] hoje');
    expect(r.detectedTypes).toEqual(['Telefone']);
  });

  it('CPF/CNPJ/e-mail continuam com o rótulo certo; números comuns intactos', () => {
    const r = redactPiiIncludingCnpj(
      'CPF 123.456.789-09, CNPJ 12.345.678/0001-90, a@b.com, pedido 2026 valor 1500',
    );
    expect(r.redactedText).toBe(
      'CPF [CPF REDIGIDO], CNPJ [CNPJ REDIGIDO], [EMAIL REDIGIDO], pedido 2026 valor 1500',
    );
    expect(r.detectedTypes).toEqual(['CNPJ', 'CPF', 'Email']);
  });

  it('redactResidualPii (consumida pelo sanitizer LGPD) não muda de comportamento', () => {
    expect(redactResidualPii('tel 91234-5678').redactedText).toBe('tel [TELEFONE REDIGIDO]');
  });
});
