import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { GamificationWidget } from '../../../../src/components/ui/GamificationWidget.js';
import { gamificationApi } from '../../../../src/features/gamification/api/gamification.api.js';
import { GamificationView } from '../../../../src/features/gamification/components/GamificationView.js';
import type {
  LeaderboardRanking,
  SellerScore,
} from '../../../../src/features/gamification/domain/Gamification.js';
import { api } from '../../../../src/lib/api.js';

// Mock do contexto de autenticação
vi.mock('../../../../src/contexts/AuthContext.js', () => ({
  useAuth: () => ({
    currentUser: {
      id: 'usr-sdr-01',
      name: 'João Silva',
      email: 'joao.silva@birthhub360.com.br',
      role: 'SDR',
      roleTitle: 'SDR',
      permissions: ['leads:view'],
      avatarBg: '#3B82F6',
      mustChangePassword: false,
    },
    isAdmin: false,
    canAccessAdminPanel: () => false,
    canAccessCommercialIntelligence: false,
    canAccessCopilotoIa: true,
    isPending: false,
    logout: vi.fn(),
  }),
}));

// Mock dos efeitos sonoros e 3D orb para ambiente jsdom
vi.mock('../../../../src/lib/soundEffects.js', () => ({
  SoundFX: {
    play: vi.fn(),
    toggleMute: vi.fn().mockReturnValue(true),
    isEnabled: vi.fn().mockReturnValue(true),
  },
}));

vi.mock('../../../../src/components/ui/Gamified3DOrb.js', () => ({
  Gamified3DOrb: ({ onOrbClick }: { onOrbClick?: () => void }) => (
    <div data-testid="mock-3d-orb" onClick={onOrbClick}>
      3D Orb Mock
    </div>
  ),
}));

vi.mock('canvas-confetti', () => ({
  default: vi.fn(),
}));

