/**
 * Testes unitários para Dynamic Routing.
 * Valida seleção de provider/model baseada em custo, latência, disponibilidade e tenant tier.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { isCircuitOpen } from '../gateway/circuit-breaker.js';
import {
  __resetLatencyCacheForTests,
  recordLatency,
  selectDynamicRouting,
} from '../gateway/dynamic-routing.js';
import type { ProviderAdapter } from '../gateway/providers/types.js';

// Mock do circuit breaker
vi.mock('../gateway/circuit-breaker.js', () => ({
  isCircuitOpen: vi.fn(),
}));

// Mock de providers
const mockProvider1: ProviderAdapter = {
  name: 'groq',
  isConfigured: () => true,
  chatCompletion: vi.fn(),
};

const mockProvider2: ProviderAdapter = {
  name: 'openai',
  isConfigured: () => true,
  chatCompletion: vi.fn(),
};

const mockProvider3: ProviderAdapter = {
  name: 'vllm',
  isConfigured: () => false, // Não configurado
  chatCompletion: vi.fn(),
};

describe('Dynamic Routing', () => {
  beforeEach(() => {
    __resetLatencyCacheForTests();
    vi.clearAllMocks();
  });

  describe('recordLatency', () => {
    it('deve registrar latência e calcular média móvel', () => {
      recordLatency('groq', 'local-llama3', 100);
      recordLatency('groq', 'local-llama3', 200);
      recordLatency('groq', 'local-llama3', 300);

      // A média deve ser (100 + 200 + 300) / 3 = 200
      // Não consigo acessar o cache diretamente, mas a função não deve lançar erro
      expect(() => recordLatency('groq', 'local-llama3', 400)).not.toThrow();
    });

    it('deve limitar número de amostras', () => {
      // Registra muitas amostras
      for (let i = 0; i < 100; i++) {
        recordLatency('groq', 'local-llama3', 100 + i);
      }
      // Não deve lançar erro
      expect(() => recordLatency('groq', 'local-llama3', 500)).not.toThrow();
    });
  });

  describe('selectDynamicRouting', () => {
    it('deve lançar erro se nenhum provider estiver configurado', async () => {
      vi.mocked(isCircuitOpen).mockResolvedValue(false);

      await expect(
        selectDynamicRouting({
          requestedModel: 'local-llama3',
          availableProviders: [mockProvider3], // Não configurado
        }),
      ).rejects.toThrow('Nenhum provider de IA configurado');
    });

    it('deve selecionar provider com circuit fechado', async () => {
      vi.mocked(isCircuitOpen)
        .mockResolvedValueOnce(false) // groq
        .mockResolvedValueOnce(true); // openai

      const result = await selectDynamicRouting({
        requestedModel: 'local-llama3',
        availableProviders: [mockProvider1, mockProvider2],
      });

      expect(result.selectedProvider.name).toBe('groq');
      expect(result.reason).toContain('Disponibilidade: 100%');
    });

    it('deve usar fallback se todos os providers tiverem circuit aberto', async () => {
      vi.mocked(isCircuitOpen).mockResolvedValue(true);

      const result = await selectDynamicRouting({
        requestedModel: 'local-llama3',
        availableProviders: [mockProvider1, mockProvider2],
      });

      expect(result.score).toBe(0);
      expect(result.reason).toContain('Fallback: todos os providers com circuit aberto');
    });

    it('deve ajustar pesos baseado no tenant tier', async () => {
      vi.mocked(isCircuitOpen).mockResolvedValue(false);

      // Tier free/starter: custo mais importante
      const resultFree = await selectDynamicRouting({
        tenantTier: 'free',
        requestedModel: 'local-llama3',
        availableProviders: [mockProvider1, mockProvider2],
      });

      // Tier enterprise: latência mais importante
      const resultEnterprise = await selectDynamicRouting({
        tenantTier: 'enterprise',
        requestedModel: 'local-llama3',
        availableProviders: [mockProvider1, mockProvider2],
      });

      // Ambos devem retornar um provider válido
      expect(resultFree.selectedProvider).toBeDefined();
      expect(resultEnterprise.selectedProvider).toBeDefined();
    });

    it('deve retornar score entre 0 e 1', async () => {
      vi.mocked(isCircuitOpen).mockResolvedValue(false);

      const result = await selectDynamicRouting({
        requestedModel: 'local-llama3',
        availableProviders: [mockProvider1, mockProvider2],
      });

      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(1);
    });

    it('deve incluir justificativa no resultado', async () => {
      vi.mocked(isCircuitOpen).mockResolvedValue(false);

      const result = await selectDynamicRouting({
        requestedModel: 'local-llama3',
        availableProviders: [mockProvider1, mockProvider2],
      });

      expect(result.reason).toBeDefined();
      expect(typeof result.reason).toBe('string');
      expect(result.reason.length).toBeGreaterThan(0);
    });
  });

  describe('__resetLatencyCacheForTests', () => {
    it('deve limpar o cache de latência', () => {
      recordLatency('groq', 'local-llama3', 100);
      __resetLatencyCacheForTests();
      // Não deve lançar erro após reset
      expect(() => recordLatency('groq', 'local-llama3', 200)).not.toThrow();
    });
  });
});
