import type React from 'react';
import { DailyPlanHub } from './DailyPlanHub.js';

export { DailyPlanHub };

import {
  BarChart3,
  BookOpen,
  Bot,
  Calendar,
  CalendarCheck,
  ClipboardCheck,
  FileText,
  Inbox,
  ShieldCheck,
} from 'lucide-react';
import { useState } from 'react';
import type { DealCardData } from '../../../components/ui/DealsGrid.js';
import { Dialog } from '../../../components/ui/Dialog.js';
import type { FunnelBarItem } from '../../../components/ui/FunnelBars.js';
import { useAuth } from '../../../contexts/AuthContext.js';
import {
  type ActiveTab,
  type CallAnalysisResult,
  CHANNEL_HEX,
  type ChannelTag,
  ComparativeTab,
  DailyTab,
  type DailyTask,
  DEAL_STAGE_LABEL,
  DEFAULT_DAILY_PLAN,
  DIAGNOSTIC_DATA,
  DiagnosticBottlenecksTab,
  EmCadenciaTab,
  IaCoachTab,
  MonthFunnelTab,
  Pauta1to1Tab,
  type SegmentKey,
} from './diagnostic/index.js';

function toFunnelItems(
  items: readonly { status: string; nome: string; leadsUnicos: number }[],
): FunnelBarItem[] {
  return items.map((item) => ({
    id: item.status,
    label: item.nome,
    value: item.leadsUnicos,
    tone: item.status === 'CONVERTED' ? 'ok' : item.status === 'JUNK' ? 'critical' : 'brand',
  }));
}

function toDealCardData(
  deals: readonly { id: string; titulo: string; empresa: string; stage: string; valor: number }[],
): DealCardData[] {
  return deals.map((d) => {
    const status = d.stage === 'WON' ? 'won' : d.stage === 'LOSE' ? 'lost' : 'open';
    const statusLabel =
      status === 'won'
        ? 'Ganho'
        : status === 'lost'
          ? 'Perdido'
          : (DEAL_STAGE_LABEL[d.stage] ?? d.stage);
    return { id: d.id, title: d.empresa || d.titulo, status, statusLabel, value: d.valor };
  });
}

function formatCurrency(val: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
}

