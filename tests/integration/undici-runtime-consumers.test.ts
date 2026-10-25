/**
 * Cobertura de runtime dos consumidores de undici aninhado (risco residual do P3 undici).
 *
 * O lock tem 4 cópias de undici: a raiz (6.x) e três aninhadas, fixadas por `overrides`:
 *   - @ai-sdk/provider-utils -> undici 7.x (createSafeNodeFetch: download SSRF-safe de URLs)
 *   - @qdrant/js-client-rest -> undici 7.x (Agent passado como `dispatcher` ao fetch nativo do Node)
 *   - testcontainers         -> undici 8.x (HttpWaitStrategy: `request()` + Agent)
 * Nenhuma suíte exercitava esses caminhos de verdade (o swarm só importa o qdrant; o ai-sdk só
 * entra via mocks), então um bump de override podia quebrar em runtime sem nenhum check vermelho.
 *
 * Tudo aqui é determinístico: só servidores HTTP locais em 127.0.0.1, sem rede externa, sem
 * chaves, sem Docker. O teste com Docker real (HttpWaitStrategy contra um container) fica em
 * tests/container/, que exige RUN_INFRA_TESTS=1.
 */
import dns from 'node:dns';
import { readFileSync } from 'node:fs';
import http from 'node:http';
import type { AddressInfo } from 'node:net';
import { createRequire } from 'node:module';
import path from 'node:path';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

const requireFromTest = createRequire(import.meta.url);

type UndiciModule = {
  Agent: { prototype: { dispatch: (...args: unknown[]) => unknown } } & (new (
    opts?: Record<string, unknown>,
  ) => { close: () => Promise<void> });
  fetch: (input: string, init?: Record<string, unknown>) => Promise<Response>;
  request: (
    url: string,
    opts?: Record<string, unknown>,
  ) => Promise<{ statusCode: number; body: { text: () => Promise<string> } }>;
};

type ResolvedUndici = { dir: string; version: string; engines?: string; mod: UndiciModule };

/** Resolve o undici exatamente como o pacote consumidor o resolve (a partir do entry dele). */
function resolveUndiciFor(pkg: string): ResolvedUndici {
  const entry = requireFromTest.resolve(pkg);
  const requireFromPkg = createRequire(entry);
  const undiciEntry = requireFromPkg.resolve('undici');
  const marker = `${path.sep}node_modules${path.sep}undici${path.sep}`;
  const dir = undiciEntry.slice(0, undiciEntry.lastIndexOf(marker) + marker.length - 1);
  const pkgJson = JSON.parse(readFileSync(path.join(dir, 'package.json'), 'utf8')) as {
    version: string;
    engines?: { node?: string };
  };
  return {
    dir,
    version: pkgJson.version,
    engines: pkgJson.engines?.node,
    mod: requireFromPkg('undici') as UndiciModule,
  };
}

function cmpSemver(a: string, b: string): number {
  const pa = a.split('-')[0].split('.').map(Number);
  const pb = b.split('-')[0].split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    if ((pa[i] ?? 0) !== (pb[i] ?? 0)) return (pa[i] ?? 0) - (pb[i] ?? 0);
  }
  return 0;
}

/** Major fixo + piso de segurança (os mesmos pisos dos `overrides` do package.json). */
function expectUndiciLine(resolved: ResolvedUndici, major: number, floor: string): void {
  expect(Number(resolved.version.split('.')[0])).toBe(major);
  expect(cmpSemver(resolved.version, floor)).toBeGreaterThanOrEqual(0);
}

/** Conta dispatches no Agent de uma cópia específica de undici (prova qual cópia fez o I/O). */
function spyAgentDispatch(undici: UndiciModule): { calls: () => number; restore: () => void } {
  const proto = undici.Agent.prototype;
  const hadOwn = Object.prototype.hasOwnProperty.call(proto, 'dispatch');
  const original = proto.dispatch;
  let count = 0;
  proto.dispatch = function (this: unknown, ...args: unknown[]) {
    count++;
    return original.apply(this, args);
  };
  return {
    calls: () => count,
    restore: () => {
      if (hadOwn) proto.dispatch = original;
      else delete (proto as { dispatch?: unknown }).dispatch;
    },
  };
}

type Recorded = { method: string; url: string; body: string; headers: http.IncomingHttpHeaders };

