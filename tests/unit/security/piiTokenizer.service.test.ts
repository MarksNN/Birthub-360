import { beforeEach, describe, expect, it } from 'vitest';
import { PiiTokenizerService } from '../../../src/lib/security/piiTokenizer.service.js';

describe('PiiTokenizerService Unit Tests', () => {
  let tokenizer: PiiTokenizerService;

  beforeEach(() => {
    tokenizer = new PiiTokenizerService();
    tokenizer.clear();
  });

  it('should tokenize CPFs, CNPJs, emails and phones into pseudo-tokens', () => {
    const rawText =
      'O cliente Carlos Silva, CPF 123.456.789-00 e CNPJ 12.345.678/0001-90, informou o email carlos.silva@empresa.com e telefone (11) 98765-4321.';

    const result = tokenizer.tokenize('org-tenant-1', rawText);

    expect(result.tokensCount).toBe(4);
    expect(result.tokenizedText).not.toContain('123.456.789-00');
    expect(result.tokenizedText).not.toContain('12.345.678/0001-90');
    expect(result.tokenizedText).not.toContain('carlos.silva@empresa.com');
    expect(result.tokenizedText).not.toContain('98765-4321');
    expect(result.tokenizedText).toContain('[CPF_TOKEN_1]');
    expect(result.tokenizedText).toContain('[CNPJ_TOKEN_2]');
    expect(result.tokenizedText).toContain('[EMAIL_TOKEN_3]');
    expect(result.tokenizedText).toContain('[PHONE_TOKEN_4]');
  });

  it('should reconstitute original values in detokenize when authorized in same session', () => {
    const rawText = 'Enviar proposta para contato@cliente.com.br no telefone (21) 99887-6655.';
    const { tokenizedText, sessionId } = tokenizer.tokenize('org-tenant-1', rawText);

    // Simula a IA respondendo usando os mesmos tokens
    const aiResponse = `Entendido. Registrei a intenção de envio para ${tokenizedText}.`;

    const restored = tokenizer.detokenize('org-tenant-1', sessionId, aiResponse);

    expect(restored).toContain('contato@cliente.com.br');
    expect(restored).toContain('(21) 99887-6655');
    expect(restored).not.toContain('[EMAIL_TOKEN_');
  });

  it('should not reconstitute across tenants (multi-tenant isolation check)', () => {
    const rawText = 'Cliente VIP com email diretor@corporacao.com';
    const { tokenizedText, sessionId } = tokenizer.tokenize('org-tenant-A', rawText);

    // Tentativa de reconstituição por outra organização (org-tenant-B)
    const crossTenantRestored = tokenizer.detokenize('org-tenant-B', sessionId, tokenizedText);

    expect(crossTenantRestored).toBe(tokenizedText);
    expect(crossTenantRestored).not.toContain('diretor@corporacao.com');
  });

  it('should perform irreversible masking', () => {
    const rawText = 'Documento 123.456.789-00 e email admin@corp.net';
    const masked = tokenizer.maskIrreversible(rawText);

    expect(masked).toBe('Documento [CPF_OCULTO] e email [EMAIL_OCULTO]');
    expect(masked).not.toContain('123.456.789-00');
  });
});
