import { describe, expect, it } from 'vitest';
import { AccountKnowledgeGraphService } from '../../../src/features/knowledge/services/accountKnowledgeGraph.service.js';
import { InMemoryAccountGraphRepository } from '../../../src/features/knowledge/infra/accountGraphRepository.js';

describe('AccountKnowledgeGraphService — Eixo 6 (Knowledge Graph)', () => {
  const service = new AccountKnowledgeGraphService(new InMemoryAccountGraphRepository());
  const orgA = 'org-tenant-alpha-001';
  const orgB = 'org-tenant-beta-002';

  it('deve inserir nós de conta e decisor com isolamento estrito de tenant', async () => {
    const accountNode = await service.upsertNode({
      id: 'acc-101',
      organizationId: orgA,
      type: 'account',
      label: 'Logística Express Ltda',
      properties: { segment: 'Transporte e Logística', fleetSize: 120 },
    });

    const contactNode = await service.upsertNode({
      id: 'cont-201',
      organizationId: orgA,
      type: 'contact',
      label: 'Carlos Silva (Diretor de Operações)',
      properties: { role: 'COO', email: 'carlos@logexpress.com.br' },
    });

    expect(accountNode.id).toBe('acc-101');
    expect(accountNode.organizationId).toBe(orgA);
    expect(contactNode.id).toBe('cont-201');
  });

  it('deve registrar relação entre conta e contato na mesma organização', async () => {
    const edge = await service.addRelationship({
      organizationId: orgA,
      sourceId: 'cont-201',
      targetId: 'acc-101',
      type: 'WORKS_AT',
      confidence: 'confirmed',
      source: 'crm',
    });

    expect(edge.id).toBeDefined();
    expect(edge.type).toBe('WORKS_AT');
    expect(edge.confidence).toBe('confirmed');
  });

  it('deve rejeitar e lançar erro ao tentar conectar entidades de tenants distintos (Tenancy Guard)', async () => {
    await service.upsertNode({
      id: 'acc-999',
      organizationId: orgB,
      type: 'account',
      label: 'Outra Empresa de Outro Tenant',
    });

    await expect(
      service.addRelationship({
        organizationId: orgA,
        sourceId: 'cont-201',
        targetId: 'acc-999', // pertence a orgB
        type: 'WORKS_AT',
        confidence: 'confirmed',
        source: 'crm',
      }),
    ).rejects.toThrow(/Tenancy violation/);
  });

  it('deve gerar estratégia de Multi-Threading para Social Selling orientada a múltiplos decisores', async () => {
    await service.upsertNode({
      id: 'cont-tech',
      organizationId: orgA,
      type: 'contact',
      label: 'Ana Martins',
      properties: { role: 'Gerente de TI', buyingRole: 'technical_buyer' },
    });
    await service.addRelationship({
      organizationId: orgA,
      sourceId: 'cont-tech',
      targetId: 'acc-101',
      type: 'DECISION_MAKER_FOR',
      confidence: 'confirmed',
      source: 'crm',
    });

    await service.upsertNode({
      id: 'cont-fin',
      organizationId: orgA,
      type: 'contact',
      label: 'Roberto Lima',
      properties: { role: 'CFO / Diretor Financeiro', buyingRole: 'financial_buyer' },
    });
    await service.addRelationship({
      organizationId: orgA,
      sourceId: 'cont-fin',
      targetId: 'acc-101',
      type: 'DECISION_MAKER_FOR',
      confidence: 'confirmed',
      source: 'crm',
    });

    const approaches = await service.generateMultiThreadingStrategy(orgA, 'acc-101');
    expect(approaches.length).toBeGreaterThanOrEqual(2);

    const techApproach = approaches.find((a) => a.roleCategory === 'technical_buyer');
    expect(techApproach).toBeDefined();
    expect(techApproach?.strategicAngle).toContain('Arquitetura');
    expect(techApproach?.suggestedOpeningDraft).toBeDefined();

    const finApproach = approaches.find((a) => a.roleCategory === 'financial_buyer');
    expect(finApproach).toBeDefined();
    expect(finApproach?.strategicAngle).toContain('Financeiro');
  });
});
