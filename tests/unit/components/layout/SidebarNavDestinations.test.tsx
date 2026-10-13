/**
 * Shell Impeccable Operate (Agente 02) + handoff 05: a Sidebar precisa levar a TODOS os destinos
 * reais do pilar de Inteligência de Mercado — LDR (`/app/market-intelligence`), Hub de MI
 * (`/app/market-intelligence/hub`) e Prospecção Inteligente (`/app/prospect/inteligente`) —, que
 * antes eram rotas órfãs. Também fixa que o rodapé não mostra mais contagem inventada ("7 sinais").
 */
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

const useAuthMock = vi.fn();
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => useAuthMock() }));
vi.mock('framer-motion', async (importOriginal) => ({
  ...(await importOriginal<typeof import('framer-motion')>()),
  useReducedMotion: () => true,
}));

import { Sidebar } from '@/components/layout/Sidebar';
import type { TabType } from '@/components/layout/tabMeta';

afterEach(cleanup);

function Where() {
  return <p data-testid="where">{useLocation().pathname}</p>;
}

function renderAt(path: string, activeTab: TabType) {
  useAuthMock.mockReturnValue({
    currentUser: { name: 'Teste', role: 'GESTOR', roleTitle: 'GESTOR' },
    isAdmin: false,
    canAccessCommercialIntelligence: true,
    canAccessCopilotoIa: true,
  });
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Sidebar activeTab={activeTab} />
      <Where />
    </MemoryRouter>,
  );
}

describe('Sidebar — destinos de MI e prospecção (handoff 05)', () => {
  it('na rota do hub, expande o grupo e marca só o Hub como página atual', () => {
    renderAt('/app/market-intelligence/hub', 'market-intelligence');
    const hub = screen.getByTestId('sidebar-sub-market-intelligence/hub');
    const ldr = screen.getByTestId('sidebar-sub-market-intelligence');
    expect(hub).toHaveAttribute('aria-current', 'page');
    expect(ldr).not.toHaveAttribute('aria-current');
  });

  it('navega para /app/prospect/inteligente pelo sub-item', () => {
    renderAt('/app/prospect', 'prospect');
    fireEvent.click(screen.getByTestId('sidebar-sub-prospect/inteligente'));
    expect(screen.getByTestId('where')).toHaveTextContent('/app/prospect/inteligente');
  });

  it('navega para o hub de MI a partir do LDR', () => {
    renderAt('/app/market-intelligence', 'market-intelligence');
    expect(screen.getByTestId('sidebar-sub-market-intelligence')).toHaveAttribute(
      'aria-current',
      'page',
    );
    fireEvent.click(screen.getByTestId('sidebar-sub-market-intelligence/hub'));
    expect(screen.getByTestId('where')).toHaveTextContent('/app/market-intelligence/hub');
  });

  it('rótulo "Copiloto IA" e rodapé sem contagem fabricada', () => {
    renderAt('/app/dashboard', 'dashboard');
    expect(screen.getByRole('button', { name: 'Copiloto IA' })).toBeInTheDocument();
    expect(screen.queryByText(/7 sinais/)).not.toBeInTheDocument();
    expect(screen.getByTestId('sidebar-intelligence-cta')).toHaveTextContent('Ver Hub de IA');
  });
});
