// @vitest-environment jsdom

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '../../../../lib/api.js';
import { AIPendingActionsInbox } from '../AIPendingActionsInbox.js';

vi.mock('../../../../lib/api.js', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock('../../../../lib/clientLogger.js', () => ({
  clientLogger: {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  },
}));

const mockPendingActions = [
  {
    id: 'act-1',
    entity: 'Hospital São Lucas',
    action: 'send_email',
    payload: {
      to: 'diretoria@saolucas.com.br',
      subject: 'Otimização do ciclo obstétrico',
      body: 'Olá, gostaria de apresentar nossa solução para maternidades...',
    },
    riskLevel: 'low',
    confidence: 0.94,
    createdAt: '2026-10-28T10:00:00Z',
  },
  {
    id: 'act-2',
    entity: 'Clínica Bem Viver',
    action: 'send_whatsapp_reply',
    payload: {
      to: '+5511999998888',
      body: 'Perfeito! Posso agendar a demonstração na quinta às 15h?',
      triggerDetail: 'Lead solicitou disponibilidade de agenda',
    },
    riskLevel: 'high',
    confidence: 0.88,
    createdAt: '2026-10-28T11:00:00Z',
  },
];

const mockAwaitingOutcome = [
  {
    id: 'act-out-1',
    entity: 'Maternidade Esperança',
    action: 'send_email',
    payload: {
      to: 'gestao@esperanca.med.br',
      subject: 'Follow-up de proposta',
    },
    executedAt: '2026-10-27T14:00:00Z',
  },
];

describe('AIPendingActionsInbox', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (api.get as any).mockImplementation((url: string) => {
      if (url === '/api/intelligence/pending') {
        return Promise.resolve(mockPendingActions);
      }
      if (url === '/api/intelligence/pending/awaiting-outcome') {
        return Promise.resolve({ actions: mockAwaitingOutcome });
      }
      return Promise.resolve([]);
    });
    (api.post as any).mockResolvedValue({ execution: { sent: true } });
    (api.delete as any).mockResolvedValue({ success: true });
  });

  it('renders pending actions list and metrics correctly', async () => {
    render(<AIPendingActionsInbox />);

    expect(screen.getByText('Inbox de Ações da IA')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Hospital São Lucas')).toBeInTheDocument();
      expect(screen.getByText('Clínica Bem Viver')).toBeInTheDocument();
    });

    expect(screen.getByText('94% confiança')).toBeInTheDocument();
    expect(screen.getByText('Alto risco')).toBeInTheDocument();
  });

  it('filters actions by search query', async () => {
    render(<AIPendingActionsInbox />);

    await waitFor(() => {
      expect(screen.getByText('Hospital São Lucas')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText('Filtrar por lead, destinatário ou assunto...');
    fireEvent.change(searchInput, { target: { value: 'Bem Viver' } });

    expect(screen.queryByText('Hospital São Lucas')).not.toBeInTheDocument();
    expect(screen.getByText('Clínica Bem Viver')).toBeInTheDocument();
  });

  it('filters actions by channel', async () => {
    render(<AIPendingActionsInbox />);

    await waitFor(() => {
      expect(screen.getByText('Hospital São Lucas')).toBeInTheDocument();
    });

    const channelSelect = screen.getByLabelText('Filtrar por canal ou tipo de ação');
    fireEvent.change(channelSelect, { target: { value: 'send_whatsapp_reply' } });

    expect(screen.queryByText('Hospital São Lucas')).not.toBeInTheDocument();
    expect(screen.getByText('Clínica Bem Viver')).toBeInTheDocument();
  });

  it('approves an action in 1 click and updates a11y announcement', async () => {
    render(<AIPendingActionsInbox />);

    await waitFor(() => {
      expect(screen.getByText('Hospital São Lucas')).toBeInTheDocument();
    });

    const approveButton = screen.getByRole('button', {
      name: 'Aprovar e executar ação para Hospital São Lucas',
    });
    fireEvent.click(approveButton);

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/api/intelligence/pending/act-1/approve');
    });

    await waitFor(() => {
      expect(screen.queryByText('Hospital São Lucas')).not.toBeInTheDocument();
    });

    expect(screen.getByTestId('a11y-announcement')).toHaveTextContent(
      'Ação para "Hospital São Lucas" aprovada e executada com sucesso.',
    );
  });

  it('discards an action with a11y announcement', async () => {
    render(<AIPendingActionsInbox />);

    await waitFor(() => {
      expect(screen.getByText('Clínica Bem Viver')).toBeInTheDocument();
    });

    const discardButton = screen.getByRole('button', {
      name: 'Descartar ação para Clínica Bem Viver',
    });
    fireEvent.click(discardButton);

    await waitFor(() => {
      expect(api.delete).toHaveBeenCalledWith('/api/intelligence/pending/act-2');
    });

    await waitFor(() => {
      expect(screen.queryByText('Clínica Bem Viver')).not.toBeInTheDocument();
    });

    expect(screen.getByTestId('a11y-announcement')).toHaveTextContent(
      'Ação para "Clínica Bem Viver" descartada.',
    );
  });

  it('switches to outcome tab and registers feedback', async () => {
    render(<AIPendingActionsInbox />);

    await waitFor(() => {
      expect(screen.getByText('Aguardando Desfecho')).toBeInTheDocument();
    });

    const outcomeTabButton = screen.getByRole('button', { name: /Aguardando Desfecho/i });
    fireEvent.click(outcomeTabButton);

    await waitFor(() => {
      expect(
        screen.getByText('Ciclo de Aprendizagem · Feedback de Desfecho Real'),
      ).toBeInTheDocument();
      expect(screen.getByText('Entidade: Maternidade Esperança')).toBeInTheDocument();
    });

    const positiveButton = screen.getByRole('button', {
      name: 'Registrar desfecho positivo para Maternidade Esperança',
    });
    fireEvent.click(positiveButton);

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/api/intelligence/pending/act-out-1/outcome', {
        status: 'POSITIVE',
        notes: undefined,
      });
    });

    await waitFor(() => {
      expect(screen.queryByText('Entidade: Maternidade Esperança')).not.toBeInTheDocument();
    });
  });

  it('displays empty state when there are no pending actions', async () => {
    (api.get as any).mockImplementation((url: string) => {
      if (url === '/api/intelligence/pending') return Promise.resolve([]);
      if (url === '/api/intelligence/pending/awaiting-outcome')
        return Promise.resolve({ actions: [] });
      return Promise.resolve([]);
    });

    render(<AIPendingActionsInbox />);

    await waitFor(() => {
      expect(screen.getByTestId('empty-state')).toBeInTheDocument();
      expect(screen.getByText('Nenhuma ação pendente de aprovação')).toBeInTheDocument();
    });
  });
});
