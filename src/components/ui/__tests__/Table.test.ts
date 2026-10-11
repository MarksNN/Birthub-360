import { cleanup, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import React from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
} from '../Table.js';

afterEach(() => {
  cleanup();
});

describe('Table Component (Design System Primitives)', () => {
  it('renderiza uma tabela completa com semântica acessível e tokens do tema', () => {
    render(
      React.createElement(
        Table,
        null,
        React.createElement(TableCaption, null, 'Lista de Empresas Prospecção'),
        React.createElement(
          TableHeader,
          null,
          React.createElement(
            TableRow,
            null,
            React.createElement(TableHead, null, 'Empresa'),
            React.createElement(TableHead, null, 'Status'),
          ),
        ),
        React.createElement(
          TableBody,
          null,
          React.createElement(
            TableRow,
            { 'data-state': 'selected' },
            React.createElement(TableCell, null, 'Birth Hub 360'),
            React.createElement(TableCell, null, 'Ativo'),
          ),
        ),
        React.createElement(
          TableFooter,
          null,
          React.createElement(
            TableRow,
            null,
            React.createElement(TableCell, null, 'Total'),
            React.createElement(TableCell, null, '1 registro'),
          ),
        ),
      ),
    );

    const table = screen.getByRole('table');
    expect(table).toBeInTheDocument();

    expect(screen.getByText('Lista de Empresas Prospecção')).toBeInTheDocument();
    expect(screen.getByText('Empresa')).toBeInTheDocument();
    expect(screen.getByText('Birth Hub 360')).toBeInTheDocument();

    const selectedRow = screen.getByText('Birth Hub 360').closest('tr');
    expect(selectedRow).toHaveClass('data-[state=selected]:bg-brand/10');
  });
});
