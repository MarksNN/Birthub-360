import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { createElement, useState } from 'react';
import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ProspectCriteria } from '../../../domain/prospectTypes.js';
import { DiscoveryFilterPanel } from '../DiscoveryFilterPanel.js';

afterEach(cleanup);

function renderFilters() {
  const onDiscover = vi.fn();
  const onInterpret = vi.fn();
  let latest: ProspectCriteria = { segmento: '', localizacao: '', quantidade: 20 };
  function Harness() {
    const [criteria, setCriteria] = useState(latest);
    latest = criteria;
    return createElement(DiscoveryFilterPanel, {
      criteria,
      setCriteria,
      activeSegments: [],
      activePersonaOptions: [],
      cities: [],
      showAdvanced: true,
      setShowAdvanced: vi.fn(),
      isSearching: false,
      discoverError: null,
      onDiscover,
      onInterpret,
      isInterpreting: false,
      interpretationMessage: null,
    });
  }
  render(createElement(Harness));
  return { onDiscover, onInterpret, criteria: () => latest };
}

describe('Turbo filters — real criteria and explicit permissions', () => {
  it('removes volume and user quantity while preserving the internal page limit', () => {
    const harness = renderFilters();
    expect(screen.queryByLabelText(/^Volume$/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Quantidade de Leads')).not.toBeInTheDocument();
    expect(harness.criteria().quantidade).toBe(20);
  });

  it('persists segment lists and multiple editable persona templates without replacing prior personas', () => {
    const harness = renderFilters();
    const products = screen.getByLabelText(/Produtos comercializados/);
    fireEvent.change(products, { target: { value: 'software, consultoria, software' } });
    fireEvent.blur(products);
    fireEvent.change(screen.getByLabelText('Adicionar modelo de persona'), {
      target: { value: 'CEO' },
    });
    fireEvent.change(screen.getByLabelText('Adicionar modelo de persona'), {
      target: { value: 'CFO' },
    });
    expect(harness.criteria().segmentoDetalhes?.produtos).toEqual(['software', 'consultoria']);
    expect(harness.criteria().personas?.map((p) => p.cargoPrincipal)).toEqual(['CEO', 'CFO']);
    fireEvent.click(screen.getByRole('button', { name: 'Remover persona 1' }));
    expect(harness.criteria().personas?.[0].cargoPrincipal).toBe('CFO');
  });

  it('requires explicit consent before sending a natural-language query, preserving provider mode', () => {
    const harness = renderFilters();
    fireEvent.change(screen.getByLabelText('Descreva sua pesquisa'), {
      target: { value: 'Empresas de engenharia em SP' },
    });
    const interpret = screen.getByRole('button', { name: 'Interpretar e preencher filtros' });
    expect(interpret).toBeDisabled();
    fireEvent.click(screen.getByLabelText(/Autorizo enviar somente esta descrição/));
    fireEvent.change(screen.getByLabelText('Provedor de IA'), { target: { value: 'local' } });
    fireEvent.change(screen.getByLabelText('Modelo de IA (opcional)'), {
      target: { value: '  llama3.2:3b  ' },
    });
    fireEvent.click(interpret);
    expect(harness.onInterpret).toHaveBeenCalledWith(
      'Empresas de engenharia em SP',
      'local',
      'llama3.2:3b',
    );
    expect(screen.getByLabelText('Descreva sua pesquisa')).toHaveAttribute('maxlength', '2000');
    expect(screen.getByLabelText('Modelo de IA (opcional)')).toHaveAttribute('maxlength', '120');
    expect(harness.onDiscover).not.toHaveBeenCalled();
  });

  it('requires paid-provider authorization independently of the selected search mode and clears all criteria', () => {
    const harness = renderFilters();
    fireEvent.change(screen.getByLabelText('Modo de pesquisa'), { target: { value: 'completo' } });
    expect(harness.criteria().autorizarPagos).toBeUndefined();
    fireEvent.click(screen.getByLabelText(/Autorizar provedores que podem consumir/));
    expect(harness.criteria().autorizarPagos).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: 'Limpar todos os filtros' }));
    expect(harness.criteria()).toEqual({
      segmento: '',
      localizacao: '',
      quantidade: 20,
      modoPesquisa: 'economico',
      autorizarPagos: false,
    });
  });
});
