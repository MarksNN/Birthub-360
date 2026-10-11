import { createElement } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { getMock } = vi.hoisted(() => ({ getMock: vi.fn() }));
vi.mock('@/lib/api', () => ({ api: { get: getMock, post: vi.fn() } }));

import { InteligenciaMercadoHub } from '../InteligenciaMercadoHub.js';
import { ProspeccaoInteligenteHub } from '../ProspeccaoInteligenteHub.js';

function renderWithRouter(ui: React.ReactElement) {
  return render(createElement(MemoryRouter, null, ui));
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});

describe('B-06 InteligenciaMercadoHub — sem dados fictícios', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        json: async () => ({
          success: true,
          data: [],
          meta: { page: 1, pageSize: 25, total: 0, totalPages: 0 },
          dataset: null,
        }),
      })),
    );
  });

  it('mostra estado bloqueado quando não há snapshot e nunca lista empresas inventadas', async () => {
    renderWithRouter(createElement(InteligenciaMercadoHub));
    expect(
      await screen.findByText('Catálogo de inteligência não disponível'),
    ).toBeInTheDocument();
    expect(screen.queryByText('TechLog Soluções')).not.toBeInTheDocument();
    expect(screen.queryByText('1.420 empresas')).not.toBeInTheDocument();
    expect(screen.queryByText('91.4%')).not.toBeInTheDocument();
  });

  it('renderiza empresas reais do catálogo quando o dataset existe', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        json: async () => ({
          success: true,
          data: [
            {
              id: 'co-1',
              cnpj: '11222333000181',
              razaoSocial: 'Empresa Real LTDA',
              nomeFantasia: 'Empresa Real',
              cnaePrincipalDescricao: 'Software',
              uf: 'SP',
              municipioNome: 'São Paulo',
              icpScore: 77,
              icpTier: 'A',
            },
          ],
          meta: { page: 1, pageSize: 25, total: 1, totalPages: 1 },
          dataset: { competencia: '2026-08', recordsActive: 1 },
        }),
      })),
    );
    renderWithRouter(createElement(InteligenciaMercadoHub));
    expect(await screen.findByText('Empresa Real')).toBeInTheDocument();
    expect(screen.getByText('11222333000181')).toBeInTheDocument();
    expect(screen.queryByText('AgroFinance Tech')).not.toBeInTheDocument();
  });
});

describe('B-06 ProspeccaoInteligenteHub — sem dados fictícios', () => {
  it('bloqueia quando nenhum provedor está pronto e não mostra decisores inventados', async () => {
    getMock.mockImplementation(async (url: string) => {
      if (url.startsWith('/api/prospecting/providers')) {
        return [
          { id: 'apollo', configured: false, status: 'unavailable', billable: true },
          { id: 'cnpjDataset', configured: true, status: 'unavailable', billable: false },
        ];
      }
      if (url.startsWith('/api/contacts')) {
        return { data: [], meta: { total: 0, page: 1, limit: 25, totalPages: 0 } };
      }
      throw new Error(`URL inesperada: ${url}`);
    });
    renderWithRouter(createElement(ProspeccaoInteligenteHub));
    expect(
      await screen.findByText('Provedores de prospecção não conectados'),
    ).toBeInTheDocument();
    expect(screen.queryByText('Rodrigo Medeiros')).not.toBeInTheDocument();
    expect(screen.queryByText('CloudScale Brasil')).not.toBeInTheDocument();
    expect(screen.queryByText('4.850 contatos')).not.toBeInTheDocument();
    expect(screen.queryByText('98.2%')).not.toBeInTheDocument();
  });

  it('lista contatos reais do tenant quando há provedor pronto', async () => {
    getMock.mockImplementation(async (url: string) => {
      if (url.startsWith('/api/prospecting/providers')) {
        return [
          { id: 'apollo', configured: true, status: 'authenticated', billable: true },
          { id: 'cnpjDataset', configured: true, status: 'ready', billable: false },
        ];
      }
      if (url.startsWith('/api/contacts')) {
        return {
          data: [
            {
              id: 'ct-1',
              name: 'Ana Real',
              role: 'CEO',
              department: null,
              company: { tradeName: 'Tenant Corp', legalName: 'Tenant Corp LTDA', segment: 'SaaS' },
            },
          ],
          meta: { total: 1, page: 1, limit: 25, totalPages: 1 },
        };
      }
      throw new Error(`URL inesperada: ${url}`);
    });
    renderWithRouter(createElement(ProspeccaoInteligenteHub));
    expect(await screen.findByText('Ana Real')).toBeInTheDocument();
    expect(screen.getByText('Tenant Corp')).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText('Contatos no tenant')).toBeInTheDocument();
    });
    expect(screen.queryByText('Camila Guimarães')).not.toBeInTheDocument();
  });
});
