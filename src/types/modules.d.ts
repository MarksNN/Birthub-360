declare module '@bull-board/api' {
  export function createBullBoard(options: any): any;
}

declare module '@bull-board/api/bullMQAdapter' {
  export class BullMQAdapter {
    constructor(queue: any, options?: any);
    getJobs(jobTypes: any[], start?: number, end?: number): Promise<any[]>;
    getJob(id: string): Promise<any>;
  }
}

declare module '@dnd-kit/core' {
  export const DndContext: any;
  export const closestCenter: any;
  export const PointerSensor: any;
  export const KeyboardSensor: any;
  export const KeyboardCode: any;
  export const useSensor: any;
  export const useSensors: any;
  export const DragOverlay: any;
  export const useDroppable: any;
  export const useDraggable: any;
  export interface Announcements {
    onDragStart?(event: { active: any }): string | undefined;
    onDragOver?(event: { active: any; over: any }): string | undefined;
    onDragEnd?(event: { active: any; over: any }): string | undefined;
    onDragCancel?(event: { active: any }): string | undefined;
  }
  export interface DragEndEvent {
    active: any;
    over: any;
  }
  export interface DragStartEvent {
    active: any;
  }
}

declare module '@dnd-kit/sortable' {
  export const SortableContext: any;
  export const arrayMove: any;
  export const useSortable: any;
  export const verticalListSortingStrategy: any;
  export const rectSortingStrategy: any;
}

declare module '@dnd-kit/utilities' {
  export const CSS: any;
}

declare module '@tiptap/react' {
  export const EditorContent: any;
  export const useEditor: any;
}

declare module '@opentelemetry/sdk-node' {
  export class NodeSDK {
    constructor(options: any);
    start(): void;
    shutdown(): Promise<void>;
  }
}

declare module 'tailwind-merge' {
  export function twMerge(...classLists: any[]): string;
}

declare module 'meilisearch' {
  export class MeiliSearch {
    constructor(options: any);
    index(name: string): any;
    createIndex(name: string, options?: any): Promise<any>;
    getIndex(name: string): Promise<any>;
  }
  export const Meilisearch: typeof MeiliSearch;
}

declare module 'zustand' {
  export function create<T = any>(initializer?: any): any;
}

declare module 'ai' {
  export const streamText: any;
  export const generateText: any;
}

declare module '@xenova/transformers' {
  export const pipeline: any;
  export const env: any;
  const _default: any;
  export default _default;
}
