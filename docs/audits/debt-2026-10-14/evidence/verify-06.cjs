// Run from snapshot root: node verify-06.cjs. No network, DB, Redis or SMTP.
const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const { stripTypeScriptTypes } = require('node:module');
const read = (file) => fs.readFileSync(file, 'utf8');
const compile = (file) => stripTypeScriptTypes(read(file).replace(/^import.*$/gm, '').replace(/^export type.*$/gm, '').replace(/export /g, ''));
(async () => {
  const guard = read('src/lib/process-guards.ts');
  const block = guard.slice(guard.indexOf('const KNOWN_REDIS'), guard.indexOf('export function registerProcessGuards')).replace('reason: unknown', 'reason').replace('): boolean', ')');
  const sb = { Error }; vm.createContext(sb);
  vm.runInContext(block + '; classify=isKnownRedisUnavailableRejection;', sb);
  assert.equal(sb.classify(new Error('business rule failed')), false);
  const redisError = new Error('Connection is closed.'); redisError.name = 'MaxRetriesPerRequestError';
  assert.equal(sb.classify(redisError), true);
  assert.equal(sb.classify(new Error('ECONNRESET payment service')), true);
  console.log('DEBT-OPS-006 reproduced: application ECONNRESET incorrectly classified Redis; ordinary error false; known Redis true.');

  const s = { process, Promise }; vm.createContext(s);
  vm.runInContext(compile('src/bootstrap/shutdown.ts') + '; createHandler=createGracefulShutdown;', s);
  let callback, closed = false;
  const conn = { quit: async () => {}, disconnect() {} };
  const deps = { httpServer: { close: (cb) => { callback = cb; } }, workers: {}, sseService: { closeAll: async () => { closed = true; callback?.(); } }, prisma: { $disconnect: async () => {} }, shutdownLangfuse: async () => {}, connection: conn, rateLimiterConnection: conn, cacheConnection: conn, logger: { info() {}, error() {} }, exit() {} };
  const pending = await Promise.race([s.createHandler(deps)('SIGTERM').then(() => 'complete'), new Promise((resolve) => setTimeout(() => resolve('pending'), 30))]);
  assert.equal(pending, 'pending'); assert.equal(closed, false);
  assert.equal(/setTimeout|Promise.race|AbortSignal/.test(read('src/bootstrap/shutdown.ts')), false);
  deps.httpServer.close = (cb) => cb(); closed = false;
  await s.createHandler(deps)('SIGTERM'); assert.equal(closed, true);
  console.log('DEBT-OPS-007 reproduced: pending HTTP callback prevents SSE close; no deadline; immediate-close control succeeds.');

  let stored = { organizationId: 'synthetic-org', userId: null, readAt: null };
  const n = { Date, logger: { error() {} }, prisma: { notification: { updateMany: async ({ data }) => { stored = { ...stored, ...data }; return { count: 1 }; }, count: async () => stored.readAt === null ? 1 : 0 } } };
  vm.createContext(n); vm.runInContext(compile('src/features/notifications/notification.service.ts') + '; service=new NotificationService();', n);
  assert.equal(await n.service.unreadCount('synthetic-org', 'B'), 1);
  await n.service.markRead('synthetic-org', 'broadcast', 'A');
  assert.equal(await n.service.unreadCount('synthetic-org', 'B'), 0);
  console.log('DEBT-NOT-001 reproduced: broadcast unread for B changes1→0 after A reads; fake persistence only.');

  assert.equal(/enforceTokenQuota/.test(read('src/lib/ai/gateway/streaming.ts')), false);
  assert.equal(/enforceTokenQuota/.test(read('src/lib/ai/gateway/chat-model.ts')), true);
  assert.equal(/assertAiBudgetNotExceeded/.test(read('src/lib/ai/gateway/streaming.ts')), true);
  console.log('DEBT-AI-001 static control: streaming omits token quota, invoke includes it, both retain monetary budget.');
  const bitrix = read('src/features/integrations/bitrix/service/client.ts');
  const attempt = bitrix.slice(bitrix.indexOf('async function attemptBitrixCall'), bitrix.indexOf('/** Erro recuperável'));
  let activeSignal;
  const b = { AbortController, REQUEST_TIMEOUT_MS: 5, setTimeout, clearTimeout, AppError: class extends Error {}, BitrixDefinitiveError: class extends Error {}, TransientBitrixError: class extends Error {}, parseRetryAfterMs() {}, safeFetch: async (_url, options) => { activeSignal = options.signal; return { status: 200, ok: true, json: async () => new Promise((_resolve, reject) => options.signal.addEventListener('abort', () => reject(new Error('aborted')))) }; } };
  vm.createContext(b); vm.runInContext(stripTypeScriptTypes(attempt) + '; call=attemptBitrixCall;', b);
  const bodyOutcome = await Promise.race([b.call('https://synthetic.invalid/', 'synthetic', {}, 'synthetic').then(() => 'complete'), new Promise((resolve) => setTimeout(() => resolve('pending'), 30))]);
  assert.equal(bodyOutcome, 'pending'); assert.equal(activeSignal.aborted, false);
  b.safeFetch = async () => ({ status: 200, ok: true, json: async () => ({ result: [] }) });
  assert.deepEqual(JSON.parse(JSON.stringify(await b.call('https://synthetic.invalid/', 'synthetic', {}, 'synthetic'))), { result: [] });
  console.log('DEBT-INT-001 reproduced: exact attempt function with fake headers/body remains pending beyond shortened5ms timer; completed-body positive control succeeds. No HTTP request.');
  const json = JSON.parse(read('audit-06.json'));
  assert.equal(json.checks.length, 50); assert.equal(new Set(json.checks.map((c) => c.id)).size, 50);
  for (const cat of new Set(json.checks.map((c) => c.category))) assert.equal(json.checks.filter((c) => c.category === cat).length, 5);
  for (const c of json.checks) for (const e of c.evidence) { const lines = read(e.file).split(/\r?\n/); assert.ok(e.lineStart > 0 && e.lineEnd <= lines.length); }
  console.log('50 unique checks; ten categories ×five; evidence files and ranges exist. No live backend validation claimed.');
})().catch((error) => { console.error(error); process.exitCode = 1; });
