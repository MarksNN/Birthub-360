import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';

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

// Mock do BullMQ para que testes unitários não tentem conectar no Redis real (evitando warnings "searchQueue offline")
vi.mock('bullmq', async (importOriginal) => {
  const actual = await importOriginal<typeof import('bullmq')>();
  class MockQueue {
    name: string;
    constructor(name: string) {
      this.name = name;
    }
    add = vi.fn().mockResolvedValue({ id: 'mocked-job-id' });
    on = vi.fn();
    close = vi.fn();
    upsertJobScheduler = vi.fn().mockResolvedValue(undefined);
  }
  class MockWorker {
    name: string;
    processor: any;
    constructor(name: string, processor: any) {
      this.name = name;
      this.processor = processor;
    }
    on = vi.fn();
    close = vi.fn();
  }
  class MockQueueEvents {
    name: string;
    constructor(name: string) {
      this.name = name;
    }
    on = vi.fn();
    close = vi.fn();
  }
  return {
    ...actual,
    Queue: MockQueue,
    Worker: MockWorker,
    QueueEvents: MockQueueEvents,
  };
});

// Removed global vi.mock('@/lib/prisma') as it breaks integration tests.
// Unit tests already mock Prisma explicitly.

// Mock canvas-confetti para evitar TypeError: Cannot read properties of null (reading 'clearRect') no JSDOM
vi.mock('canvas-confetti', () => ({
  default: vi.fn(),
}));
if (!process.env.PII_BLIND_INDEX_KEY || process.env.PII_BLIND_INDEX_KEY.includes('replace-with')) {
  process.env.PII_BLIND_INDEX_KEY = Buffer.alloc(32, 1).toString('base64');
}

