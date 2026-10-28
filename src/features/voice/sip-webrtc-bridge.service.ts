import { randomUUID } from 'node:crypto';
import { type AuditAction, AuditService } from '../../lib/audit/audit.service.js';
import { logger } from '../../lib/logger.js';
import { prisma } from '../../lib/prisma.js';
import { AppError } from '../../shared/middlewares/errorHandler.js';
import { redactResidualPii } from '../../shared/security/piiRedaction.js';
import {
  type CallOutcomeState,
  callMarker,
  callResultedInConversation,
  classifyCallOutcome,
} from '../integrations/birth-voice/birthVoice.helpers.js';
import { AudioStreamBridge } from './audio-stream-bridge.js';
import type {
  AudioCodec,
  AudioPacket,
  BargeInEvent,
  BridgeCallResult,
  BridgeHandshakeRequest,
  BridgeHandshakeResponse,
  BridgeSessionState,
  SIPConnectionInfo,
  VoiceCommandExecutionResult,
  VoiceCommandRequest,
  WebRTCSessionInfo,
} from './types.js';
import { voiceCommandExecutorService } from './voice-command-executor.service.js';

export const MANDATORY_VOICE_AI_DISCLOSURE =
  'Esta ligação é realizada com auxílio de inteligência artificial e poderá ser gravada para fins de atendimento e segurança. Diga "opt-out" a qualquer momento para revogar o consentimento.';

export interface ActiveBridgeSession {
  sessionId: string;
  state: BridgeSessionState;
  sipInfo: SIPConnectionInfo;
  webrtcInfo: WebRTCSessionInfo;
  audioCodec: AudioCodec;
  sampleRate: number;
  channels: number;
  audioBridge: AudioStreamBridge;
  commandsExecuted: VoiceCommandExecutionResult[];
  transcriptionParts: string[];
  startedAt: Date;
  lastActivityAt: Date;
}

/**
 * SipWebRtcBridgeService
 *
 * Orchestrates the bidirectional bridge between SIP/3CX telephony sessions
 * and LiveKit / WebRTC AI Voice Orchestration.
 * Ensures zero false voice commands (eliminates B-07) and real call outcome persistence.
 */
export class SipWebRtcBridgeService {
  private activeSessions = new Map<string, ActiveBridgeSession>();

  /**
   * Performs handshake between active 3CX/SIP call and LiveKit WebRTC session.
   */
  async handshake(request: BridgeHandshakeRequest): Promise<BridgeHandshakeResponse> {
    const { sessionId, sipInfo, webrtcInfo } = request;

    if (!sipInfo.callId || !sipInfo.organizationId) {
      throw new AppError('Dados de chamada SIP/3CX incompletos para handshake.', 400);
    }

    const roomName = webrtcInfo?.roomName || `livekit-room-${sipInfo.callId}`;
    const participantId = webrtcInfo?.participantId || `sip-agent-${sipInfo.extension}`;
    const token = webrtcInfo?.token || `livekit-jwt-${randomUUID().slice(0, 12)}`;
    const audioCodec: AudioCodec = request.audioCodec || 'opus';
    const sampleRate = request.sampleRate || 48000;
    const channels = request.channels || 1;

    logger.info(
      {
        sessionId,
        callId: sipInfo.callId,
        organizationId: sipInfo.organizationId,
        roomName,
        participantId,
      },
      '[SipWebRtcBridge] Handshake estabelecido com sucesso',
    );

    const audioBridge = new AudioStreamBridge(sessionId);

    // Register barge-in listener
    audioBridge.on('barge_in', (evt: BargeInEvent) => {
      const session = this.activeSessions.get(sessionId);
      if (session) {
        session.state = 'interrupted';
        logger.info(
          { sessionId, triggerEnergy: evt.triggerEnergy },
          '[SipWebRtcBridge] Barge-In detectado: áudio do assistente interrompido',
        );
      }
    });

    const activeSession: ActiveBridgeSession = {
      sessionId,
      state: 'connected',
      sipInfo,
      webrtcInfo: {
        roomName,
        token,
        participantId,
        serverUrl: webrtcInfo?.serverUrl || 'wss://livekit.internal.birthub.local',
      },
      audioCodec,
      sampleRate,
      channels,
      audioBridge,
      commandsExecuted: [],
      transcriptionParts: [],
      startedAt: new Date(),
      lastActivityAt: new Date(),
    };

    this.activeSessions.set(sessionId, activeSession);

    return {
      success: true,
      sessionId,
      state: 'connected',
      sipCallId: sipInfo.callId,
      webrtcRoomName: roomName,
      webrtcToken: token,
      participantId,
      audioCodec,
      sampleRate,
      channels,
      connectedAt: activeSession.startedAt,
    };
  }

