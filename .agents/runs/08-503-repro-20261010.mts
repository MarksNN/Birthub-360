// Repro isolado (Agente 08) — NÃO faz parte do repo. Usa middlewares/routers REAIS da main.
import express from 'express';
import type { AddressInfo } from 'node:net';
import { unavailableLegacyModule } from '../../src/bootstrap/legacyModuleGate.ts';

const app = express();
// stub de auth: simula usuário autenticado+tenant (a cadeia real é authenticateToken+requireTenant)
const fakeAuth: express.RequestHandler = (req, res, next) =>
  req.headers.authorization ? next() : res.status(401).json({ error: 'stub-unauthenticated' });
app.use('/api/voice-hub', fakeAuth, unavailableLegacyModule('voice-hub'));
app.use('/api/outbound', fakeAuth, unavailableLegacyModule('outbound'));
app.use('/api/dialer-3cx', fakeAuth, unavailableLegacyModule('dialer-3cx'));

let extra = '';
try {
  const tel = (await import('../../src/lib/voice-hub/routes/telephony.routes.ts')).default;
  app.use('/api', tel); extra += ' telephony';
} catch (e) { console.log('telephony import fail:', (e as Error).message.split('\n')[0]); }
try {
  const { threecxWebhookRouter } = await import('../../src/features/integrations/threecx/threecx.routes.ts');
  app.use('/api/integrations/3cx/webhook', threecxWebhookRouter); extra += ' 3cx-webhook';
} catch (e) { console.log('3cx import fail:', (e as Error).message.split('\n')[0]); }
try {
  const { voiceResultWebhookRoutes } = await import('../../src/features/integrations/birth-voice/voiceResult.webhook.ts');
  app.use('/api/webhooks/voice-result', voiceResultWebhookRoutes); extra += ' voice-result';
} catch (e) { console.log('voice-result import fail:', (e as Error).message.split('\n')[0]); }
try {
  const { birthVoiceWebhookRoutes } = await import('../../src/features/integrations/birth-voice/birthVoice.webhook.ts');
  app.use('/api/integrations/birth-voice', birthVoiceWebhookRoutes); extra += ' birth-voice-webhook';
} catch (e) { console.log('birth-voice webhook import fail:', (e as Error).message.split('\n')[0]); }
try {
  const { getOutboundConfig } = await import('../../src/lib/voice-hub/services/twilioClient.ts');
  try { getOutboundConfig(); } catch (e) { console.log('getOutboundConfig() ->', (e as Error).constructor.name, (e as Error).message); }
} catch (e) { console.log('twilioClient import fail:', (e as Error).message.split('\n')[0]); }
console.log('mounted:', extra);

const srv = app.listen(0);
const base = `http://127.0.0.1:${(srv.address() as AddressInfo).port}`;
const auth = { Authorization: 'Bearer fake' };
const cases: [string, string, Record<string, string>?, string?][] = [
  ['GET', '/api/voice-hub/workflow'],
  ['GET', '/api/voice-hub/workflow', auth],
  ['POST', '/api/voice-hub/workflow', { ...auth, 'content-type': 'application/json' }, '{"nodes":[],"edges":[]}'],
  ['POST', '/api/voice-hub/workflow/publish', auth],
  ['POST', '/api/voice-hub/calls/outbound', { ...auth, 'content-type': 'application/json' }, '{"agentId":"x","targetNumber":"+5511999999999"}'],
  ['GET', '/api/outbound/campaigns', auth],
  ['POST', '/api/dialer-3cx/call', auth],
  ['POST', '/api/telephony/twilio/voice', { 'content-type': 'application/x-www-form-urlencoded' }, 'CallSid=CA1'],
  ['POST', '/api/telephony/twilio/outbound', { 'content-type': 'application/x-www-form-urlencoded' }, 'CallSid=CA1'],
  ['POST', '/api/integrations/3cx/webhook', { 'content-type': 'application/json' }, '{}'],
  ['POST', '/api/webhooks/voice-result', { 'content-type': 'application/json' }, '{}'],
  ['POST', '/api/integrations/birth-voice/webhook', { 'content-type': 'application/json' }, '{}'],
];
for (const [m, p, h, b] of cases) {
  const r = await fetch(base + p, { method: m, headers: h, body: b });
  const t = await r.text();
  console.log(`${m} ${p} ${h?.Authorization ? '[auth]' : '[no-auth]'} -> ${r.status} ${t.slice(0, 200)}`);
}
srv.close();
process.exit(0);
