import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';

import { api } from '../../../../src/lib/api.js';
import {
  signalsRisksApi,
  type DataQualityReportData,
  type DealRiskScanResult,
  type SignalRiskHealthScore,
} from '../../../../src/features/signals-risks/signalsRisks.api.js';
import { SignalsRadarTab } from '../../../../src/features/signals-risks/components/SignalsRadarTab.js';
import { DealRisksTab } from '../../../../src/features/signals-risks/components/DealRisksTab.js';
import { computeDataQualityReport } from '../../../../src/features/market-intelligence/server/dataQualityReport.service.js';

describe('Capacidade 1 — RevOps: Fluxo Integrado de Previsibilidade, Sinais e Riscos', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  describe('Tarefa 1.1 — Contratos HTTP e Desempacotamento de Envelope da API', () => {
    it('desempacota corretamente o DataQualityReport da rota de Market Intelligence', async () => {
      const mockReportData = {
        generatedAt: new Date().toISOString(),
        accountCoverage: { available: true, totalAccounts: 20, coveragePct: 80 },
        signalCoverage: {
          available: true,
          reason: null,
          totalSignals: 8,
          accountsWithSignals: 5,
          byType: { EXPANSAO: 3, VAGAS: 5 },
          byStatus: { active: 8 },
        },
      };

      // Simula o comportamento real do api.get (que desempacota { success: true, data } -> data)
      vi.spyOn(api, 'get').mockResolvedValue(mockReportData as any);

      const coverage = await signalsRisksApi.getSignalCoverage();

      expect(coverage).not.toBeNull();
      expect(coverage?.available).toBe(true);
      expect(coverage?.totalSignals).toBe(8);
      expect(coverage?.accountsWithSignals).toBe(5);
      expect(coverage?.byType).toEqual({ EXPANSAO: 3, VAGAS: 5 });
    });

    it('trata graciosamente caso a API retorne envelope aninhado ou resposta direta', async () => {
      const mockNestedData = {
        data: {
          signalCoverage: {
            available: true,
            reason: null,
            totalSignals: 4,
            accountsWithSignals: 2,
            byType: { NOVA_OPERACAO: 4 },
            byStatus: { active: 4 },
          },
        },
      };

      vi.spyOn(api, 'get').mockResolvedValue(mockNestedData as any);

      const coverage = await signalsRisksApi.getSignalCoverage();

      expect(coverage).not.toBeNull();
      expect(coverage?.totalSignals).toBe(4);
    });

    it('retorna null e registra aviso observável quando o endpoint falha (sem quebrar a aplicação)', async () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      vi.spyOn(api, 'get').mockRejectedValue(new Error('500 Internal Server Error'));

      const coverage = await signalsRisksApi.getSignalCoverage();

      expect(coverage).toBeNull();
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('[signalsRisksApi] Falha ao obter cobertura de sinais de mercado'),
        expect.any(Object),
      );
    });

    it('desempacota scanDealRisks corretamente após post na rota de inteligência comercial', async () => {
      const mockScanResult: DealRiskScanResult = {
        scanned: 18,
        alertsCreated: 4,
        skippedCooldown: 3,
        errors: 0,
      };

      // api.post desempacota para data diretamente
      vi.spyOn(api, 'post').mockResolvedValue(mockScanResult as any);

      const result = await signalsRisksApi.scanDealRisks();

      expect(result.scanned).toBe(18);
      expect(result.alertsCreated).toBe(4);
      expect(result.skippedCooldown).toBe(3);
      expect(result.errors).toBe(0);
    });

    it('desempacota getHealthScore e extrai os pilares', async () => {
      const mockHealth: SignalRiskHealthScore = {
        overallScore: 88,
        pillars: [
          { pillar: 'pipeline', label: 'Pipeline', score: 90 },
          { pillar: 'conversao', label: 'Conversão', score: 85 },
        ],
      };

      vi.spyOn(api, 'get').mockResolvedValue(mockHealth as any);

      const health = await signalsRisksApi.getHealthScore();

      expect(health).not.toBeNull();
      expect(health?.overallScore).toBe(88);
      expect(health?.pillars).toHaveLength(2);
    });

    it('filtra notificações de risco e silêncio comercial em getRiskNotifications', async () => {
      vi.spyOn(api, 'get').mockResolvedValue({
        items: [
          { id: '1', title: 'Risco de perda — lead inativo', kind: 'Alerta', createdAt: new Date().toISOString() },
          { id: '2', title: 'Novo usuário adicionado', kind: 'Info', createdAt: new Date().toISOString() },
          { id: '3', title: 'Silêncio prolongado no WhatsApp', kind: 'Aviso', createdAt: new Date().toISOString() },
          { id: '4', title: 'Concorrente mencionado na chamada', kind: 'Alerta', createdAt: new Date().toISOString() },
        ],
        unread: 4,
      } as any);

      const riskNotifications = await signalsRisksApi.getRiskNotifications();

      expect(riskNotifications).toHaveLength(3);
      expect(riskNotifications.map((n) => n.id)).toEqual(['1', '3', '4']);
    });
  });

  describe('Tarefa 1.2 — Visualização de Dados Reais no SignalsRadarTab', () => {
    it('exibe as métricas consolidadas do tenant sem dados inventados quando coverage está ativo', () => {
      const realCoverage: DataQualityReportData = {
        available: true,
        reason: null,
        totalSignals: 14,
        accountsWithSignals: 7,
        byType: {
          EXPANSAO: 6,
          VAGAS: 8,
        },
        byStatus: { active: 14 },
      };

      render(<SignalsRadarTab coverage={realCoverage} loading={false} />);

      // Verifica cartões de métricas do tenant
      expect(screen.getAllByText('14')).toHaveLength(2); // Card principal e badge do filtro
      expect(screen.getByText('7')).toBeInTheDocument();
      expect(screen.getByText('14 Sinais')).toBeInTheDocument();

      // Confirma que não há mais o mock de 12 contas
      expect(screen.queryByText('12')).not.toBeInTheDocument();

      // Verifica os badges de contagem real nos filtros
      expect(screen.getByText('Todos os Sinais').closest('button')).toHaveTextContent('14');
      expect(screen.getByText('Expansão & Filiais').closest('button')).toHaveTextContent('6');
      expect(screen.getByText('Vagas & Headcount').closest('button')).toHaveTextContent('8');

      // Verifica ocorrências nos cards da taxonomia
      expect(screen.getByText('6 no tenant')).toBeInTheDocument();
      expect(screen.getByText('8 no tenant')).toBeInTheDocument();
    });

    it('exibe estado explícito de zero sinais e motivo real quando coverage não possui sinais', () => {
      const emptyCoverage: DataQualityReportData = {
        available: false,
        reason: 'nenhum_sinal_registrado_no_tenant',
        totalSignals: 0,
        accountsWithSignals: null,
        byType: null,
        byStatus: null,
      };

      render(<SignalsRadarTab coverage={emptyCoverage} loading={false} />);

      expect(screen.getAllByText('0')).toHaveLength(2); // Sinais Ativos e Contas com Sinais
      expect(screen.getByText('nenhum_sinal_registrado_no_tenant')).toBeInTheDocument();
      expect(screen.getByText('Aguardando Dados')).toBeInTheDocument();
    });

    it('filtra os sinais da taxonomia preservando a integridade comercial', () => {
      const realCoverage: DataQualityReportData = {
        available: true,
        reason: null,
        totalSignals: 2,
        accountsWithSignals: 2,
        byType: { EXPANSAO: 2 },
        byStatus: { active: 2 },
      };

      render(<SignalsRadarTab coverage={realCoverage} loading={false} />);

      const expansionFilter = screen.getByRole('button', { name: /Expansão & Filiais/i });
      fireEvent.click(expansionFilter);

      expect(screen.getByText('Abertura de Filial / Expansão Geográfica')).toBeInTheDocument();
      expect(screen.queryByText('Contratações Chave em Gestão')).not.toBeInTheDocument();
    });
  });

  describe('Tarefa 1.3 — Homologação da Varredura de Riscos no DealRisksTab', () => {
    it('executa scanDealRisks, exibe feedback detalhado e aciona callback de refresh', async () => {
      const onRefreshMock = vi.fn();
      vi.spyOn(signalsRisksApi, 'scanDealRisks').mockResolvedValue({
        scanned: 25,
        alertsCreated: 5,
        skippedCooldown: 2,
        errors: 0,
      });

      render(
        <DealRisksTab
          healthScore={{
            overallScore: 65,
            pillars: [
              { pillar: 'pipeline', label: 'Pipeline', score: 70 },
              { pillar: 'followUp', label: 'Follow-up', score: 60 },
            ],
          }}
          overviewAlerts={[]}
          notifications={[]}
          onRefresh={onRefreshMock}
        />,
      );

      // Clica no botão para escanear riscos
      const scanButton = screen.getByRole('button', { name: /Escanear Riscos Agora/i });
      fireEvent.click(scanButton);

      await waitFor(() => {
        expect(signalsRisksApi.scanDealRisks).toHaveBeenCalledTimes(1);
        expect(screen.getByText(/Escaneamento concluído/i)).toBeInTheDocument();
        expect(screen.getByText('25')).toBeInTheDocument(); // leads analisados
        expect(screen.getByText('5')).toBeInTheDocument(); // novos alertas
        expect(onRefreshMock).toHaveBeenCalledTimes(1);
      });
    });

    it('exibe erro visível e tratável quando a rota de IA atinge rate limit ou falha', async () => {
      vi.spyOn(signalsRisksApi, 'scanDealRisks').mockRejectedValue(
        new Error('Muitas requisições de IA para esta organização. Tente novamente em instantes.'),
      );

      render(
        <DealRisksTab
          healthScore={null}
          overviewAlerts={[]}
          notifications={[]}
          onRefresh={vi.fn()}
        />,
      );

      const scanButton = screen.getByRole('button', { name: /Escanear Riscos Agora/i });
      fireEvent.click(scanButton);

      await waitFor(() => {
        expect(
          screen.getByText(
            'Muitas requisições de IA para esta organização. Tente novamente em instantes.',
          ),
        ).toBeInTheDocument();
      });
    });
  });

  describe('Integração Pura do Serviço de Qualidade de Dados (Account Intelligence)', () => {
    it('computeDataQualityReport gera seção signalCoverage semanticamente compatível', () => {
      const now = new Date('2026-10-16T12:00:00Z');
      const report = computeDataQualityReport({
        now,
        totalAccounts: 10,
        latestSnapshots: [],
        evidenceByType: [],
        totalEvidence: 0,
        evidenceAccountCount: 0,
        signalsByType: [
          { key: 'EXPANSAO', count: 3 },
          { key: 'VAGAS', count: 2 },
        ],
        signalsByStatus: [
          { key: 'Active', count: 5 },
        ],
        totalSignals: 5,
        signalAccountCount: 4,
        decisionMakerTotal: 0,
        decisionMakerVerifiedCount: 0,
        decisionMakerByStatus: [],
        relationshipTotal: 0,
        relationshipByStatus: [],
      });

      expect(report.signalCoverage.available).toBe(true);
      expect(report.signalCoverage.totalSignals).toBe(5);
      expect(report.signalCoverage.accountsWithSignals).toBe(4);
      expect(report.signalCoverage.byType).toEqual({
        EXPANSAO: 3,
        VAGAS: 2,
      });
      expect(report.signalCoverage.byStatus).toEqual({
        Active: 5,
      });
    });
  });
});