async function startServer(
  handler: (req: Recorded, res: http.ServerResponse) => void,
): Promise<{ server: http.Server; baseUrl: string; port: number; requests: Recorded[] }> {
  const requests: Recorded[] = [];
  const server = http.createServer((req, res) => {
    const chunks: Buffer[] = [];
    req.on('data', (c: Buffer) => chunks.push(c));
    req.on('end', () => {
      const rec: Recorded = {
        method: req.method ?? '',
        url: req.url ?? '',
        body: Buffer.concat(chunks).toString('utf8'),
        headers: req.headers,
      };
      requests.push(rec);
      handler(rec, res);
    });
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address() as AddressInfo;
  return { server, baseUrl: `http://127.0.0.1:${port}`, port, requests };
}

function sendJson(res: http.ServerResponse, status: number, payload: unknown): void {
  res.writeHead(status, { 'content-type': 'application/json' });
  res.end(JSON.stringify(payload));
}

describe('undici: resolução das cópias aninhadas (lock + overrides)', () => {
  it('raiz continua em undici 6 (>= 6.29.1)', () => {
    const root = requireFromTest('undici/package.json') as { version: string };
    expect(Number(root.version.split('.')[0])).toBe(6);
    expect(cmpSemver(root.version, '6.29.1')).toBeGreaterThanOrEqual(0);
  });

  it('@ai-sdk/provider-utils resolve undici 7 aninhado (>= 7.30.1)', () => {
    const u = resolveUndiciFor('@ai-sdk/provider-utils');
    expect(u.dir).toContain(`@ai-sdk${path.sep}provider-utils${path.sep}node_modules`);
    expectUndiciLine(u, 7, '7.30.1');
  });

  it('@qdrant/js-client-rest resolve undici 7 aninhado (>= 7.30.1)', () => {
    const u = resolveUndiciFor('@qdrant/js-client-rest');
    expect(u.dir).toContain(`js-client-rest${path.sep}node_modules`);
    expectUndiciLine(u, 7, '7.30.1');
  });

  it('testcontainers resolve undici 8 aninhado (>= 8.12.2) e o Node atende o engines dele', () => {
    const u = resolveUndiciFor('testcontainers');
    expect(u.dir).toContain(`testcontainers${path.sep}node_modules`);
    expectUndiciLine(u, 8, '8.12.2');
    // undici 8 exige Node >= 22.19 (engines); o CI usa node-version '22'.
    const floor = /(\d+\.\d+\.\d+)/.exec(u.engines ?? '')?.[1];
    expect(floor, `engines.node do undici 8: ${u.engines}`).toBeDefined();
    expect(cmpSemver(process.versions.node, floor as string)).toBeGreaterThanOrEqual(0);
  });
});

describe('ai-sdk (src/lib/ai/vercel-ai.ts) -> provider-utils -> undici 7', () => {
  const PROBE_HOST = 'ai-sdk-undici-probe.test';
  let srv: Awaited<ReturnType<typeof startServer>>;
  let undici7: ResolvedUndici;

  beforeAll(async () => {
    srv = await startServer((_req, res) => {
      res.writeHead(200, { 'content-type': 'image/png' });
      res.end(Buffer.from([0x89, 0x50, 0x4e, 0x47]));
    });
    undici7 = resolveUndiciFor('@ai-sdk/provider-utils');
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => srv.server.close(() => resolve()));
  });

  it('generateText baixa URL de imagem pelo safe fetch (undici 7 + lookup) e bloqueia IP privado', async () => {
    // O safe fetch do provider-utils lê dns.lookup via process.getBuiltinModule na 1ª chamada e o
    // injeta em `new Agent({ connect: { lookup } })` do undici 7. Fazemos o hostname de teste
    // resolver para 127.0.0.1: o caminho real (Agent -> connector -> lookup) tem de rodar e a
    // validação de IP tem de barrar a conexão antes de qualquer byte chegar ao servidor local.
    const originalLookup = dns.lookup;
    const lookupCalls: string[] = [];
    const fakeLookup = ((hostname: string, options: unknown, callback: unknown) => {
      if (hostname !== PROBE_HOST) {
        return (originalLookup as (...a: unknown[]) => unknown)(hostname, options, callback);
      }
      lookupCalls.push(hostname);
      const cb = (typeof options === 'function' ? options : callback) as (
        err: Error | null,
        address: unknown,
        family?: number,
      ) => void;
      const all = typeof options === 'object' && options !== null && 'all' in options;
      if (all && (options as { all?: boolean }).all)
        cb(null, [{ address: '127.0.0.1', family: 4 }]);
      else cb(null, '127.0.0.1', 4);
    }) as typeof dns.lookup;
    dns.lookup = fakeLookup;
    const dispatch = spyAgentDispatch(undici7.mod);

    try {
      const { generateText } = await import('../../src/lib/ai/vercel-ai');
      const { MockLanguageModelV4 } = await import('ai/test');
      const doGenerate = vi.fn();
      const model = new MockLanguageModelV4({ doGenerate });

      const error = await generateText({
        model,
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: 'descreva' },
              { type: 'image', image: new URL(`http://${PROBE_HOST}:${srv.port}/x.png`) },
            ],
          },
        ],
      }).then(
        () => null,
        (e: unknown) => e,
      );

      expect(error).toBeInstanceOf(Error);
      const flat = JSON.stringify(error, Object.getOwnPropertyNames(error)) + String(error);
      const causeMsg = String((error as { cause?: { message?: string } }).cause?.message ?? '');
      expect(`${flat} ${causeMsg}`).toMatch(/disallowed IP address 127\.0\.0\.1/);
      expect(lookupCalls.length).toBeGreaterThan(0); // o connector do undici 7 usou o lookup injetado
      expect(dispatch.calls()).toBeGreaterThan(0); // o I/O passou pelo Agent do undici 7 aninhado
      expect(srv.requests).toHaveLength(0); // nada vazou para o servidor
      expect(doGenerate).not.toHaveBeenCalled(); // o modelo nem foi chamado
    } finally {
      dns.lookup = originalLookup;
      dispatch.restore();
    }
  });

  it('a mesma cópia de undici 7 completa um download com Agent + lookup próprio (caminho positivo)', async () => {
    // Mesmo formato que o provider-utils usa (Agent com connect.lookup + fetch do próprio undici),
    // mas com um lookup que aceita loopback — prova que a cópia 7.x transfere de ponta a ponta.
    const { Agent, fetch } = undici7.mod;
    const agent = new Agent({
      connect: {
        lookup: (_h: string, _o: unknown, cb: (e: null, a: unknown) => void) =>
          cb(null, [{ address: '127.0.0.1', family: 4 }]),
      },
    });
    try {
      const res = await fetch(`http://${PROBE_HOST}:${srv.port}/ok.png`, { dispatcher: agent });
      expect(res.status).toBe(200);
      expect(res.headers.get('content-type')).toBe('image/png');
      expect(Buffer.from(await res.arrayBuffer())).toEqual(Buffer.from([0x89, 0x50, 0x4e, 0x47]));
      expect(srv.requests.at(-1)?.headers.host).toBe(`${PROBE_HOST}:${srv.port}`);
    } finally {
      await agent.close();
    }
  });
});

