import { beforeEach, describe, expect, it, vi } from 'vitest';

const prismaFindFirstMock = vi.fn();
const prismaFindManyDocumentsMock = vi.fn();

vi.mock('../../../../lib/prisma.js', () => ({
  prisma: {
    lead: {
      findFirst: (...args: unknown[]) => prismaFindFirstMock(...args),
    },
    crmCommercialDocument: {
      findMany: (...args: unknown[]) => prismaFindManyDocumentsMock(...args),
    },
  },
}));

vi.mock('../../../../lib/async-context.js', () => ({
  getTenantId: vi.fn().mockReturnValue('org-test-123'),
}));

import { inspectContractReadinessTool } from '../contractInspectionTool.js';

beforeEach(() => {
  prismaFindFirstMock.mockReset();
  prismaFindManyDocumentsMock.mockReset();
});

describe('inspectContractReadinessTool', () => {
  it('retorna erro se organização ausente', async () => {
    const { getTenantId } = await import('../../../../lib/async-context.js');
    vi.mocked(getTenantId).mockReturnValueOnce(undefined);

    const result = await inspectContractReadinessTool.invoke({ leadId: 'lead-1' });
    expect(result).toContain('Erro: contexto de organização ausente');
  });

  it('avalia prontidão cadastral e documental completa do lead', async () => {
    prismaFindFirstMock.mockResolvedValue({
      id: 'lead-1',
      amount: 150000,
      company: {
        tradeName: 'Grupo Vanguarda',
        legalName: 'Vanguarda Logística SA',
        cnpj: '12.345.678/0001-90',
      },
      contact: {
        name: 'Roberto CEO',
        email: 'roberto@vanguarda.com.br',
        role: 'CEO',
      },
    });

    prismaFindManyDocumentsMock.mockResolvedValue([
      {
        id: 'doc-1',
        number: 'PROP-2026-001',
        title: 'Proposta Comercial Anual',
        status: 'Enviado',
        total: 150000,
        createdAt: new Date(),
      },
    ]);

    const result = await inspectContractReadinessTool.invoke({ leadId: 'lead-1' });

    expect(result).toContain('RELATÓRIO DE PRONTIDÃO CONTRATUAL');
    expect(result).toContain('Grupo Vanguarda');
    expect(result).toContain('Índice de Prontidão: 100%');
    expect(result).toContain('PROP-2026-001');
    expect(result).toContain('Dados cadastrais completos');
  });

  it('aponta pendências quando faltam dados essenciais para formalização', async () => {
    prismaFindFirstMock.mockResolvedValue({
      id: 'lead-incomplete',
      amount: 0,
      company: {
        tradeName: 'Startup Nova',
        cnpj: null,
      },
      contact: {
        name: 'Fundador',
        email: null,
      },
    });

    prismaFindManyDocumentsMock.mockResolvedValue([]);

    const result = await inspectContractReadinessTool.invoke({ leadId: 'lead-incomplete' });

    expect(result).toContain('Índice de Prontidão: 25%');
    expect(result).toContain('AVISO DE GOVERNANÇA: Contrato não está pronto para despacho');
    expect(result).toContain('Falta E-mail corporativo do signatário');
  });

  it('nunca possui capacidade de mutação de status no lead', () => {
    const schema = inspectContractReadinessTool.schema as any;
    expect(schema.shape.status).toBeUndefined();
    expect(inspectContractReadinessTool.description).toContain('leitura estrita');
  });
});
