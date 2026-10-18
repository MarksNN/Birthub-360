import { randomUUID } from 'node:crypto';
import type {
  AccountGraphView,
  GraphEdge,
  GraphNode,
  GraphNodeType,
  GraphRelationshipType,
  IAccountKnowledgeGraphPort,
  MultiThreadingApproach,
  RelationshipConfidence,
} from '../../../shared/contracts/accountKnowledgeGraph.contract.js';
import { domainEventMesh } from '../../../lib/queue/domainEventMesh.service.js';
import { logger } from '../../../lib/logger.js';

export class AccountKnowledgeGraphService implements IAccountKnowledgeGraphPort {
  // Armazenamento em memória com isolamento estrito de tenant (em produção respaldado pelo PostgreSQL/Prisma)
  private nodesStore = new Map<string, GraphNode>();
  private edgesStore = new Map<string, GraphEdge>();

  /**
   * Adiciona ou atualiza um nó no grafo semântico.
   */
  async upsertNode(params: {
    id: string;
    organizationId: string;
    type: GraphNodeType;
    label: string;
    properties?: Record<string, unknown>;
  }): Promise<GraphNode> {
    if (!params.organizationId || params.organizationId.trim() === '') {
      throw new Error('Tenancy violation: organizationId obrigatório para nós do grafo');
    }

    const key = `${params.organizationId}:${params.id}`;
    const node: GraphNode = {
      id: params.id,
      organizationId: params.organizationId,
      type: params.type,
      label: params.label,
      properties: params.properties || {},
    };

    this.nodesStore.set(key, node);
    return node;
  }

  /**
   * Registra uma relação (aresta) entre duas entidades no grafo.
   */
  async addRelationship(edgeInput: Omit<GraphEdge, 'id' | 'discoveredAt'>): Promise<GraphEdge> {
    if (!edgeInput.organizationId || edgeInput.organizationId.trim() === '') {
      throw new Error('Tenancy violation: organizationId obrigatório para relacionamentos');
    }

    // Verificar se algum nó pertence a outro tenant (Isolamento Multi-Tenant estrito)
    for (const node of this.nodesStore.values()) {
      if (
        (node.id === edgeInput.sourceId || node.id === edgeInput.targetId) &&
        node.organizationId !== edgeInput.organizationId
      ) {
        throw new Error('Tenancy violation: tentativa de conectar com entidade de outro tenant');
      }
    }

    const sourceKey = `${edgeInput.organizationId}:${edgeInput.sourceId}`;
    const targetKey = `${edgeInput.organizationId}:${edgeInput.targetId}`;

    const sourceNode = this.nodesStore.get(sourceKey);
    const targetNode = this.nodesStore.get(targetKey);

    const id = `edge-${randomUUID()}`;
    const discoveredAt = new Date().toISOString();

    const edge: GraphEdge = {
      id,
      discoveredAt,
      ...edgeInput,
    };

    const edgeKey = `${edgeInput.organizationId}:${id}`;
    this.edgesStore.set(edgeKey, edge);

    // Publicar evento no DomainEventMesh
    await domainEventMesh.publish({
      eventType: 'GRAPH_RELATIONSHIP_UPDATED',
      eventVersion: '1.0.0',
      organizationId: edgeInput.organizationId,
      correlationId: `graph-${id}`,
      producer: 'account-knowledge-graph',
      aggregateId: edgeInput.sourceId,
      payload: {
        edgeId: id,
        sourceId: edgeInput.sourceId,
        targetId: edgeInput.targetId,
        type: edgeInput.type,
        confidence: edgeInput.confidence,
        source: edgeInput.source,
      },
    });

    return edge;
  }

  /**
   * Remove uma relação do grafo.
   */
  async removeRelationship(organizationId: string, edgeId: string): Promise<boolean> {
    const key = `${organizationId}:${edgeId}`;
    return this.edgesStore.delete(key);
  }

