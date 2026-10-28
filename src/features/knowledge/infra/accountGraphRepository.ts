import type { Prisma } from '@prisma/client';
import { withTenantContext } from '../../../lib/async-context.js';
import { prisma } from '../../../lib/prisma.js';
import type {
  GraphEdge,
  GraphNode,
  GraphNodeType,
  GraphRelationshipType,
  RelationshipConfidence,
} from '../../../shared/contracts/accountKnowledgeGraph.contract.js';

/**
 * REMED-02: porta de persistência do Grafo de Contas. Fonte da verdade = PostgreSQL
 * (AccountGraphNode/AccountGraphEdge, tenant-scoped + RLS). Toda operação recebe organizationId.
 */
export interface AccountGraphRepository {
  upsertNode(node: GraphNode): Promise<GraphNode>;
  findNode(organizationId: string, nodeId: string): Promise<GraphNode | null>;
  findNodes(organizationId: string, nodeIds: string[]): Promise<GraphNode[]>;
  listNodesByType(organizationId: string, type: GraphNodeType): Promise<GraphNode[]>;
  createEdge(edge: GraphEdge): Promise<GraphEdge>;
  deleteEdge(organizationId: string, edgeId: string): Promise<boolean>;
  listEdgesTouching(organizationId: string, nodeId: string): Promise<GraphEdge[]>;
  /** Remove o nó e todas as arestas que o tocam (LGPD). Retorna nº de arestas removidas. */
  purgeNode(organizationId: string, nodeId: string): Promise<number>;
}

type NodeRow = {
  organizationId: string;
  nodeId: string;
  type: string;
  label: string;
  properties: unknown;
};
type EdgeRow = {
  id: string;
  organizationId: string;
  sourceId: string;
  targetId: string;
  type: string;
  confidence: string;
  source: string;
  discoveredAt: Date;
  validUntil: Date | null;
  properties: unknown;
};

const toNode = (r: NodeRow): GraphNode => ({
  id: r.nodeId,
  organizationId: r.organizationId,
  type: r.type as GraphNodeType,
  label: r.label,
  properties: (r.properties as Record<string, unknown>) ?? {},
});

const toEdge = (r: EdgeRow): GraphEdge => ({
  id: r.id,
  organizationId: r.organizationId,
  sourceId: r.sourceId,
  targetId: r.targetId,
  type: r.type as GraphRelationshipType,
  confidence: r.confidence as RelationshipConfidence,
  source: r.source,
  discoveredAt: r.discoveredAt.toISOString(),
  ...(r.validUntil ? { validUntil: r.validUntil.toISOString() } : {}),
  ...(r.properties ? { properties: r.properties as Record<string, unknown> } : {}),
});

export class PrismaAccountGraphRepository implements AccountGraphRepository {
  async upsertNode(node: GraphNode): Promise<GraphNode> {
    const row = await withTenantContext(node.organizationId, () =>
      prisma.accountGraphNode.upsert({
        where: { organizationId_nodeId: { organizationId: node.organizationId, nodeId: node.id } },
        create: {
          organizationId: node.organizationId,
          nodeId: node.id,
          type: node.type,
          label: node.label,
          properties: node.properties as Prisma.InputJsonValue,
        },
        update: {
          type: node.type,
          label: node.label,
          properties: node.properties as Prisma.InputJsonValue,
        },
      }),
    );
    return toNode(row);
  }

  async findNode(organizationId: string, nodeId: string): Promise<GraphNode | null> {
    const row = await withTenantContext(organizationId, () =>
      prisma.accountGraphNode.findFirst({ where: { organizationId, nodeId } }),
    );
    return row ? toNode(row) : null;
  }

  async findNodes(organizationId: string, nodeIds: string[]): Promise<GraphNode[]> {
    if (nodeIds.length === 0) return [];
    const rows = await withTenantContext(organizationId, () =>
      prisma.accountGraphNode.findMany({ where: { organizationId, nodeId: { in: nodeIds } } }),
    );
    return rows.map(toNode);
  }

