import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Card, CardDescription, CardTitle } from '../Card.js';
import { Input } from '../Input.js';
import { PageTitleCard } from '../PageTitleCard.js';

afterEach(cleanup);
describe('Official identity primitive contracts', () => {
  it('keeps a card keyboard action and loading content while replacing its accent strip', () => {
    const onClick = vi.fn();
    const { container } = render(
      React.createElement(
        Card,
        { accentBar: true, isLoading: true, onClick },
        React.createElement(CardTitle, null, 'Receita'),
        React.createElement(CardDescription, null, 'Dados comerciais'),
      ),
    );
    const card = screen.getByRole('button');
    expect(card).toHaveAttribute('data-accent', 'gold');
    expect(card).toHaveClass('bh-platform-card');
    expect(container.querySelector('.h-\\[2px\\]')).toBeNull();
    expect(screen.getByText('Receita').parentElement).toHaveClass('opacity-60');
    fireEvent.keyDown(card, { key: 'Enter' });
    expect(onClick).toHaveBeenCalledTimes(1);
  });
  it('reports invalid input without replacing its accessible description', () => {
    render(
      React.createElement(Input, {
        error: true,
        'aria-invalid': false,
        'aria-label': 'E-mail',
        'aria-describedby': 'email-error',
      }),
    );
    expect(screen.getByRole('textbox')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByRole('textbox')).toHaveAttribute('aria-describedby', 'email-error');
  });
  it('preserves heading levels and semantic accents on page titles', () => {
    const { container } = render(
      React.createElement(PageTitleCard, {
        title: 'Previsibilidade',
        as: 'h2',
        accent: 'gold',
        subtitle: 'Dados da operação',
      }),
    );
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Previsibilidade');
    expect(container.querySelector('header')).toHaveAttribute('data-accent', 'gold');
  });
});
