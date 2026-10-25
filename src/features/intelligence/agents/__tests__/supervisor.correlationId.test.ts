import { describe, expect, it } from 'vitest';
import { buildSwarmCorrelationId } from '../supervisor.agent.js';

describe('buildSwarmCorrelationId', () => {
  it('usa o thread_id do checkpoint (tenant:sid) quando presente', () => {
    const config = { configurable: { thread_id: 'tenant-a:sess-123' } };

    expect(buildSwarmCorrelationId(config, 1700000000000)).toBe(
      'swarm-tenant-a:sess-123-1700000000000',
    );
  });

  it('cai em no-thread sem config, sem thread_id, com thread_id vazio ou não-string', () => {
    const now = 42;

    expect(buildSwarmCorrelationId(undefined, now)).toBe('swarm-no-thread-42');
    expect(buildSwarmCorrelationId({}, now)).toBe('swarm-no-thread-42');
    expect(buildSwarmCorrelationId({ configurable: {} }, now)).toBe('swarm-no-thread-42');
    expect(buildSwarmCorrelationId({ configurable: { thread_id: '' } }, now)).toBe(
      'swarm-no-thread-42',
    );
    expect(buildSwarmCorrelationId({ configurable: { thread_id: 123 } }, now)).toBe(
      'swarm-no-thread-42',
    );
  });
});