export function JoaoReisDiagnosticHub() {
  const { currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState<ActiveTab>('daily');
  const [dailyTasks, setDailyTasks] = useState<DailyTask[]>(DEFAULT_DAILY_PLAN);
  const [dailyNotes, setDailyNotes] = useState<string>('');
  const [todayActivitiesCount, setTodayActivitiesCount] = useState<number>(28);
  const [selectedSegment, setSelectedSegment] = useState<SegmentKey>('transportadora');
  const [callTranscriptInput, setCallTranscriptInput] = useState<string>('');
  const [callAnalysisResult, setCallAnalysisResult] = useState<CallAnalysisResult | null>(null);
  const [sprintLeadIndex, setSprintLeadIndex] = useState<number>(0);
  const [channelTag, setChannelTag] = useState<ChannelTag>('[WhatsApp]');
  const [copiedPauta, setCopiedPauta] = useState(false);
  const [modalContent, setModalContent] = useState<{ title: string; body: React.ReactNode } | null>(
    null,
  );

  const toggleTask = (taskId: string) => {
    setDailyTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, completed: !t.completed } : t)),
    );
  };

  const resetDailyTasks = () => {
    setDailyTasks(DEFAULT_DAILY_PLAN);
  };

  const analyzeTranscript = () => {
    if (!callTranscriptInput.trim()) return;
    const lower = callTranscriptInput.toLowerCase();
    const hasNextStep =
      lower.includes('próximo passo') ||
      lower.includes('agenda') ||
      lower.includes('amanhã') ||
      lower.includes('reunião');
    const mentionsFleet =
      lower.includes('caminhão') ||
      lower.includes('frota') ||
      lower.includes('veículos') ||
      lower.includes('motorista');

    let baseScore = 65;
    if (hasNextStep) baseScore += 20;
    if (mentionsFleet) baseScore += 15;

    setCallAnalysisResult({
      score: Math.min(100, baseScore),
      talkListenRatio: '45% SDR / 55% Cliente (Excelente)',
      qualificationTime: '1m 40s (Rápido & Focado)',
      lockedNextStep: hasNextStep,
      strengths: [
        'Abertura direta mencionando autoridade no setor de transporte.',
        mentionsFleet
          ? 'Explorou o dimensionamento da frota do lead com precisão.'
          : 'Tom assertivo e empático com a dor de contratação.',
      ],
      improvements: [
        hasNextStep
          ? 'Confirmar recebimento do convite de agenda via WhatsApp logo após a call.'
          : 'OBRIGATÓRIO: Sempre travar dia e hora específicos da call de fechamento antes de desligar.',
      ],
    });
  };

  const generatePautaMarkdown = () => {
    return `# PAUTA DE ALINHAMENTO 1:1 — SDR JOÃO REIS & GESTOR COMERCIAL
Data: ${new Date().toLocaleDateString('pt-BR')}
Profissional: João Reis (ID Bitrix: 392)
Pilar: Commercial Intelligence & Prospecção Ativa

---

## 1. RESUMO EXECUTIVO DE INDICADORES (AGOSTO vs JULHO)
- Leads Trabalhados: 179 (+179.7% vs Julho)
- Atividades Realizadas: 530 (+148.8% vs Julho)
- Reuniões Agendadas: 15 (8.4% de conversão — Ponto Crítico de Ajuste)
- Negócios Ganhos: 5 deals ganhos gerando R$ 363,16 em receita direta

---

## 2. PONTOS FORTES E RECONHECIMENTOS
- Volume de atividade e dedicação física de prospecção expressiva.
- Capacidade de recuperar negócios em pipeline (5 ganhos em Agosto contra 1 em Julho).
- Disciplina em manter volume de toques diários acima de 25 contatos.

---

## 3. GARGALOS E PLANO DE AÇÃO IMEDIATO
1. **Queda na Conversão de Agendamento (25% → 8.4%):**
   - *Causa provável:* Menor tempo de escuta e qualificação superficial ao tentar acelerar o volume.
   - *Ação:* Reduzir velocidade da abordagem inicial e usar o pitch segmentado de 3 minutos.
2. **Discriminação de Canais no Bitrix24:**
   - *Situação:* 88% das atividades foram salvas como genéricas.
   - *Ação:* Utilizar o seletor de tag obrigatório [WhatsApp], [Ligação], [E-mail] antes de registrar.
3. **Leads Parados em Cadência (> 30 dias):**
   - *Ação:* Executar limpeza e desqualificação em massa dos 51 leads com gap superior a 30 dias.

---

## 4. COMPROMISSOS FIRMADOS PARA A PRÓXIMA SEMANA
- [ ] Bater mínimo de 2 reuniões agendadas por dia.
- [ ] Atacar 100% dos novos leads inbound em menos de 2 horas úteis.
- [ ] Atualizar status do estoque "Em Cadência" para eliminar backlog inativo.
`;
  };

  const copyPautaToClipboard = () => {
    navigator.clipboard.writeText(generatePautaMarkdown());
    setCopiedPauta(true);
    setTimeout(() => setCopiedPauta(false), 2500);
  };

  const completedCount = dailyTasks.filter((t) => t.completed).length;
  const progressPercent = Math.round((completedCount / (dailyTasks.length || 1)) * 100);
  const currentPacePercent = Math.min(100, Math.round((todayActivitiesCount / 60) * 100));

  const TAB_ITEMS = [
    {
      id: 'daily' as const,
      icon: ClipboardCheck,
      title: 'Plano Diário',
      subtitle: `${completedCount}/${dailyTasks.length} (${progressPercent}%)`,
    },
    { id: 'iacoach' as const, icon: Bot, title: 'IA Coach SDR', subtitle: 'Pitches & Meet' },
    {
      id: 'pauta1to1' as const,
      icon: FileText,
      title: 'Pauta de 1:1',
      subtitle: 'Exportar p/ Gestor',
    },
    { id: 'julho' as const, icon: Calendar, title: 'Julho 2026', subtitle: '213 Atividades' },
    {
      id: 'agosto' as const,
      icon: CalendarCheck,
      title: 'Agosto 2026',
      subtitle: '530 Atividades',
    },
    { id: 'comparativo' as const, icon: BarChart3, title: 'Comparativo', subtitle: 'Jul x Ago Δ' },
    { id: 'emcadencia' as const, icon: Inbox, title: 'Em Cadência', subtitle: '130 Leads Fila' },
    {
      id: 'diagnostico' as const,
      icon: BookOpen,
      title: 'Diagnóstico',
      subtitle: 'Gargalos & Ação',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-ink flex items-center gap-2">
            Central de Diagnóstico &amp; Treinamento SDR — João Reis
          </h2>
          <p className="text-xs text-ink-2">
            Base oficial de inteligência operacional, histórico Bitrix24 e rotina guiada de alta
            performance.
          </p>
        </div>

        {currentUser && (
          <div className="px-4 py-2 rounded-2xl bg-brand-active text-on-brand text-xs font-black shadow-md flex items-center gap-2">
            <ShieldCheck className="w-4 h-4" />
            Sessão Exclusiva — João Reis
          </div>
        )}
      </div>

      {/* Navegação por Abas */}
      <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-8 gap-3">
        {TAB_ITEMS.map(({ id, icon: Icon, title, subtitle }) => {
          const active = activeTab === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => setActiveTab(id)}
              className={`relative overflow-hidden flex items-center gap-3 rounded-card border p-3.5 text-left transition-colors duration-200 cursor-pointer ${
                active
                  ? 'border-brand/40 bg-surface shadow-card-hover -translate-y-0.5'
                  : 'border-line bg-surface shadow-card hover:-translate-y-0.5 hover:shadow-card-hover hover:border-brand/20'
              }`}
            >
              <span
                className={`absolute inset-x-0 top-0 h-[3px] ${active ? 'bg-gradient-to-r from-brand to-brand-2' : 'bg-line'}`}
              />
              <span
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-colors ${
                  active ? 'bg-brand text-on-brand' : 'bg-brand/10 text-brand'
                }`}
              >
                <Icon className="w-4 h-4" />
              </span>
              <span className="min-w-0">
                <span className="block text-xs font-black leading-tight text-ink truncate">
                  {title}
                </span>
                <span className="block text-[10px] text-ink-2 leading-snug truncate">
                  {subtitle}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      {/* Conteúdo por Aba */}
      {activeTab === 'daily' && (
        <DailyTab
          todayActivitiesCount={todayActivitiesCount}
          setTodayActivitiesCount={setTodayActivitiesCount}
          currentPacePercent={currentPacePercent}
          setActiveTab={setActiveTab}
          channelTag={channelTag}
          setChannelTag={setChannelTag}
          sprintLeadIndex={sprintLeadIndex}
          setSprintLeadIndex={setSprintLeadIndex}
          dailyTasks={dailyTasks}
          toggleTask={toggleTask}
          resetDailyTasks={resetDailyTasks}
          dailyNotes={dailyNotes}
          setDailyNotes={setDailyNotes}
        />
      )}

      {activeTab === 'iacoach' && (
        <IaCoachTab
          selectedSegment={selectedSegment}
          setSelectedSegment={setSelectedSegment}
          callTranscriptInput={callTranscriptInput}
          setCallTranscriptInput={setCallTranscriptInput}
          analyzeTranscript={analyzeTranscript}
          callAnalysisResult={callAnalysisResult}
        />
      )}

      {activeTab === 'pauta1to1' && (
        <Pauta1to1Tab
          copyPautaToClipboard={copyPautaToClipboard}
          copiedPauta={copiedPauta}
          generatePautaMarkdown={generatePautaMarkdown}
        />
      )}

      {activeTab === 'julho' && (
        <MonthFunnelTab
          monthName="Julho de 2026"
          leadsNovos={DIAGNOSTIC_DATA.metJul.leadsNovos}
          leadsNovosCaption="79 leads únicos"
          leadsTrabalhados={DIAGNOSTIC_DATA.metJul.leadsTrabalhados}
          taxaContato={DIAGNOSTIC_DATA.metJul.taxaContato}
          reuniaoAgendada={DIAGNOSTIC_DATA.metJul.reuniaoAgendada}
          taxaAgendamento={DIAGNOSTIC_DATA.metJul.taxaAgendamento}
          convertido={DIAGNOSTIC_DATA.metJul.convertido}
          ganhoValor={DIAGNOSTIC_DATA.metJul.ganhoValor}
          funnelItems={toFunnelItems(DIAGNOSTIC_DATA.funilJul)}
          channelData={DIAGNOSTIC_DATA.canalJul}
          channelHex={CHANNEL_HEX}
          deals={toDealCardData(DIAGNOSTIC_DATA.dealsJulDetalhe)}
          formatCurrency={formatCurrency}
        />
      )}

      {activeTab === 'agosto' && (
        <MonthFunnelTab
          monthName="Agosto de 2026"
          leadsNovos={DIAGNOSTIC_DATA.metAgo.leadsNovos}
          leadsNovosCaption="131 leads únicos"
          leadsTrabalhados={DIAGNOSTIC_DATA.metAgo.leadsTrabalhados}
          taxaContato={DIAGNOSTIC_DATA.metAgo.taxaContato}
          reuniaoAgendada={DIAGNOSTIC_DATA.metAgo.reuniaoAgendada}
          taxaAgendamento={DIAGNOSTIC_DATA.metAgo.taxaAgendamento}
          convertido={DIAGNOSTIC_DATA.metAgo.convertido}
          ganhoValor={DIAGNOSTIC_DATA.metAgo.ganhoValor}
          funnelItems={toFunnelItems(DIAGNOSTIC_DATA.funilAgo)}
          channelData={DIAGNOSTIC_DATA.canalAgo}
          channelHex={CHANNEL_HEX}
          deals={toDealCardData(DIAGNOSTIC_DATA.dealsAgoDetalhe)}
          formatCurrency={formatCurrency}
        />
      )}

      {activeTab === 'comparativo' && <ComparativeTab formatCurrency={formatCurrency} />}

      {activeTab === 'emcadencia' && <EmCadenciaTab />}

      {activeTab === 'diagnostico' && <DiagnosticBottlenecksTab />}

      {/* Modal de Detalhes / Drill-Down */}
      <Dialog
        isOpen={!!modalContent}
        onClose={() => setModalContent(null)}
        title={modalContent?.title ?? ''}
        maxWidth="max-w-2xl"
      >
        <div className="text-xs text-ink-2 space-y-2 max-h-[60vh] overflow-y-auto pr-2">
          {modalContent?.body}
        </div>
      </Dialog>
    </div>
  );
}
