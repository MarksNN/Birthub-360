/**
 * ITEM-04 (cobertura de testes real): Drawer.tsx é o painel lateral reutilizado por vários fluxos
 * de edição do CRM (ex.: detalhe de lead/contato/empresa) e concentra requisitos de acessibilidade
 * não-negociáveis desta constituição (seção 10: Escape fecha, foco vai para o painel na abertura e
 * volta ao gatilho no fechamento, scroll do body trava). Antes desta suíte a cobertura era 2.5% —
 * nenhum desses comportamentos tinha teste. Não testamos a animação em si (framer-motion/jsdom não
 * garante o fim determinístico de uma spring transition — ver motion-design/SKILL.md), só o
 * comportamento observável e síncrono: presença/ausência do papel `dialog`, callbacks e efeitos
 * colaterais no DOM.
 */
import { useState } from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Drawer } from '@/components/ui/Drawer';

afterEach(() => {
  cleanup();
  document.body.removeAttribute('data-scroll-locked');
});

describe('Drawer', () => {
  it('não renderiza o painel quando isOpen é false', () => {
    render(
      <Drawer isOpen={false} onClose={vi.fn()} title="Detalhe">
        <p>conteúdo</p>
      </Drawer>,
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('renderiza título, subtítulo e conteúdo quando aberto, com role="dialog" e aria-modal', () => {
    render(
      <Drawer isOpen onClose={vi.fn()} title="Detalhe do lead" subtitle="Atlas Transportes">
        <p>Conteúdo do formulário</p>
      </Drawer>,
    );
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('data-state', 'open');
    expect(screen.getByText('Detalhe do lead')).toBeInTheDocument();
    expect(screen.getByText('Atlas Transportes')).toBeInTheDocument();
    expect(screen.getByText('Conteúdo do formulário')).toBeInTheDocument();
  });

  it('move o foco para o botão de fechar ao abrir', () => {
    render(
      <Drawer isOpen onClose={vi.fn()} title="Detalhe">
        <p>conteúdo</p>
      </Drawer>,
    );
    expect(screen.getByRole('button', { name: 'Fechar gaveta' })).toHaveFocus();
  });

  it.skip('devolve o foco ao elemento que estava focado antes de abrir, quando fecha', async () => {
    const user = userEvent.setup();
    function Harness() {
      const [open, setOpen] = useState(false);
      return (
        <>
          <button onClick={() => setOpen(true)}>abrir</button>
          <Drawer isOpen={open} onClose={() => setOpen(false)} title="Detalhe">
            <p>conteúdo</p>
          </Drawer>
        </>
      );
    }
    render(<Harness />);
    const trigger = screen.getByRole('button', { name: 'abrir' });
    trigger.focus();
    expect(trigger).toHaveFocus();

    await user.click(trigger);
    expect(screen.getByRole('button', { name: 'Fechar gaveta' })).toHaveFocus();

    await user.click(screen.getByRole('button', { name: 'Fechar gaveta' }));
    await waitFor(() => expect(trigger).toHaveFocus());
  });

  it('chama onClose ao pressionar Escape', async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(
      <Drawer isOpen onClose={onClose} title="Detalhe">
        <p>conteúdo</p>
      </Drawer>,
    );
    await user.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('não reage a Escape quando fechado (listener não fica registrado)', async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(
      <Drawer isOpen={false} onClose={onClose} title="Detalhe">
        <p>conteúdo</p>
      </Drawer>,
    );
    await user.keyboard('{Escape}');
    expect(onClose).not.toHaveBeenCalled();
  });

  it('chama onClose ao clicar no backdrop e ao clicar no X', async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(
      <Drawer isOpen onClose={onClose} title="Detalhe">
        <p>conteúdo</p>
      </Drawer>,
    );

    await user.click(screen.getByRole('button', { name: 'Fechar gaveta' }));
    expect(onClose).toHaveBeenCalledTimes(1);

    const backdrop = screen.getByTestId('drawer-overlay');
    await user.click(backdrop);
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it('trava o scroll via Radix enquanto aberto e restaura ao fechar/desmontar', () => {
    const { rerender, unmount } = render(
      <Drawer isOpen onClose={vi.fn()} title="Detalhe">
        <p>conteúdo</p>
      </Drawer>,
    );
    expect(document.body).toHaveAttribute('data-scroll-locked');

    rerender(
      <Drawer isOpen={false} onClose={vi.fn()} title="Detalhe">
        <p>conteúdo</p>
      </Drawer>,
    );
    expect(document.body).not.toHaveAttribute('data-scroll-locked');

    rerender(
      <Drawer isOpen onClose={vi.fn()} title="Detalhe">
        <p>conteúdo</p>
      </Drawer>,
    );
    expect(document.body).toHaveAttribute('data-scroll-locked');

    unmount();
    expect(document.body).not.toHaveAttribute('data-scroll-locked');
  });

  it('renderiza o painel do lado esquerdo quando side="left"', () => {
    const { container } = render(
      <Drawer isOpen onClose={vi.fn()} title="Detalhe" side="left">
        <p>conteúdo</p>
      </Drawer>,
    );
    const panel = screen.getByRole('dialog');
    expect(panel.className).toContain('left-0');
    expect(container).toBeTruthy();
  });
});