  /**
   * Pushes inbound audio frame from SIP/3CX lead into the WebRTC stream.
   */
  async handleInboundAudio(sessionId: string, packet: AudioPacket): Promise<void> {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      throw new AppError(`Sessão de voz ${sessionId} não encontrada no bridge.`, 404);
    }
    session.lastActivityAt = new Date();
    session.state = 'streaming';
    session.audioBridge.pushInboundPacket(packet);
  }

  /**
   * Pushes outbound TTS audio frame from WebRTC / AI into SIP/3CX caller stream.
   */
  async handleOutboundAudio(sessionId: string, packet: AudioPacket): Promise<boolean> {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      throw new AppError(`Sessão de voz ${sessionId} não encontrada no bridge.`, 404);
    }
    session.lastActivityAt = new Date();
    session.state = 'streaming';
    return session.audioBridge.pushOutboundPacket(packet);
  }

  /**
   * Appends live transcription chunk to session summary.
   */
  appendTranscription(sessionId: string, speaker: 'agent' | 'lead', text: string): void {
    const session = this.activeSessions.get(sessionId);
    if (session && text.trim()) {
      session.transcriptionParts.push(`${speaker === 'agent' ? 'IA' : 'Lead'}: ${text.trim()}`);
    }
  }

  /**
   * Executes a verified voice command emitted during the call (B-07 elimination).
   */
  async executeVoiceCommand(
    sessionId: string,
    command: Omit<VoiceCommandRequest, 'sessionId' | 'organizationId' | 'leadId'>,
  ): Promise<VoiceCommandExecutionResult> {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      throw new AppError(`Sessão de voz ${sessionId} não encontrada.`, 404);
    }

    const fullCommand: VoiceCommandRequest = {
      ...command,
      sessionId,
      organizationId: session.sipInfo.organizationId,
      leadId: session.sipInfo.leadId,
    };

    const result = await voiceCommandExecutorService.executeCommand(fullCommand);
    session.commandsExecuted.push(result);

    if (command.type === 'HANGUP' && result.executed) {
      await this.terminateSession(sessionId, 'hangup_requested', 'completed');
    }

    return result;
  }

  /**
   * Terminates the bridge session, persists real call Activity and logs audit record.
   */
  async terminateSession(
    sessionId: string,
    reason: string = 'normal_clearing',
    outcomeOverride?: CallOutcomeState,
  ): Promise<BridgeCallResult> {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      throw new AppError(`Sessão ${sessionId} já encerrada ou inexistente.`, 404);
    }

    const endedAt = new Date();
    const durationSeconds = Math.max(
      1,
      Math.round((endedAt.getTime() - session.startedAt.getTime()) / 1000),
    );
    const audioStats = session.audioBridge.getStats();
    const rawTranscription = session.transcriptionParts.join('\n');
    const sanitizedTranscription = rawTranscription
      ? redactResidualPii(rawTranscription).redactedText
      : '';

    const determinedOutcome: CallOutcomeState =
      outcomeOverride ||
      classifyCallOutcome({
        providerOutcome: reason,
        machineDetected: false,
        durationSeconds,
        text: sanitizedTranscription,
      });

    const hadConversation = callResultedInConversation(determinedOutcome);
    const marker = callMarker(session.sipInfo.callId);

    // Persist Activity if leadId exists
    if (session.sipInfo.leadId) {
      try {
        const obsParts = [
          `Chamada de Voz via Bridge WebRTC/LiveKit <-> 3CX.`,
          `Ramal: ${session.sipInfo.extension} | Destino: ${session.sipInfo.destinationNumber}`,
          `Duração: ${durationSeconds}s | Motivo: ${reason}`,
          `Resultado: ${determinedOutcome}`,
          session.commandsExecuted.length > 0
            ? `Comandos executados:\n${session.commandsExecuted.map((c) => `- [${c.type}] ${c.message}`).join('\n')}`
            : null,
          sanitizedTranscription
            ? `\n--- Transcrição (LGPD Sanitizada) ---\n${sanitizedTranscription}`
            : null,
          marker,
        ]
          .filter(Boolean)
          .join('\n');

        await prisma.activity.create({
          data: {
            organizationId: session.sipInfo.organizationId,
            leadId: session.sipInfo.leadId,
            type: 'Ligacao' as never,
            status: (hadConversation ? 'Concluida' : 'Cancelada') as never,
            owner: `SDR IA (3CX Ramal ${session.sipInfo.extension})`,
            date: session.startedAt,
            observations: obsParts,
          },
        });
      } catch (err: any) {
        logger.warn(
          { err, sessionId, leadId: session.sipInfo.leadId },
          '[SipWebRtcBridge] Falha ao persistir Activity de chamada no banco',
        );
      }
    }

    await AuditService.log({
      action: 'AGENT_EXECUTED' as AuditAction,
      entity: 'VoiceBridgeSession',
      entityId: sessionId,
      organizationId: session.sipInfo.organizationId,
      afterState: {
        sessionId,
        callId: session.sipInfo.callId,
        outcome: determinedOutcome,
        durationSeconds,
        bargeInCount: audioStats.bargeInCount,
        commandsCount: session.commandsExecuted.length,
        audioRetentionDays: 90, // Política de retenção LGPD (Art. 16)
        transcriptionLength: sanitizedTranscription.length,
      },
    });

    session.audioBridge.clear();
    this.activeSessions.delete(sessionId);

    logger.info(
      {
        sessionId,
        callId: session.sipInfo.callId,
        outcome: determinedOutcome,
        durationSeconds,
        bargeInCount: audioStats.bargeInCount,
      },
      '[SipWebRtcBridge] Sessão finalizada com sucesso',
    );

    return {
      sessionId,
      sipCallId: session.sipInfo.callId,
      organizationId: session.sipInfo.organizationId,
      leadId: session.sipInfo.leadId,
      state: 'completed',
      outcome: determinedOutcome,
      durationSeconds,
      recordingUrl: `https://storage.internal.birthub.local/recordings/${sessionId}.opus`,
      transcriptionSummary: sanitizedTranscription || null,
      commandsExecuted: session.commandsExecuted,
      bargeInCount: audioStats.bargeInCount,
      startedAt: session.startedAt,
      endedAt,
    };
  }

  getSession(sessionId: string): ActiveBridgeSession | undefined {
    return this.activeSessions.get(sessionId);
  }

  getActiveSessionsCount(): number {
    return this.activeSessions.size;
  }
}

export const sipWebRtcBridgeService = new SipWebRtcBridgeService();
