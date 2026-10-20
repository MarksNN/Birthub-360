import http from 'node:http';
import express, { Request, Response } from 'express';
import { WebSocketServer, WebSocket } from 'ws';
import { bimodalLiveVoiceService } from '../../src/features/ai-voice/server/bimodalLiveVoice.service.js';
import { conversationalIntelligenceService } from '../../src/features/ai-voice/server/conversationalIntelligence.service.js';
import { multimodalRoleplaySimulatorService } from '../../src/features/roleplay/services/multimodalRoleplaySimulator.service.js';

const app = express();
app.use(express.json({ limit: '10mb' }));

const PORT = parseInt(process.env.PORT || '3001', 10);

// Health Checks
app.get('/health/live', (_req: Request, res: Response) => {
  res.status(200).json({ status: 'live', timestamp: new Date().toISOString() });
});

app.get('/health/ready', (_req: Request, res: Response) => {
  res.status(200).json({ status: 'ready', uptime: process.uptime() });
});

// ─────────────────────────────────────────────────────────────────────────────
// VOZ BIMODAL LIVE (Eixo 5 / Onda 04)
// ─────────────────────────────────────────────────────────────────────────────

app.post('/api/voice/sessions', async (req: Request, res: Response) => {
  try {
    const { organizationId, sessionId, sellerId, contextMode, enableBargeIn, sampleRate } = req.body;
    if (!organizationId || organizationId.trim() === '') {
      res.status(400).json({ error: 'Tenancy violation: organizationId é obrigatório' });
      return;
    }

    const session = await bimodalLiveVoiceService.createSession({
      organizationId,
      sessionId: sessionId || `live-${Date.now()}`,
      sellerId: sellerId || 'seller-default',
      contextMode: contextMode || 'roleplay_simulation',
      enableBargeIn: enableBargeIn ?? true,
      sampleRate: sampleRate ?? 24000,
    });

    res.status(201).json(session);
  } catch (err: any) {
    res.status(err.message?.includes('Tenancy violation') ? 400 : 500).json({ error: err.message });
  }
});

app.post('/api/voice/sessions/:id/stream', async (req: Request, res: Response) => {
  try {
    const sessionId = req.params.id;
    const { organizationId, audioChunkBase64, isFinalChunk } = req.body;
    if (!organizationId) {
      res.status(400).json({ error: 'Tenancy violation: organizationId obrigatório' });
      return;
    }

    const result = await bimodalLiveVoiceService.sendAudioStream({
      sessionId,
      organizationId,
      audioChunkBase64: audioChunkBase64 || '',
      isFinalChunk: isFinalChunk ?? false,
    });

    res.status(200).json(result);
  } catch (err: any) {
    res.status(404).json({ error: err.message });
  }
});

app.post('/api/voice/sessions/:id/barge-in', async (req: Request, res: Response) => {
  try {
    const sessionId = req.params.id;
    const { organizationId, interruptionReason } = req.body;
    if (!organizationId) {
      res.status(400).json({ error: 'Tenancy violation: organizationId obrigatório' });
      return;
    }

    const result = await bimodalLiveVoiceService.triggerBargeIn({
      sessionId,
      organizationId,
      interruptionReason,
    });

    res.status(200).json(result);
  } catch (err: any) {
    res.status(404).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// ROLEPLAY MULTIMODAL & IA COGNITIVA (Onda 04/05)
// ─────────────────────────────────────────────────────────────────────────────

app.post('/api/roleplay/sessions', async (req: Request, res: Response) => {
  try {
    const { organizationId, sellerId, framework, personaArchetype, industry } = req.body;
    if (!organizationId || organizationId.trim() === '') {
      res.status(400).json({ error: 'Tenancy violation: organizationId obrigatório' });
      return;
    }

    const session = await multimodalRoleplaySimulatorService.startSession({
      organizationId,
      sellerId: sellerId || 'seller-01',
      framework: framework || 'SPIN',
      personaArchetype: personaArchetype || 'cfo_skeptical',
      industry: industry || 'Tecnologia B2B',
    });

    res.status(201).json(session);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/roleplay/sessions/:id/turns', async (req: Request, res: Response) => {
  try {
    const sessionId = req.params.id;
    const { organizationId, sellerSpeech, talkDurationSeconds } = req.body;
    if (!organizationId) {
      res.status(400).json({ error: 'Tenancy violation: organizationId obrigatório' });
      return;
    }

    const result = await multimodalRoleplaySimulatorService.submitTurn({
      organizationId,
      sessionId,
      sellerMessage: sellerSpeech || 'Argumentação do vendedor.',
      talkDurationSeconds: talkDurationSeconds || 5,
    });

    res.status(200).json(result);
  } catch (err: any) {
    res.status(404).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// INTELIGÊNCIA CONVERSACIONAL E COACHING (Eixo 13 / Onda 05)
// ─────────────────────────────────────────────────────────────────────────────

app.post('/api/ai/conversational/analyze', async (req: Request, res: Response) => {
  try {
    const { organizationId, callId, sellerId, turns, expectedFramework } = req.body;
    if (!organizationId || organizationId.trim() === '') {
      res.status(400).json({ error: 'Tenancy violation: organizationId obrigatório' });
      return;
    }

    const report = await conversationalIntelligenceService.generatePostCallReport({
      organizationId,
      callId: callId || `call-${Date.now()}`,
      sellerId: sellerId || 'seller-01',
      turns: turns || [],
      expectedFramework: expectedFramework || 'SPIN',
    });

    res.status(200).json(report);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// HTTP SERVER & WEBSOCKET DUPLEX STREAMING
// ─────────────────────────────────────────────────────────────────────────────

const server = http.createServer(app);

const wss = new WebSocketServer({ noServer: true });

wss.on('connection', (ws: WebSocket, req: http.IncomingMessage) => {
  const url = new URL(req.url || '', `http://${req.headers.host}`);
  const orgId = url.searchParams.get('orgId') || 'unknown-org';
  const sessionId = url.searchParams.get('sessionId') || `sess-${Date.now()}`;

  ws.on('message', (data: any) => {
    try {
      const message = JSON.parse(data.toString());
      if (message.event === 'AUDIO_FRAME') {
        ws.send(
          JSON.stringify({
            event: 'AUDIO_RESPONSE_CHUNK',
            seq: (message.seq || 0) + 1,
            organizationId: orgId,
            sessionId,
            audioBase64: 'UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=',
            ttfbMs: 140,
            timestamp: new Date().toISOString(),
          }),
        );
      } else {
        ws.send(JSON.stringify({ event: 'ACK', status: 'received' }));
      }
    } catch {
      ws.send(JSON.stringify({ event: 'ERROR', message: 'Payload inválido' }));
    }
  });
});

server.on('upgrade', (request, socket, head) => {
  const { pathname } = new URL(request.url || '', `http://${request.headers.host}`);
  if (pathname === '/ws/live-voice') {
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request);
    });
  } else {
    socket.destroy();
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`[AI Voice Load Server] Rodando na porta ${PORT}`);
});
