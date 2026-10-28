import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { type TabCardItem, TabNavCards } from '../TabNavCards.js';

afterEach(() => {
  cleanup();
});

describe('TabNavCards (Design System Primitives)', () => {
  const dummyIcon = ({ className }: { className?: string }) =>
    React.createElement('span', { 'data-testid': 'test-icon', className });

  const items: TabCardItem[] = [
    {
      id: 'tab-1',
      title: 'Visão Geral',
      subtitle: 'Métricas consolidadas',
      icon: dummyIcon,
    },
    {
      id: 'tab-2',
      title: 'Prospecção',
      subtitle: 'Contatos e empresas',
      icon: dummyIcon,
    },
  ];

  it('renderiza todos os itens com role="tab" e acessibilidade adequada', () => {
    const onSelect = vi.fn();
    render(
      React.createElement(TabNavCards, {
        items,
        activeId: 'tab-1',
        onSelect,
      }),
    );

    const tabs = screen.getAllByRole('tab');
    expect(tabs).toHaveLength(2);

    expect(tabs[0]).toHaveAttribute('aria-selected', 'true');
    expect(tabs[1]).toHaveAttribute('aria-selected', 'false');

    expect(screen.getByText('Visão Geral')).toBeInTheDocument();
    expect(screen.getByText('Métricas consolidadas')).toBeInTheDocument();
  });

  it('dispara onSelect ao clicar em uma aba inativa', () => {
    const onSelect = vi.fn();
    render(
      React.createElement(TabNavCards, {
        items,
        activeId: 'tab-1',
        onSelect,
      }),
    );

    const tab2 = screen.getByText('Prospecção');
    fireEvent.click(tab2);

    expect(onSelect).toHaveBeenCalledWith('tab-2');
  });

  it('possui classes de foco e semântica de tokens no elemento ativo', () => {
    const onSelect = vi.fn();
    render(
      React.createElement(TabNavCards, {
        items,
        activeId: 'tab-1',
        onSelect,
      }),
    );

    const tabs = screen.getAllByRole('tab');
    expect(tabs[0].className).toContain('border-brand/60');
    expect(tabs[0].className).toContain('focus-visible:ring-ring');
  });
});
