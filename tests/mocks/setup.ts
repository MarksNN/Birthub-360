process.setMaxListeners(50);
process.env.DATABASE_URL = 'postgresql://dummy:dummy@localhost:5432/dummy';
if (!process.env.CREDENTIALS_ENCRYPTION_KEY || process.env.CREDENTIALS_ENCRYPTION_KEY.includes('replace-with')) {
  process.env.CREDENTIALS_ENCRYPTION_KEY = Buffer.alloc(32, 1).toString('base64');
}
if (!process.env.PII_BLIND_INDEX_KEY || process.env.PII_BLIND_INDEX_KEY.includes('replace-with')) {
  process.env.PII_BLIND_INDEX_KEY = Buffer.alloc(32, 1).toString('base64');
}
// Setup global do MSW para os testes unitários (TEST-004). Registrado via `setupFiles` em
// `vitest.unit.config.ts`. Antes disto, o mock de HTTP era ad hoc por arquivo
// (`global.fetch = vi.fn()` / `vi.spyOn(globalThis, 'fetch')` / `vi.mock` da camada de API),
// espalhado por vários testes. Agora todos usam os handlers em `tests/mocks/handlers/` e
// sobrescrevem pontualmente com `server.use(...)` quando precisam de uma resposta diferente.
import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterAll, afterEach, beforeAll, vi } from 'vitest';
import { server } from './server';

// jsdom não implementa HTMLDialogElement.showModal()/close() (usado pelo componente Dialog
// compartilhado, ver src/components/ui/Dialog.tsx) — sem isso, qualquer teste que monte um
// componente com Dialog aberto (CompanyForm, ContactForm etc.) quebra com
// "TypeError: dialog.showModal is not a function".
if (typeof HTMLDialogElement !== 'undefined' && !HTMLDialogElement.prototype.showModal) {
  HTMLDialogElement.prototype.showModal = function (this: HTMLDialogElement) {
    this.open = true;
  };
  HTMLDialogElement.prototype.close = function (this: HTMLDialogElement) {
    this.open = false;
    this.dispatchEvent(new Event('close'));
  };
}

// jsdom não implementa IntersectionObserver (usado por framer-motion `useInView` — ver
// GlowChart.tsx, halo decorativo que só deve animar em loop com o card visível, ACH-03-05) — sem
// isso, qualquer componente que monte esse hook quebra com "ReferenceError: IntersectionObserver
// is not defined" assim que o efeito roda, mesmo em testes que nem afirmam nada sobre ele (ex.:
// ReportsHub.test.tsx, que só renderiza o GlowChart de passagem). Stub mínimo: nunca dispara
// callback (equivalente a "nunca visível" em jsdom, que não tem layout real de qualquer forma),
// só evita o crash.
class IntersectionObserverStub implements IntersectionObserver {
    readonly root: Element | Document | null = null;
    readonly rootMargin: string = '';
    readonly thresholds: ReadonlyArray<number> = [];
    observe(): void {}
    unobserve(): void {}
    disconnect(): void {}
    takeRecords(): IntersectionObserverEntry[] {
        return [];
    }
}

if (typeof globalThis !== 'undefined') {
    (globalThis as any).IntersectionObserver = IntersectionObserverStub;
}
if (typeof global !== 'undefined') {
    (global as any).IntersectionObserver = IntersectionObserverStub;
}
if (typeof window !== 'undefined') {
    (window as any).IntersectionObserver = IntersectionObserverStub;
}

server.listen({ onUnhandledRequest: 'bypass' });
import { beforeEach } from 'vitest';

beforeEach(() => {
  if (typeof window !== 'undefined') {
    window.fetch = globalThis.fetch;
  }
});

afterEach(async () => {
  cleanup();
  server.resetHandlers();
  try {
    const apiModule = (await import('../../src/lib/api')) as Record<string, unknown>;
    try {
      const fn = apiModule?.invalidateInFlightGetCache;
      if (typeof fn === 'function') {
        (fn as () => void)();
      }
    } catch {
      // Safe fallback if property access on a Vitest mock proxy throws
    }
  } catch {
    // Safe fallback if @/lib/api is mocked in current test context
  }
});
afterAll(() => server.close());

// Mock DATABASE_URL para os testes passarem na validação do Zod
process.env.DATABASE_URL = 'postgresql://dummy:dummy@localhost:5432/dummy';