  async listNodesByType(organizationId: string, type: GraphNodeType): Promise<GraphNode[]> {
    const rows = await withTenantContext(organizationId, () =>
      prisma.accountGraphNode.findMany({
        where: { organizationId, type },
        orderBy: { createdAt: 'asc' },
      }),
    );
    return rows.map(toNode);
  }

  async createEdge(edge: GraphEdge): Promise<GraphEdge> {
    const row = await withTenantContext(edge.organizationId, () =>
      prisma.accountGraphEdge.create({
        data: {
          id: edge.id,
          organizationId: edge.organizationId,
          sourceId: edge.sourceId,
          targetId: edge.targetId,
          type: edge.type,
          confidence: edge.confidence,
          source: edge.source,
          discoveredAt: new Date(edge.discoveredAt),
          validUntil: edge.validUntil ? new Date(edge.validUntil) : null,
          properties: (edge.properties ?? undefined) as Prisma.InputJsonValue | undefined,
        },
      }),
    );
    return toEdge(row);
  }

  async deleteEdge(organizationId: string, edgeId: string): Promise<boolean> {
    const res = await withTenantContext(organizationId, () =>
      prisma.accountGraphEdge.deleteMany({ where: { organizationId, id: edgeId } }),
    );
    return res.count > 0;
  }

  async listEdgesTouching(organizationId: string, nodeId: string): Promise<GraphEdge[]> {
    const rows = await withTenantContext(organizationId, () =>
      prisma.accountGraphEdge.findMany({
        where: { organizationId, OR: [{ sourceId: nodeId }, { targetId: nodeId }] },
        orderBy: { discoveredAt: 'asc' },
      }),
    );
    return rows.map(toEdge);
  }

  async purgeNode(organizationId: string, nodeId: string): Promise<number> {
    return withTenantContext(organizationId, async () => {
      // biome-ignore lint/plugin/no-prisma-tx-escape: uso legado congelado no baseline (parecer 15 #40 L1); migrar para runInTransaction
      const [edges] = await prisma.$transaction([
        prisma.accountGraphEdge.deleteMany({
          where: { organizationId, OR: [{ sourceId: nodeId }, { targetId: nodeId }] },
        }),
        prisma.accountGraphNode.deleteMany({ where: { organizationId, nodeId } }),
      ]);
      return edges.count;
    });
  }
}

/** Implementação em memória APENAS para testes unitários (não usada em runtime). */
export class InMemoryAccountGraphRepository implements AccountGraphRepository {
  private nodes = new Map<string, GraphNode>();
  private edges = new Map<string, GraphEdge>();
  private k = (org: string, id: string) => `${org}:${id}`;

  async upsertNode(node: GraphNode) {
    this.nodes.set(this.k(node.organizationId, node.id), { ...node });
    return { ...node };
  }
  async findNode(org: string, id: string) {
    return this.nodes.get(this.k(org, id)) ?? null;
  }
  async findNodes(org: string, ids: string[]) {
    return ids.map((id) => this.nodes.get(this.k(org, id))).filter((n): n is GraphNode => !!n);
  }
  async listNodesByType(org: string, type: GraphNodeType) {
    return [...this.nodes.values()].filter((n) => n.organizationId === org && n.type === type);
  }
  async createEdge(edge: GraphEdge) {
    this.edges.set(this.k(edge.organizationId, edge.id), { ...edge });
    return { ...edge };
  }
  async deleteEdge(org: string, id: string) {
    return this.edges.delete(this.k(org, id));
  }
  async listEdgesTouching(org: string, nodeId: string) {
    return [...this.edges.values()].filter(
      (e) => e.organizationId === org && (e.sourceId === nodeId || e.targetId === nodeId),
    );
  }
  async purgeNode(org: string, nodeId: string) {
    this.nodes.delete(this.k(org, nodeId));
    let n = 0;
    for (const [key, e] of this.edges) {
      if (e.organizationId === org && (e.sourceId === nodeId || e.targetId === nodeId)) {
        this.edges.delete(key);
        n++;
      }
    }
    return n;
  }
}
