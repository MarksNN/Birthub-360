import { useCallback, useEffect, useRef } from 'react';
import { useStudioStore, workflowGraphSnapshot } from './useStudioStore.js';

/** A scope is a real session/user/organization identity, never a tenant supplied to the API. */
export function useWorkflowPersistence(contextKey: string | null) {
  const controllerRef = useRef<AbortController | null>(null);
  const {
    nodes,
    edges,
    workflowContext,
    loadState,
    saveState,
    savedGraph,
    setWorkflowContext,
    loadWorkflowFromServer,
    saveWorkflowToServer,
  } = useStudioStore();

  const startLoad = useCallback(() => {
    controllerRef.current?.abort();
    setWorkflowContext(contextKey);
    const controller = new AbortController();
    controllerRef.current = controller;
    if (contextKey) void loadWorkflowFromServer(controller.signal);
  }, [contextKey, setWorkflowContext, loadWorkflowFromServer]);

  useEffect(() => {
    startLoad();
    return () => {
      controllerRef.current?.abort();
      setWorkflowContext(null);
    };
  }, [startLoad, setWorkflowContext]);

  const isReady = contextKey !== null && workflowContext === contextKey && loadState === 'ready';
  useEffect(() => {
    if (!isReady || saveState === 'saving' || saveState === 'error') return;
    if (workflowGraphSnapshot(nodes, edges) === savedGraph) return;
    const timer = setTimeout(() => void saveWorkflowToServer(controllerRef.current?.signal), 3000);
    return () => clearTimeout(timer);
  }, [nodes, edges, isReady, savedGraph, saveState, saveWorkflowToServer]);

  return {
    loadState: isReady
      ? ('ready' as const)
      : workflowContext === contextKey
        ? loadState
        : ('loading' as const),
    saveState,
    retryLoad: startLoad,
    retrySave: () => useStudioStore.setState({ saveState: 'idle' }),
  };
}
