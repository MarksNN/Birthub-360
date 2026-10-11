import type { StudioNode, StudioEdge, NodeLifecycleState } from '../lib/studio/types.js';
import type { StudioState } from './studioTypes.js';
import { clientLogger as logger } from '../../../lib/clientLogger.js';
import { nodeRegistry } from './nodeRegistry.js';
/** Persist graph content, excluding ReactFlow's transient interaction state. */
export function workflowGraphSnapshot(nodes: StudioNode[], edges: StudioEdge[]): string {
  return JSON.stringify({
    nodes: nodes.map(
      ({ measured: _measured, selected: _selected, dragging: _dragging, ...node }) => node,
    ),
    edges: edges.map(({ selected: _selected, ...edge }) => edge),
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isWorkflowGraph(nodes: unknown, edges: unknown): boolean {
  if (!Array.isArray(nodes) || !Array.isArray(edges)) return false;
  const nodeIds = new Set<string>();
  for (const node of nodes) {
    if (
      !isRecord(node) ||
      typeof node.id !== 'string' ||
      !node.id ||
      nodeIds.has(node.id) ||
      typeof node.type !== 'string' ||
      !Object.hasOwn(nodeRegistry, node.type) ||
      !isRecord(node.position) ||
      typeof node.position.x !== 'number' ||
      !Number.isFinite(node.position.x) ||
      typeof node.position.y !== 'number' ||
      !Number.isFinite(node.position.y) ||
      !isRecord(node.data) ||
      typeof node.data.label !== 'string' ||
      (node.data.config !== undefined && !isRecord(node.data.config))
    )
      return false;
    const data = node.data;
    const metrics = data.metrics;
    const validation = data.validation;
    if (data.category !== undefined && typeof data.category !== 'string') return false;
    if (
      metrics !== undefined &&
      (!isRecord(metrics) ||
        ['invocations', 'errorRate', 'latencyMs'].some(
          (key) =>
            metrics[key] !== undefined &&
            (typeof metrics[key] !== 'number' || !Number.isFinite(metrics[key])),
        ))
    )
      return false;
    if (
      validation !== undefined &&
      (!isRecord(validation) ||
        typeof validation.isValid !== 'boolean' ||
        !Array.isArray(validation.errors) ||
        !validation.errors.every((item: unknown) => typeof item === 'string') ||
        !Array.isArray(validation.warnings) ||
        !validation.warnings.every((item: unknown) => typeof item === 'string'))
    )
      return false;
    nodeIds.add(node.id);
  }
  const edgeIds = new Set<string>();
  for (const edge of edges) {
    if (
      !isRecord(edge) ||
      typeof edge.id !== 'string' ||
      !edge.id ||
      edgeIds.has(edge.id) ||
      typeof edge.source !== 'string' ||
      !nodeIds.has(edge.source) ||
      typeof edge.target !== 'string' ||
      !nodeIds.has(edge.target) ||
      (edge.data !== undefined &&
        (!isRecord(edge.data) ||
          (edge.data.description !== undefined && typeof edge.data.description !== 'string') ||
          (edge.data.condition !== undefined && typeof edge.data.condition !== 'string')))
    )
      return false;
    edgeIds.add(edge.id);
  }
  return true;
}

export function createWorkflowPersistenceActions(
  get: () => StudioState,
  set: (state: Partial<StudioState>) => void,
  getEpoch: () => number,
): Pick<StudioState, 'loadWorkflowFromServer' | 'saveWorkflowToServer'> {
  return {
    loadWorkflowFromServer: async (signal) => {
      const epoch = getEpoch();
      const isCurrent = () => epoch === getEpoch() && !signal?.aborted;
      set({ loadState: 'loading' });
      try {
        const res = await fetch('/api/voice-hub/workflow', { signal, credentials: 'include' });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data: unknown = await res.json();
        if (!isCurrent()) return false;
        if (!isRecord(data) || !Object.hasOwn(data, 'workflow')) {
          throw new Error('Invalid workflow response');
        }
        const workflow = data.workflow;
        if (
          workflow !== null &&
          (!isRecord(workflow) ||
            typeof workflow.id !== 'string' ||
            !workflow.id ||
            !isWorkflowGraph(workflow.nodes, workflow.edges))
        ) {
          throw new Error('Invalid workflow graph');
        }
        const nodes = workflow === null ? [] : (workflow.nodes as StudioNode[]);
        const edges = workflow === null ? [] : (workflow.edges as StudioEdge[]);
        const lifecycles: Record<string, NodeLifecycleState> = {};
        for (const node of nodes) lifecycles[node.id] = 'Ready';
        set({
          nodes,
          edges,
          nodeLifecycles: lifecycles,
          workflowId: workflow === null ? null : (workflow.id as string),
          selectedNodeId: null,
          past: [],
          future: [],
          clipboard: null,
          savedGraph: workflowGraphSnapshot(nodes, edges),
          loadState: 'ready',
          saveState: 'idle',
        });
        return true;
      } catch (err: unknown) {
        if (!isCurrent()) return false;
        logger.error({ err }, 'Error loading workflow from server');
        set({ loadState: 'error' });
        get().addSimulationLog({
          type: 'error',
          message: 'Não foi possível carregar o fluxo. Edição e gravação automática bloqueadas.',
        });
        return false;
      }
    },
    saveWorkflowToServer: async (signal) => {
      if (get().loadState !== 'ready' || get().saveState === 'saving') return false;
      const epoch = getEpoch();
      const isCurrent = () => epoch === getEpoch() && !signal?.aborted;
      const { nodes, edges } = get();
      const graph = workflowGraphSnapshot(nodes, edges);
      set({ saveState: 'saving' });
      try {
        const res = await fetch('/api/voice-hub/workflow', {
          method: 'POST',
          signal,
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: graph,
        });
        const data: unknown = await res.json().catch(() => null);
        if (!isCurrent()) return false;
        if (
          !res.ok ||
          !isRecord(data) ||
          data.success !== true ||
          !isRecord(data.workflow) ||
          typeof data.workflow.id !== 'string' ||
          !data.workflow.id
        ) {
          throw new Error(`Workflow save not confirmed (HTTP ${res.status})`);
        }
        set({
          workflowId: data.workflow.id,
          savedGraph: graph,
          saveState: workflowGraphSnapshot(get().nodes, get().edges) === graph ? 'saved' : 'idle',
        });
        get().addSimulationLog({
          type: 'info',
          message: 'Versão enviada confirmada pelo servidor.',
        });
        return true;
      } catch (err: unknown) {
        if (!isCurrent()) return false;
        logger.error({ err }, 'Error saving workflow to server');
        set({ saveState: 'error' });
        get().addSimulationLog({
          type: 'error',
          message: 'Falha ao salvar. As alterações locais não foram confirmadas pelo servidor.',
        });
        return false;
      }
    },
  };
}
