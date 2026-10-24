// @vitest-environment jsdom

import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { IntelligenceHub } from '../IntelligenceHub.js';

// Mocks dos componentes pesados filhos
vi.mock('../EliteCommercialAgentWorkspace.js', () => ({
  EliteCommercialAgentWorkspace: () => (
    <div data-testid="commercial-cell-view">Célula Workspace View</div>
  ),
}));
vi.mock('../GroqTelemetryPanel.js', () => ({
  GroqTelemetryPanel: () => <div data-testid="telemetry-view">Groq Telemetry View</div>,
}));
vi.mock('../AISuiteHub.js', () => ({
  AISuiteHub: () => <div data-testid="ai-suite-view">AI Suite View</div>,
}));
vi.mock('../SwarmDashboard.js', () => ({
  SwarmDashboard: () => <div data-testid="swarm-view">Swarm Dashboard View</div>,
}));
vi.mock('../AgentQualityPanel.js', () => ({
  AgentQualityPanel: () => <div data-testid="quality-view">Quality Panel View</div>,
}));
vi.mock('../SalesMethodologyStudio.js', () => ({
  SalesMethodologyStudio: () => <div data-testid="methodologies-view">Methodologies View</div>,
}));
vi.mock('../../../dashboard/components/AIConfigCenter.js', () => ({
  AIConfigCenter: () => <div data-testid="ai-config-view">AI Config View</div>,
}));
vi.mock('../SuperagentCreator.js', () => ({
  SuperagentCreator: () => <div data-testid="superagent-view">Superagent Creator View</div>,
}));
vi.mock('../RobustScriptGenerator.js', () => ({
  RobustScriptGenerator: () => <div data-testid="scripts-view">Scripts Generator View</div>,
}));
vi.mock('../AutomationGuide.js', () => ({
  AutomationGuide: () => <div data-testid="automations-view">Automation Guide View</div>,
}));
vi.mock('../B2BGenerator.js', () => ({
  B2BGenerator: () => <div data-testid="generator-view">B2B Generator View</div>,
}));
vi.mock('../../../components/Intelligence.js', () => ({
  Intelligence: () => <div data-testid="tools-view">Outreach Intelligence View</div>,
}));
vi.mock('../../../copiloto-ia/components/CopilotoIaHub.js', () => ({
  CopilotoIaHub: () => <div data-testid="copiloto-view">Copiloto IA View</div>,
}));
vi.mock('../AIPendingActions.js', () => ({
  AIPendingActions: () => <div data-testid="actions-view">Pending Actions View</div>,
}));
vi.mock('../../../knowledge/knowledge.api.js', () => ({
  knowledgeApi: {
    list: vi.fn().mockResolvedValue([]),
  },
}));

function renderHub(initialTab?: any) {
  return render(
    <MemoryRouter>
      <IntelligenceHub initialTab={initialTab} />
    </MemoryRouter>,
  );
}

describe('IntelligenceHub Redesigned', () => {
  it('renders executive header and live operational status badges', () => {
    renderHub();

    expect(screen.getByText('Hub de Inteligência Artificial & Agentes')).toBeInTheDocument();
    expect(screen.getByText('12 Agentes Prontos')).toBeInTheDocument();
    expect(screen.getByText('Ultra-Low Latency')).toBeInTheDocument();
    expect(screen.getByText('Guardrails Ativos')).toBeInTheDocument();
    expect(screen.getByText('RAG Híbrido Conectado')).toBeInTheDocument();
  });

  it('renders flagship hero card for Célula Comercial in default all view', () => {
    renderHub();

    expect(screen.getByText('Célula Comercial de Agentes Autônomos')).toBeInTheDocument();
    expect(screen.getByText('Acessar Célula Comercial')).toBeInTheDocument();
  });

  it('filters tools by category when clicking category tabs', () => {
    renderHub();

    // Clica na aba de Governança & Decisão
    const govTab = screen.getByRole('tab', { name: /Governança & Decisão/i });
    fireEvent.click(govTab);

    // Deve conter os 3 itens de governança
    expect(screen.getByText('Central de Decisões & Aprovações')).toBeInTheDocument();
    expect(screen.getByText('Qualidade & Harness do Enxame')).toBeInTheDocument();
    expect(screen.getByText('Telemetria Groq Cloud')).toBeInTheDocument();

    // Não deve conter itens táticos
    expect(screen.queryByText('Metodologias de Vendas B2B')).not.toBeInTheDocument();
  });

  it('filters tools dynamically via search query', () => {
    renderHub();

    const searchInput = screen.getByPlaceholderText(/Buscar capacidade/i);
    fireEvent.change(searchInput, { target: { value: 'groq' } });

    expect(screen.getByText('Telemetria Groq Cloud')).toBeInTheDocument();
    expect(screen.queryByText('Célula Comercial de Agentes')).not.toBeInTheDocument();
  });

  it('navigates into a tool view and allows returning via Voltar button', () => {
    renderHub();

    // Clica em Telemetria Groq Cloud
    const groqCard = screen.getByText('Telemetria Groq Cloud');
    fireEvent.click(groqCard);

    // Deve exibir o breadcrumb e a view da ferramenta
    expect(screen.getByTestId('telemetry-view')).toBeInTheDocument();
    expect(screen.getByText('Voltar ao Hub')).toBeInTheDocument();

    // Clica no botão Voltar
    fireEvent.click(screen.getByText('Voltar ao Hub'));

    // Deve voltar para a grade
    expect(screen.getByText('Hub de Inteligência Artificial & Agentes')).toBeInTheDocument();
  });
});
