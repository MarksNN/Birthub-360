import { beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '../../src/lib/prisma';
import { requestContext } from '../../src/lib/async-context';
import { AccountKnowledgeGraphService } from '../../src/features/knowledge/services/accountKnowledgeGraph.service.js';
import { WinLossAutopsyService } from '../../src/features/intelligence/services/winLossAutopsy.service.js';

/**
 * REMED-02 — Grafo de Contas e Autópsia Win-Loss persistidos em PostgreSQL real (sem Map/Set):
 * sobrevivem a uma NOVA instância do service e respeitam RLS por tenant.
 */
const ORG_A = 'remed02-org-a';
const ORG_B = 'remed02-org-b';
const bypass = <T>(fn: () => Promise<T>) => requestContext.run({ bypassRls: true }, fn);

describe('REMED-02 persistência Grafo de Contas + Win-Loss (Postgres real)', () => {
  beforeEach(async () => {
    await bypass(async () => {
      for (const id of [ORG_A, ORG_B]) {
        await prisma.organization.upsert({ where: { id }, create: { id, name: id }, update: {} });
      }
    });
    for (const org of [ORG_A, ORG_B]) {
      await requestContext.run({ tenantId: org }, async () => {
        await prisma.accountGraphEdge.deleteMany({ where: { organizationId: org } });
        await prisma.accountGraphNode.deleteMany({ where: { organizationId: org } });
        await prisma.winLossAutopsyReport.deleteMany({ where: { organizationId: org } });
      });
    }
  });

  it('grafo persiste entre instâncias do service e monta a visão da conta', async () => {
    const writer = new AccountKnowledgeGraphService();
    await writer.upsertNode({
      id: 'acc-1',
      organizationId: ORG_A,
      type: 'account',
      label: 'Conta 1',
    });
    await writer.upsertNode({
      id: 'cont-cfo',
      organizationId: ORG_A,
      type: 'contact',
      label: 'Maria',
      properties: { role: 'CFO' },
    });
    const edge = await writer.addRelationship({
      organizationId: ORG_A,
      sourceId: 'cont-cfo',
      targetId: 'acc-1',
      type: 'DECISION_MAKER_FOR',
      confidence: 'confirmed',
      source: 'crm',
    });

    const reader = new AccountKnowledgeGraphService();
    const view = await reader.getAccountGraph(ORG_A, 'acc-1');
    expect(view.account.label).toBe('Conta 1');
    expect(view.contacts.map((c) => c.id)).toEqual(['cont-cfo']);
    expect(view.edges.map((e) => e.id)).toEqual([edge.id]);
    expect(view.completenessMetrics.decisionMakerIdentified).toBe(true);
    expect(view.recommendedApproaches[0]?.roleCategory).toBe('financial_buyer');

    // upsert idempotente (unique organizationId+nodeId)
    await reader.upsertNode({
      id: 'acc-1',
      organizationId: ORG_A,
      type: 'account',
      label: 'Conta 1 v2',
    });
    expect(
      await requestContext.run({ tenantId: ORG_A }, () => prisma.accountGraphNode.count()),
    ).toBe(2);
  });

  it('isola tenants: RLS esconde nós de outro tenant e bloqueia aresta cross-tenant', async () => {
    const svc = new AccountKnowledgeGraphService();
    await svc.upsertNode({ id: 'acc-a', organizationId: ORG_A, type: 'account', label: 'A' });
    await svc.upsertNode({ id: 'acc-b', organizationId: ORG_B, type: 'account', label: 'B' });

    await expect(
      svc.addRelationship({
        organizationId: ORG_A,
        sourceId: 'acc-a',
        targetId: 'acc-b',
        type: 'PARTNER_OF' as never,
        confidence: 'confirmed',
        source: 'crm',
      }),
    ).rejects.toThrow(/Tenancy violation/);

    const seenByA = await requestContext.run({ tenantId: ORG_A }, () =>
      prisma.accountGraphNode.findMany({ select: { nodeId: true } }),
    );
    expect(seenByA.map((n) => n.nodeId)).toEqual(['acc-a']);

    // escrita com organizationId de outro tenant é rejeitada pela policy WITH CHECK
    await expect(
      requestContext.run({ tenantId: ORG_A }, () =>
        prisma.accountGraphNode.create({
          data: { organizationId: ORG_B, nodeId: 'x', type: 'account', label: 'x' },
        }),
      ),
    ).rejects.toThrow();
  });

  it('LGPD purge remove nó e arestas no banco', async () => {
    const svc = new AccountKnowledgeGraphService();
    await svc.upsertNode({ id: 'acc-1', organizationId: ORG_A, type: 'account', label: 'C' });
    await svc.upsertNode({ id: 'cont-1', organizationId: ORG_A, type: 'contact', label: 'P' });
    await svc.addRelationship({
      organizationId: ORG_A,
      sourceId: 'cont-1',
      targetId: 'acc-1',
      type: 'WORKS_AT',
      confidence: 'confirmed',
      source: 'crm',
    });
    expect(await svc.purgeContactData(ORG_A, 'cont-1')).toBe(1);
    const view = await new AccountKnowledgeGraphService().getAccountGraph(ORG_A, 'acc-1');
    expect(view.contacts).toHaveLength(0);
    expect(view.edges).toHaveLength(0);
  });

  it('autópsia Win-Loss persiste, é lida por nova instância e respeita tenant', async () => {
    const report = await new WinLossAutopsyService().generateAutopsy({
      organizationId: ORG_A,
      dealId: 'deal-1',
      outcome: 'DEAL_LOST',
      dealTitle: 'Deal 1',
      companyName: 'Empresa',
      dealValue: 1000,
      timelineEvents: [],
      messagesAndNotes: [],
      unresolvedObjections: ['Preço acima do orçamento'],
    });

    const loaded = await new WinLossAutopsyService().getAutopsyReport(ORG_A, report.id);
    expect(loaded?.id).toBe(report.id);
    expect(loaded?.sectionD_FactorHypotheses[0]?.category).toBe('pricing');
    expect(await new WinLossAutopsyService().getAutopsyReport(ORG_B, report.id)).toBeUndefined();
  });
});
