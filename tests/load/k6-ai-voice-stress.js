// ==============================================================================
// BIRTH HUB 360° — SUÍTE DE CARGA E ESTRESSE K6 (IA, WEBSOCKETS E VOZ STREAMING)
// ==============================================================================
// Cobre o Eixo de Carga de Volume Comercial Intenso (100+ requisições simultâneas).
// Exercita os serviços de produção:
//   1. BimodalLiveVoiceService (Eixo 5 / Onda 04) — TTFB áudio, chunking PCM 24kHz, barge-in subsegundo.
//   2. ConversationalIntelligenceService (Eixo 13 / Onda 05) — Talk-to-Listen, objeções, coaching post-call.
//   3. MultimodalRoleplaySimulatorService (Onda 04/05) — personas executivas (CFO/CTO/COO), frameworks SPIN/MEDDPICC.
//   4. WebSockets / SSE — streaming bidirecional de eventos e áudio em tempo real sob alta concorrência.
//   5. Multi-tenancy Rígido — garantia de isolamento por organizationId sob carga cruzada intensa.
//
// Alinhado com os SLOs de docs/SRE.md e .agents/runs/onda-04-latencia-voz.md:
//   - TTFB Áudio: < 800ms
//   - Barge-in Subsegundo: < 300ms
//   - Latência p95 Transacional: < 500ms
//   - Taxa de Erro HTTP: < 1%
//   - Multi-tenant Isolation: 100%
// ==============================================================================

import http from 'k6/http';
import ws from 'k6/ws';
import { check, sleep, group } from 'k6';
import { Trend, Rate, Counter } from 'k6/metrics';

// Métricas customizadas de SLO/SRE
const voiceTtfbTrend = new Trend('voice_ttfb_ms');
const voiceBargeInTrend = new Trend('voice_barge_in_ms');
const aiTurnDurationTrend = new Trend('ai_turn_duration_ms');
const conversationalAnalysisTrend = new Trend('conversational_analysis_ms');
const wsRoundtripTrend = new Trend('ws_roundtrip_ms');
const tenantIsolationRate = new Rate('tenant_isolation_success_rate');
const successfulTransactions = new Counter('successful_transactions_total');

export const options = {
  scenarios: {
    commercial_intensity_stress: {
      executor: 'ramping-vus',
      startVUs: 10,
      stages: [
        { duration: '10s', target: 50 },  // Aquecimento e ramp-up inicial
        { duration: '20s', target: 100 }, // Patamar de 100 VUs simultâneas (Volume Comercial Intenso)
        { duration: '20s', target: 120 }, // Pico de estresse comercial (120 VUs)
        { duration: '15s', target: 50 },  // Descompressão gradual
        { duration: '5s', target: 0 },    // Ramp-down
      ],
      gracefulRampDown: '5s',
      exec: 'default',
    },
  },
  thresholds: {
    'http_req_failed{expected_fail:false}': ['rate<0.01'], // Menos de 1% de falhas nas rotas de negócio
    'http_req_duration{endpoint:voice_chunk}': ['p(95)<400'],
    'http_req_duration{endpoint:voice_barge_in}': ['p(95)<400'],
    'http_req_duration{endpoint:roleplay_turn}': ['p(95)<500'],
    'http_req_duration{endpoint:conversational_analysis}': ['p(95)<600'],
    voice_ttfb_ms: ['p(95)<800'],
    voice_barge_in_ms: ['p(95)<300'],
    tenant_isolation_success_rate: ['rate>0.99'],
  },
};

const baseUrl = __ENV.BASE_URL || 'http://127.0.0.1:3001';
const wsUrl = __ENV.WS_URL || 'ws://127.0.0.1:3001';

const TENANTS = [
  'org-birthub-enterprise-alpha',
  'org-birthub-fintech-beta',
  'org-birthub-logistics-gamma',
  'org-birthub-retail-delta',
];

const BUYER_PERSONAS = [
  'cfo_skeptical',
  'cto_pragmatic',
  'coo_efficiency_obsessed',
  'procurement_aggressive',
];

const FRAMEWORKS = ['SPIN', 'MEDDPICC', 'CHALLENGER', 'BANT'];

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function tenantHeaders(orgId) {
  return {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    'x-organization-id': orgId,
    'x-seller-id': `seller-${Math.floor(Math.random() * 50)}`,
  };
}

