import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, renderHook } from '@testing-library/react';
import { useStudioStore } from '@/features/voice-hub/store/useStudioStore.js';
import { useWorkflowPersistence } from '@/features/voice-hub/store/useWorkflowPersistence.js';
import { validationEngine } from '@/lib/studio/ValidationEngine.js';
import type { StudioNode } from '@/features/voice-hub/lib/studio/types.js';

const context = 'session-qa:user-qa:tenant-qa';
const start: StudioNode = {
  id: 'start-qa',
  type: 'start',
  position: { x: 0, y: 0 },
  data: { label: 'QA Start', category: 'Trigger', config: {} },
};
function response(body: unknown, status = 200): Response {
  return { ok: status >= 200 && status < 300, status, json: async () => body } as Response;
}
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}
async function tick(ms = 0) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
}
function readyGraph() {
  useStudioStore.setState({ nodes: [structuredClone(start)], edges: [], loadState: 'ready' });
}

describe('Voice Studio persistence with HTTP responses mocked', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
    useStudioStore.getState().setWorkflowContext(null);
    useStudioStore.getState().setWorkflowContext(context);
  });
  afterEach(() => {
    cleanup();
    useStudioStore.getState().setWorkflowContext(null);
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });
  it('clears the graph when the tenant has no saved workflow', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(response({ workflow: null }));
    expect(await useStudioStore.getState().loadWorkflowFromServer()).toBe(true);
    expect(useStudioStore.getState()).toMatchObject({
      nodes: [],
      edges: [],
      workflowId: null,
      loadState: 'ready',
    });
  });
  it.each([401, 403, 503])(
    'rejects hydration on HTTP %s and preserves current graph',
    async (status) => {
      useStudioStore.setState({ nodes: [start], edges: [] });
      vi.mocked(fetch).mockResolvedValueOnce(response({ error: 'unavailable' }, status));
      expect(await useStudioStore.getState().loadWorkflowFromServer()).toBe(false);
      expect(useStudioStore.getState().nodes).toEqual([start]);
      expect(useStudioStore.getState().loadState).toBe('error');
    },
  );
  it.each([
    { workflow: { nodes: [] } },
    { workflow: { id: 'wf-qa', nodes: [{}], edges: [] } },
    {
      workflow: {
        id: 'wf-qa',
        nodes: [{ ...start, data: { ...start.data, category: 42 } }],
        edges: [],
      },
    },
    {
      workflow: {
        id: 'wf-qa',
        nodes: [
          {
            ...start,
            data: { ...start.data, metrics: { invocations: 'bad', errorRate: 0, latencyMs: 0 } },
          },
        ],
        edges: [],
      },
    },
    {
      workflow: {
        id: 'wf-qa',
        nodes: [start],
        edges: [{ id: 'edge-qa', source: start.id, target: 'missing' }],
      },
    },
  ])('rejects malformed graph %# without hydrating it', async (body) => {
    vi.mocked(fetch).mockResolvedValueOnce(response(body));
    expect(await useStudioStore.getState().loadWorkflowFromServer()).toBe(false);
    expect(useStudioStore.getState().loadState).toBe('error');
    expect(useStudioStore.getState().workflowId).toBeNull();
  });
  it('loads a valid graph without resaving the loaded snapshot', async () => {
    vi.useFakeTimers();
    vi.mocked(fetch).mockResolvedValueOnce(
      response({ workflow: { id: 'wf-qa', nodes: [start], edges: [] } }),
    );
    renderHook(() => useWorkflowPersistence(context));
    await tick(6000);
    expect(useStudioStore.getState()).toMatchObject({
      workflowId: 'wf-qa',
      nodes: [start],
      loadState: 'ready',
    });
    expect(fetch).toHaveBeenCalledTimes(1);
  });
  it('blocks saving before successful hydration', async () => {
    expect(await useStudioStore.getState().saveWorkflowToServer()).toBe(false);
    expect(fetch).not.toHaveBeenCalled();
  });
  it('creates editor nodes without fabricated performance measurements', () => {
    readyGraph();
    useStudioStore.getState().addNodeFromRegistry('voice');
    expect(useStudioStore.getState().nodes.at(-1)?.data).not.toHaveProperty('metrics');
  });
  it('ignores selection and measurements but saves a real position change without renaming', async () => {
    vi.useFakeTimers();
    vi.mocked(fetch).mockResolvedValueOnce(
      response({
        workflow: { id: 'wf-qa', name: 'Existing customer flow', nodes: [start], edges: [] },
      }),
    );
    renderHook(() => useWorkflowPersistence(context));
    await tick();
    const measured = {
      ...start,
      selected: true,
      dragging: false,
      measured: { width: 220, height: 80 },
    };
    act(() => useStudioStore.getState().setNodes([measured]));
    await tick(6000);
    expect(fetch).toHaveBeenCalledTimes(1);
    vi.mocked(fetch).mockResolvedValueOnce(response({ success: true, workflow: { id: 'wf-qa' } }));
    act(() => useStudioStore.getState().setNodes([{ ...measured, position: { x: 40, y: 60 } }]));
    await tick(3000);
    expect(fetch).toHaveBeenCalledTimes(2);
    const [, options] = vi.mocked(fetch).mock.calls[1];
    const payload = JSON.parse(String(options?.body));
    expect(payload).toEqual({ nodes: [{ ...start, position: { x: 40, y: 60 } }], edges: [] });
    expect(payload).not.toHaveProperty('name');
  });
  it('rejects SPA HTML and network failures without enabling editing', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => {
        throw new SyntaxError('HTML fallback');
      },
    } as unknown as Response);
    expect(await useStudioStore.getState().loadWorkflowFromServer()).toBe(false);
    expect(useStudioStore.getState().loadState).toBe('error');
    vi.mocked(fetch).mockRejectedValueOnce(new TypeError('network unavailable'));
    expect(await useStudioStore.getState().loadWorkflowFromServer()).toBe(false);
    expect(await useStudioStore.getState().saveWorkflowToServer()).toBe(false);
    expect(fetch).toHaveBeenCalledTimes(2);
  });
  it('ignores aborted hydration even if transport later returns a valid graph', async () => {
    const loading = deferred<Response>();
    const controller = new AbortController();
    vi.mocked(fetch).mockReturnValueOnce(loading.promise);
    const pending = useStudioStore.getState().loadWorkflowFromServer(controller.signal);
    controller.abort();
    loading.resolve(response({ workflow: { id: 'aborted-wf', nodes: [start], edges: [] } }));
    expect(await pending).toBe(false);
    expect(useStudioStore.getState().workflowId).toBeNull();
  });
  it.each([403, 503])('does not claim persistence when HTTP %s rejects a save', async (status) => {
    readyGraph();
    vi.mocked(fetch).mockResolvedValueOnce(response({ error: 'unavailable' }, status));
    expect(await useStudioStore.getState().saveWorkflowToServer()).toBe(false);
    expect(useStudioStore.getState()).toMatchObject({ workflowId: null, saveState: 'error' });
  });
  it.each([{ success: false }, { success: true }, { success: true, workflow: {} }])(
    'requires explicit workflow confirmation %#',
    async (body) => {
      readyGraph();
      vi.mocked(fetch).mockResolvedValueOnce(response(body));
      expect(await useStudioStore.getState().saveWorkflowToServer()).toBe(false);
      expect(useStudioStore.getState().saveState).toBe('error');
    },
  );
  it('confirms save only after HTTP success with a workflow identifier', async () => {
    readyGraph();
    vi.mocked(fetch).mockResolvedValueOnce(
      response({ success: true, workflow: { id: 'wf-saved' } }),
    );
    expect(await useStudioStore.getState().saveWorkflowToServer()).toBe(true);
    expect(useStudioStore.getState()).toMatchObject({ workflowId: 'wf-saved', saveState: 'saved' });
    expect(fetch).toHaveBeenCalledWith(
      '/api/voice-hub/workflow',
      expect.objectContaining({ method: 'POST' }),
    );
    const [, options] = vi.mocked(fetch).mock.calls[0];
    expect(JSON.parse(String(options?.body))).toMatchObject({ nodes: [start], edges: [] });
  });
  it('does not mark newer edits as saved when an older save finishes', async () => {
    readyGraph();
    const saving = deferred<Response>();
    vi.mocked(fetch).mockReturnValueOnce(saving.promise);
    const pending = useStudioStore.getState().saveWorkflowToServer();
    const edited = { ...start, data: { ...start.data, label: 'Unsaved edit' } };
    useStudioStore.getState().setNodes([edited]);
    saving.resolve(response({ success: true, workflow: { id: 'wf-qa' } }));
    await pending;
    expect(useStudioStore.getState().nodes).toEqual([edited]);
    expect(useStudioStore.getState().savedGraph).not.toEqual(
      JSON.stringify({ nodes: [edited], edges: [] }),
    );
    expect(useStudioStore.getState().saveState).not.toBe('saved');
  });
  it('ignores previous organization hydration and clears undo and clipboard', async () => {
    const loading = deferred<Response>();
    vi.mocked(fetch).mockReturnValueOnce(loading.promise);
    const pending = useStudioStore.getState().loadWorkflowFromServer();
    useStudioStore.setState({
      past: [{ nodes: [start], edges: [] }],
      clipboard: { nodes: [start], edges: [] },
    });
    useStudioStore.getState().setWorkflowContext('session-qa:user-qa:other-tenant');
    loading.resolve(response({ workflow: { id: 'old-tenant-wf', nodes: [start], edges: [] } }));
    expect(await pending).toBe(false);
    expect(useStudioStore.getState()).toMatchObject({
      nodes: [],
      edges: [],
      workflowId: null,
      past: [],
      clipboard: null,
    });
  });
  it('ignores save confirmation after logout', async () => {
    readyGraph();
    const saving = deferred<Response>();
    vi.mocked(fetch).mockReturnValueOnce(saving.promise);
    const pending = useStudioStore.getState().saveWorkflowToServer();
    useStudioStore.getState().setWorkflowContext(null);
    saving.resolve(response({ success: true, workflow: { id: 'old-session-wf' } }));
    expect(await pending).toBe(false);
    expect(useStudioStore.getState()).toMatchObject({
      workflowContext: null,
      nodes: [],
      workflowId: null,
    });
  });
  it('holds autosave while GET is unresolved and recovers only on explicit retry', async () => {
    vi.useFakeTimers();
    const loading = deferred<Response>();
    vi.mocked(fetch).mockReturnValueOnce(loading.promise);
    const hook = renderHook(() => useWorkflowPersistence(context));
    await tick(6000);
    expect(fetch).toHaveBeenCalledTimes(1);
    await act(async () => {
      loading.resolve(response({ error: 'offline' }, 503));
    });
    await tick(6000);
    expect(hook.result.current.loadState).toBe('error');
    expect(fetch).toHaveBeenCalledTimes(1);
    vi.mocked(fetch).mockResolvedValueOnce(response({ workflow: null }));
    act(() => hook.result.current.retryLoad());
    await tick();
    expect(hook.result.current.loadState).toBe('ready');
    expect(fetch).toHaveBeenCalledTimes(2);
  });
  it('saves edge-only edits and allows explicit retry after failure', async () => {
    vi.useFakeTimers();
    const end: StudioNode = { ...start, id: 'end-qa', type: 'end' };
    vi.mocked(fetch).mockResolvedValueOnce(
      response({ workflow: { id: 'wf-qa', nodes: [start, end], edges: [] } }),
    );
    const hook = renderHook(() => useWorkflowPersistence(context));
    await tick();
    vi.mocked(fetch).mockResolvedValueOnce(response({ error: 'offline' }, 503));
    act(() =>
      useStudioStore.getState().setEdges([{ id: 'edge-qa', source: start.id, target: end.id }]),
    );
    await tick(3000);
    expect(hook.result.current.saveState).toBe('error');
    await tick(6000);
    expect(fetch).toHaveBeenCalledTimes(2);
    vi.mocked(fetch).mockResolvedValueOnce(response({ success: true, workflow: { id: 'wf-qa' } }));
    act(() => hook.result.current.retrySave());
    await tick(3000);
    expect(hook.result.current.saveState).toBe('saved');
    expect(fetch).toHaveBeenCalledTimes(3);
  });
  it('serializes autosaves and sends latest edits after an in-flight save', async () => {
    vi.useFakeTimers();
    vi.mocked(fetch).mockResolvedValueOnce(
      response({ workflow: { id: 'wf-qa', nodes: [start], edges: [] } }),
    );
    renderHook(() => useWorkflowPersistence(context));
    await tick();
    const saving = deferred<Response>();
    vi.mocked(fetch).mockReturnValueOnce(saving.promise);
    act(() => useStudioStore.getState().updateNodeMetadata(start.id, { label: 'Edit one' }));
    await tick(3000);
    act(() => useStudioStore.getState().updateNodeMetadata(start.id, { label: 'Edit two' }));
    await tick(6000);
    expect(fetch).toHaveBeenCalledTimes(2);
    vi.mocked(fetch).mockResolvedValueOnce(response({ success: true, workflow: { id: 'wf-qa' } }));
    await act(async () => {
      saving.resolve(response({ success: true, workflow: { id: 'wf-qa' } }));
    });
    await tick(3000);
    expect(fetch).toHaveBeenCalledTimes(3);
    const [, options] = vi.mocked(fetch).mock.calls[2];
    expect(JSON.parse(String(options?.body)).nodes[0].data.label).toBe('Edit two');
    expect(useStudioStore.getState().saveState).toBe('saved');
  });
  it('blocks network without authenticated organization context', async () => {
    vi.useFakeTimers();
    renderHook(() => useWorkflowPersistence(null));
    await tick(6000);
    expect(fetch).not.toHaveBeenCalled();
    expect(await useStudioStore.getState().saveWorkflowToServer()).toBe(false);
  });
  it('blocks publication and simulation with the unavailable shared validator', async () => {
    readyGraph();
    const result = validationEngine.validate([], []);
    expect(result.isValid).toBe(false);
    expect(result.issues.some((issue) => issue.type === 'error')).toBe(true);
    useStudioStore.getState().startSimulation();
    expect(useStudioStore.getState().isDebugging).toBe(false);
    expect(useStudioStore.getState().simulationLogs.some((log) => log.type === 'success')).toBe(
      false,
    );
    expect(useStudioStore.getState().simulationLogs.some((log) => log.type === 'error')).toBe(true);
    await useStudioStore.getState().publishWorkflowToServer();
    expect(useStudioStore.getState().publishState).toBe('error');
    expect(fetch).not.toHaveBeenCalled();
  });
});
