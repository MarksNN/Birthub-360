import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { createElement } from 'react';
import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, it, vi } from 'vitest';

const { getMock, postMock } = vi.hoisted(() => ({ getMock: vi.fn(), postMock: vi.fn() }));
vi.mock('@/lib/api', () => ({ api: { get: getMock, post: postMock } }));

import { SearchExecutionPanel } from '../SearchExecutionPanel.js';
import { TurboProvidersPanel } from '../TurboProvidersPanel.js';

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('Turbo providers and execution history — identified mocked API responses', () => {
  it('does not call providers on render and preserves not-validated state after a requested health test', async () => {
    postMock.mockResolvedValue([
      {
        id: 'googlePlaces',
        configured: true,
        status: 'not_validated',
        message: 'Consulta paga não executada.',
      },
    ]);
    render(createElement(TurboProvidersPanel));
    expect(postMock).not.toHaveBeenCalled();
    fireEvent.click(screen.getByText('Central de provedores'));
    fireEvent.click(screen.getByRole('button', { name: 'Testar conexões autorizadas' }));
    expect(await screen.findByText('googlePlaces: not_validated')).toBeInTheDocument();
    expect(screen.getByText('Consulta paga não executada.')).toBeInTheDocument();
    expect(postMock).toHaveBeenCalledWith('/api/prospecting/providers/test', {});
  });

  it('exposes permission or service errors instead of inventing healthy providers', async () => {
    getMock.mockRejectedValue(new Error('Permissão insuficiente'));
    render(createElement(TurboProvidersPanel));
    fireEvent.click(screen.getByText('Central de provedores'));
    fireEvent.click(screen.getByRole('button', { name: 'Consultar estados' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Permissão insuficiente');
  });

  it('fetches the tenant-scoped persisted execution on request and shows recorded provider/cost data', async () => {
    getMock.mockResolvedValue({
      id: 'mock-execution',
      status: 'partial',
      startedAt: '2026-10-09T12:00:00Z',
      totalResults: 0,
      costUsd: 0.02,
      providersCalled: [{ provider: 'apollo', status: 'error', resultCount: 0, costUsd: 0 }],
    });
    render(createElement(SearchExecutionPanel, { searchId: 'mock-execution' }));
    fireEvent.click(
      screen.getByRole('button', { name: 'Consultar histórico e custo desta execução' }),
    );
    expect(await screen.findByText(/Status registrado: partial/)).toBeInTheDocument();
    expect(screen.getByText(/apollo: error/)).toBeInTheDocument();
    expect(getMock).toHaveBeenCalledWith('/api/prospecting/searches/mock-execution');
  });
});
