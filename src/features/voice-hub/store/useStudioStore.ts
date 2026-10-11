import { create } from 'zustand';
import type {
  StudioNode,
  StudioEdge,
  NodeType,
  ValidationIssue,
  WorkflowVersionSummary,
} from '../lib/studio/types.js';
import { validationEngine } from '../../../lib/studio/ValidationEngine.js';
import { addEdge } from '@xyflow/react';
import { clientLogger as logger } from '../../../lib/clientLogger.js';
import { nodeRegistry } from './nodeRegistry.js';
import { initialNodes, initialEdges } from './initialData.js';
import { createWorkflowPersistenceActions } from './workflowPersistence.js';
export { workflowGraphSnapshot } from './workflowPersistence.js';
import type { NodeLifecycleState, StudioState } from './studioTypes.js';

// Re-exports for backwards compatibility
export { nodeRegistry };
export type { NodeLifecycleState, NodeRegistryItem, SimulationLog, StudioState } from './studioTypes.js';

let workflowEpoch = 0;

let simulationInterval: ReturnType<typeof setInterval> | null = null;
export const useStudioStore = create<StudioState>((set, get) => ({
  past: [],
  future: [],
  clipboard: null,

  saveSnapshot: () => {
    const { nodes, edges, past } = get();
    // avoid saving identical snapshots
    if (past.length > 0) {
      const last = past[past.length - 1];
      if (
        JSON.stringify(last.nodes) === JSON.stringify(nodes) &&
        JSON.stringify(last.edges) === JSON.stringify(edges)
      )
        return;
    }
    set({
      past: [...past, { nodes: structuredClone(nodes), edges: structuredClone(edges) }],
      future: [],
    });
  },

  undo: () => {
    const { past, future, nodes, edges } = get();
    if (past.length === 0) return;
    const previous = past[past.length - 1];
    const newPast = past.slice(0, past.length - 1);
    set({
      past: newPast,
      future: [{ nodes, edges }, ...future],
      nodes: previous.nodes,
      edges: previous.edges,
    });
  },

  redo: () => {
    const { past, future, nodes, edges } = get();
    if (future.length === 0) return;
    const next = future[0];
    const newFuture = future.slice(1);
    set({
      past: [...past, { nodes, edges }],
      future: newFuture,
      nodes: next.nodes,
      edges: next.edges,
    });
  },

  copySelection: () => {
    const { nodes, edges } = get();
    const selectedNodes = nodes.filter((n) => n.selected);
    const selectedNodeIds = new Set(selectedNodes.map((n) => n.id));
    const selectedEdges = edges.filter(
      (e) => selectedNodeIds.has(e.source) && selectedNodeIds.has(e.target),
    );
    set({ clipboard: { nodes: selectedNodes, edges: selectedEdges } });
  },

  autoAlignNodes: () => {
    const { nodes, saveSnapshot } = get();
    saveSnapshot();
    const sorted = [...nodes].sort((a, b) => a.position.y - b.position.y);
    let currentY = 50;
    const aligned = sorted.map((n) => {
      const res = { ...n, position: { x: 300, y: currentY } };
      currentY += 150;
      return res;
    });
    set({ nodes: aligned });
  },

  deleteSelection: () => {
    const { nodes, edges, saveSnapshot } = get();
    const selectedNodes = nodes.filter((n) => n.selected).map((n) => n.id);
    if (selectedNodes.length === 0) return;

    saveSnapshot();
    set({
      nodes: nodes.filter((n) => !n.selected),
      edges: edges.filter(
        (e) => !selectedNodes.includes(e.source) && !selectedNodes.includes(e.target),
      ),
    });
  },

  pasteSelection: () => {
    const { clipboard, nodes, edges, saveSnapshot } = get();
    if (!clipboard || clipboard.nodes.length === 0) return;
    saveSnapshot();

    const idMapping: Record<string, string> = {};
    const newNodes = clipboard.nodes.map((n) => {
      const newId = crypto.randomUUID();
      idMapping[n.id] = newId;
      return {
        ...n,
        id: newId,
        selected: true,
        position: { x: n.position.x + 50, y: n.position.y + 50 },
      };
    });

    const newEdges = clipboard.edges.map((e) => ({
      ...e,
      id: crypto.randomUUID(),
      source: idMapping[e.source],
      target: idMapping[e.target],
    }));

    set({
      nodes: [...nodes.map((n) => ({ ...n, selected: false })), ...newNodes],
      edges: [...edges.map((e) => ({ ...e, selected: false })), ...newEdges],
    });
  },

  nodes: initialNodes,
  edges: initialEdges,
  selectedNodeId: null,
  favorites: ['prompt', 'llm', 'knowledge'],
  templates: [
    {
      id: 'temp-1',
      name: 'Recepção e Qualificação Padrão',
      nodes: initialNodes.slice(0, 5),
      edges: initialEdges.slice(0, 4),
    },
  ],
  searchQuery: '',
  activeCategory: 'all',
  nodeLifecycles: {
    'start-1': 'Ready',
    'voice-1': 'Ready',
    'llm-1': 'Ready',
    'prompt-1': 'Ready',
    'condition-1': 'Ready',
    'handoff-1': 'Ready',
    'knowledge-1': 'Ready',
    'end-1': 'Ready',
  },

  // Debug / Simulation state
  isDebugging: false,
  activeSimulationNodeId: null,
  simulationStepIndex: -1,
  simulationLogs: [],
  simulationVariables: {
    customer_name: 'Marcelo Silva',
    hasCompletedSurvey: 'false',
    intent: 'Suporte',
    confidenceScore: 0.94,
    caller_phone: '+5511999998888',
    channel: 'Telefone',
  },
  isSimulationPaused: false,
  simulationSpeedMs: 1500,

  publishState: 'idle',
  publishIssues: [],

  workflowId: null,
  workflowContext: null,
  loadState: 'loading',
  saveState: 'idle',
  savedGraph: null,
  setWorkflowContext: (context) => {
    workflowEpoch += 1;
    get().stopSimulation();
    set({
      workflowContext: context,
      nodes: [],
      edges: [],
      workflowId: null,
      past: [],
      future: [],
      clipboard: null,
      selectedNodeId: null,
      nodeLifecycles: {},
      templates: [],
      favorites: [],
      searchQuery: '',
      activeCategory: 'all',
      simulationVariables: {},
      simulationLogs: [],
      activeSimulationNodeId: null,
      isDebugging: false,
      simulationStepIndex: -1,
      isSimulationPaused: false,
      loadState: 'loading',
      saveState: 'idle',
      savedGraph: null,
      publishState: 'idle',
      publishIssues: [],
      isVersionHistoryOpen: false,
      workflowVersions: [],
      versionHistoryState: 'idle',
      versionHistoryError: null,
      rollbackState: 'idle',
      rollbackIssues: [],
      rollbackError: null,
      rollbackTargetVersion: null,
    });
  },

  isVersionHistoryOpen: false,
  workflowVersions: [],
  versionHistoryState: 'idle',
  versionHistoryError: null,

  rollbackState: 'idle',
  rollbackIssues: [],
  rollbackError: null,
  rollbackTargetVersion: null,

  // Node State mutators
  setNodes: (nodes) =>
    set((state) => ({
      nodes: typeof nodes === 'function' ? nodes(state.nodes) : nodes,
    })),
  setEdges: (edges) =>
    set((state) => ({
      edges: typeof edges === 'function' ? edges(state.edges) : edges,
    })),

  setSelectedNodeId: (id) => set({ selectedNodeId: id }),

  addNodeFromRegistry: (type, position) => {
    const regItem = nodeRegistry[type];
    if (!regItem) return;

    const newId = `${type}-${Date.now()}`;
    const newNode: StudioNode = {
      id: newId,
      type: type as NodeType,
      position: position || {
        x: 400 + ((get().nodes.length * 25) % 200),
        y: 300 + ((get().nodes.length * 25) % 200),
      },
      data: {
        label: `${regItem.label} ${get().nodes.filter((n) => n.type === type).length + 1}`,
        category: regItem.category,
        config: { ...regItem.defaultConfig },
      },
    };

    set((state) => ({
      nodes: [...state.nodes, newNode],
      nodeLifecycles: { ...state.nodeLifecycles, [newId]: 'Ready' },
    }));
  },

  deleteNode: (id) => {
    set((state) => ({
      nodes: state.nodes.filter((n) => n.id !== id),
      edges: state.edges.filter((e) => e.source !== id && e.target !== id),
      selectedNodeId: state.selectedNodeId === id ? null : state.selectedNodeId,
      activeSimulationNodeId:
        state.activeSimulationNodeId === id ? null : state.activeSimulationNodeId,
    }));
  },

  updateNodeConfig: (id, key, value) => {
    set((state) => ({
      nodes: state.nodes.map((n) => {
        if (n.id === id) {
          return {
            ...n,
            data: {
              ...n.data,
              config: {
                ...n.data.config,
                [key]: value,
              },
            },
          };
        }
        return n;
      }),
    }));
  },

  updateNodeMetadata: (id, updates) => {
    set((state) => ({
      nodes: state.nodes.map((n) => {
        if (n.id === id) {
          return {
            ...n,
            data: {
              ...n.data,
              label: updates.label !== undefined ? updates.label : n.data.label,
              description:
                updates.description !== undefined ? updates.description : n.data.description,
            },
          };
        }
        return n;
      }),
    }));
  },

  toggleFavorite: (type) => {
    set((state) => {
      const isFav = state.favorites.includes(type);
      return {
        favorites: isFav ? state.favorites.filter((t) => t !== type) : [...state.favorites, type],
      };
    });
  },

  saveAsTemplate: (name) => {
    const { nodes, edges } = get();
    const newTemp = {
      id: `temp-${Date.now()}`,
      name,
      nodes: JSON.parse(JSON.stringify(nodes)),
      edges: JSON.parse(JSON.stringify(edges)),
    };
    set((state) => ({
      templates: [...state.templates, newTemp],
    }));
  },

  setSearchQuery: (q) => set({ searchQuery: q }),
  setActiveCategory: (cat) => set({ activeCategory: cat }),

  setNodeLifecycle: (id, state) => {
    set((stateObj) => ({
      nodeLifecycles: { ...stateObj.nodeLifecycles, [id]: state },
    }));
  },

  connectNodes: (connection) => {
    set((state) => {
      const sourceNode = state.nodes.find((n) => n.id === connection.source);
      const targetNode = state.nodes.find((n) => n.id === connection.target);

      const edgeData: StudioEdge['data'] = {
        category: 'Flow',
        description: `Conecta ${sourceNode?.data.label} a ${targetNode?.data.label}`,
        condition: '',
        priority: 1,
        weight: 1,
        event: 'next',
      };

      if (sourceNode?.type === 'condition') {
        const branchIndex = connection.sourceHandle === 'out-0' ? 0 : 1;
        edgeData.condition = branchIndex === 0 ? 'Variable == Value' : 'Fallback';
        edgeData.isFallback = branchIndex === 1;
        edgeData.category = 'Branch';
      } else if (sourceNode?.type === 'switch') {
        const handleId = connection.sourceHandle || 'out-0';
        const index = parseInt(handleId.split('-')[1], 10) || 0;
        const variable = sourceNode.data.config?.variableToCheck || 'userIntent';
        const value = sourceNode.data.config?.[`path${index}`] || `Caminho ${index}`;
        edgeData.condition = `${variable} == ${value}`;
        edgeData.category = 'Switch Branch';
      }

      const newEdge: StudioEdge = {
        id: `e-${connection.source}-${connection.target}-${Date.now()}`,
        source: connection.source || '',
        target: connection.target || '',
        sourceHandle: connection.sourceHandle,
        targetHandle: connection.targetHandle,
        type: 'studioEdge',
        data: edgeData,
      };

      return {
        edges: addEdge(newEdge, state.edges) as StudioEdge[],
      };
    });
  },

  updateEdgeData: (edgeId, updates) => {
    set((state) => ({
      edges: state.edges.map((e) => {
        if (e.id === edgeId) {
          return {
            ...e,
            data: {
              ...e.data,
              ...updates,
            },
          };
        }
        return e;
      }),
    }));
  },

  // Simulation Controls & Execution Loop
  addSimulationLog: (log) => {
    const timestamp = new Date().toLocaleTimeString('pt-BR');
    set((state) => ({
      simulationLogs: [{ ...log, timestamp }, ...state.simulationLogs].slice(0, 100),
    }));
  },

  clearSimulationLogs: () => set({ simulationLogs: [] }),
  updateSimulationVariable: (key, value) =>
    set((state) => ({
      simulationVariables: { ...state.simulationVariables, [key]: value },
    })),
  deleteSimulationVariable: (key) =>
    set((state) => {
      const newVars = { ...state.simulationVariables };
      delete newVars[key];
      return { simulationVariables: newVars };
    }),

  startSimulation: () => {
    if (simulationInterval) clearInterval(simulationInterval);

    // IMPORTANT: this is a local, client-only walk of the current nodes/edges graph — it never
    // calls the real Voice Runtime (lib/voice-runtime, owned by Agente 04), which today doesn't
    // even consume Workflow.nodes/edges yet (see handoff 07-para-04). It exists to let an author
    // preview branching/config without a real call, and it must never claim success for a node
    // that ValidationEngine would flag as broken — see the per-step check in runStep() below.
    const { nodes: startNodes } = get();
    const startNode = startNodes.find((n) => n.type === 'start');

    if (!startNode) {
      get().addSimulationLog({
        type: 'error',
        message:
          'Não é possível simular: nenhum nó Start encontrado no fluxo. Adicione um nó Start e conecte-o ao restante do fluxo.',
      });
      return;
    }

    if (!validationEngine.validate(startNodes, get().edges).isValid) {
      get().addSimulationLog({
        type: 'error',
        message: 'Simulação bloqueada: o fluxo não possui validação disponível e aprovada.',
      });
      return;
    }

    set({
      isDebugging: true,
      simulationStepIndex: 0,
      activeSimulationNodeId: startNode.id,
      isSimulationPaused: false,
      simulationLogs: [],
    });

    get().addSimulationLog({
      nodeId: startNode.id,
      nodeLabel: startNode.data.label,
      type: 'info',
      message:
        'Iniciando simulação local (mock) — não é uma chamada real de voz nem invoca o Voice Runtime em produção.',
    });

    get().setNodeLifecycle(startNode.id, 'Executing');

    const runStep = () => {
      const { activeSimulationNodeId, nodes, edges, isSimulationPaused, simulationVariables } =
        get();
      if (isSimulationPaused) return;
      if (!activeSimulationNodeId) return;

      const currentNode = nodes.find((n) => n.id === activeSimulationNodeId);
      if (!currentNode) {
        get().addSimulationLog({
          type: 'error',
          message: `Simulação interrompida: nó "${activeSimulationNodeId}" não existe mais no fluxo (foi removido durante a simulação?).`,
        });
        get().stopSimulation();
        return;
      }

      // Never claim success for a node ValidationEngine would reject at publish time (e.g. an
      // empty prompt, a Tool node with no endpoint, an LLM node with no provider). Simulating
      // past a broken node would be exactly the kind of "fingir sucesso" the runtime contract
      // forbids — surface the real error and halt instead.
      const { issues: liveIssues } = validationEngine.validate(nodes, edges);
      const blockingIssues = liveIssues.filter(
        (i) => (!i.nodeId || i.nodeId === currentNode.id) && i.type === 'error',
      );
      if (blockingIssues.length > 0) {
        get().setNodeLifecycle(currentNode.id, 'Failed');
        get().addSimulationLog({
          nodeId: currentNode.id,
          nodeLabel: currentNode.data.label,
          type: 'error',
          message: `Falha em ${currentNode.data.label}: ${blockingIssues.map((i) => i.message).join(' ')}`,
        });
        get().stopSimulation();
        return;
      }

      // Node execution completed
      get().setNodeLifecycle(currentNode.id, 'Completed');
      get().addSimulationLog({
        nodeId: currentNode.id,
        nodeLabel: currentNode.data.label,
        type: 'success',
        message: `Node ${currentNode.data.label} executado com sucesso (simulação local). Latência estimada: ${currentNode.data.metrics?.latencyMs || 15}ms`,
      });

      // Determine next node
      let nextNodeId: string | null = null;
      let matchingEdge: StudioEdge | null = null;

      const outgoingEdges = edges.filter((e) => e.source === currentNode.id);

      if (outgoingEdges.length === 1) {
        matchingEdge = outgoingEdges[0];
        nextNodeId = matchingEdge.target;
      } else if (outgoingEdges.length > 1) {
        // Evaluate conditions
        if (currentNode.type === 'condition') {
          const checkVar =
            typeof currentNode.data.config?.variable === 'string'
              ? currentNode.data.config.variable
              : 'intent';
          const valToCheck = simulationVariables[checkVar] || '';
          const checkVal = currentNode.data.config?.value || '';

          if (valToCheck === checkVal) {
            // Out-0 branch (Success branch)
            matchingEdge =
              outgoingEdges.find((e) => e.sourceHandle === 'out-0') || outgoingEdges[0];
          } else {
            // Out-1 branch (Fallback branch)
            matchingEdge =
              outgoingEdges.find((e) => e.sourceHandle === 'out-1') ||
              outgoingEdges[1] ||
              outgoingEdges[0];
          }
          nextNodeId = matchingEdge.target;
        } else {
          // Default first edge
          matchingEdge = outgoingEdges[0];
          nextNodeId = matchingEdge.target;
        }
      }

      if (nextNodeId) {
        const nextNode = nodes.find((n) => n.id === nextNodeId);
        if (nextNode) {
          get().addSimulationLog({
            nodeId: nextNodeId,
            nodeLabel: nextNode.data.label,
            type: 'event',
            message: `Ativando próximo Node: ${nextNode.data.label} via canal de decisão "${matchingEdge?.data?.description || 'Next Link'}"`,
          });
          get().setNodeLifecycle(nextNodeId, 'Executing');
          set({
            activeSimulationNodeId: nextNodeId,
            simulationStepIndex: get().simulationStepIndex + 1,
          });

          // Specific logs based on node types
          if (nextNode.type === 'voice') {
            get().addSimulationLog({
              nodeId: nextNodeId,
              nodeLabel: nextNode.data.label,
              type: 'info',
              message: `Voice setup: provider="${nextNode.data.config?.provider}", voice="${nextNode.data.config?.voiceId || 'Rachel'}"`,
            });
          } else if (nextNode.type === 'llm') {
            get().addSimulationLog({
              nodeId: nextNodeId,
              nodeLabel: nextNode.data.label,
              type: 'info',
              message: `Mounting LLM Provider config: model="${nextNode.data.config?.model || 'gemini-2.5-pro'}", temperature=${nextNode.data.config?.temperature || 0.2}`,
            });
          } else if (nextNode.type === 'prompt') {
            get().addSimulationLog({
              nodeId: nextNodeId,
              nodeLabel: nextNode.data.label,
              type: 'info',
              message: `Fired system instruction compilation: Text length=${typeof nextNode.data.config?.promptText === 'string' ? nextNode.data.config.promptText.length : 0} characters. DeepThinking: active.`,
            });
          } else if (nextNode.type === 'human_handoff') {
            get().addSimulationLog({
              nodeId: nextNodeId,
              nodeLabel: nextNode.data.label,
              type: 'warn',
              message: `Transferindo chamada telefônica para o departamento "${nextNode.data.config?.department}"`,
            });
            get().addSimulationLog({
              nodeId: nextNodeId,
              nodeLabel: nextNode.data.label,
              type: 'success',
              message: `Canal telefônico roteado para suporte ao vivo.`,
            });
            get().stopSimulation();
          } else if (nextNode.type === 'knowledge') {
            get().addSimulationLog({
              nodeId: nextNodeId,
              nodeLabel: nextNode.data.label,
              type: 'info',
              message: `Executing vector search RAG query against database "${nextNode.data.config?.database || 'Notion FAQs'}"`,
            });
            get().addSimulationLog({
              nodeId: nextNodeId,
              nodeLabel: nextNode.data.label,
              type: 'success',
              message: `Knowledge source search complete. Returned 3 chunks. Match score: 0.91`,
            });
          } else if (nextNode.type === 'end') {
            get().addSimulationLog({
              nodeId: nextNodeId,
              nodeLabel: nextNode.data.label,
              type: 'success',
              message: 'Conexão encerrada de forma limpa. Transcrição salva na plataforma.',
            });
            get().stopSimulation();
          }
        } else {
          get().stopSimulation();
        }
      } else {
        // No outgoing connections, end of execution
        get().addSimulationLog({
          nodeId: currentNode.id,
          nodeLabel: currentNode.data.label,
          type: 'info',
          message: 'Fim do grafo de execução visual.',
        });
        get().stopSimulation();
      }
    };

    simulationInterval = setInterval(runStep, get().simulationSpeedMs);
  },

  stopSimulation: () => {
    if (simulationInterval) {
      clearInterval(simulationInterval);
      simulationInterval = null;
    }

    const lifecycles = { ...get().nodeLifecycles };
    Object.keys(lifecycles).forEach((k) => {
      lifecycles[k] = 'Ready';
    });

    set({
      isDebugging: false,
      activeSimulationNodeId: null,
      simulationStepIndex: -1,
      isSimulationPaused: false,
      nodeLifecycles: lifecycles,
    });

    get().addSimulationLog({
      type: 'info',
      message: 'Debugger / Simulation session terminated.',
    });
  },

  pauseSimulation: () => {
    set({ isSimulationPaused: true });
    get().addSimulationLog({ type: 'warn', message: 'Sessão de simulação pausada.' });
  },

  resumeSimulation: () => {
    set({ isSimulationPaused: false });
    get().addSimulationLog({ type: 'info', message: 'Sessão de simulação retomada.' });
  },

  stepSimulationForward: () => {
    // Single manual tick forward
    const { activeSimulationNodeId, nodes, edges, simulationVariables } = get();
    if (!activeSimulationNodeId) return;

    const currentNode = nodes.find((n) => n.id === activeSimulationNodeId);
    if (!currentNode) return;

    // Same rule as the automatic playback loop in startSimulation: don't advance past a node
    // that ValidationEngine flags as an error, and don't silently mark it "Completed".
    const { issues: liveIssues } = validationEngine.validate(nodes, edges);
    const blockingIssues = liveIssues.filter(
      (i) => (!i.nodeId || i.nodeId === currentNode.id) && i.type === 'error',
    );
    if (blockingIssues.length > 0) {
      get().setNodeLifecycle(currentNode.id, 'Failed');
      get().addSimulationLog({
        nodeId: currentNode.id,
        nodeLabel: currentNode.data.label,
        type: 'error',
        message: `Falha em ${currentNode.data.label}: ${blockingIssues.map((i) => i.message).join(' ')}`,
      });
      get().stopSimulation();
      return;
    }

    get().setNodeLifecycle(currentNode.id, 'Completed');

    let nextNodeId: string | null = null;
    const outgoingEdges = edges.filter((e) => e.source === currentNode.id);

    if (outgoingEdges.length === 1) {
      nextNodeId = outgoingEdges[0].target;
    } else if (outgoingEdges.length > 1) {
      if (currentNode.type === 'condition') {
        const checkVar =
          typeof currentNode.data.config?.variable === 'string'
            ? currentNode.data.config.variable
            : 'intent';
        const valToCheck = simulationVariables[checkVar] || '';
        const checkVal = currentNode.data.config?.value || '';

        if (valToCheck === checkVal) {
          nextNodeId =
            outgoingEdges.find((e) => e.sourceHandle === 'out-0')?.target ||
            outgoingEdges[0].target;
        } else {
          nextNodeId =
            outgoingEdges.find((e) => e.sourceHandle === 'out-1')?.target ||
            outgoingEdges[1].target ||
            outgoingEdges[0].target;
        }
      } else {
        nextNodeId = outgoingEdges[0].target;
      }
    }

    if (nextNodeId) {
      const nextNode = nodes.find((n) => n.id === nextNodeId);
      if (nextNode) {
        get().setNodeLifecycle(nextNodeId, 'Executing');
        set({
          activeSimulationNodeId: nextNodeId,
          simulationStepIndex: get().simulationStepIndex + 1,
        });
        get().addSimulationLog({
          nodeId: nextNodeId,
          nodeLabel: nextNode.data.label,
          type: 'event',
          message: `Manual step forward: Ativando node ${nextNode.data.label}`,
        });
      }
    } else {
      get().stopSimulation();
    }
  },

  stepSimulationBackward: () => {
    // For simplicity, reset or log manual step back
    get().addSimulationLog({
      type: 'warn',
      message: 'Retrocesso de passo manual acionado.',
    });
  },

  // AI Flow Refactoring and Generation
  applyAiRefactor: async (mode) => {
    const epoch = workflowEpoch;
    get().addSimulationLog({
      type: 'event',
      message: `Enviando fluxo ativo para a Catarina AI para refatoração real (modo: ${mode})...`,
    });

    try {
      const response = await fetch('/api/ai/refactor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode, nodes: get().nodes }),
      });

      if (!response.ok) {
        throw new Error(`Erro na API: ${response.statusText}`);
      }

      const data = await response.json();
      if (epoch !== workflowEpoch) return;
      if (data?.nodes) {
        set({ nodes: data.nodes });
        get().addSimulationLog({
          type: 'success',
          message: `Catarina AI completou a refatoração do grafo de execução visual usando IA real!`,
        });
      }
    } catch (err: unknown) {
      if (epoch !== workflowEpoch) return;
      logger.error({ err }, 'Error applying AI refactor to workflow');
      const errMessage = err instanceof Error ? err.message : String(err);
      get().addSimulationLog({
        type: 'error',
        message: `Falha na refatoração real da Catarina AI: ${errMessage}. Revertendo para simulação offline local...`,
      });

      // Fallback local logic to guarantee the user's workflow never breaks
      set((state) => {
        const updatedNodes = state.nodes.map((n) => {
          if (n.type === 'prompt') {
            return {
              ...n,
              data: {
                ...n.data,
                label:
                  mode === 'moreHuman'
                    ? 'Atendimento Altamente Humanizado'
                    : 'Atendimento Otimizado AI',
                config: {
                  ...n.data.config,
                  promptText:
                    mode === 'moreHuman'
                      ? 'Você é um assistente virtual empático, natural, que respira e usa pausas de voz para soar humano.'
                      : 'Responda de forma extremamente curta e concisa para economizar latência de áudio.',
                },
              },
            };
          }
          if (n.type === 'llm') {
            return {
              ...n,
              data: {
                ...n.data,
                config: {
                  ...n.data.config,
                  model: mode === 'reduceCost' ? 'gemini-2.5-flash' : 'gemini-2.5-pro',
                  temperature: mode === 'simplify' ? 0.1 : 0.45,
                },
              },
            };
          }
          return n;
        });
        return { nodes: updatedNodes };
      });
    }
  },

  generateWorkflowFromPrompt: async (prompt) => {
    const epoch = workflowEpoch;
    get().addSimulationLog({
      type: 'event',
      message: `Catarina AI está processando o prompt natural com Gemini real: "${prompt}"...`,
    });

    try {
      const response = await fetch('/api/ai/generate-workflow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      });

      if (!response.ok) {
        throw new Error(`Erro na API: ${response.statusText}`);
      }

      const data = await response.json();
      if (epoch !== workflowEpoch) return;
      if (data?.nodes && data.edges) {
        const lifecycles: Record<string, NodeLifecycleState> = {};
        data.nodes.forEach((n: { id: string }) => {
          lifecycles[n.id] = 'Ready';
        });

        set({
          nodes: data.nodes,
          edges: data.edges,
          nodeLifecycles: lifecycles,
          selectedNodeId: null,
          activeSimulationNodeId: null,
        });

        get().addSimulationLog({
          type: 'success',
          message: `Catarina AI (Gemini Real) gerou um grafo completo contendo ${data.nodes.length} nodes e ${data.edges.length} conexões com sucesso!`,
        });
      }
    } catch (err: unknown) {
      if (epoch !== workflowEpoch) return;
      logger.error({ err }, 'Error generating workflow from prompt');
      const errMessage = err instanceof Error ? err.message : String(err);
      get().addSimulationLog({
        type: 'error',
        message: `Falha na geração real de fluxo: ${errMessage}.`,
      });
    }
  },
  ...createWorkflowPersistenceActions(get, set, () => workflowEpoch),
  publishWorkflowToServer: async () => {
    const epoch = workflowEpoch;
    const { nodes, edges } = get();

    // Fast local pre-check so an obviously-broken flow doesn't even round-trip: purely a UX
    // shortcut, NOT the enforcement point. The server independently re-runs ValidationEngine
    // against the persisted row and is the only thing allowed to set status: 'active'.
    const localResult = validationEngine.validate(nodes, edges);
    if (!localResult.isValid) {
      set({ publishState: 'error', publishIssues: localResult.issues });
      get().addSimulationLog({
        type: 'error',
        message: `Publicação bloqueada: ${localResult.issues.filter((i) => i.type === 'error').length} erro(s) de validação precisam ser corrigidos antes de ativar este fluxo.`,
      });
      return;
    }

    set({ publishState: 'publishing' });
    try {
      const res = await fetch('/api/voice-hub/workflow/publish', { method: 'POST' });
      const data = await res.json().catch(() => ({}));
      if (epoch !== workflowEpoch) return;

      if (res.ok) {
        set({
          publishState: 'success',
          publishIssues: [],
          workflowId: data.workflow?.id ?? get().workflowId,
        });
        get().addSimulationLog({
          type: 'success',
          message: 'Fluxo validado e publicado com sucesso. Status: ativo.',
        });
        // A fresh publish archives a new version — keep an already-open history panel current
        // instead of leaving it showing a now-stale list.
        if (get().isVersionHistoryOpen) {
          get().fetchWorkflowVersions();
        }
        return;
      }

      // 422 (ValidationFailedError) carries structured issues from the server-side re-check;
      // any other non-OK status is a generic failure with no issues to display.
      const issues: ValidationIssue[] = Array.isArray(data.issues) ? data.issues : [];
      set({ publishState: 'error', publishIssues: issues });
      get().addSimulationLog({
        type: 'error',
        message: `Falha ao publicar: ${data.error || res.statusText || 'erro desconhecido no servidor'}`,
      });
    } catch (err: any) {
      if (epoch !== workflowEpoch) return;
      logger.error({ err }, 'Error publishing workflow to server');
      set({ publishState: 'error', publishIssues: [] });
      get().addSimulationLog({
        type: 'error',
        message: 'Falha ao publicar: não foi possível contatar o servidor.',
      });
    }
  },

  // "Histórico de Publicações": GET /workflow/:id/versions, tenant/workflow-scoped server-side
  // (workflowRepository.findWorkflowByIdForTenant — see workflowVersioning.test.ts). Never called
  // with any id other than this session's own `workflowId`, so a version list can never mix
  // tenants or workflows (AGENTS.md §15).
  openVersionHistory: () => {
    set({
      isVersionHistoryOpen: true,
      rollbackState: 'idle',
      rollbackIssues: [],
      rollbackError: null,
    });
    get().fetchWorkflowVersions();
  },

  closeVersionHistory: () => {
    set({ isVersionHistoryOpen: false });
  },

  fetchWorkflowVersions: async () => {
    const epoch = workflowEpoch;
    const { workflowId } = get();
    if (!workflowId) {
      // Nothing has round-tripped through the server yet (or nothing has ever been published) —
      // a real empty state, never a fabricated placeholder list.
      set({ workflowVersions: [], versionHistoryState: 'idle', versionHistoryError: null });
      return;
    }

    set({ versionHistoryState: 'loading', versionHistoryError: null });
    try {
      const res = await fetch(`/api/voice-hub/workflow/${workflowId}/versions`);
      const data = await res.json().catch(() => ({}));
      if (epoch !== workflowEpoch) return;

      if (!res.ok) {
        set({
          versionHistoryState: 'error',
          workflowVersions: [],
          versionHistoryError:
            data.error || 'Não foi possível carregar o histórico de publicações.',
        });
        return;
      }

      const versions: WorkflowVersionSummary[] = Array.isArray(data.versions) ? data.versions : [];
      set({ versionHistoryState: 'idle', workflowVersions: versions, versionHistoryError: null });
    } catch (err: any) {
      if (epoch !== workflowEpoch) return;
      logger.error({ err }, 'Error fetching workflow version history');
      set({
        versionHistoryState: 'error',
        workflowVersions: [],
        versionHistoryError: 'Não foi possível contatar o servidor.',
      });
    }
  },

  rollbackWorkflowToVersion: async (version: number) => {
    const epoch = workflowEpoch;
    const { workflowId } = get();
    if (!workflowId) return;

    set({
      rollbackState: 'rolling-back',
      rollbackTargetVersion: version,
      rollbackIssues: [],
      rollbackError: null,
    });

    try {
      const res = await fetch(
        `/api/voice-hub/workflow/${workflowId}/versions/${version}/rollback`,
        {
          method: 'POST',
        },
      );
      const data = await res.json().catch(() => ({}));
      if (epoch !== workflowEpoch) return;

      if (res.ok && data.workflow) {
        const lifecycles: Record<string, NodeLifecycleState> = {};
        (Array.isArray(data.workflow.nodes) ? data.workflow.nodes : []).forEach(
          (n: { id: string }) => {
            lifecycles[n.id] = 'Ready';
          },
        );
        set({
          nodes: data.workflow.nodes || [],
          edges: data.workflow.edges || [],
          nodeLifecycles: lifecycles,
          workflowId: data.workflow.id ?? workflowId,
          rollbackState: 'success',
          rollbackTargetVersion: null,
        });
        get().addSimulationLog({
          type: 'success',
          message: `Rollback concluído: versão ${version} restaurada e publicada como v${data.workflow.version}.`,
        });
        // Rollback archives the version it superseded — refresh so the list reflects it.
        await get().fetchWorkflowVersions();
        return;
      }

      // 422 (ValidationFailedError) carries the same structured `issues` shape as
      // publishWorkflowToServer's rejection path — surfaced with the same ValidationIssuesList,
      // never a silent failure on a rejected rollback.
      const issues: ValidationIssue[] = Array.isArray(data.issues) ? data.issues : [];
      set({
        rollbackState: 'error',
        rollbackIssues: issues,
        rollbackError: data.error || 'Não foi possível restaurar esta versão.',
        rollbackTargetVersion: null,
      });
      get().addSimulationLog({
        type: 'error',
        message: `Falha ao restaurar versão ${version}: ${data.error || res.statusText || 'erro desconhecido no servidor'}`,
      });
    } catch (err: any) {
      if (epoch !== workflowEpoch) return;
      logger.error({ err }, 'Error rolling back workflow version');
      set({
        rollbackState: 'error',
        rollbackIssues: [],
        rollbackError: 'Não foi possível contatar o servidor.',
        rollbackTargetVersion: null,
      });
      get().addSimulationLog({
        type: 'error',
        message: 'Falha ao restaurar versão: não foi possível contatar o servidor.',
      });
    }
  },
}));
