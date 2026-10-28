import type { StudioEdge, StudioNode } from '../lib/studio/types.js';
import { nodeRegistry } from './nodeRegistry.js';

export const initialNodes: StudioNode[] = [
  {
    id: 'start-1',
    type: 'start',
    position: { x: 50, y: 300 },
    data: {
      label: 'Inbound Call',
      category: 'Trigger',
      config: nodeRegistry.start.defaultConfig,
      metrics: { invocations: 1248, errorRate: 0, latencyMs: 12 },
    },
  },
  {
    id: 'voice-1',
    type: 'voice',
    position: { x: 380, y: 150 },
    data: {
      label: 'Voice Setup',
      category: 'Config',
      config: nodeRegistry.voice.defaultConfig,
      metrics: { invocations: 1248, errorRate: 0, latencyMs: 8 },
    },
  },
  {
    id: 'llm-1',
    type: 'llm',
    position: { x: 380, y: 450 },
    data: {
      label: 'Gemini 3.1 Pro',
      category: 'LLM',
      config: nodeRegistry.llm.defaultConfig,
      metrics: { invocations: 1248, errorRate: 0.02, latencyMs: 145 },
    },
  },
  {
    id: 'prompt-1',
    type: 'prompt',
    position: { x: 720, y: 300 },
    data: {
      label: 'Atendimento Inicial',
      category: 'Prompt',
      config: nodeRegistry.prompt.defaultConfig,
      metrics: { invocations: 1220, errorRate: 0.05, latencyMs: 420 },
    },
  },
  {
    id: 'condition-1',
    type: 'condition',
    position: { x: 1060, y: 300 },
    data: {
      label: 'Verifica Intenção',
      category: 'Logic',
      config: nodeRegistry.condition.defaultConfig,
      metrics: { invocations: 1180, errorRate: 0.01, latencyMs: 25 },
    },
  },
  {
    id: 'handoff-1',
    type: 'human_handoff',
    position: { x: 1420, y: 120 },
    data: {
      label: 'Transferir Suporte',
      category: 'Action',
      config: nodeRegistry.human_handoff.defaultConfig,
      metrics: { invocations: 450, errorRate: 0.08, latencyMs: 120 },
    },
  },
  {
    id: 'knowledge-1',
    type: 'knowledge',
    position: { x: 1420, y: 480 },
    data: {
      label: 'Buscar Documentos',
      category: 'Knowledge',
      config: nodeRegistry.knowledge.defaultConfig,
      metrics: { invocations: 730, errorRate: 0.04, latencyMs: 310 },
    },
  },
  {
    id: 'end-1',
    type: 'end',
    position: { x: 1780, y: 480 },
    data: {
      label: 'Finalizar',
      category: 'Trigger',
      config: nodeRegistry.end.defaultConfig,
      metrics: { invocations: 700, errorRate: 0, latencyMs: 10 },
    },
  },
];

export const initialEdges: StudioEdge[] = [
  {
    id: 'e1-v1',
    source: 'start-1',
    target: 'voice-1',
    type: 'studioEdge',
    data: { category: 'Config', description: 'Carrega Voz' },
  },
  {
    id: 'e1-l1',
    source: 'start-1',
    target: 'llm-1',
    type: 'studioEdge',
    data: { category: 'Config', description: 'Carrega LLM' },
  },
  {
    id: 'ev1-p1',
    source: 'voice-1',
    target: 'prompt-1',
    type: 'studioEdge',
    data: { category: 'Pipeline', description: 'Voz Ativa' },
  },
  {
    id: 'el1-p1',
    source: 'llm-1',
    target: 'prompt-1',
    type: 'studioEdge',
    data: { category: 'Pipeline', description: 'LLM Ativo' },
  },
  {
    id: 'e-p1-c1',
    source: 'prompt-1',
    target: 'condition-1',
    type: 'studioEdge',
    data: { category: 'Flow', description: 'Resultado' },
  },
  {
    id: 'e-c1-h1',
    source: 'condition-1',
    target: 'handoff-1',
    sourceHandle: 'out-0',
    type: 'studioEdge',
    data: { condition: 'Intent == Suporte', category: 'Branch', description: 'Caso Suporte' },
  },
  {
    id: 'e-c1-k1',
    source: 'condition-1',
    target: 'knowledge-1',
    sourceHandle: 'out-1',
    type: 'studioEdge',
    data: {
      condition: 'Intent == Dúvida',
      isFallback: true,
      category: 'Branch',
      description: 'Caso Geral / Fallback',
    },
  },
  {
    id: 'e-k1-e1',
    source: 'knowledge-1',
    target: 'end-1',
    type: 'studioEdge',
    data: { category: 'Flow', description: 'Concluído' },
  },
];
