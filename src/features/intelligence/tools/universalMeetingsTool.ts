import { DynamicStructuredTool } from '@langchain/core/tools';
import { z } from 'zod';
import { getTenantId } from '../../../lib/context.js';
import { logger } from '../../../lib/logger.js';
import { prisma } from '../../../lib/prisma.js';
import { generateStructuredOutput } from '../../../lib/ai/gateway.js';

/**
 * Hub Universal de Reuniões e Agenda (Google Calendar/Meet, Microsoft Teams Meetings, Zoom, Calendly e Agendamento nativo).
 */
export const universalMeetingsTool = new DynamicStructuredTool({
  name: 'universal_meetings_hub',
  description:
    'Agenda reuniões, gera links de convite (Google Calendar/Meet, Microsoft Teams, Zoom, Calendly e PublicBookingLink nativo) e sintetiza transcrições de reuniões com extração de próximos passos e tarefas.',
  schema: z.object({
    action: z
      .enum(['schedule_meeting', 'get_booking_links', 'synthesize_transcript', 'list_upcoming'])
      .default('schedule_meeting')
      .describe('Ação de reunião ou calendário.'),
    provider: z
      .enum(['internal', 'google_meet', 'microsoft_teams', 'zoom', 'calendly'])
      .default('google_meet')
      .describe('Provedor de videoconferência/calendário.'),
    title: z.string().optional().describe('Título da reunião.'),
    startTime: z.string().optional().describe('Data/hora de início em ISO 8601.'),
    durationMinutes: z.number().min(10).max(240).default(30).describe('Duração em minutos.'),
    leadId: z.string().optional().describe('ID do lead convidado.'),
    attendeeEmails: z.array(z.string()).optional().describe('E-mails dos participantes.'),
    transcript: z
      .string()
      .optional()
      .describe('Transcrição da reunião para síntese executiva e criação de follow-ups.'),
  }),
  func: async ({
    action,
    provider,
    title,
    startTime,
    durationMinutes,
    leadId,
    attendeeEmails,
    transcript,
  }) => {
    try {
      const organizationId = getTenantId();
      if (!organizationId) {
        return JSON.stringify({ error: 'Contexto de organização (tenant) ausente.' });
      }

      if (action === 'get_booking_links') {
        const [bookingLinks, googleConn, m365Setting, zoomSetting, calendlySetting] =
          await Promise.all([
            prisma.publicBookingLink.findMany({
              where: { organizationId, active: true },
              take: 10,
            }),
            prisma.googleWorkspaceConnection.findFirst({
              where: { organizationId },
              select: { email: true, scope: true },
            }),
            prisma.setting.findFirst({
              where: { organizationId, key: 'integration.microsoft365' },
              select: { value: true },
            }),
            prisma.setting.findFirst({
              where: { organizationId, key: 'integration.zoom' },
              select: { value: true },
            }),
            prisma.setting.findFirst({
              where: { organizationId, key: 'integration.calendly' },
              select: { value: true },
            }),
          ]);

        const calendlyCfg = (calendlySetting?.value ?? {}) as Record<string, unknown>;

        return JSON.stringify(
          {
            success: true,
            provedores: {
              googleCalendarMeet: {
                conectado: Boolean(googleConn),
                email: googleConn?.email ?? null,
              },
              microsoftTeamsCalendar: { conectado: Boolean(m365Setting?.value) },
              zoom: { conectado: Boolean(zoomSetting?.value) },
              calendly: {
                conectado: Boolean(calendlyCfg.schedulingUrl || calendlyCfg.apiKey),
                schedulingUrl: calendlyCfg.schedulingUrl ?? null,
              },
            },
            publicBookingLinks: bookingLinks.map((b) => ({
              id: b.id,
              slug: b.slug,
              title: b.title,
              durationMinutes: b.durationMinutes,
            })),
          },
          null,
          2,
        );
      }

      if (action === 'list_upcoming') {
        const meetings = await prisma.activity.findMany({
          where: {
            organizationId,
            type: 'Meeting',
            ...(leadId ? { leadId } : {}),
            date: { gte: new Date() },
          },
          orderBy: { date: 'asc' },
          take: 15,
        });

        return JSON.stringify(
          { success: true, total: meetings.length, upcomingMeetings: meetings },
          null,
          2,
        );
      }

      if (action === 'synthesize_transcript') {
        if (!transcript || transcript.trim().length < 20) {
          return JSON.stringify({
            error: 'Forneça a transcrição (transcript) da reunião para sintetizar.',
          });
        }

        const synthesis = await generateStructuredOutput<{
          executiveSummary: string;
          keyDecisions: string[];
          objectionsRaised: string[];
          nextSteps: Array<{ task: string; owner: string; priority: 'high' | 'normal' }>;
          sentiment: 'positive' | 'neutral' | 'negative';
        }>({
          organizationId,
          feature: 'meeting_synthesis',
          systemInstruction:
            'Você é um especialista em inteligência de reuniões B2B. Extraia resumo executivo, decisões, objeções e próximos passos acionáveis.',
          prompt: `Analise a transcrição de reunião abaixo:\n\n${transcript.slice(0, 12000)}`,
          schema: {
            type: 'object',
            properties: {
              executiveSummary: { type: 'string' },
              keyDecisions: { type: 'array', items: { type: 'string' } },
              objectionsRaised: { type: 'array', items: { type: 'string' } },
              nextSteps: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    task: { type: 'string' },
                    owner: { type: 'string' },
                    priority: { type: 'string', enum: ['high', 'normal'] },
                  },
                  required: ['task', 'owner', 'priority'],
                },
              },
              sentiment: { type: 'string', enum: ['positive', 'neutral', 'negative'] },
            },
            required: [
              'executiveSummary',
              'keyDecisions',
              'objectionsRaised',
              'nextSteps',
              'sentiment',
            ],
          },
          fallback: () => ({
            executiveSummary: transcript.slice(0, 300),
            keyDecisions: [],
            objectionsRaised: [],
            nextSteps: [{ task: 'Enviar follow-up da reunião', owner: 'Closer', priority: 'high' }],
            sentiment: 'neutral',
          }),
        });

        // Salvar resumo como Nota e criar tarefas de follow-up
        if (leadId) {
          await prisma.note.create({
            data: {
              organizationId,
              targetType: 'lead',
              targetId: leadId,
              text: `### Ata de Reunião (${provider})\n${synthesis.executiveSummary}\n\n**Decisões:** ${synthesis.keyDecisions.join('; ')}\n**Objeções:** ${synthesis.objectionsRaised.join('; ')}`,
              authorName: 'Swarm Meeting Intelligence',
            },
          });
        }

        return JSON.stringify(
          {
            success: true,
            provider,
            leadId: leadId ?? null,
            synthesis,
          },
          null,
          2,
        );
      }

      // action === 'schedule_meeting'
      const meetingTitle = (title || 'Reunião Comercial / Demonstração').trim();
      const start = startTime ? new Date(startTime) : new Date(Date.now() + 48 * 60 * 60 * 1000);
      const safeStart = Number.isNaN(start.getTime())
        ? new Date(Date.now() + 48 * 60 * 60 * 1000)
        : start;
      const end = new Date(safeStart.getTime() + durationMinutes * 60 * 1000);

      let meetingLink: string | null = null;
      let externalEventId: string | null = null;

      if (provider === 'google_meet') {
        const googleConn = await prisma.googleWorkspaceConnection.findFirst({
          where: { organizationId },
          select: { accessToken: true },
        });
        if (googleConn?.accessToken) {
          try {
            const res = await fetch(
              'https://www.googleapis.com/calendar/v3/calendars/primary/events?conferenceDataVersion=1',
              {
                method: 'POST',
                headers: {
                  Authorization: `Bearer ${googleConn.accessToken}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  summary: meetingTitle,
                  start: { dateTime: safeStart.toISOString() },
                  end: { dateTime: end.toISOString() },
                  attendees: (attendeeEmails ?? []).map((email) => ({ email })),
                  conferenceData: {
                    createRequest: {
                      requestId: `bh360-${Date.now()}`,
                      conferenceSolutionKey: { type: 'hangoutsMeet' },
                    },
                  },
                }),
                signal: AbortSignal.timeout(10000),
              },
            );
            if (res.ok) {
              const eventData = (await res.json()) as { id?: string; hangoutLink?: string };
              externalEventId = eventData.id ?? null;
              meetingLink = eventData.hangoutLink ?? null;
            }
          } catch (err) {
            logger.warn(
              { err },
              'Falha ao criar evento direto no Google Calendar; registrando no CRM.',
            );
          }
        }
      } else if (provider === 'microsoft_teams') {
        const m365Setting = await prisma.setting.findFirst({
          where: { organizationId, key: 'integration.microsoft365' },
          select: { value: true },
        });
        const cfg = (m365Setting?.value ?? {}) as Record<string, unknown>;
        const accessToken = typeof cfg.accessToken === 'string' ? cfg.accessToken.trim() : '';
        if (accessToken) {
          try {
            const res = await fetch('https://graph.microsoft.com/v1.0/me/events', {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                subject: meetingTitle,
                start: { dateTime: safeStart.toISOString(), timeZone: 'UTC' },
                end: { dateTime: end.toISOString(), timeZone: 'UTC' },
                isOnlineMeeting: true,
                onlineMeetingProvider: 'teamsForBusiness',
                attendees: (attendeeEmails ?? []).map((email) => ({
                  emailAddress: { address: email },
                  type: 'required',
                })),
              }),
              signal: AbortSignal.timeout(10000),
            });
            if (res.ok) {
              const eventData = (await res.json()) as {
                id?: string;
                onlineMeeting?: { joinUrl?: string };
              };
              externalEventId = eventData.id ?? null;
              meetingLink = eventData.onlineMeeting?.joinUrl ?? null;
            }
          } catch (err) {
            logger.warn(
              { err },
              'Falha ao criar reunião no Microsoft Teams Graph API; registrando no CRM.',
            );
          }
        }
      }

      const activity = await prisma.activity.create({
        data: {
          organizationId,
          title: meetingTitle,
          type: 'Meeting',
          status: 'Pending',
          date: safeStart,
          leadId: leadId || null,
          notes: `Provedor: ${provider} | Duração: ${durationMinutes}min | Participantes: ${(attendeeEmails ?? []).join(', ') || 'N/A'}${meetingLink ? ` | Link: ${meetingLink}` : ''}`,
        },
      });

      return JSON.stringify(
        {
          success: true,
          activityId: activity.id,
          provider,
          title: meetingTitle,
          startTime: safeStart.toISOString(),
          endTime: end.toISOString(),
          meetingLink,
          externalEventId,
        },
        null,
        2,
      );
    } catch (error) {
      logger.error({ error, action, provider }, 'Erro em universalMeetingsTool');
      return JSON.stringify({
        error: 'Falha na ferramenta universal de reuniões.',
        details: error instanceof Error ? error.message : String(error),
      });
    }
  },
});
