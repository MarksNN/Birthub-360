import type {
  StudioNode,
  StudioEdge,
  ValidationIssue,
  WorkflowVersionSummary,
  NodeLifecycleState,
} from '../lib/studio/types.js';
import type { Connection } from '@xyflow/react';

export type { NodeLifecycleState } from '../lib/studio/types.js';

export interface NodeRegistryItem {
  type: string;
  label: string;
  category: string;
  description: string;
  iconName: string;
  colorClass: string;
  inputs: number;
  outputs: number;
  version: string;
  compatibilities: string[];
  dependencies: string[];
  defaultConfig: Record<string, unknown>;
  documentation: {
    goal: string;
    inputsDesc: string[];
    outputsDesc: string[];
    bestPractices: string[];
    examples: string[];
  };
}

export interface SimulationLog {
  timestamp: string;
  nodeId?: string;
  nodeLabel?: string;
  type: 'info' | 'success' | 'warn' | 'error' | 'event';
  message: string;
  payload?: unknown;
}

export interface StudioState {
  past: { nodes: StudioNode[]; edges: StudioEdge[] }[];
  future: { nodes: StudioNode[]; edges: StudioEdge[] }[];
  clipboard: { nodes: StudioNode[]; edges: StudioEdge[] } | null;
  undo: () => void;
  redo: () => void;
  copySelection: () => void;
  pasteSelection: () => void;
  autoAlignNodes: () => void;
  deleteSelection: () => void;
  saveSnapshot: () => void;
  nodes: StudioNode[];
  edges: StudioEdge[];
  selectedNodeId: string | null;
  favorites: string[];
  templates: { id: string; name: string; nodes: StudioNode[]; edges: StudioEdge[] }[];
  searchQuery: string;
  activeCategory: string;
  nodeLifecycles: Record<string, NodeLifecycleState>;

  // Debug & Simulation Mode
  isDebugging: boolean;
  activeSimulationNodeId: string | null;
  simulationStepIndex: number;
  simulationLogs: SimulationLog[];
  simulationVariables: Record<string, unknown>;
  isSimulationPaused: boolean;
  simulationSpeedMs: number;

  // Actions
  setNodes: (nodes: StudioNode[] | ((nds: StudioNode[]) => StudioNode[])) => void;
  setEdges: (edges: StudioEdge[] | ((eds: StudioEdge[]) => StudioEdge[])) => void;
  setSelectedNodeId: (id: string | null) => void;
  addNodeFromRegistry: (type: string, position?: { x: number; y: number }) => void;
  deleteNode: (id: string) => void;
  updateNodeConfig: (id: string, key: string, value: unknown) => void;
  updateNodeMetadata: (id: string, updates: { label?: string; description?: string }) => void;
  toggleFavorite: (type: string) => void;
  saveAsTemplate: (name: string) => void;
  setSearchQuery: (q: string) => void;
  setActiveCategory: (cat: string) => void;
  setNodeLifecycle: (id: string, state: NodeLifecycleState) => void;

  // Connections
  connectNodes: (connection: Connection) => void;
  updateEdgeData: (edgeId: string, updates: Partial<StudioEdge['data']>) => void;

  // Simulation Controls & Execution Loop
  addSimulationLog: (log: Omit<SimulationLog, 'timestamp'>) => void;
  clearSimulationLogs: () => void;
  updateSimulationVariable: (key: string, value: unknown) => void;
  deleteSimulationVariable: (key: string) => void;
  startSimulation: () => void;
  stopSimulation: () => void;
  pauseSimulation: () => void;
  resumeSimulation: () => void;
  stepSimulationForward: () => void;
  stepSimulationBackward: () => void;

  // AI Generation & Refactoring
  applyAiRefactor: (
    mode: 'moreHuman' | 'reduceCost' | 'simplify' | 'reduceLatency',
  ) => Promise<void>;
  generateWorkflowFromPrompt: (prompt: string) => Promise<void>;

  // Server state & publishing
  workflowId: string | null;
  workflowContext: string | null;
  loadState: 'loading' | 'ready' | 'error';
  saveState: 'idle' | 'saving' | 'saved' | 'error';
  savedGraph: string | null;
  setWorkflowContext: (context: string | null) => void;
  loadWorkflowFromServer: (signal?: AbortSignal) => Promise<boolean>;
  saveWorkflowToServer: (signal?: AbortSignal) => Promise<boolean>;

  publishState: 'idle' | 'publishing' | 'success' | 'error';
  publishIssues: ValidationIssue[];
  publishWorkflowToServer: () => Promise<void>;

  // Version history & rollback
  isVersionHistoryOpen: boolean;
  workflowVersions: WorkflowVersionSummary[];
  versionHistoryState: 'idle' | 'loading' | 'error';
  versionHistoryError: string | null;
  openVersionHistory: () => void;
  closeVersionHistory: () => void;
  fetchWorkflowVersions: () => Promise<void>;

  rollbackState: 'idle' | 'rolling-back' | 'success' | 'error';
  rollbackIssues: ValidationIssue[];
  rollbackError: string | null;
  rollbackTargetVersion: number | null;
  rollbackWorkflowToVersion: (version: number) => Promise<void>;
}