describe('Capacidade 2 — Gamificação: Fluxo Integrado do Cockpit Comercial', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  const mockLeaderboard: LeaderboardRanking = {
    period: 'month',
    rankings: [
      {
        sellerName: 'João Silva',
        userId: 'usr-sdr-01',
        totalPoints: 2450,
        level: 3,
        levelTitle: 'Closer Sênior',
        callsCount: 65,
        meetingsCount: 14,
        qualifiedCount: 22,
        dealsClosed: 4,
        wonRevenue: 125000,
        streakDays: 5,
        badges: [
          {
            id: 'FIRST_BLOOD',
            title: 'Primeiro Fechamento',
            description: 'Fechou o primeiro negócio ganho no CRM',
            icon: 'Trophy',
            unlocked: true,
          },
          {
            id: 'CALL_MASTER',
            title: 'Mestre da Conexão',
            description: 'Realizou 50 ou mais ligações comerciais registradas',
            icon: 'PhoneCall',
            unlocked: true,
          },
          {
            id: 'MEETING_PRO',
            title: 'Agenda Blindada',
            description: 'Conduziu 10 ou mais reuniões de vendas agendadas',
            icon: 'CalendarCheck',
            unlocked: true,
          },
          {
            id: 'CLOSER_ELITE',
            title: 'Closer de Elite',
            description: 'Superou R$ 100.000 em volume de negócios fechados',
            icon: 'Flame',
            unlocked: true,
          },
        ],
      },
      {
        sellerName: 'Maria Santos',
        userId: 'usr-sdr-02',
        totalPoints: 1820,
        level: 3,
        levelTitle: 'Closer Sênior',
        callsCount: 42,
        meetingsCount: 8,
        qualifiedCount: 15,
        dealsClosed: 2,
        wonRevenue: 48000,
        streakDays: 2,
        badges: [
          {
            id: 'FIRST_BLOOD',
            title: 'Primeiro Fechamento',
            description: 'Fechou o primeiro negócio ganho no CRM',
            icon: 'Trophy',
            unlocked: true,
          },
        ],
      },
    ],
  };

  const mockSellerProfile: SellerScore = mockLeaderboard.rankings[0];

  describe('Microtarefa 2.1 — Client de API Frontend (gamificationApi)', () => {
    it('desempacota o payload do endpoint de leaderboard corretamente', async () => {
      vi.spyOn(api, 'get').mockResolvedValue(mockLeaderboard as any);

      const result = await gamificationApi.getLeaderboard('month');

      expect(result.period).toBe('month');
      expect(result.rankings).toHaveLength(2);
      expect(result.rankings[0].sellerName).toBe('João Silva');
      expect(result.rankings[0].totalPoints).toBe(2450);
    });

    it('retorna fallback seguro vazio em caso de erro na chamada do leaderboard', async () => {
      vi.spyOn(api, 'get').mockRejectedValue(new Error('Network error'));

      const result = await gamificationApi.getLeaderboard('week');

      expect(result.period).toBe('week');
      expect(result.rankings).toEqual([]);
    });

    it('obtém o perfil do vendedor e mapeia badges desbloqueadas', async () => {
      vi.spyOn(api, 'get').mockResolvedValue(mockSellerProfile as any);

      const profile = await gamificationApi.getSellerProfile('João Silva');

      expect(profile).not.toBeNull();
      expect(profile?.sellerName).toBe('João Silva');
      expect(profile?.level).toBe(3);
      expect(profile?.badges).toHaveLength(4);
      expect(profile?.badges[0].unlocked).toBe(true);
    });
  });

  describe('Microtarefa 2.2 e 2.4 — GamificationWidget com Dados Reais e Interações', () => {
    it('renderiza nível, pontos e badges reais a partir de sellerScore', () => {
      render(
        <GamificationWidget
          initialXp={mockSellerProfile.totalPoints}
          level={mockSellerProfile.level}
          streakDays={mockSellerProfile.streakDays}
          sellerScore={mockSellerProfile}
          show3DCore
        />,
      );

      expect(screen.getByText(/Nível 3/i)).toBeInTheDocument();
      expect(screen.getByText(/5 Dias Seguidos/i)).toBeInTheDocument();
      expect(screen.getByText(/2.450/i)).toBeInTheDocument();
    });

    it('abre painel de conquistas e exibe badges calculadas a partir de dados reais', () => {
      render(
        <GamificationWidget
          initialXp={mockSellerProfile.totalPoints}
          level={mockSellerProfile.level}
          streakDays={mockSellerProfile.streakDays}
          sellerScore={mockSellerProfile}
          show3DCore
        />,
      );

      const toggleButton = screen.getByRole('button', { name: /abrir missões e conquistas/i });
      fireEvent.click(toggleButton);

      const achievementsTab = screen.getByRole('button', { name: /conquistas 3d/i });
      fireEvent.click(achievementsTab);

      expect(screen.getByText(/Primeiro Fechamento/i)).toBeInTheDocument();
      expect(screen.getByText(/Mestre da Conexão/i)).toBeInTheDocument();
    });

    it('permite interação com o Cristal 3D incrementando pontos de esforço', () => {
      render(
        <GamificationWidget
          initialXp={100}
          level={1}
          streakDays={0}
          sellerScore={null}
          show3DCore
        />,
      );

      const orb = screen.getByTestId('mock-3d-orb');
      fireEvent.click(orb);

      // 100 + 25 = 125 XP
      expect(screen.getByText(/125/i)).toBeInTheDocument();
    });
  });

  describe('Microtarefa 2.3 — View Completa do Cockpit (GamificationView)', () => {
    beforeEach(() => {
      vi.spyOn(gamificationApi, 'getLeaderboard').mockResolvedValue(mockLeaderboard);
      vi.spyOn(gamificationApi, 'getSellerProfile').mockResolvedValue(mockSellerProfile);
    });

    it('carrega o ranking geral, destaca o usuário corrente e exibe métricas reais', async () => {
      render(
        <MemoryRouter>
          <GamificationView />
        </MemoryRouter>,
      );

      await waitFor(() => {
        expect(screen.getByText(/Gamificação & Aceleração de Vendas/i)).toBeInTheDocument();
      });

      // Usuário corrente destacado
      expect(screen.getByText('Você')).toBeInTheDocument();
      expect(screen.getByText('Maria Santos')).toBeInTheDocument();

      // Métricas de esforço exibidas
      expect(screen.getAllByText(/65/).length).toBeGreaterThanOrEqual(1); // chamadas do João Silva
      expect(screen.getAllByText(/14/).length).toBeGreaterThanOrEqual(1); // reuniões do João Silva
    });

    it('alterna o filtro de período do Leaderboard recarregando o ranking', async () => {
      render(
        <MemoryRouter>
          <GamificationView />
        </MemoryRouter>,
      );

      await waitFor(() => {
        expect(screen.getByText(/Ranking Geral da Equipe/i)).toBeInTheDocument();
      });

      const weekButton = screen.getByRole('button', { name: /esta semana/i });
      fireEvent.click(weekButton);

      expect(gamificationApi.getLeaderboard).toHaveBeenCalledWith('week');
    });

    it('exibe estado honesto de equipe sem atividades quando rankings estão vazios', async () => {
      vi.spyOn(gamificationApi, 'getLeaderboard').mockResolvedValue({
        period: 'month',
        rankings: [],
      });
      vi.spyOn(gamificationApi, 'getSellerProfile').mockResolvedValue(null);

      render(
        <MemoryRouter>
          <GamificationView />
        </MemoryRouter>,
      );

      await waitFor(() => {
        expect(
          screen.getByText(/Nenhuma atividade comercial registrada neste período/i),
        ).toBeInTheDocument();
      });
    });
  });
});
