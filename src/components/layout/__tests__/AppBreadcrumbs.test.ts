import { cleanup, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it } from 'vitest';
import { AppBreadcrumbs } from '../AppBreadcrumbs.js';

afterEach(() => {
  cleanup();
});

describe('AppBreadcrumbs Component (App Shell)', () => {
  it('renderiza breadcrumbs automáticos a partir do caminho da rota', () => {
    render(
      React.createElement(
        MemoryRouter,
        { initialEntries: ['/app/crm'] },
        React.createElement(AppBreadcrumbs, null),
      ),
    );

    expect(screen.getByRole('navigation', { name: /navegação estrutural/i })).toBeInTheDocument();
    expect(screen.getByText('Início')).toBeInTheDocument();
    expect(screen.getByText('Pipeline CRM')).toBeInTheDocument();
  });

  it('renderiza caminho aninhado com sub-rotas corretamente', () => {
    render(
      React.createElement(
        MemoryRouter,
        { initialEntries: ['/app/market-intelligence/hub'] },
        React.createElement(AppBreadcrumbs, null),
      ),
    );

    expect(screen.getByText('Início')).toBeInTheDocument();
    expect(screen.getByText('Inteligência de Mercado')).toBeInTheDocument();
    expect(screen.getByText('Hub de Inteligência')).toBeInTheDocument();
  });

  it('marca o último item como aria-current="page"', () => {
    render(
      React.createElement(
        MemoryRouter,
        { initialEntries: ['/app/prospect'] },
        React.createElement(AppBreadcrumbs, null),
      ),
    );

    const currentPage = screen.getByText('Prospecção');
    expect(currentPage).toHaveAttribute('aria-current', 'page');
  });
});
