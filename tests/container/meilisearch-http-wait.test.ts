/**
 * HttpWaitStrategy do testcontainers (undici 8 aninhado) contra um container real.
 *
 * Complementa tests/integration/undici-runtime-consumers.test.ts (que roda sem Docker): aqui o
 * caminho é o de produção do testcontainers — Docker sobe o container e o HttpWaitStrategy faz o
 * polling HTTP com `request()` do undici 8 até /health responder 200.
 *
 * Imagem: getmeili/meilisearch:v1.12, a mesma do service do job build-and-test (já está no cache
 * do runner, então não há pull extra). Só roda com RUN_INFRA_TESTS=1.
 */
import { createRequire } from 'node:module';
import { GenericContainer, type StartedTestContainer, Wait } from 'testcontainers';
import { afterAll, describe, expect, it } from 'vitest';

// Único gate: RUN_INFRA_TESTS. Com ele em '1', qualquer falha de Docker/container (runtime
// ausente, pull, start, wait strategy) propaga do `start()` e o teste FALHA — sem skip silencioso.
const runContainerTests = process.env.RUN_INFRA_TESTS === '1';

const requireFromTest = createRequire(import.meta.url);

describe.skipIf(!runContainerTests)(
  'testcontainers HttpWaitStrategy (undici 8) com Meilisearch',
  () => {
    let container: StartedTestContainer | undefined;

    afterAll(async () => {
      await container?.stop();
    });

    it('espera /health via undici 8 e o container fica acessível', async () => {
      const requireFromTc = createRequire(requireFromTest.resolve('testcontainers'));
      const undici8 = requireFromTc('undici') as {
        request: (...args: unknown[]) => Promise<unknown>;
      };
      const { version } = requireFromTc('undici/package.json') as { version: string };
      expect(Number(version.split('.')[0])).toBe(8);

      // Conta as chamadas do HttpWaitStrategy (`(0, undici_1.request)(...)` lê a export a cada uso).
      const originalRequest = undici8.request;
      let calls = 0;
      undici8.request = (...args: unknown[]) => {
        calls++;
        return originalRequest(...args);
      };

      try {
        container = await new GenericContainer('getmeili/meilisearch:v1.12')
          .withEnvironment({ MEILI_ENV: 'development', MEILI_NO_ANALYTICS: 'true' })
          .withExposedPorts(7700)
          .withWaitStrategy(Wait.forHttp('/health', 7700).forStatusCode(200))
          .withStartupTimeout(60_000)
          .start();
      } finally {
        undici8.request = originalRequest;
      }

      expect(calls).toBeGreaterThan(0);
      const res = await fetch(
        `http://${container.getHost()}:${container.getMappedPort(7700)}/health`,
      );
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ status: 'available' });
    }, 120_000);
  },
);
