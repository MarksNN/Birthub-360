import { beforeEach, describe, expect, it, vi } from 'vitest';

const prismaFindManyMock = vi.fn();
const similaritySearchMock = vi.fn();

vi.mock('../../../../lib/prisma.js', () => ({
  prisma: {
    objectionMatrixItem: {
      findMany: (...args: unknown[]) => prismaFindManyMock(...args),
    },
  },
}));

vi.mock('../../../../lib/ai/vectorStore.js', () => ({
  vectorStore: {
    similaritySearch: (...args: unknown[]) => similaritySearchMock(...args),
  },
}));

vi.mock('../../../../lib/async-context.js', () => ({
  getTenantId: vi.fn().mockReturnValue('org-test-123'),
}));

import { getObjectionBattlecardTool } from '../battlecardTool.js';

beforeEach(() => {
  prismaFindManyMock.mockReset();
  similaritySearchMock.mockReset();
});

describe('getObjectionBattlecardTool', () => {
  it('retorna erro se contexto de organização estiver ausente', async () => {
    const { getTenantId } = await import('../../../../lib/async-context.js');
    vi.mocked(getTenantId).mockReturnValueOnce(undefined);

    const result = await getObjectionBattlecardTool.invoke({ objectionCategory: 'Preco' });
    expect(result).toContain('Erro: contexto de organização ausente');
  });

  it('retorna battlecard cadastrado na matriz da organização com roteiro give-get', async () => {
    prismaFindManyMock.mockResolvedValue([
      {
        id: 'obj-1',
        brand: 'Default',
        segment: 'Logística',
        persona: 'CFO',
        objectionTitle: 'Preço acima do orçamento',
        objectionText: 'Achei o valor mensal elevado comparado com nosso software atual.',
        responseScript:
          'Entendo perfeitamente. Contudo, nossa solução reduz 18% em perda de combustível.',
        keyDifferentiator: 'Retorno sobre investimento comprovado em menos de 90 dias.',
      },
    ]);

    const result = await getObjectionBattlecardTool.invoke({
      objectionCategory: 'Preco',
      query: 'orçamento',
    });

    expect(result).toContain('BATTLECARD 1: "Preço acima do orçamento"');
    expect(result).toContain('reduz 18% em perda de combustível');
    expect(result).toContain('menos de 90 dias');
  });

  it('faz fallback para busca no Playbook (RAG) se não houver item exato no banco', async () => {
    prismaFindManyMock.mockResolvedValue([]);
    similaritySearchMock.mockResolvedValue([
      {
        id: 'chunk-1',
        documentTitle: 'Playbook de Negociação B2B',
        content: 'Contra a concorrência Totvs, destaque nossa agilidade de onboarding em 7 dias.',
        similarity: 0.85,
      },
    ]);

    const result = await getObjectionBattlecardTool.invoke({
      objectionCategory: 'Concorrencia',
      query: 'Totvs',
    });

    expect(result).toContain('Diretrizes de Battlecard encontradas no Playbook');
    expect(result).toContain('Playbook de Negociação B2B');
    expect(result).toContain('onboarding em 7 dias');
  });
});
