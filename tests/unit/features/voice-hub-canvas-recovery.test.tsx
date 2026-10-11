// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { VisualCanvas } from '@/features/voice-hub/components/studio/Canvas.js';
import { TopBar } from '@/features/voice-hub/components/studio/panels/TopBar.js';
import { useStudioStore } from '@/features/voice-hub/store/useStudioStore.js';

const auth = vi.hoisted(() => ({ session: { data: null as unknown, isPending: false } }));
vi.mock('@/lib/auth-client.js', () => ({ authClient: { useSession: () => auth.session } }));
vi.mock('@xyflow/react', () => ({
  ReactFlowProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
  ReactFlow: () => <div data-testid="graph-editor" />,
  MiniMap: () => null,
  Controls: () => null,
  Background: () => null,
  BackgroundVariant: { Dots: 'dots' },
  SelectionMode: { Partial: 'partial' },
  useOnSelectionChange: () => undefined,
  useReactFlow: () => ({ zoomIn: vi.fn(), zoomOut: vi.fn(), fitView: vi.fn() }),
  addEdge: (edge: unknown, edges: unknown[]) => [...edges, edge],
  applyNodeChanges: (_changes: unknown, nodes: unknown[]) => nodes,
  applyEdgeChanges: (_changes: unknown, edges: unknown[]) => edges,
}));
vi.mock('@/features/voice-hub/components/studio/nodes/index.js', () => ({
  StartNode: () => null,
  EndNode: () => null,
  PromptNode: () => null,
  ConditionNode: () => null,
  ToolNode: () => null,
  LlmNode: () => null,
  VoiceNode: () => null,
  QuestionNode: () => null,
  SwitchNode: () => null,
  MemoryNode: () => null,
  KnowledgeNode: () => null,
  HumanHandoffNode: () => null,
}));
vi.mock('@/features/voice-hub/components/studio/edges/StudioEdge.js', () => ({
  StudioEdge: () => null,
}));
vi.mock('@/features/voice-hub/components/studio/panels/LayersPanel.js', () => ({
  LayersPanel: () => null,
}));
vi.mock('@/features/voice-hub/components/studio/panels/InspectorPanel.js', () => ({
  InspectorPanel: () => null,
}));
vi.mock('@/features/voice-hub/components/studio/panels/BottomDrawer.js', () => ({
  BottomDrawer: () => null,
}));

function signIn(organizationId = 'tenant-qa') {
  auth.session.data = { session: { id: 'session-qa' }, user: { id: 'user-qa', organizationId } };
}
function response(body: unknown, status = 200) {
  return { ok: status === 200, status, json: async () => body } as Response;
}

describe('Voice Studio Canvas hydration and keyboard safety', () => {
  beforeEach(() => {
    auth.session = { data: null, isPending: false };
    vi.stubGlobal('fetch', vi.fn());
    useStudioStore.getState().setWorkflowContext(null);
  });
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });
  it('does not expose editor controls without authenticated organization', () => {
    render(<VisualCanvas />);
    expect(screen.queryByTestId('graph-editor')).toBeNull();
    expect(screen.getByRole('status').textContent).toMatch(/sessão e organização/);
    expect(fetch).not.toHaveBeenCalled();
  });
  it('keeps editor unmounted while hydration is pending', async () => {
    signIn();
    vi.mocked(fetch).mockReturnValueOnce(new Promise(() => {}));
    render(<VisualCanvas />);
    expect(screen.queryByTestId('graph-editor')).toBeNull();
    expect(screen.queryByTitle('Simular Ligação (Test Call)')).toBeNull();
    fireEvent.keyDown(document.body, { key: 'Delete' });
    expect(useStudioStore.getState().nodes).toEqual([]);
    expect(fetch).toHaveBeenCalledTimes(1);
  });
  it('discloses backend 503 and retries hydration without exposing editing', async () => {
    signIn();
    vi.mocked(fetch).mockResolvedValueOnce(response({ error: 'Module unavailable' }, 503));
    render(<VisualCanvas />);
    expect((await screen.findByRole('alert')).textContent).toMatch(
      /salvamento automático bloqueados/,
    );
    expect(screen.queryByTestId('graph-editor')).toBeNull();
    vi.mocked(fetch).mockResolvedValueOnce(response({ workflow: null }));
    fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));
    expect(await screen.findByTestId('graph-editor')).toBeTruthy();
    expect(fetch).toHaveBeenCalledTimes(2);
  });
  it('resets tenant data immediately after logout', async () => {
    signIn();
    vi.mocked(fetch).mockResolvedValueOnce(
      response({ workflow: { id: 'wf-qa', nodes: [], edges: [] } }),
    );
    const view = render(<VisualCanvas />);
    await screen.findByTestId('graph-editor');
    auth.session.data = null;
    act(() => view.rerender(<VisualCanvas />));
    expect(screen.queryByTestId('graph-editor')).toBeNull();
    expect(useStudioStore.getState().workflowId).toBeNull();
    expect(useStudioStore.getState().workflowContext).toBeNull();
  });
  it('supports Enter and Space on the demo trigger and blocks publishing', () => {
    const onSimulate = vi.fn();
    const onPublish = vi.fn();
    render(
      <TopBar
        issues={[
          { id: 'validation-unavailable', type: 'error', message: 'Validation unavailable' },
        ]}
        onSimulate={onSimulate}
        onPublish={onPublish}
      />,
    );
    const trigger = screen.getByTitle('Simular Ligação (Test Call)');
    fireEvent.keyDown(trigger, { key: 'Enter' });
    fireEvent.keyDown(trigger, { key: ' ' });
    expect(onSimulate).toHaveBeenCalledTimes(2);
    const publish = screen.getByRole('button', { name: /publicar|publish/i });
    expect((publish as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(publish);
    expect(onPublish).not.toHaveBeenCalled();
  });
});
