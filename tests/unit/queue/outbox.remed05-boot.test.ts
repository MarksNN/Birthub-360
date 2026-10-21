import { describe, expect, it } from 'vitest';
import { DomainEventOutboxConfigError, resolveDomainEventOutboxMode } from '../../../src/lib/queue/outbox/outboxMode.js';

describe('REMED-05 fail-closed do modo da outbox', () => {
  it('production sem DOMAIN_EVENT_OUTBOX=prisma falha com erro claro', () => {
    expect(() => resolveDomainEventOutboxMode({ NODE_ENV: 'production' })).toThrow(DomainEventOutboxConfigError);
    expect(() => resolveDomainEventOutboxMode({ NODE_ENV: 'production', DOMAIN_EVENT_OUTBOX: 'memory' })).toThrow(
      /NODE_ENV=production exige DOMAIN_EVENT_OUTBOX=prisma/,
    );
  });
  it('production com prisma passa', () => {
    expect(resolveDomainEventOutboxMode({ NODE_ENV: 'production', DOMAIN_EVENT_OUTBOX: 'prisma' })).toBe('prisma');
  });
  it('dev/test continuam em memória por padrão', () => {
    expect(resolveDomainEventOutboxMode({ NODE_ENV: 'test' })).toBe('memory');
    expect(resolveDomainEventOutboxMode({ NODE_ENV: 'development' })).toBe('memory');
    expect(resolveDomainEventOutboxMode({})).toBe('memory');
  });
  it('valor inválido é rejeitado', () => {
    expect(() => resolveDomainEventOutboxMode({ NODE_ENV: 'test', DOMAIN_EVENT_OUTBOX: 'redis' })).toThrow(/inválido/);
  });
});

describe('REMED-05 registro síncrono no boot', () => {
  it('configure é síncrono e registra a UoW antes de retornar', async () => {
    const { configureDomainEventOutboxFromEnv } = await import('../../../src/lib/queue/outbox/prismaRuntime.js');
    const { domainEventMesh } = await import('../../../src/lib/queue/domainEventMesh.service.js');
    const { PrismaOutboxRepository } = await import('../../../src/lib/queue/outbox/prismaOutbox.repository.js');
    const { InMemoryOutboxRepository, InMemoryConsumptionStore } = await import('../../../src/lib/queue/outbox/inMemory.js');
    expect(configureDomainEventOutboxFromEnv({ NODE_ENV: 'test' })).toBeNull();
    const result = configureDomainEventOutboxFromEnv({ NODE_ENV: 'production', DOMAIN_EVENT_OUTBOX: 'prisma' });
    expect(result).not.toBeInstanceOf(Promise);
    expect(result?.unitOfWork).toBeDefined();
    expect((domainEventMesh as unknown as { outbox: unknown }).outbox).toBeInstanceOf(PrismaOutboxRepository);
    expect(() => configureDomainEventOutboxFromEnv({ NODE_ENV: 'production' })).toThrow(/fail-closed/);
    domainEventMesh.configure({ outbox: new InMemoryOutboxRepository(), consumptions: new InMemoryConsumptionStore() });
  });

  it('setupDI registra DomainEventOutboxUnitOfWork de forma síncrona', async () => {
    const { registerDomainEventOutbox } = await import('../../../src/shared/di/setup.js');
    const { container } = await import('../../../src/shared/di/container.js');
    const { domainEventMesh } = await import('../../../src/lib/queue/domainEventMesh.service.js');
    const { InMemoryOutboxRepository, InMemoryConsumptionStore } = await import('../../../src/lib/queue/outbox/inMemory.js');
    expect(registerDomainEventOutbox({ NODE_ENV: 'test' })).toBe(false);
    const ok = registerDomainEventOutbox({ NODE_ENV: 'production', DOMAIN_EVENT_OUTBOX: 'prisma' });
    expect(ok).toBe(true);
    expect(container.resolve('DomainEventOutboxUnitOfWork')).toBeDefined();
    expect(() => registerDomainEventOutbox({ NODE_ENV: 'production' })).toThrow(/fail-closed/);
    domainEventMesh.configure({ outbox: new InMemoryOutboxRepository(), consumptions: new InMemoryConsumptionStore() });
  });
});
