import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApproachGeneratorCard } from '../../../../src/features/social-selling/components/ApproachGeneratorCard.js';
import { socialSellingApi } from '../../../../src/features/social-selling/api/socialSelling.api.js';

describe('ApproachGeneratorCard — Social Selling IA', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('renderiza o formulário e o estado vazio inicial corretamente', () => {
    render(<ApproachGeneratorCard />);

    expect(screen.getByText('Gerador de Abordagens')).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Ex: Banco Neon, TOTVS/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Ex: Diretor Comercial/i)).toBeInTheDocument();
    expect(screen.getByText('Nenhuma abordagem gerada ainda')).toBeInTheDocument();

    const submitBtn = screen.getByRole('button', { name: /Gerar Abordagem com IA/i });
    expect(submitBtn).toBeDisabled();
  });

  it('permite preenchimento dos campos e habilita o botão de geração', () => {
    render(<ApproachGeneratorCard />);

    const companyInput = screen.getByPlaceholderText(/Ex: Banco Neon, TOTVS/i);
    const roleInput = screen.getByPlaceholderText(/Ex: Diretor Comercial/i);
    const submitBtn = screen.getByRole('button', { name: /Gerar Abordagem com IA/i });

    fireEvent.change(companyInput, { target: { value: 'Logística Alfa' } });
    fireEvent.change(roleInput, { target: { value: 'Diretor de Operações' } });

    expect(submitBtn).not.toBeDisabled();
  });

  it('chama socialSellingApi e exibe a abordagem gerada com suas seções estruturadas', async () => {
    vi.spyOn(socialSellingApi, 'generateApproach').mockResolvedValue({
      headline: 'Abordagem Consultiva para Logística Alfa',
      hook: 'Olá Carlos! Acompanhando o mercado de transporte, notei o crescimento da sua frota.',
      body: 'Identificamos que operações de médio porte reduzem custos de ociosidade em até 22% com automação.',
      callToAction: 'Como vocês têm monitorado o gargalo entre pátio e faturamento?',
      fullMessage: 'Mensagem completa formatada para envio no LinkedIn.',
      channel: 'linkedin',
      tone: 'consultivo',
      modelUsed: 'local-llama3-fast',
      estimatedTokens: 310,
    });

    render(<ApproachGeneratorCard />);

    fireEvent.change(screen.getByPlaceholderText(/Ex: Banco Neon, TOTVS/i), {
      target: { value: 'Logística Alfa' },
    });
    fireEvent.change(screen.getByPlaceholderText(/Ex: Diretor Comercial/i), {
      target: { value: 'Diretor de Operações' },
    });

    const submitBtn = screen.getByRole('button', { name: /Gerar Abordagem com IA/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText('Abordagem Consultiva para Logística Alfa')).toBeInTheDocument();
    });

    expect(
      screen.getByText(/Olá Carlos! Acompanhando o mercado de transporte/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Identificamos que operações de médio porte reduzem custos/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Como vocês têm monitorado o gargalo entre pátio/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Mensagem completa formatada para envio no LinkedIn.'),
    ).toBeInTheDocument();
    expect(screen.getByText('local-llama3-fast')).toBeInTheDocument();
    expect(screen.getByText('310')).toBeInTheDocument();
  });

  it('permite copiar o texto gerado para a área de transferência', async () => {
    vi.spyOn(socialSellingApi, 'generateApproach').mockResolvedValue({
      headline: 'Headline Teste',
      hook: 'Gancho Teste',
      body: 'Corpo Teste',
      callToAction: 'CTA Teste',
      fullMessage: 'Texto final para copiar',
      channel: 'whatsapp',
      tone: 'executivo',
      modelUsed: 'mock-model',
      estimatedTokens: 100,
    });

    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      clipboard: {
        writeText: writeTextMock,
      },
    });

    render(<ApproachGeneratorCard />);

    fireEvent.change(screen.getByPlaceholderText(/Ex: Banco Neon, TOTVS/i), {
      target: { value: 'Empresa X' },
    });
    fireEvent.change(screen.getByPlaceholderText(/Ex: Diretor Comercial/i), {
      target: { value: 'CEO' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Gerar Abordagem com IA/i }));

    await waitFor(() => {
      expect(screen.getByText('Headline Teste')).toBeInTheDocument();
    });

    const copyBtn = screen.getByRole('button', { name: /Copiar/i });
    fireEvent.click(copyBtn);

    expect(writeTextMock).toHaveBeenCalledWith('Texto final para copiar');
    await waitFor(() => {
      expect(screen.getByText('Copiado!')).toBeInTheDocument();
    });
  });

  it('exibe mensagem de erro quando a API falha', async () => {
    vi.spyOn(socialSellingApi, 'generateApproach').mockRejectedValue(
      new Error('AI Gateway indisponível no momento'),
    );

    render(<ApproachGeneratorCard />);

    fireEvent.change(screen.getByPlaceholderText(/Ex: Banco Neon, TOTVS/i), {
      target: { value: 'Empresa Erro' },
    });
    fireEvent.change(screen.getByPlaceholderText(/Ex: Diretor Comercial/i), {
      target: { value: 'Diretor' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Gerar Abordagem com IA/i }));

    await waitFor(() => {
      expect(screen.getByText('AI Gateway indisponível no momento')).toBeInTheDocument();
    });
  });
});
