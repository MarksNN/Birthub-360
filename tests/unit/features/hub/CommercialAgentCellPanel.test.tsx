import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const legacyList = vi.hoisted(() => vi.fn());
const listAgents = vi.hoisted(() => vi.fn());
const getAgent = vi.hoisted(() => vi.fn());
const getPlaybook = vi.hoisted(() => vi.fn());
const dispatchMission = vi.hoisted(() => vi.fn());
const evaluateRedteam = vi.hoisted(() => vi.fn());

vi.mock('../../../../src/features/hub/commercialAgentCell.api.js', () => ({
  commercialAgentCellApi: { list: legacyList },
}));
vi.mock('../../../../src/features/hub/commercialV3.api.js', () => ({
  commercialV3Api: {
    listAgents,
    getAgent,
    getPlaybook,
    dispatchMission,
    evaluateRedteam,
  },
}));

import { CommercialAgentCellPanel } from '../../../../src/features/hub/components/CommercialAgentCellPanel.js';

const agents = [
  {
    id: 'icp',
    name: 'Arquiteto de ICP',
    prompt: 'p',
    index: 'i',
    skills: 11,
    playbooks: 1,
  },
  { id: 'sdr', name: 'SDR de Cadência', prompt: 'p', index: 'i', skills: 4, playbooks: 2 },
];

const skills = Array.from({ length: 11 }, (_, index) => ({
  id: `comercial.icp.skill-${index}`,
  name: `Habilidade ${index}`,
  playbookId: 'P1',
  catalogStage: 'operacao',
  number: index + 1,
  agentId: 'icp' as const,
}));

const detail = {
  agent: agents[0],
  skillsCount: skills.length,
  skills,
  playbooksCount: 1,
  playbooks: [{ id: 'P1', name: 'Abertura', path: 'playbooks/p1.md' }],
  handoffs: [['sdr', 'Qualificar e devolver', 'nota']],
};

const missionResult = {
  status: 'COMPLETED',
  missionId: 'mission-1',
  resumo_humano: 'Análise consultiva sem envio.',
  compliance: { channel: 'NONE', sendEligible: false },
  execution: { performed: false },
};

