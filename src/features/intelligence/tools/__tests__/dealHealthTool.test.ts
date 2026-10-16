import { beforeEach, describe, expect, it, vi } from 'vitest';

const prismaFindManyMock = vi.fn();
const prismaFindFirstMock = vi.fn();

vi.mock('../../../../lib/prisma.js', () => ({
  prisma: {
    lead: {
      findMany: (...args: unknown[]) => prismaFindManyMock(...args),
      findFirst: (...args: unknown[]) => prismaFindFirstMock(...args),
    },
  },
}));

vi.mock('../../../../lib/async-context.js', () => ({
  getTenantId: vi.fn().mockReturnValue('org-test-123'),
  getUserId: vi.fn().mockReturnValue('user-123'),
}));

import { checkDealHealthTool } from '../dealHealthTool.js';

beforeEach(() => {
  prismaFindManyMock.mockReset();
  prismaFindFirstMock.mockReset();
});

describe('checkDealHealthTool', () => {
  it('retorna erro explícito quando o contexto de organização está ausente', async () => {
    const { getTenantId } = await import('../../../../lib/async-context.js');
    vi.mocked(getTenantId).mockReturnValueOnce(undefined);

    const result = await checkDealHealthTool.invoke({});
    expect(result).toContain('Erro: contexto de organização ausente');
  });

  it('lista deals estagnados quando nenhum leadId é informado', async () => {
    prismaFindManyMock.mockResolvedValue([
      {
        id: 'lead-1',
        amount: 25000,
        status: 'Qualificacao_SDR',
        updatedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
        lastInteraction: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
        company: { tradeName: 'Logística Alfa', legalName: 'Logística Alfa Ltda' },
        contact: { name: 'Carlos Gerente' },
      },
    ]);

    const result = await checkDealHealthTool.invoke({ staleDaysThreshold: 7 });

    expect(result).toContain('Encontrados 1 deals com risco de estagnação');
    expect(result).toContain('Logística Alfa');
    expect(result).toContain('R$ 25.000');
  });

  it('avalia deal específico com raio-X de saúde, aging e atividades recentes', async () => {
    prismaFindFirstMock.mockResolvedValue({
      id: 'lead-specific-1',
      amount: 48000,
      probability: 70,
      score: 85,
      status: 'Apresentacao_Agendada',
      updatedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
      lastInteraction: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
      company: { tradeName: 'Beta Frotas', legalName: 'Beta Frotas SA' },
      contact: { name: 'Mariana Diretora', role: 'Diretora Operacional' },
      activities: [
        {
          id: 'act-1',
          type: 'Ligacao',
          status: 'Realizada',
          observations: 'Reunião de alinhamento técnico concluída',
          date: new Date(),
        },
      ],
      internalNotes: [],
    });

    const result = await checkDealHealthTool.invoke({ leadId: 'lead-specific-1' });

    expect(result).toContain('DIAGNÓSTICO DO DEAL: Beta Frotas');
    expect(result).toContain('R$ 48.000,00');
    expect(result).toContain('Atenção');
    expect(result).toContain('Reunião de alinhamento técnico concluída');
  });

  it('nunca altera nem escreve status de lead (somente leitura)', () => {
    expect(checkDealHealthTool.description).not.toMatch(/atualiza|grava|move/i);
    const schema = checkDealHealthTool.schema as any;
    expect(schema.shape.status).toBeUndefined();
  });
});
