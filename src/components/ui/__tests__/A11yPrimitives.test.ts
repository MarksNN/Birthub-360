import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Button } from '../Button.js';
import { Dialog } from '../Dialog.js';

afterEach(() => {
  cleanup();
});

describe('Button (A03-P1-03)', () => {
  it('fica desabilitado e com aria-busy quando loading, mesmo com disabled={false} explícito', () => {
    const onClick = vi.fn();
    render(
      React.createElement(
        Button,
        { loading: true, disabled: false, onClick, magnetic: false },
        'Salvar',
      ),
    );
    const button = screen.getByRole('button', { name: 'Salvar' });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('aria-busy', 'true');
    fireEvent.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });

  it('com asChild e loading, não injeta o spinner como segundo filho do Slot', () => {
    render(
      React.createElement(
        Button,
        { asChild: true, loading: true, magnetic: false },
        React.createElement('a', { href: '#destino' }, 'Ir'),
      ),
    );
    const link = screen.getByRole('link', { name: 'Ir' });
    expect(link.querySelector('svg')).toBeNull();
  });
});

describe('Dialog (A03-P1-05)', () => {
  it('renderiza subtitle como descrição acessível', () => {
    render(
      React.createElement(
        Dialog,
        { isOpen: true, onClose: () => {}, title: 'Título', subtitle: 'Descrição do modal' },
        React.createElement('p', null, 'Corpo'),
      ),
    );
    const dialog = screen.getByRole('dialog', { name: 'Título' });
    expect(dialog).toHaveAccessibleDescription('Descrição do modal');
  });

  it('sem title, ainda expõe um nome acessível', () => {
    render(
      React.createElement(
        Dialog,
        { isOpen: true, onClose: () => {} },
        React.createElement('p', null, 'Corpo'),
      ),
    );
    expect(screen.getByRole('dialog', { name: 'Diálogo' })).toBeInTheDocument();
  });

  it('preventClose bloqueia Esc e não chama onClose', () => {
    const onClose = vi.fn();
    render(
      React.createElement(
        Dialog,
        { isOpen: true, onClose, title: 'Salvando', preventClose: true },
        React.createElement('p', null, 'Corpo'),
      ),
    );
    const dialog = screen.getByRole('dialog');
    fireEvent.keyDown(dialog, { key: 'Escape' });
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Fechar modal' })).not.toBeInTheDocument();
  });
});
