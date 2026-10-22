/**
 * Detecção de Voz Ativa (VAD) e Barge-in (Passo 58 / Agente 12)
 * Permite interrupção subsegundo do SDR autônomo ao detectar fala do interlocutor.
 */

export class VadBargeInService {
  private isInterrupted = false;

  public processAudioFrame(energyLevel: number, threshold = 0.65): boolean {
    if (energyLevel > threshold) {
      this.isInterrupted = true;
      return true; // Barge-in acionado
    }
    return false;
  }

  public reset(): void {
    this.isInterrupted = false;
  }

  public hasBargeInOccurred(): boolean {
    return this.isInterrupted;
  }
}

export const vadBargeIn = new VadBargeInService();
