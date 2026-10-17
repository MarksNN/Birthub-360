/**
 * mobileFieldMeeting.service.ts
 *
 * Serviço de backend para ingestão e conciliação de reuniões de campo gravadas offline (Capacidade 6 - Mobile).
 * Conecta o payload gerado pelo OfflineSyncService à infraestrutura de Copiloto IA,
 * garantindo isolamento multi-tenant (RLS), consentimento LGPD auditável e transcrição automática.
 */

import { randomUUID } from 'node:crypto';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { AuditService } from '../../../lib/audit/audit.service.js';
import { logger } from '../../../lib/logger.js';
import { prisma } from '../../../lib/prisma.js';
import { AppError } from '../../../shared/middlewares/errorHandler.js';
import { ingestLiveCallInsight } from '../../commercial-intelligence/application/dealRiskDetection.service.js';
import { enqueueTranscribeConversationJob } from '../../copiloto-ia/jobs/transcribeConversation.worker.js';
import type { FieldMeetingAudioPayload } from '../offlineSync.service.js';

export interface MobileFieldMeetingSyncResult {
  id: string;
  title: string;
  status: string;
  consentGranted: boolean;
  leadId: string | null;
  audioObjectKey: string;
  hasNotes: boolean;
}

export class MobileFieldMeetingService {
  /**
   * Sincroniza uma reunião presencial de campo originada no app mobile.
   */
  async syncFieldMeeting(
    organizationId: string,
    input: FieldMeetingAudioPayload,
    userId?: string,
    clientIp?: string,
  ): Promise<MobileFieldMeetingSyncResult> {
    if (!input.title || !input.title.trim()) {
      throw new AppError('Título da reunião de campo é obrigatório.', 400);
    }

    if (!input.consentGranted) {
      throw new AppError(
        'Gravação de reunião de campo rejeitada: ausência de consentimento verbal prévio do titular (LGPD).',
        400,
      );
    }

    // Valida existência do lead se fornecido
    if (input.leadId) {
      const lead = await prisma.lead.findFirst({
        where: { id: input.leadId, organizationId },
        select: { id: true },
      });
      if (!lead) {
        throw new AppError('Lead associado não encontrado nesta organização.', 404);
      }
    }

    const now = new Date();
    const conversationId = randomUUID();
    const mimeType = input.audioMimeType || 'audio/webm';
    const extension = mimeType.split('/')[1]?.split(';')[0] || 'webm';
    const objectKey = `copiloto-ia/${organizationId}/${conversationId}/${randomUUID()}.${extension}`;

    // 1. Cria a conversa com status inicial SCHEDULED
    const conversation = await prisma.copilotoConversation.create({
      data: {
        id: conversationId,
        organizationId,
        source: 'MANUAL',
        status: 'SCHEDULED',
        title: input.title.trim(),
        leadId: input.leadId || null,
        consentStatus: 'PENDING',
        createdBy: userId || null,
      },
    });

    // 2. Registra o consentimento auditável (LGPD)
    const consentMethod = input.consentMethod || 'FIELD_VERBAL_CONSENT';
    const textVersion = input.textVersion || 'v1.0';

    await prisma.copilotoConsentRecord.create({
      data: {
        organizationId,
        conversationId,
        method: consentMethod,
        textVersion,
        actorId: userId || null,
        grantedAt: now,
      },
    });

    await prisma.copilotoConversation.update({
      where: { id: conversationId, organizationId },
      data: { consentStatus: 'GRANTED' },
    });

    try {
      await AuditService.log({
        action: 'CREATE',
        entity: 'COPILOTO_IA_CONSENT',
        entityId: conversationId,
        actorId: userId || 'system_mobile_sync',
        tenantId: organizationId,
        ipAddress: clientIp,
        afterState: { granted: true, method: consentMethod, textVersion },
      });
    } catch (auditErr: any) {
      logger.warn(
        { err: auditErr },
        'Falha no log de auditoria LGPD de reunião de campo (best-effort)',
      );
    }

    // 3. Transiciona status para CAPTURING e depois PROCESSING
    const startedAt = input.recordedAt ? new Date(input.recordedAt) : now;
    const durationMs = input.durationMs || 1000;
    const endedAt = new Date(startedAt.getTime() + durationMs);

    await prisma.copilotoConversation.update({
      where: { id: conversationId, organizationId },
      data: {
        status: 'PROCESSING',
        startedAt,
        endedAt,
      },
    });

    // 4. Salva o áudio no storage de objetos se credenciais estiverem disponíveis
    if (input.audioData) {
      try {
        await this.persistAudioBuffer(objectKey, input.audioData, mimeType);
      } catch (storageErr: any) {
        logger.warn(
          { err: storageErr, objectKey },
          'Armazenamento em bucket S3 indisponível, prosseguindo com metadata',
        );
      }
    }

    // 5. Atualiza os metadados de áudio na conversa
    await prisma.copilotoConversation.update({
      where: { id: conversationId, organizationId },
      data: {
        audioObjectKey: objectKey,
        audioMimeType: mimeType,
        audioSizeBytes: input.audioSizeBytes || 0,
        audioDurationMs: durationMs,
      },
    });

    // 6. Se houver anotações da reunião tomadas em campo, persiste como segmento de transcrição inicial
    let hasNotes = false;
    if (input.meetingNotes && input.meetingNotes.trim()) {
      hasNotes = true;
      await prisma.copilotoTranscriptSegment.create({
        data: {
          organizationId,
          conversationId,
          startMs: 0,
          endMs: durationMs,
          text: `[Anotações de Campo]: ${input.meetingNotes.trim()}`,
          speakerLabel: 'Consultor (Campo)',
          confidence: 1.0,
        },
      });
    }

    // 7. Enfileira job de transcrição via Whisper
    try {
      await enqueueTranscribeConversationJob({ conversationId, organizationId });
    } catch (jobErr: any) {
      logger.warn(
        { err: jobErr },
        'Falha ao enfileirar job de transcrição (best-effort em ambiente sem worker)',
      );
    }

    // 8. Elevação de Inteligência (Capacidade 6 Mobile ➔ Capacidade 1 RevOps):
    // Se o lead foi informado e há anotações de campo, avalia preventivamente riscos imediatos (concorrentes ou objeções)
    if (input.leadId && input.meetingNotes?.trim()) {
      try {
        const notesLower = input.meetingNotes.toLowerCase();
        const competitorMatches = [
          'concorrente',
          'proposta concorrente',
          'outro fornecedor',
        ].filter((c) => notesLower.includes(c));
        const competitorMentioned =
          competitorMatches.length > 0 ? 'Concorrente citado em campo' : null;

        const isNegative =
          notesLower.includes('insatisfeito') ||
          notesLower.includes('caro') ||
          notesLower.includes('rejeit');
        const objectionCategory =
          notesLower.includes('preço') || notesLower.includes('caro')
            ? 'preco_ou_orcamento'
            : competitorMentioned
              ? 'concorrente'
              : null;

        await ingestLiveCallInsight(
          organizationId,
          {
            callId: `field-meeting-${conversationId.substring(0, 8)}`,
            dealId: input.leadId,
            timestamp: now,
            sentimentScore: isNegative ? -0.3 : 0.4,
            objectionCategory,
            competitorMentioned,
            suggestedRebuttal: objectionCategory
              ? 'Agendar alinhamento executivo para demonstrar ROI e diferenciais'
              : null,
          },
          now,
          { notify: true },
        );
      } catch (riskErr: any) {
        logger.warn(
          { err: riskErr, leadId: input.leadId },
          'Detecção de risco preventivo em reunião de campo não bloqueia sincronização',
        );
      }
    }

    logger.info(
      {
        organizationId,
        conversationId,
        leadId: input.leadId || null,
        durationMs,
      },
      'Reunião de campo sincronizada com sucesso no Copiloto IA',
    );

    return {
      id: conversation.id,
      title: conversation.title || input.title,
      status: 'PROCESSING',
      consentGranted: true,
      leadId: input.leadId || null,
      audioObjectKey: objectKey,
      hasNotes,
    };
  }

  private async persistAudioBuffer(
    objectKey: string,
    base64Data: string,
    contentType: string,
  ): Promise<void> {
    const accessKey = process.env.STORAGE_ACCESS_KEY_ID || process.env.MINIO_ACCESS_KEY;
    const secretKey = process.env.STORAGE_SECRET_ACCESS_KEY || process.env.MINIO_SECRET_KEY;
    if (!accessKey || !secretKey) {
      return;
    }

    const endpoint =
      process.env.STORAGE_ENDPOINT || process.env.MINIO_ENDPOINT || 'http://localhost:9000';
    const region = process.env.STORAGE_REGION || 'us-east-1';
    const bucket = process.env.STORAGE_BUCKET || 'prospector-assets';

    const s3 = new S3Client({
      endpoint,
      region,
      credentials: {
        accessKeyId: accessKey,
        secretAccessKey: secretKey,
      },
      forcePathStyle: true,
    });

    const buffer = Buffer.from(base64Data, 'base64');
    await s3.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: objectKey,
        Body: buffer,
        ContentType: contentType,
      }),
    );
  }
}

export const mobileFieldMeetingService = new MobileFieldMeetingService();
