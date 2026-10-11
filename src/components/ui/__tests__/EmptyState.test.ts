import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { EmptyState } from '../EmptyState.js';

afterEach(() => {
  cleanup();
});

describe('EmptyState Component (Design System Primitives)', () => {
  it('renderiza título, descrição e ícone com tokens de superfície e tema', () => {
    const dummyIcon = React.createElement('span', { 'data-testid': 'custom-icon' }, 'Icon');
    render(
      React.createElement(EmptyState, {
        title: 'Nenhum lead encontrado',
        description: 'Tente ajustar os filtros da busca para ver resultados.',
        icon: dummyIcon,
      }),
    );

    expect(screen.getByText('Nenhum lead encontrado')).toBeInTheDocument();
    expect(
      screen.getByText('Tente ajustar os filtros da busca para ver resultados.'),
    ).toBeInTheDocument();
    expect(screen.getByTestId('custom-icon')).toBeInTheDocument();
  });

  it('renderiza botão de ação quando fornecido e dispara o callback onAction', () => {
    const onAction = vi.fn();
    render(
      React.createElement(EmptyState, {
        title: 'Sem integrações configuradas',
        description: 'Conecte seu Bitrix24 ou CRM externo.',
        actionLabel: 'Adicionar Conexão',
        onAction,
      }),
    );

    const button = screen.getByRole('button', { name: 'Adicionar Conexão' });
    expect(button).toBeInTheDocument();

    fireEvent.click(button);
    expect(onAction).toHaveBeenCalledTimes(1);
  });
});