  /**
   * Expurgar nós de contato e suas arestas associadas em cumprimento à LGPD.
   */
  async purgeContactData(organizationId: string, contactId: string): Promise<number> {
    const nodeKey = `${organizationId}:${contactId}`;
    this.nodesStore.delete(nodeKey);

    let removedEdges = 0;
    for (const [key, edge] of this.edgesStore.entries()) {
      if (
        edge.organizationId === organizationId &&
        (edge.sourceId === contactId || edge.targetId === contactId)
      ) {
        this.edgesStore.delete(key);
        removedEdges++;
      }
    }

    logger.info(
      `[AccountKnowledgeGraph] LGPD: Expurgo do contato ${contactId} concluído no tenant ${organizationId}. ${removedEdges} arestas removidas.`,
    );
    return removedEdges;
  }

  /**
   * Recupera a visualização consolidada do grafo de uma conta.
   */
  async getAccountGraph(organizationId: string, accountId: string): Promise<AccountGraphView> {
    const accountKey = `${organizationId}:${accountId}`;
    let accountNode = this.nodesStore.get(accountKey);

    if (!accountNode) {
      accountNode = {
        id: accountId,
        organizationId,
        type: 'account',
        label: `Conta ${accountId}`,
        properties: {},
      };
    }

    const relatedCompanies: GraphNode[] = [];
    const contacts: GraphNode[] = [];
    const deals: GraphNode[] = [];
    const edges: GraphEdge[] = [];

    let hasDecisionMaker = false;
    let hasChampion = false;
    let hasBlockerRisk = false;

    for (const edge of this.edgesStore.values()) {
      if (edge.organizationId !== organizationId) continue;

      if (edge.sourceId === accountId || edge.targetId === accountId) {
        edges.push(edge);

        const otherId = edge.sourceId === accountId ? edge.targetId : edge.sourceId;
        const otherNode = this.nodesStore.get(`${organizationId}:${otherId}`);

        if (otherNode) {
          if (
            otherNode.type === 'company' &&
            !relatedCompanies.some((c) => c.id === otherNode.id)
          ) {
            relatedCompanies.push(otherNode);
          } else if (otherNode.type === 'contact' && !contacts.some((c) => c.id === otherNode.id)) {
            contacts.push(otherNode);
            const role = (otherNode.properties?.role as string) || '';
            if (
              role.toLowerCase().includes('diretor') ||
              role.toLowerCase().includes('cfo') ||
              role.toLowerCase().includes('ceo') ||
              edge.type === 'DECISION_MAKER_FOR'
            ) {
              hasDecisionMaker = true;
            }
            if (role.toLowerCase().includes('gerente') || edge.type === 'INFLUENCES') {
              hasChampion = true;
            }
          } else if (otherNode.type === 'deal' && !deals.some((d) => d.id === otherNode.id)) {
            deals.push(otherNode);
          }
        }

        if (edge.type === 'MENTIONED_COMPETITOR') {
          hasBlockerRisk = true;
        }
      }
    }

    const readinessBase =
      (contacts.length > 0 ? 30 : 0) + (hasDecisionMaker ? 40 : 0) + (hasChampion ? 30 : 0);
    const multiThreadingReadiness = Math.min(100, readinessBase);

    const recommendedApproaches = await this.generateMultiThreadingStrategy(
      organizationId,
      accountId,
    );

    return {
      account: accountNode,
      relatedCompanies,
      contacts,
      deals,
      edges,
      completenessMetrics: {
        decisionMakerIdentified: hasDecisionMaker,
        championIdentified: hasChampion,
        blockerRiskDetected: hasBlockerRisk,
        multiThreadingReadiness,
      },
      recommendedApproaches,
    };
  }