function deferred<T>() {
  let resolve: (value: T) => void = () => {};
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

describe('CommercialAgentCellPanel', () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    legacyList.mockResolvedValue([
      {
        id: 'closer',
        name: 'Closer',
        role: 'Fechamento',
        status: 'REAL_EM_PRODUCAO',
        mission: 'Conduzir a proposta até o sim.',
      },
    ]);
    listAgents.mockResolvedValue({ success: true, data: agents });
    getAgent.mockResolvedValue({ success: true, data: detail });
    getPlaybook.mockResolvedValue({
      success: true,
      data: { playbook: detail.playbooks[0], content: '# SOP de abertura' },
    });
    dispatchMission.mockResolvedValue({ success: true, data: missionResult });
    evaluateRedteam.mockResolvedValue({
      success: true,
      data: {
        totalCasesEvaluated: 209,
        complianceRate: 100,
        passedCases: 209,
        failedCases: 0,
        byAgent: [{ agentId: 'icp', passed: 11, total: 11 }],
      },
    });
  });

  it('filtra especialistas, abre playbook e despacha missão consultiva', async () => {
    render(<CommercialAgentCellPanel />);
    expect(await screen.findByText('Arquiteto de ICP')).toBeTruthy();
    expect(screen.getByText('SDR de Cadência')).toBeTruthy();

    fireEvent.change(screen.getByPlaceholderText('Buscar especialista...'), {
      target: { value: 'cadência' },
    });
    expect(screen.queryByText('Arquiteto de ICP')).toBeNull();
    fireEvent.change(screen.getByPlaceholderText('Buscar especialista...'), {
      target: { value: 'zzzz-sem-agente' },
    });
    expect(screen.queryByText('SDR de Cadência')).toBeNull();
    fireEvent.change(screen.getByPlaceholderText('Buscar especialista...'), {
      target: { value: '' },
    });

    fireEvent.click(screen.getByText('Arquiteto de ICP'));
    expect(await screen.findByText('Habilidade 0')).toBeTruthy();
    expect(screen.getByText(/\+ 1 outras habilidades/)).toBeTruthy();
    expect(screen.getByText('→ sdr')).toBeTruthy();

    fireEvent.click(screen.getByText(/P1: Abertura/));
    expect(await screen.findByText('# SOP de abertura')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Voltar' }));
    expect(screen.queryByText('# SOP de abertura')).toBeNull();

    const dispatch = screen.getByRole('button', { name: 'Executar Demanda' });
    expect(dispatch).toHaveProperty('disabled', true);
    fireEvent.change(screen.getByPlaceholderText(/Formule a estratégia/), {
      target: { value: 'Monte o ICP industrial.' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Executar Demanda' }));
    expect(await screen.findByText('Análise consultiva sem envio.')).toBeTruthy();
    expect(screen.getByText(/ID: mission-1/)).toBeTruthy();
    expect(screen.getByText(/NÃO \(Rascunho Seguro\)/)).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Fechar' }));
    await waitFor(() => {
      expect(screen.queryByText('Habilidade 0')).toBeNull();
    });
  });

  it('mostra erros de catálogo, playbook, missão e redteam', async () => {
    listAgents.mockRejectedValueOnce(new Error('catálogo fora'));
    legacyList.mockRejectedValueOnce('legado bruto');
    const view = render(<CommercialAgentCellPanel />);
    expect(await screen.findByText('catálogo fora')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: /Célula Legada/ }));
    expect(await screen.findByText('Falha ao carregar a Célula Legada.')).toBeTruthy();

    listAgents.mockResolvedValueOnce({ success: true, data: agents });
    view.unmount();
    render(<CommercialAgentCellPanel />);
    fireEvent.click(await screen.findByText('Arquiteto de ICP'));
    getPlaybook.mockRejectedValueOnce(new Error('playbook fora'));
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    fireEvent.click(await screen.findByText(/P1: Abertura/));
    await waitFor(() => expect(errorSpy).toHaveBeenCalled());
    errorSpy.mockRestore();

    dispatchMission.mockResolvedValueOnce({ success: false });
    fireEvent.change(screen.getByPlaceholderText(/Formule a estratégia/), {
      target: { value: 'Sem canal.' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Executar Demanda' }));
    expect(await screen.findByText('Não foi possível concluir a missão.')).toBeTruthy();

    dispatchMission.mockRejectedValueOnce('falha bruta');
    fireEvent.click(screen.getByRole('button', { name: 'Executar Demanda' }));
    expect(await screen.findByText('Erro ao processar a missão comercial.')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: /Auditoria Redteam \(209 Testes\)/ }));
    const auditButtons = screen.getAllByRole('button', { name: /Executar Auditoria Completa/ });
    evaluateRedteam.mockResolvedValueOnce({ success: false });
    fireEvent.click(auditButtons[0]);
    expect(await screen.findByText('Falha ao processar a auditoria Redteam.')).toBeTruthy();

    evaluateRedteam.mockRejectedValueOnce(new Error('redteam fora'));
    fireEvent.click(screen.getAllByRole('button', { name: /Executar Auditoria Completa/ })[0]);
    expect(await screen.findByText('redteam fora')).toBeTruthy();
  });

  it('mostra o relatório redteam e a célula legada carregada', async () => {
    render(<CommercialAgentCellPanel />);
    fireEvent.click(screen.getByRole('button', { name: /Auditoria Redteam \(209 Testes\)/ }));
    fireEvent.click(screen.getByRole('button', { name: /Executar Auditoria Completa/ }));
    expect(await screen.findAllByText('209')).toHaveLength(2);
    expect(screen.getByText('icp')).toBeTruthy();
    expect(screen.getByText((_, node) => node?.textContent === '11/11')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: /Célula Legada/ }));
    expect(await screen.findByText('Closer')).toBeTruthy();
    expect(screen.getByText('Em produção')).toBeTruthy();
    expect(screen.getByText('Conduzir a proposta até o sim.')).toBeTruthy();
  });

  it('mantém o estado de carregamento enquanto as APIs não respondem', async () => {
    const agentsCall = deferred<{ success: boolean; data: typeof agents }>();
    const legacyCall = deferred<unknown[]>();
    listAgents.mockReturnValueOnce(agentsCall.promise);
    legacyList.mockReturnValueOnce(legacyCall.promise);
    render(<CommercialAgentCellPanel />);
    expect(screen.getByText(/Carregando Suíte V3.1/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /Célula Legada/ }));
    expect(screen.getByText(/Carregando agentes legados/)).toBeTruthy();
    agentsCall.resolve({ success: true, data: [] });
    legacyCall.resolve([]);
    await waitFor(() => {
      expect(screen.queryByText(/Carregando agentes legados/)).toBeNull();
    });
  });

  it('encerra o carregamento quando o detalhe do agente falha', async () => {
    getAgent.mockRejectedValueOnce(new Error('detalhe fora'));
    render(<CommercialAgentCellPanel />);
    fireEvent.click(await screen.findByText('Arquiteto de ICP'));
    expect(await screen.findByText(/Carregando habilidades/)).toBeTruthy();
    await waitFor(() => {
      expect(screen.queryByText(/Carregando habilidades/)).toBeNull();
    });
    expect(screen.queryByText('Habilidade 0')).toBeNull();
  });
});
