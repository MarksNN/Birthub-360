import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  AudioRecordingService,
  type AudioRecordingResult,
} from '../../../../src/features/mobile/audioRecording.service.js';
import { offlineSyncService } from '../../../../src/features/mobile/offlineSync.service.js';

describe('AudioRecordingService (Gravação Nativa / Web Mobile)', () => {
  let service: AudioRecordingService;
  let mockMediaRecorderInstance: any;
  let mockStream: any;

  beforeEach(() => {
    service = new AudioRecordingService();

    mockStream = {
      getTracks: vi.fn().mockReturnValue([
        { stop: vi.fn() },
      ]),
    };

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

    // Mock global de MediaRecorder como função construtora
    const MockMediaRecorderConstructor = vi.fn().mockImplementation(function (this: any) {
      return mockMediaRecorderInstance;
    });
    (MockMediaRecorderConstructor as any).isTypeSupported = vi.fn().mockReturnValue(true);
    vi.stubGlobal('MediaRecorder', MockMediaRecorderConstructor);

    if (!global.navigator) {
      vi.stubGlobal('navigator', {} as any);
    }
    (navigator as any).mediaDevices = {
      getUserMedia: vi.fn().mockResolvedValue(mockStream),
    };
  });

  afterEach(() => {
    service.cancelRecording();
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  it('detecta suporte a gravação quando MediaRecorder e getUserMedia estão disponíveis', () => {
    expect(service.isSupported()).toBe(true);
  });

  it('inicia gravação e transiciona estado para "recording"', async () => {
    const states: string[] = [];
    service.onStateChange((s) => states.push(s));

    await service.startRecording();

    expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledWith({
      audio: expect.objectContaining({ echoCancellation: true }),
    });
    expect(mockMediaRecorderInstance.start).toHaveBeenCalled();
    expect(service.getState()).toBe('recording');
    expect(states).toContain('recording');
  });

  it('pausa e retoma a gravação de áudio', async () => {
    await service.startRecording();
    expect(service.getState()).toBe('recording');

    service.pauseRecording();
    expect(mockMediaRecorderInstance.pause).toHaveBeenCalled();
    expect(service.getState()).toBe('paused');

    service.resumeRecording();
    expect(mockMediaRecorderInstance.resume).toHaveBeenCalled();
    expect(service.getState()).toBe('recording');
  });

  it('finaliza gravação e retorna resultado estruturado', async () => {
    await service.startRecording();

    // Simula emissão de dados de áudio
    if (mockMediaRecorderInstance.ondataavailable) {
      mockMediaRecorderInstance.ondataavailable({
        data: new Blob(['audio-content-chunk'], { type: 'audio/webm' }),
      });
    }

    // Mock do blobToBase64
    vi.spyOn(service, 'blobToBase64').mockResolvedValue('YXVkaW8tY29udGVudA==');

    const resultPromise = service.stopRecording();
    const result = await resultPromise;

    expect(result.base64).toBe('YXVkaW8tY29udGVudA==');
    expect(result.mimeType).toBe('audio/webm');
    expect(service.getState()).toBe('stopped');
  });

  it('rejeita recordFieldMeetingAndEnqueue se consentimento LGPD não foi concedido', async () => {
    const mockResult: AudioRecordingResult = {
      blob: new Blob([]),
      base64: 'YXVkaW8=',
      mimeType: 'audio/webm',
      sizeBytes: 100,
      durationMs: 5000,
    };

    await expect(
      service.recordFieldMeetingAndEnqueue(
        {
          title: 'Reunião sem consentimento',
          consentGranted: false,
        },
        mockResult,
      ),
    ).rejects.toThrow(/consentimento prévio/i);
  });

  it('enfileira com sucesso quando consentimento LGPD é fornecido', async () => {
    const enqueueSpy = vi.spyOn(offlineSyncService, 'enqueueFieldMeetingAudio').mockResolvedValue({
      id: 'op_123',
      type: 'FIELD_MEETING_AUDIO',
      endpoint: '/api/mobile/field-meetings/sync',
      method: 'POST',
      payload: {} as any,
      timestamp: Date.now(),
      status: 'pending',
      retryCount: 0,
      maxRetries: 3,
    });

    const mockResult: AudioRecordingResult = {
      blob: new Blob([]),
      base64: 'YXVkaW9fcmVhbA==',
      mimeType: 'audio/webm',
      sizeBytes: 45000,
      durationMs: 30000,
    };

    const item = await service.recordFieldMeetingAndEnqueue(
      {
        title: 'Visita Comercial Alpha',
        leadId: 'lead_abc',
        meetingNotes: 'Anotações da reunião',
        consentGranted: true,
      },
      mockResult,
    );

    expect(enqueueSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Visita Comercial Alpha',
        leadId: 'lead_abc',
        audioData: 'YXVkaW9fcmVhbA==',
        consentGranted: true,
        consentMethod: 'FIELD_VERBAL_CONSENT',
        meetingNotes: 'Anotações da reunião',
      }),
    );
    expect(item.id).toBe('op_123');
  });
});
