import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../../../src/lib/soundEffects.js', () => ({
  SoundFX: { play: vi.fn() },
}));
vi.mock('../../../../../src/lib/api.js', () => ({
  api: { post: vi.fn() },
}));

import { api } from '../../../../../src/lib/api.js';
import { EcosystemInboundEventSimulator } from '../../../../../src/features/intelligence/components/EcosystemInboundEventSimulator.js';

describe('EcosystemInboundEventSimulator', () => {
  beforeEach(() => {
    vi.mocked(api.post).mockReset();
  });

  it('não dispara com assunto vazio e mostra a cadeia quando o barramento responde', async () => {
    vi.mocked(api.post).mockResolvedValue({
      data: {
        sourcePlatform: 'gmail',
        eventType: 'meeting_completed',
        durationMs: 12,
        actionsTriggered: [
          { stepNumber: 1, toolName: 'meetings', title: 'Síntese', success: true },
          { stepNumber: 2, toolName: 'notifications', title: 'Alerta', success: false },
        ],
      },
    });

    render(<EcosystemInboundEventSimulator />);
    fireEvent.change(screen.getByLabelText('Assunto ou Título do Evento'), {
      target: { value: '   ' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Disparar Evento no Barramento/ }));
    expect(api.post).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText('Plataforma de Origem'), { target: { value: 'gmail' } });
    fireEvent.change(screen.getByLabelText('Tipo de Evento Reativo'), {
      target: { value: 'meeting_completed' },
    });
    fireEvent.change(screen.getByLabelText('Remetente / Decisor'), {
      target: { value: 'cfo@industria.com' },
    });
    fireEvent.change(screen.getByLabelText('Assunto ou Título do Evento'), {
      target: { value: 'Call de ROI' },
    });
    fireEvent.change(screen.getByLabelText('Conteúdo Bruto / Corpo da Mensagem / Pauta da Reunião'), {
      target: { value: 'Queremos avançar amanhã.' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Disparar Evento no Barramento/ }));

    expect(await screen.findByText('Síntese')).toBeTruthy();
    expect(screen.getByText('Alerta')).toBeTruthy();
    expect(api.post).toHaveBeenCalledWith(
      '/api/agent/ecosystem/events/ingest',
      expect.objectContaining({
        sourcePlatform: 'gmail',
        eventType: 'meeting_completed',
        subjectOrTitle: 'Call de ROI',
      }),
    );
  });

  it('mostra a mensagem de erro quando o barramento falha', async () => {
    vi.mocked(api.post).mockRejectedValueOnce(new Error('barramento indisponível'));
    render(<EcosystemInboundEventSimulator />);
    fireEvent.click(screen.getByRole('button', { name: /Disparar Evento no Barramento/ }));
    expect(await screen.findByText('barramento indisponível')).toBeTruthy();

    vi.mocked(api.post).mockRejectedValueOnce('falha bruta');
    fireEvent.click(screen.getByRole('button', { name: /Disparar Evento no Barramento/ }));
    await waitFor(() => {
      expect(screen.getByText('Falha ao processar evento inbound.')).toBeTruthy();
    });
  });
});