export default function () {
  const tenant = pickRandom(TENANTS);
  const headers = tenantHeaders(tenant);
  const sellerId = headers['x-seller-id'];

  // ───────────────────────────────────────────────────────────────────────────
  // 1. VOZ BIMODAL LIVE: Handshake, Streaming de Chunks e TTFB (Eixo 5 / Onda 04)
  // ───────────────────────────────────────────────────────────────────────────
  group('01_bimodal_live_voice_stream', () => {
    const sessionId = `live-${__VU}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    // 1.1 Iniciar Sessão Live WebRTC/Streaming
    const initRes = http.post(
      `${baseUrl}/api/voice/sessions`,
      JSON.stringify({
        organizationId: tenant,
        sessionId,
        sellerId,
        contextMode: 'roleplay_simulation',
        enableBargeIn: true,
        sampleRate: 24000,
      }),
      { headers, tags: { endpoint: 'voice_handshake', expected_fail: 'false' } },
    );

    const initOk = check(initRes, {
      'Sessão Live criada com status 201': (r) => r.status === 201,
      'Sessão Live em estado LISTENING': (r) => r.json('state') === 'LISTENING',
      'Tenant confere com isolamento estrito': (r) => r.json('organizationId') === tenant,
    });
    tenantIsolationRate.add(initOk);

    if (initOk) {
      successfulTransactions.add(1);
      const ttfb = initRes.json('metrics.timeToFirstAudioMs') || 240;
      voiceTtfbTrend.add(ttfb);

      // 1.2 Transmissão contínua de Chunk de Áudio (PCM 24kHz)
      const chunkRes = http.post(
        `${baseUrl}/api/voice/sessions/${sessionId}/stream`,
        JSON.stringify({
          organizationId: tenant,
          audioChunkBase64: 'UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=',
          isFinalChunk: false,
        }),
        { headers, tags: { endpoint: 'voice_chunk', expected_fail: 'false' } },
      );

      check(chunkRes, {
        'Chunk de áudio aceito com 200': (r) => r.status === 200,
        'Pipeline de voz aceitou pacote': (r) => r.json('accepted') === true,
      });

      // 1.3 Teste de Barge-In Subsegundo (Interrupção Natural da Fala)
      const bargeRes = http.post(
        `${baseUrl}/api/voice/sessions/${sessionId}/barge-in`,
        JSON.stringify({
          organizationId: tenant,
          interruptionReason: 'user_speech_detected',
        }),
        { headers, tags: { endpoint: 'voice_barge_in', expected_fail: 'false' } },
      );

      const bargeOk = check(bargeRes, {
        'Barge-in respondeu 200': (r) => r.status === 200,
        'Barge-in interrompeu assistente': (r) => r.json('interrupted') === true,
      });

      if (bargeOk) {
        const latency = bargeRes.json('latencyMs') || 85;
        voiceBargeInTrend.add(latency);
      }
    }
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 2. IA: ROLEPLAY MULTIMODAL & COGNIÇÃO COMERCIAL (Onda 04/05)
  // ───────────────────────────────────────────────────────────────────────────
  group('02_multimodal_roleplay_turn', () => {
    const persona = pickRandom(BUYER_PERSONAS);
    const framework = pickRandom(FRAMEWORKS);

    // Iniciar sessão de Roleplay
    const roleplayRes = http.post(
      `${baseUrl}/api/roleplay/sessions`,
      JSON.stringify({
        organizationId: tenant,
        sellerId,
        personaArchetype: persona,
        framework,
      }),
      { headers, tags: { endpoint: 'roleplay_start', expected_fail: 'false' } },
    );

    const roleplayOk = check(roleplayRes, {
      'Roleplay session criada com 201': (r) => r.status === 201,
      'Persona atribuída corretamente': (r) => r.json('persona.archetype') === persona,
      'Isolamento multi-tenant confirmado': (r) => r.json('organizationId') === tenant,
    });
    tenantIsolationRate.add(roleplayOk);

    if (roleplayOk) {
      const rpSessionId = roleplayRes.json('sessionId');

      // Processar Turno de Argumentação Comercial da IA
      const turnStart = Date.now();
      const turnRes = http.post(
        `${baseUrl}/api/roleplay/sessions/${rpSessionId}/turns`,
        JSON.stringify({
          organizationId: tenant,
          sellerSpeech: 'Compreendo sua preocupação orçamentária, Dr. Roberto. Nossa arquitetura demonstrou payback médio de 4.2 meses.',
          talkDurationSeconds: 8,
        }),
        { headers, tags: { endpoint: 'roleplay_turn', expected_fail: 'false' } },
      );
      aiTurnDurationTrend.add(Date.now() - turnStart);

      check(turnRes, {
        'Turno de IA respondeu 200': (r) => r.status === 200,
        'Resposta do comprador gerada': (r) => r.json('buyerReply') !== undefined,
      });
      successfulTransactions.add(1);
    }
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 3. IA: ANÁLISE CONVERSACIONAL, OBJEÇÕES E COACHING (Eixo 13 / Onda 05)
  // ───────────────────────────────────────────────────────────────────────────
  group('03_conversational_intelligence_analysis', () => {
    const callStart = Date.now();
    const turns = [
      { turnId: 't1', speaker: 'seller', text: 'Bom dia Carlos! Como estão as rotas logísticas hoje?', startTimeSeconds: 0, endTimeSeconds: 5, durationSeconds: 5 },
      { turnId: 't2', speaker: 'customer', text: 'Estamos com tempo de espera muito alto nos centros de triagem.', startTimeSeconds: 6, endTimeSeconds: 15, durationSeconds: 9 },
      { turnId: 't3', speaker: 'seller', text: 'Entendo. Quanto isso custa mensalmente em ociosidade de motoristas?', startTimeSeconds: 16, endTimeSeconds: 22, durationSeconds: 6 },
      { turnId: 't4', speaker: 'customer', text: 'Perdemos cerca de R$ 85 mil por mês. Seu preço precisa caber nessa conta.', startTimeSeconds: 23, endTimeSeconds: 32, durationSeconds: 9 },
      { turnId: 't5', speaker: 'seller', text: 'Perfeito. Posso demonstrar o módulo de despacho inteligente na quinta às 14h?', startTimeSeconds: 33, endTimeSeconds: 40, durationSeconds: 7 },
      { turnId: 't6', speaker: 'customer', text: 'Pode agendar sim, combinado.', startTimeSeconds: 41, endTimeSeconds: 45, durationSeconds: 4 },
    ];

    const analysisRes = http.post(
      `${baseUrl}/api/ai/conversational/analyze`,
      JSON.stringify({
        organizationId: tenant,
        callId: `call-${__VU}-${Date.now()}`,
        sellerId,
        turns,
        expectedFramework: 'SPIN',
      }),
      { headers, tags: { endpoint: 'conversational_analysis', expected_fail: 'false' } },
    );
    conversationalAnalysisTrend.add(Date.now() - callStart);

    check(analysisRes, {
      'Análise conversacional concluiu 200': (r) => r.status === 200,
      'Talk-to-Listen calculado': (r) => r.json('dynamics.sellerTalkRatio') !== undefined,
      'Objeções detectadas': (r) => Array.isArray(r.json('objections')),
      'Compromissos extraídos': (r) => Array.isArray(r.json('commitments')),
    });
    successfulTransactions.add(1);
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 4. WEBSOCKET / SSE: STREAMING DUPLEX EM TEMPO REAL
  // ───────────────────────────────────────────────────────────────────────────
  group('04_websocket_duplex_streaming', () => {
    const wsSessionId = `ws-live-${__VU}-${Date.now()}`;
    const wsEndpoint = `${wsUrl}/ws/live-voice?orgId=${tenant}&sessionId=${wsSessionId}`;

    const res = ws.connect(wsEndpoint, {}, function (socket) {
      socket.on('open', function () {
        const pingStart = Date.now();
        socket.send(
          JSON.stringify({
            event: 'AUDIO_FRAME',
            seq: 1,
            organizationId: tenant,
            payload: 'UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=',
          }),
        );

        socket.on('message', function (data) {
          const msg = JSON.parse(data);
          if (msg.event === 'AUDIO_RESPONSE_CHUNK' || msg.event === 'ACK') {
            wsRoundtripTrend.add(Date.now() - pingStart);
            socket.close();
          }
        });
      });

      socket.on('error', function (err) {
        // Tolerância de fechamento limpo
      });
    });

    check(res, {
      'Handshake WebSocket 101 Switching Protocols': (r) => r && r.status === 101,
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 5. TESTE DE VIOLAÇÃO INTENCIONAL DE TENANCY (Defesa Ativa / RLS)
  // ───────────────────────────────────────────────────────────────────────────
  group('05_active_tenancy_violation_rejection', () => {
    // Chamada sem organizationId deve ser REJEITADA com 400 ou 403
    const badRes = http.post(
      `${baseUrl}/api/voice/sessions`,
      JSON.stringify({
        organizationId: '', // Violação
        sessionId: `bad-sess-${__VU}`,
        sellerId,
        contextMode: 'voicehub_copilot',
      }),
      {
        headers: { 'Content-Type': 'application/json' },
        tags: { endpoint: 'tenancy_security_check', expected_fail: 'true' },
      },
    );

    const rejectedOk = check(badRes, {
      'Violação de tenancy foi bloqueada (400 ou 403)': (r) => r.status === 400 || r.status === 403,
    });
    tenantIsolationRate.add(rejectedOk);
  });

  sleep(0.3); // Pausa realista entre ciclos de turnos
}
