// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { TestSimulatorModal } from '@/features/voice-hub/components/studio/panels/TestSimulatorModal.js';

let recognition: Recognition;
class Recognition {
  onstart?: () => void;
  onresult?: (event: unknown) => void;
  onerror?: () => void;
  onend?: () => void;
  start = vi.fn(() => this.onstart?.());
  stop = vi.fn();
  constructor() {
    recognition = this;
  }
}
const stopTrack = vi.fn();
const closeAudio = vi.fn().mockResolvedValue(undefined);
const cancelSpeech = vi.fn();
const getUserMedia = vi.fn();
class AudioContextStub {
  state = 'running';
  close = closeAudio;
  createAnalyser() {
    return { fftSize: 256, frequencyBinCount: 128, getByteTimeDomainData: vi.fn() };
  }
  createMediaStreamSource() {
    return { connect: vi.fn() };
  }
}

function microphone() {
  return screen.getByRole('button', { name: /microfone|falar|ouvir/i });
}

describe('Voice Studio explicitly demonstrative simulator', () => {
  beforeEach(() => {
    vi.stubGlobal('SpeechRecognition', Recognition);
    vi.stubGlobal('AudioContext', AudioContextStub);
    vi.stubGlobal('speechSynthesis', { cancel: cancelSpeech, speak: vi.fn() });
    vi.stubGlobal('fetch', vi.fn());
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: { getUserMedia },
    });
    getUserMedia.mockResolvedValue({ getTracks: () => [{ stop: stopTrack }] });
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
  });
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    vi.clearAllMocks();
    delete (navigator as unknown as { mediaDevices?: unknown }).mediaDevices;
  });
  it('mounts without a reference error and discloses mock answers', () => {
    render(<TestSimulatorModal onClose={vi.fn()} />);
    expect(screen.getByText(/Modo Demo \(mock\)/)).toBeTruthy();
    expect(screen.getByText(/não com o LLM\/prompt configurado no Canvas/)).toBeTruthy();
    expect(fetch).not.toHaveBeenCalled();
  });
  it('stops recognition, microphone tracks, audio context and speech on unmount', async () => {
    const view = render(<TestSimulatorModal onClose={vi.fn()} />);
    await act(async () => {
      fireEvent.click(microphone());
    });
    expect(getUserMedia).toHaveBeenCalledWith({ audio: true });
    expect(recognition.start).toHaveBeenCalledTimes(1);
    view.unmount();
    expect(recognition.stop).toHaveBeenCalled();
    expect(stopTrack).toHaveBeenCalled();
    expect(closeAudio).toHaveBeenCalled();
    expect(cancelSpeech).toHaveBeenCalled();
  });
  it('releases late microphone permission results after unmount', async () => {
    let resolve!: (stream: unknown) => void;
    getUserMedia.mockReturnValueOnce(
      new Promise((done) => {
        resolve = done;
      }),
    );
    const view = render(<TestSimulatorModal onClose={vi.fn()} />);
    fireEvent.click(microphone());
    view.unmount();
    await act(async () => {
      resolve({ getTracks: () => [{ stop: stopTrack }] });
    });
    expect(stopTrack).toHaveBeenCalledTimes(1);
  });
  it('shows communication errors without pretending the graph ran successfully', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({ ok: false, status: 503 } as Response);
    render(<TestSimulatorModal onClose={vi.fn()} />);
    await act(async () => {
      fireEvent.click(microphone());
    });
    await act(async () => {
      recognition.onresult?.({ results: [[{ transcript: 'QA demonstration only' }]] });
    });
    expect(await screen.findByText('Erro de comunicação.')).toBeTruthy();
    expect(screen.getByText(/Modo Demo \(mock\)/)).toBeTruthy();
  });
});
