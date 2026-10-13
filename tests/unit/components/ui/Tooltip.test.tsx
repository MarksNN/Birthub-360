import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { Tooltip } from '@/components/ui/Tooltip';

afterEach(() => {
  cleanup();
});

describe('Tooltip Component', () => {
  it('renderiza o elemento filho e exibe a dica contextual ao passar o mouse', async () => {
    render(
      <Tooltip content="Dica de contexto Bitrix24" delay={0}>
        <button type="button">Sincronizar Bitrix</button>
      </Tooltip>,
    );

    const button = screen.getByRole('button', { name: 'Sincronizar Bitrix' });
    expect(button).toBeInTheDocument();

    fireEvent.mouseEnter(button);

    await waitFor(() => {
      expect(screen.getByRole('tooltip')).toHaveTextContent('Dica de contexto Bitrix24');
    });

    fireEvent.mouseLeave(button);

    await waitFor(() => {
      expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
    });
  });

  it('exibe a dica contextual ao receber foco via teclado', async () => {
    render(
      <Tooltip content="Dica de contexto Ações em Lote" delay={0}>
        <button type="button">Seleção em Lote</button>
      </Tooltip>,
    );

    const button = screen.getByRole('button', { name: 'Seleção em Lote' });
    fireEvent.focus(button);

    await waitFor(() => {
      expect(screen.getByRole('tooltip')).toHaveTextContent('Dica de contexto Ações em Lote');
    });

    fireEvent.blur(button);

    await waitFor(() => {
      expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
    });
  });
});
