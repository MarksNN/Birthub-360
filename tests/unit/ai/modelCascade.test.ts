import { describe, expect, it } from 'vitest';
import { ModelCascadeRouter } from '../../../src/lib/ai/gateway/model-cascade.js';

describe('ModelCascadeRouter Unit Tests', () => {
  const router = new ModelCascadeRouter();

  it('should route LOW complexity tasks to fast and economical models', () => {
    const res = router.route('intent');
    expect(res.complexity).toBe('LOW');
    expect(res.selectedModel).toBe('local-llama3-fast');
    expect(res.estimatedCostPer1kTokensUsd).toBeLessThan(0.0005);
    expect(res.expectedLatencyMs).toBeLessThan(500);
  });

  it('should route MEDIUM complexity tasks to balanced contextual models', () => {
    const res = router.route('social-selling');
    expect(res.complexity).toBe('MEDIUM');
    expect(res.selectedModel).toBe('local-llama3');
    expect(res.fallbackModel).toBe('gpt-4o-mini');
  });

  it('should route HIGH complexity tasks to analytical deep reasoning models', () => {
    const res = router.route('roleplay-eval');
    expect(res.complexity).toBe('HIGH');
    expect(res.selectedModel).toBe('gpt-4o');
    expect(res.fallbackModel).toBe('claude-sonnet');
    expect(res.expectedLatencyMs).toBeGreaterThan(1000);
  });

  it('should allow user hint to override default inferred complexity', () => {
    const res = router.route('intent', 'HIGH');
    expect(res.complexity).toBe('HIGH');
    expect(res.selectedModel).toBe('gpt-4o');
  });
});
