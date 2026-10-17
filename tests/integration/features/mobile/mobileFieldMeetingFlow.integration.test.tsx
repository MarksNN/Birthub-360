import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { FieldMeetingRecorder } from '../../../../src/features/mobile/components/FieldMeetingRecorder.js';
import { audioRecordingService } from '../../../../src/features/mobile/audioRecording.service.js';
import { offlineSyncService } from '../../../../src/features/mobile/offlineSync.service.js';

describe('Fluxo Integrado de Gravação de Reunião de Campo (Capacidade 6 - Mobile)', () => {
  let mockMediaRecorderInstance: any;

  beforeEach(() => {
    mockMediaRecorderInstance = {
      state: 'inactive',
      mimeType: 'audio/webm',
      start: vi.fn().mockImplementation(function (this: any) {
        this.state = 'recording';
      }),
      pause: vi.fn().mockImplementation(function (this: any) {
        this.state = 'paused';
      }),
      resume: vi.fn().mockImplementation(function (this: any) {
        this.state = 'recording';
      }),
      stop: vi.fn().mockImplementation(function (this: any) {
        this.state = 'inactive';
        if (this.onstop) this.onstop();
      }),
      ondataavailable: null,
      onstop: null,
    };

    const MockMediaRecorderConstructor = vi.fn().mockImplementation(function (this: any) {
      return mockMediaRecorderInstance;
    });
    (MockMediaRecorderConstructor as any).isTypeSupported = vi.fn().mockReturnValue(true);
    vi.stubGlobal('MediaRecorder', MockMediaRecorderConstructor);

    if (!global.navigator) {
      vi.stubGlobal('navigator', {} as any);
    }
    (navigator as any).mediaDevices = {
      getUserMedia: vi.fn().mockResolvedValue({
        getTracks: vi.fn().mockReturnValue([{ stop: vi.fn() }]),
      }),
    };

    // URL.createObjectURL mock para o player de áudio
    if (typeof window !== 'undefined') {
      window.URL.createObjectURL = vi.fn().mockReturnValue('blob:http://localhost/mock-audio');
    }
  });

  afterEach(async () => {
    audioRecordingService.cancelRecording();
    await offlineSyncService.clearQueue();
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  it('renderiza o cockpit mobile com status de conectividade online e timer zerado', () => {
    render(<FieldMeetingRecorder initialTitle="Visita Inicial" />);

    expect(screen.getByText('Reunião Presencial de Campo')).toBeDefined();
    expect(screen.getByText('Online')).toBeDefined();
    expect(screen.getByText('00:00')).toBeDefined();
    expect(screen.getByLabelText(/Consentimento Verbal LGPD/i)).toBeDefined();
  });

  it('bloqueia início da gravação e exibe aviso quando consentimento LGPD não foi marcado', async () => {
    render(<FieldMeetingRecorder />);

    const recordButton = screen.getByTitle('Iniciar Gravação');
    fireEvent.click(recordButton);

    await waitFor(() => {
      expect(
        screen.getByText(/O consentimento verbal do titular é obrigatório pela LGPD/i),
      ).toBeDefined();
    });
    expect(mockMediaRecorderInstance.start).not.toHaveBeenCalled();
  });

  it('inicia gravação, pausa, retoma e finaliza após concessão de consentimento LGPD', async () => {
    render(<FieldMeetingRecorder initialTitle="Visita Comercial Clasp" />);

    const consentCheckbox = screen.getByLabelText(/Consentimento Verbal LGPD/i);
    fireEvent.click(consentCheckbox);

    const recordButton = screen.getByTitle('Iniciar Gravação');
    fireEvent.click(recordButton);

    await waitFor(() => {
      expect(screen.getByText(/Gravando Áudio em Campo/i)).toBeDefined();
    });
    expect(mockMediaRecorderInstance.start).toHaveBeenCalled();

    // Pausa a gravação
    const pauseButton = screen.getByTitle('Pausar');
    fireEvent.click(pauseButton);
    await waitFor(() => {
      expect(screen.getByText(/Gravação Pausada/i)).toBeDefined();
    });

    // Retoma a gravação
    const resumeButton = screen.getByTitle('Retomar');
    fireEvent.click(resumeButton);
    await waitFor(() => {
      expect(screen.getByText(/Gravando Áudio em Campo/i)).toBeDefined();
    });

    // Para a gravação
    vi.spyOn(audioRecordingService, 'blobToBase64').mockResolvedValue('YXVkaW8tY29udGVudA==');
    const stopButton = screen.getByTitle('Parar e Finalizar');
    fireEvent.click(stopButton);

    await waitFor(() => {
      expect(screen.getByText(/Gravação Pronta/i)).toBeDefined();
      expect(screen.getByText(/Salvar e Sincronizar Reunião/i)).toBeDefined();
    });
  });

  it('salva reunião e enfileira no OfflineSyncService com confirmação visual', async () => {
    const onSuccessMock = vi.fn();
    render(
      <FieldMeetingRecorder
        initialTitle="Reunião Presencial Hospital Santa Cruz"
        initialLeadId="lead_test_888"
        onSuccess={onSuccessMock}
      />,
    );

    // 1. Marca consentimento
    fireEvent.click(screen.getByLabelText(/Consentimento Verbal LGPD/i));

    // 2. Inicia gravação
    fireEvent.click(screen.getByTitle('Iniciar Gravação'));
    await waitFor(() => {
      expect(screen.getByText(/Gravando Áudio em Campo/i)).toBeDefined();
    });

    // 3. Finaliza gravação
    vi.spyOn(audioRecordingService, 'blobToBase64').mockResolvedValue('YXVkaW8tY29udGVudA==');
    fireEvent.click(screen.getByTitle('Parar e Finalizar'));

    await waitFor(() => {
      expect(screen.getByText(/Salvar e Sincronizar Reunião/i)).toBeDefined();
    });

    // 4. Preenche anotações de campo
    const notesInput = screen.getByLabelText(/Anotações & Destaques de Campo/i);
    fireEvent.change(notesInput, {
      target: { value: 'Diretor de TI solicitou demonstração executiva na próxima terça-feira.' },
    });

    // 5. Salva e sincroniza
    const saveButton = screen.getByText(/Salvar e Sincronizar Reunião/i);
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(
        screen.getByText(/Reunião enviada e em processamento no Copiloto IA!|Reunião gravada e enfileirada no dispositivo!/i),
      ).toBeDefined();
    });

    expect(onSuccessMock).toHaveBeenCalledWith(
      expect.objectContaining({
        syncStatus: expect.stringMatching(/synced_or_syncing|queued_offline/),
      }),
    );
  });
});