  /**
   * Gera abordagens de Multi-Threading Comercial alinhadas ao Social Selling C4.
   * Rascunhos para aprovação humana (nunca envio autônomo desautorizado).
   */
  async generateMultiThreadingStrategy(
    organizationId: string,
    accountId: string,
  ): Promise<MultiThreadingApproach[]> {
    const approaches: MultiThreadingApproach[] = [];

    for (const node of this.nodesStore.values()) {
      if (node.organizationId !== organizationId || node.type !== 'contact') continue;

      // Verificar se o contato está vinculado à conta
      const isLinkedToAccount = Array.from(this.edgesStore.values()).some(
        (e) =>
          e.organizationId === organizationId &&
          (e.sourceId === node.id || e.targetId === node.id) &&
          (e.sourceId === accountId || e.targetId === accountId),
      );

      if (!isLinkedToAccount) continue;

      const role = ((node.properties?.role as string) || node.label || '').toLowerCase();

      if (
        role.includes('ti') ||
        role.includes('tecnol') ||
        role.includes('engenhar') ||
        role.includes('arquiteto')
      ) {
        approaches.push({
          roleCategory: 'technical_buyer',
          targetContactId: node.id,
          targetContactName: node.label,
          targetRole: (node.properties?.role as string) || 'Líder Técnico',
          strategicAngle: 'Arquitetura resiliente, segurança de dados e interoperabilidade via API',
          keyArguments: [
            'Conectividade nativa com Bitrix24, ERPs e barramento DomainEventMesh',
            'Isolamento criptográfico de PII e governança LGPD ponta a ponta',
            'SLA de 99.9% com telemetria e observabilidade em tempo real',
          ],
          recommendedChannels: ['linkedin', 'email'],
          suggestedOpeningDraft: `Olá ${node.label}, analisei a infraestrutura técnica da sua operação e como a consolidação de pipelines com governança rígida de dados pode otimizar a carga de engenharia do seu time. Gostaria de compartilhar nosso whitepaper de arquitetura?`,
        });
      } else if (
        role.includes('cfo') ||
        role.includes('financ') ||
        role.includes('control') ||
        role.includes('compras')
      ) {
        approaches.push({
          roleCategory: 'financial_buyer',
          targetContactId: node.id,
          targetContactName: node.label,
          targetRole: (node.properties?.role as string) || 'Decisor Financeiro',
          strategicAngle: 'Retorno Financeiro, eficiência de capital e redução de CAC comprovado',
          keyArguments: [
            'Economia direta de até 42% em ferramentas fragmentadas de inteligência comercial',
            'Previsibilidade de fluxo de caixa com motor preditivo de forecast auditável',
            'Redução drástica do ciclo médio de vendas e eliminação de churn precoce',
          ],
          recommendedChannels: ['email', 'call'],
          suggestedOpeningDraft: `Prezado(a) ${node.label}, temos acompanhado o crescimento da organização e modelamos uma análise de eficiência de capital que demonstra redução de 35% no custo de aquisição de clientes. Podemos agendar 15 minutos para apresentar os números?`,
        });
      } else if (
        role.includes('ceo') ||
        role.includes('diretor') ||
        role.includes('vp') ||
        role.includes('presidente')
      ) {
        approaches.push({
          roleCategory: 'executive_sponsor',
          targetContactId: node.id,
          targetContactName: node.label,
          targetRole: (node.properties?.role as string) || 'Patrocinador Executivo',
          strategicAngle:
            'Alinhamento estratégico, expansão de market share e velocidade de receita',
          keyArguments: [
            'Centralização dos eixos de RevOps, Inteligência Exógena e Swarm Tático em uma única plataforma',
            'Visão executiva em tempo real dos gargalos do pipeline comercial',
            'Vantagem competitiva através de detecção precoce de sinais de mercado',
          ],
          recommendedChannels: ['linkedin', 'call'],
          suggestedOpeningDraft: `${node.label}, parabéns pela recente expansão das operações. Estruturamos um estudo setorial sobre como líderes do seu segmento estão usando inteligência preditiva para antecipar movimentos concorrenciais. Seria um prazer compartilhar os insights.`,
        });
      } else {
        approaches.push({
          roleCategory: 'influencer',
          targetContactId: node.id,
          targetContactName: node.label,
          targetRole: (node.properties?.role as string) || 'Especialista Operacional',
          strategicAngle:
            'Produtividade diária, eliminação de trabalho manual e empoderamento com IA',
          keyArguments: [
            'Automação de tarefas repetitivas e atualização transparente de CRM',
            'Copiloto comercial contextualizado com o histórico completo das contas',
          ],
          recommendedChannels: ['linkedin', 'email'],
          suggestedOpeningDraft: `Olá ${node.label}, vi que você atua na linha de frente de operações. Como tem sido o desafio de manter as contas atualizadas sem perder tempo com processos manuais?`,
        });
      }
    }

    return approaches;
  }

  /**
   * Limpa o estado em memória (utilitário para testes isolados).
   */
  clear(): void {
    this.nodesStore.clear();
    this.edgesStore.clear();
  }
}

export const accountKnowledgeGraph = new AccountKnowledgeGraphService();