describe('qdrant (src/lib/ai/embeddings/qdrant.ts) -> fetch nativo + dispatcher undici 7', () => {
  let srv: Awaited<ReturnType<typeof startServer>>;
  let dispatch: ReturnType<typeof spyAgentDispatch>;
  const previousUrl = process.env.QDRANT_URL;
  const previousKey = process.env.QDRANT_API_KEY;

  beforeAll(async () => {
    srv = await startServer((req, res) => {
      const ok = (result: unknown) => sendJson(res, 200, { result, status: 'ok', time: 0 });
      const route = `${req.method} ${req.url?.split('?')[0]}`;
      switch (route) {
        case 'GET /':
          return sendJson(res, 200, { title: 'qdrant - vector search engine', version: '1.19.0' });
        case 'GET /collections':
          return ok({ collections: [] });
        case 'PUT /collections/document_embeddings':
          return ok(true);
        case 'PUT /collections/document_embeddings/points':
          return ok({ operation_id: 1, status: 'completed' });
        case 'POST /collections/document_embeddings/points/query':
          return ok({
            points: [
              { id: 'p-1', version: 1, score: 0.91, payload: { tenantId: 't1', documentId: 'd1' } },
            ],
          });
        case 'POST /collections/document_embeddings/points/delete':
          return ok({ operation_id: 2, status: 'completed' });
        default:
          return sendJson(res, 404, { status: { error: `rota não simulada: ${route}` } });
      }
    });
    process.env.QDRANT_URL = srv.baseUrl;
    delete process.env.QDRANT_API_KEY;
    dispatch = spyAgentDispatch(resolveUndiciFor('@qdrant/js-client-rest').mod);
    vi.resetModules(); // qdrant.ts lê QDRANT_URL no top-level: força reavaliação com a URL local
  });

  afterEach(() => {
    srv.requests.length = 0;
  });

  afterAll(async () => {
    dispatch.restore();
    if (previousUrl === undefined) delete process.env.QDRANT_URL;
    else process.env.QDRANT_URL = previousUrl;
    if (previousKey !== undefined) process.env.QDRANT_API_KEY = previousKey;
    await new Promise<void>((resolve) => srv.server.close(() => resolve()));
  });

  it('initialize/upsert/search/delete do wrapper passam pelo Agent do undici 7 aninhado', async () => {
    const qdrant = await import('../../src/lib/ai/embeddings/qdrant');
    const before = dispatch.calls();

    await qdrant.initializeQdrantCollection();
    const create = srv.requests.find(
      (r) => r.method === 'PUT' && r.url.startsWith('/collections/document_embeddings'),
    );
    expect(create, JSON.stringify(srv.requests.map((r) => `${r.method} ${r.url}`))).toBeDefined();
    expect(JSON.parse(create!.body)).toMatchObject({ vectors: { size: 1536, distance: 'Cosine' } });

    const vector = Array.from({ length: 4 }, (_, i) => i / 4);
    const pointId = await qdrant.upsertEmbedding('t1', 'd1', vector, {
      tenantId: 't1',
      documentId: 'd1',
    });
    expect(pointId).toBe('t1-d1-0');
    const upsert = srv.requests.find(
      (r) => r.url.startsWith('/collections/document_embeddings/points') && r.method === 'PUT',
    );
    expect(JSON.parse(upsert!.body).points[0]).toMatchObject({ id: 't1-d1-0', vector });

    const hits = await qdrant.searchEmbeddings('t1', vector, { limit: 3 });
    expect(hits).toEqual([
      { id: 'p-1', score: 0.91, payload: { tenantId: 't1', documentId: 'd1' } },
    ]);
    const query = srv.requests.find((r) =>
      r.url.startsWith('/collections/document_embeddings/points/query'),
    );
    expect(JSON.parse(query!.body)).toMatchObject({
      limit: 3,
      filter: { must: [{ key: 'tenantId', match: { value: 't1' } }] },
    });

    await qdrant.deleteDocumentEmbeddings('t1', 'd1');
    expect(
      srv.requests.some((r) => r.url.startsWith('/collections/document_embeddings/points/delete')),
    ).toBe(true);

    // Cada chamada HTTP do client saiu pelo dispatcher undici 7.x passado ao fetch nativo do Node.
    expect(dispatch.calls() - before).toBeGreaterThanOrEqual(4);
  });
});

