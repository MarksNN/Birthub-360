import type { Edge, Node } from '@xyflow/react';
import type {
  NodeType,
  StudioEdgeData as SharedEdgeData,
  StudioNodeData as SharedNodeData,
} from '../../../../lib/studio/types.js';

export * from '../../../../lib/studio/types.js';

export type NodeLifecycleState =
  | 'Created'
  | 'Initialized'
  | 'Configured'
  | 'Validated'
  | 'Ready'
  | 'Executing'
  | 'Completed'
  | 'Failed'
  | 'Retry'
  | 'Archived';

export interface StudioNodeData extends SharedNodeData {
  validation?: { isValid: boolean; errors: string[]; warnings: string[] };
  lifecycleState?: NodeLifecycleState;
}
export interface StudioEdgeData extends SharedEdgeData {
  condition?: string;
}
export type StudioNode = Node<StudioNodeData, NodeType> & { type: NodeType };
export type StudioEdge = Edge<StudioEdgeData>;
