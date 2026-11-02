import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useCrmBoardController } from '../../../src/hooks/useCrmBoardController.js';
import { api } from '../../../src/lib/api.js';
import { toast } from '../../../src/lib/toast.js';

vi.mock('../../../src/lib/api.js', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

vi.mock('../../../src/lib/toast.js', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

vi.mock('../../../src/lib/clientLogger.js', () => ({
  clientLogger: {
    error: vi.fn(),
  },
}));

describe('useCrmBoardController — textos novos do pipeline', () => {
  it('cobre os dois ramos do erro de carga, a conversão e o import já existente', async () => {
    vi.mocked(api.get).mockRejectedValueOnce(new Error('pipeline fora'));
    const { result } = renderHook(() => useCrmBoardController('Negocio'));

    await waitFor(() => {
      expect(result.current.error).toBe('pipeline fora');
    });

    vi.mocked(api.get).mockRejectedValueOnce({ message: 'sem stack' });
    await act(async () => {
      await result.current.fetchLeads();
    });
    expect(result.current.error).toBe('Não foi possível carregar o pipeline comercial.');

    vi.mocked(api.get).mockResolvedValue({ data: [] });
    vi.mocked(api.post).mockResolvedValueOnce({});
    await act(async () => {
      await result.current.handleConvert('lead-1');
    });
    expect(toast.success).toHaveBeenCalledWith(
      'Lead convertido em negócio e enviado ao pipeline comercial.',
    );

    vi.mocked(api.post).mockResolvedValueOnce({ data: { imported: 0, skipped: 4 } });
    await act(async () => {
      await result.current.handleImportBitrix();
    });
    expect(toast.info).toHaveBeenCalledWith('4 leads recentes já estavam no sistema.');
  });
});