describe('testcontainers -> undici 8 (HttpWaitStrategy), sem Docker', () => {
  let srv: Awaited<ReturnType<typeof startServer>>;

  beforeAll(async () => {
    srv = await startServer((req, res) =>
      req.url === '/health' ? sendJson(res, 200, { status: 'available' }) : sendJson(res, 503, {}),
    );
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => srv.server.close(() => resolve()));
  });

  it('carregar testcontainers carrega o undici 8 aninhado e expõe Wait.forHttp', async () => {
    const u8 = resolveUndiciFor('testcontainers');
    const tc = (await import('testcontainers')) as typeof import('testcontainers');
    const strategy = tc.Wait.forHttp('/health', 7700).forStatusCode(200).allowInsecure();
    expect(strategy.constructor.name).toBe('HttpWaitStrategy');
    const loaded = Object.keys(requireFromTest.cache).filter((k) =>
      k.startsWith(u8.dir + path.sep),
    );
    expect(loaded.length, `nenhum módulo de ${u8.dir} no require.cache`).toBeGreaterThan(0);
  });

  it('request() do undici 8 com Agent inseguro (como no allowInsecure) + parser do testcontainers', async () => {
    const u8 = resolveUndiciFor('testcontainers');
    const requireFromTc = createRequire(requireFromTest.resolve('testcontainers'));
    const { undiciResponseToFetchResponse } = requireFromTc(
      './wait-strategies/utils/undici-response-parser',
    ) as { undiciResponseToFetchResponse: (r: unknown) => Promise<Response> };
    const dispatch = spyAgentDispatch(u8.mod);
    const agent = new u8.mod.Agent({ connect: { rejectUnauthorized: false } });
    try {
      const raw = await u8.mod.request(`${srv.baseUrl}/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000),
        headers: {},
        dispatcher: agent,
      });
      const res = await undiciResponseToFetchResponse(raw);
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ status: 'available' });
      expect(dispatch.calls()).toBeGreaterThan(0);
    } finally {
      dispatch.restore();
      await agent.close();
    }
  });
});
