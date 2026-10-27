import {
  BellRing,
  Bot,
  Calendar,
  CheckCircle2,
  ClipboardList,
  Database,
  Download,
  FileSpreadsheet,
  FileText,
  Layers,
  Loader2,
  Mail,
  MessageSquare,
  Play,
  Presentation,
  RefreshCw,
  Save,
  Smartphone,
  Sparkles,
  Watch,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { api } from '../../../lib/api.js';
import { SoundFX } from '../../../lib/soundEffects.js';
import { EcosystemInboundEventSimulator } from './EcosystemInboundEventSimulator.js';

interface ConnectorFieldSpec {
  key: string;
  label: string;
  placeholder: string;
  secret?: boolean;
}

interface ConnectorStatusItem {
  provider: string;
  name: string;
  group: 'crm_erp' | 'email' | 'messaging' | 'tasks_notes' | 'meetings' | 'notifications_wearables';
  settingKey: string | null;
  description: string;
  fields: ConnectorFieldSpec[];
  connected: boolean;
  statusDetail: string;
  maskedConfig: Record<string, string>;
}

interface UniversalToolMeta {
  name: string;
  category: string;
  label: string;
  description: string;
  supportedPlatforms: string[];
}

interface UniversalEcosystemPanelProps {
  mode: 'connectors' | 'studio';
  onLaunchSwarmMission: (missionText: string) => void;
}

const GROUP_LABELS: Record<ConnectorStatusItem['group'], { title: string; badge: string }> = {
  crm_erp: {
    title: 'CRMs & ERPs Corporativos',
    badge: 'Bitrix24 · HubSpot · Pipedrive · RD · Omie',
  },
  email: {
    title: 'Caixas de E-mail & Suites Corporativas',
    badge: 'Outlook/M365 · Gmail · IMAP/SMTP Unificado',
  },
  messaging: {
    title: 'Mensageria, Chat & SMS',
    badge: 'WhatsApp · Telegram · Teams · Slack · SMS',
  },
  tasks_notes: {
    title: 'Tarefas, Projetos & Anotações',
    badge: 'Trello · Monday.com · ClickUp · Asana · Notion',
  },
  meetings: {
    title: 'Reuniões, Videoconferência & Agenda',
    badge: 'Google Meet · Teams · Zoom · Calendly',
  },
  notifications_wearables: {
    title: 'Alertas Multi-Dispositivo (Celular, Relógio & Pop-up)',
    badge: 'Smartwatch · Push Mobile · Pop-up SSE · SMS',
  },
};

const TOOL_CATEGORY_OPTIONS = [
  { id: 'prospecting_enrichment', label: 'Prospecção & Enriquecimento (Apollo/Receita/Hunter)' },
  { id: 'email_intelligence', label: 'E-mail Multi-Provedor (Outlook/Gmail/IMAP) + Sinais IA' },
  { id: 'messaging_omnichannel', label: 'Mensageria (WhatsApp/Telegram/Teams/Slack/SMS)' },
  {
    id: 'tasks_projects_notes',
    label: 'Tarefas & Notas (Trello/Monday/Bitrix/ClickUp/Asana/Notion)',
  },
  { id: 'meetings_calendar', label: 'Reuniões & Atas IA (Meet/Teams/Zoom/Calendly)' },
  {
    id: 'office_docs_sheets_slides',
    label: 'Office & Workspace (Word/Docs, Excel .xlsx, PowerPoint)',
  },
  {
    id: 'multi_device_notifications',
    label: 'Notificações (Pop-up, Celular, Relógio/Smartwatch, SMS)',
  },
  { id: 'scripts_prompts_enablement', label: 'Fábrica de Scripts Comerciais & Prompts' },
  { id: 'crm_erp_sync', label: 'Sincronização Multi-CRM & ERP' },
  { id: 'pipeline_revops', label: 'Pipeline, Forecast, Propostas, Churn & Cross-Sell' },
];

export function UniversalEcosystemPanel({
  mode,
  onLaunchSwarmMission,
}: UniversalEcosystemPanelProps) {
  const [connectors, setConnectors] = useState<ConnectorStatusItem[]>([]);
  const [catalog, setCatalog] = useState<UniversalToolMeta[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeGroup, setActiveGroup] = useState<ConnectorStatusItem['group'] | 'all'>('all');
  const [editingProvider, setEditingProvider] = useState<string | null>(null);
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [savingProvider, setSavingProvider] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  // Studio: Standalone Agent state
  const [agentTitle, setAgentTitle] = useState('Especialista de Operações & Receita 360');
  const [customPrompt, setCustomPrompt] = useState(
    'Atue como um especialista comercial e operacional completo. Use as ferramentas universais para consultar dados reais, gerar artefatos e acionar as plataformas conectadas.',
  );
  const [selectedCategories, setSelectedCategories] = useState<string[]>([
    'prospecting_enrichment',
    'email_intelligence',
    'tasks_projects_notes',
    'office_docs_sheets_slides',
    'multi_device_notifications',
    'scripts_prompts_enablement',
  ]);
  const [standaloneMission, setStandaloneMission] = useState(
    'Verifique os provedores de e-mail conectados, gere um script de cold call e WhatsApp para Diretores Financeiros (CFOs) e dispare um alerta de resumo no pop-up e no relógio (smartwatch).',
  );
  const [runningStandalone, setRunningStandalone] = useState(false);
  const [standaloneOutput, setStandaloneOutput] = useState<string | null>(null);

  // Studio: Office Generator state
  const [officeType, setOfficeType] = useState<
    'excel_or_gsheet' | 'word_or_gdoc' | 'powerpoint_or_gslides'
  >('excel_or_gsheet');
  const [officeTitle, setOfficeTitle] = useState('Plano Executivo de Prospecção & Forecast Q4');
  const [generatingOffice, setGeneratingOffice] = useState(false);
  const [officeDownload, setOfficeDownload] = useState<{
    filename: string;
    mimeType: string;
    base64: string;
    preview: string;
  } | null>(null);

  // Studio: Automated Multi-Platform Playbooks state
  const [playbooks, setPlaybooks] = useState<
    Array<{
      id: string;
      title: string;
      subtitle: string;
      platformsInvolved: string[];
      stepsSummary: string[];
    }>
  >([]);
  const [runningPlaybookId, setRunningPlaybookId] = useState<string | null>(null);
  const [testingProvider, setTestingProvider] = useState<string | null>(null);
  const [playbookReport, setPlaybookReport] = useState<{
    playbookId: string;
    title: string;
    durationMs: number;
    steps: Array<{
      stepNumber: number;
      toolName: string;
      title: string;
      success: boolean;
      output: unknown;
    }>;
  } | null>(null);

  const loadEcosystemData = useCallback(async () => {
    setLoading(true);
    try {
      const [connRes, catRes, pbRes] = await Promise.all([
        api.get<{ success: boolean; data: ConnectorStatusItem[] }>(
          '/api/agent/ecosystem/connectors',
        ),
        api.get<{ success: boolean; data: UniversalToolMeta[] }>('/api/agent/ecosystem/catalog'),
        api.get<{ success: boolean; data: any[] }>('/api/agent/ecosystem/playbooks'),
      ]);
      const connList = Array.isArray(connRes)
        ? connRes
        : Array.isArray((connRes as any)?.data)
          ? (connRes as any).data
          : [];
      const catList = Array.isArray(catRes)
        ? catRes
        : Array.isArray((catRes as any)?.data)
          ? (catRes as any).data
          : [];
      const pbList = Array.isArray(pbRes)
        ? pbRes
        : Array.isArray((pbRes as any)?.data)
          ? (pbRes as any).data
          : [];
      setConnectors(connList);
      setCatalog(catList);
      setPlaybooks(pbList);
    } catch {
      // Silencioso caso a instância esteja sem sessão ativa
    } finally {
      setLoading(false);
    }
  }, []);

  const handleTestConnector = async (provider: string) => {
    SoundFX.play('click');
    setTestingProvider(provider);
    setFeedback(null);
    try {
      const res = await api.post<any>(`/api/agent/ecosystem/connectors/${provider}/test`, {});
      const data = res?.data ?? res;
      setFeedback(data?.message || `Teste do conector ${provider.toUpperCase()} concluído.`);
      SoundFX.play('success');
    } catch (err: any) {
      setFeedback(
        err instanceof Error ? err.message : `Falha ao testar conector ${provider.toUpperCase()}.`,
      );
    } finally {
      setTestingProvider(null);
    }
  };

  const handleRunPlaybook = async (playbookId: string) => {
    SoundFX.play('click');
    setRunningPlaybookId(playbookId);
    setPlaybookReport(null);
    try {
      const res = await api.post<any>(`/api/agent/ecosystem/playbooks/${playbookId}/run`, {});
      const data = res?.data ?? res;
      if (data?.steps) {
        setPlaybookReport(data);
        SoundFX.play('success');
      }
    } catch (err: any) {
      setFeedback(err instanceof Error ? err.message : 'Falha ao executar playbook.');
    } finally {
      setRunningPlaybookId(null);
    }
  };

  useEffect(() => {
    void loadEcosystemData();
  }, [loadEcosystemData]);

  const startEditing = (item: ConnectorStatusItem) => {
    SoundFX.play('click');
    setEditingProvider(item.provider);
    setFormValues({ ...item.maskedConfig });
    setFeedback(null);
  };

  const handleSaveConnector = async (provider: string) => {
    setSavingProvider(provider);
    setFeedback(null);
    try {
      await api.put(`/api/agent/ecosystem/connectors/${provider}`, {
        config: formValues,
      });
      SoundFX.play('success');
      setFeedback(`Conector ${provider.toUpperCase()} salvo com sucesso!`);
      setEditingProvider(null);
      await loadEcosystemData();
    } catch (err: any) {
      setFeedback(
        err instanceof Error
          ? err.message
          : 'Não foi possível salvar a configuração deste conector.',
      );
    } finally {
      setSavingProvider(null);
    }
  };

  const toggleCategory = (id: string) => {
    setSelectedCategories((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id],
    );
  };

  const handleRunStandaloneAgent = async () => {
    if (!standaloneMission.trim()) return;
    SoundFX.play('click');
    setRunningStandalone(true);
    setStandaloneOutput(null);
    try {
      const res = await api.post<any>('/api/agent/ecosystem/standalone-run', {
        mission: standaloneMission,
        agentTitle,
        customSystemPrompt: customPrompt,
        categories: selectedCategories,
      });
      const payload = res?.data ?? res;
      setStandaloneOutput(
        payload?.output || payload?.error || 'Execução concluída com ferramentas universais.',
      );
      SoundFX.play('success');
    } catch (err: any) {
      setStandaloneOutput(
        err instanceof Error ? `Erro: ${err.message}` : 'Falha ao executar agente isolado.',
      );
    } finally {
      setRunningStandalone(false);
    }
  };

  const handleGenerateOfficeFile = async () => {
    if (!officeTitle.trim()) return;
    SoundFX.play('click');
    setGeneratingOffice(true);
    setOfficeDownload(null);
    try {
      const payload: Record<string, unknown> = {
        docType: officeType,
        title: officeTitle,
      };
      if (officeType === 'excel_or_gsheet') {
        payload.sheetColumns = [
          'Empresa Alvo',
          'Canal Principal',
          'Plataforma CRM / Tarefa',
          'Ticket Estimado (R$)',
          'Probabilidade (%)',
          'Próximo Passo',
        ];
        payload.sheetRows = [
          [
            'Indústria Alpha S.A.',
            'Outlook + LinkedIn',
            'Bitrix24 + Trello',
            85000,
            75,
            'Demo Técnica Agendada',
          ],
          [
            'Grupo Logística Brasil',
            'WhatsApp + Cold Call',
            'HubSpot + Monday.com',
            120000,
            60,
            'Enviar Proposta Comercial',
          ],
          [
            'TechFin Pagamentos',
            'Gmail + Reunião Teams',
            'Pipedrive + Notion',
            64000,
            85,
            'Revisão Jurídica de Contrato',
          ],
        ];
      } else if (officeType === 'word_or_gdoc') {
        payload.documentSections = [
          {
            heading: '1. Sumário Executivo & Diagnóstico Comercial',
            body: 'Documento estruturado gerado pela Suite Universal BirthHub 360 para alinhamento de proposta de valor, ROI projetado e cronograma de implantação.',
          },
          {
            heading: '2. Arquitetura de Integração Multi-Plataforma',
            body: 'Sincronização nativa com CRMs (Bitrix24, HubSpot, Pipedrive, RD Station, Omie), E-mail (Outlook/M365, Gmail, IMAP), Projetos (Trello, Monday, ClickUp, Asana, Notion) e Alertas (Celular, Smartwatch e Pop-up).',
          },
        ];
      } else {
        payload.slides = [
          {
            slideNumber: 1,
            title: officeTitle,
            bullets: [
              'Diagnóstico de Eficiência Comercial & Inteligência de Receita',
              'Automação End-to-End com Enxame de Agentes (BDR, SDR, Closer, CRM, Ops)',
              'Ganhos Rápidos de Conversão em 30-60-90 Dias',
            ],
            speakerNotes:
              'Abertura focada na dor executiva do decisor e retorno sobre investimento.',
          },
          {
            slideNumber: 2,
            title: 'Ecossistema Conectado em Tempo Real',
            bullets: [
              'E-mails (Outlook/Gmail/IMAP) analisados com detecção de oportunidade por IA',
              'Tarefas espelhadas em Trello, Monday.com, Bitrix24 e Notion',
              'Alertas instantâneos no Celular, Relógio (Smartwatch) e Pop-up na tela',
            ],
            speakerNotes:
              'Destacar que o time comercial não precisa mudar as ferramentas que já usa.',
          },
        ];
      }

      const res = await api.post<any>('/api/agent/ecosystem/office/generate', payload);
      const data = res?.data ?? res;
      if (data?.download?.base64) {
        setOfficeDownload({
          filename: data.download.filename,
          mimeType: data.download.mimeType,
          base64: data.download.base64,
          preview: String(data.contentPreview || ''),
        });
        SoundFX.play('success');
      }
    } catch (err: any) {
      setFeedback(err instanceof Error ? err.message : 'Falha ao gerar arquivo Office.');
    } finally {
      setGeneratingOffice(false);
    }
  };

  const triggerBrowserDownload = () => {
    if (!officeDownload) return;
    const byteChars = atob(officeDownload.base64);
    const byteNumbers = new Array(byteChars.length);
    for (let i = 0; i < byteChars.length; i++) {
      byteNumbers[i] = byteChars.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: officeDownload.mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = officeDownload.filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (mode === 'connectors') {
    const filtered =
      activeGroup === 'all' ? connectors : connectors.filter((c) => c.group === activeGroup);
    const connectedCount = connectors.filter((c) => c.connected).length;

    return (
      <div className="space-y-6">
        {/* Resumo de Conectividade */}
        <div className="flex flex-wrap items-center justify-between gap-4 bg-surface-2/70 border border-line rounded-xl p-4">
          <div>
            <h3 className="text-sm font-black uppercase tracking-wider text-ink flex items-center gap-2">
              <Layers size={16} className="text-[var(--color-heading-cyan)]" />
              Hub Universal de Plataformas Corporativas ({connectedCount}/{connectors.length}{' '}
              Ativas)
            </h3>
            <p className="text-xs text-ink-2 mt-1">
              Todas as conexões configuradas aqui ficam imediatamente disponíveis para o{' '}
              <strong>Enxame (Swarm)</strong> e para qualquer <strong>Agente Individual</strong>.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void loadEcosystemData()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-surface border border-line text-ink hover:bg-surface-2 cursor-pointer"
          >
            <RefreshCw size={12} className={loading ? 'animate-spin' : ''} /> Atualizar Status
          </button>
        </div>

        {/* Filtro por Categoria */}
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setActiveGroup('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${
              activeGroup === 'all'
                ? 'bg-ink text-surface border-ink'
                : 'bg-surface-2 text-ink-2 border-line hover:text-ink'
            }`}
          >
            Todas ({connectors.length})
          </button>
          {(Object.keys(GROUP_LABELS) as ConnectorStatusItem['group'][]).map((g) => (
            <button
              key={g}
              type="button"
              onClick={() => setActiveGroup(g)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${
                activeGroup === g
                  ? 'bg-ink text-surface border-ink'
                  : 'bg-surface-2 text-ink-2 border-line hover:text-ink'
              }`}
            >
              {GROUP_LABELS[g].title}
            </button>
          ))}
        </div>

        {feedback && (
          <div className="px-4 py-2.5 rounded-xl bg-success/10 border border-success/30 text-xs font-bold text-ink">
            {feedback}
          </div>
        )}

        {/* Grid de Conectores */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((item) => {
            const isEditing = editingProvider === item.provider;
            return (
              <div
                key={item.provider}
                className="bg-surface-2/50 border border-line rounded-xl p-4 flex flex-col justify-between gap-3"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-widest text-ink-2">
                        {GROUP_LABELS[item.group]?.badge}
                      </span>
                      <h4 className="text-sm font-black text-ink mt-0.5">{item.name}</h4>
                    </div>
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${
                        item.connected
                          ? 'bg-success/10 border-success/30 text-success-active dark:text-success'
                          : 'bg-surface border-line text-ink-2'
                      }`}
                    >
                      {item.connected ? (
                        <>
                          <CheckCircle2 size={11} /> Ativo
                        </>
                      ) : (
                        'Configurar'
                      )}
                    </span>
                  </div>
                  <p className="text-xs text-ink-2 mt-1.5 leading-relaxed">{item.description}</p>
                  <p className="text-[11px] font-semibold text-ink mt-2">{item.statusDetail}</p>
                </div>

                {item.fields.length > 0 && !isEditing && (
                  <div className="pt-2 border-t border-line flex items-center justify-between">
                    <span className="text-[11px] text-ink-2">
                      {item.fields.length} parâmetro(s) de conexão
                    </span>
                    <button
                      type="button"
                      onClick={() => startEditing(item)}
                      className="px-3 py-1 rounded-lg text-xs font-bold bg-surface border border-line text-ink hover:bg-surface-2 cursor-pointer"
                    >
                      {item.connected ? 'Editar Credenciais' : 'Conectar Plataforma'}
                    </button>
                    <button
                      type="button"
                      disabled={testingProvider === item.provider}
                      onClick={() => void handleTestConnector(item.provider)}
                      className="px-2.5 py-1 rounded-lg text-xs font-bold bg-surface-2 border border-line text-ink hover:bg-surface cursor-pointer disabled:opacity-50"
                    >
                      {testingProvider === item.provider ? 'Testando...' : 'Testar Ping'}
                    </button>
                  </div>
                )}

                {isEditing && (
                  <div className="pt-3 border-t border-line space-y-2.5">
                    {item.fields.map((field) => (
                      <div key={field.key}>
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-ink-2 mb-1">
                          {field.label}
                        </label>
                        <input
                          type={field.secret ? 'password' : 'text'}
                          value={formValues[field.key] ?? ''}
                          onChange={(e) =>
                            setFormValues((prev) => ({ ...prev, [field.key]: e.target.value }))
                          }
                          placeholder={field.placeholder}
                          className="w-full bg-surface border border-line rounded-lg px-3 py-1.5 text-xs text-ink focus:outline-none"
                        />
                      </div>
                    ))}
                    <div className="flex items-center justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setEditingProvider(null)}
                        className="px-3 py-1.5 rounded-lg text-xs font-bold text-ink-2 hover:text-ink cursor-pointer"
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        disabled={savingProvider === item.provider}
                        onClick={() => void handleSaveConnector(item.provider)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-ink text-surface cursor-pointer disabled:opacity-50"
                      >
                        {savingProvider === item.provider ? (
                          <Loader2 size={12} className="animate-spin" />
                        ) : (
                          <Save size={12} />
                        )}
                        Salvar Conexão
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // mode === 'studio'
  return (
    <div className="space-y-6">
      {/* 1. Gerador Instantâneo de Arquivos Office & Google Workspace */}
      <div className="bg-surface-2/60 border border-line rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h3 className="text-sm font-black uppercase tracking-wider text-ink flex items-center gap-2">
              <FileSpreadsheet size={16} className="text-[var(--color-heading-success)]" />
              Suite Universal Office & Google Workspace (Excel .xlsx, Word/Docs, PowerPoint/Slides)
            </h3>
            <p className="text-xs text-ink-2 mt-0.5">
              Gere planilhas binárias reais (`.xlsx`), documentos executivos e apresentações prontas
              para download e indexadas na Base de Conhecimento.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-ink-2 mb-1">
              Formato do Artefato
            </label>
            <select
              value={officeType}
              onChange={(e) => setOfficeType(e.target.value as any)}
              className="w-full bg-surface border border-line rounded-lg px-3 py-2 text-xs font-bold text-ink"
            >
              <option value="excel_or_gsheet">Planilha Excel (.xlsx) / Google Sheets</option>
              <option value="word_or_gdoc">Documento Word / Google Docs</option>
              <option value="powerpoint_or_gslides">Apresentação PowerPoint / Google Slides</option>
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-ink-2 mb-1">
              Título do Arquivo
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={officeTitle}
                onChange={(e) => setOfficeTitle(e.target.value)}
                className="flex-1 bg-surface border border-line rounded-lg px-3 py-2 text-xs text-ink"
              />
              <button
                type="button"
                disabled={generatingOffice}
                onClick={() => void handleGenerateOfficeFile()}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold bg-ink text-surface cursor-pointer disabled:opacity-50"
              >
                {generatingOffice ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : officeType === 'excel_or_gsheet' ? (
                  <FileSpreadsheet size={14} />
                ) : officeType === 'word_or_gdoc' ? (
                  <FileText size={14} />
                ) : (
                  <Presentation size={14} />
                )}
                Gerar Arquivo
              </button>
            </div>
          </div>
        </div>

        {officeDownload && (
          <div className="bg-surface border border-line rounded-xl p-4 flex items-center justify-between flex-wrap gap-3">
            <div>
              <p className="text-xs font-black text-ink">
                Arquivo pronto: <span className="underline">{officeDownload.filename}</span>
              </p>
              <p className="text-[11px] text-ink-2 mt-0.5">
                Indexado automaticamente na Base de Conhecimento da organização.
              </p>
            </div>
            <button
              type="button"
              onClick={triggerBrowserDownload}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-black bg-success text-white cursor-pointer"
            >
              <Download size={14} /> Baixar {officeDownload.filename}
            </button>
          </div>
        )}
      </div>

      {/* 2. Executor de Agente Individual Reutilizável (Qualquer Agente com as 29 Tools Universais) */}
      <div className="bg-surface-2/60 border border-line rounded-xl p-5 space-y-4">
        <div>
          <h3 className="text-sm font-black uppercase tracking-wider text-ink flex items-center gap-2">
            <Bot size={16} className="text-[var(--color-heading-iris)]" />
            Executor de Agente Individual com Ferramentas Universais ({catalog.length} Tools Ativas)
          </h3>
          <p className="text-xs text-ink-2 mt-0.5">
            Qualquer agente separado da plataforma pode reutilizar os pacotes de ferramentas do
            Swarm de forma independente.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-ink-2 mb-1">
              Nome / Cargo do Agente Separado
            </label>
            <input
              type="text"
              value={agentTitle}
              onChange={(e) => setAgentTitle(e.target.value)}
              className="w-full bg-surface border border-line rounded-lg px-3 py-2 text-xs text-ink"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-ink-2 mb-1">
              Diretriz / System Prompt do Agente
            </label>
            <input
              type="text"
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              className="w-full bg-surface border border-line rounded-lg px-3 py-2 text-xs text-ink"
            />
          </div>
        </div>

        <div>
          <span className="block text-[10px] font-bold uppercase tracking-wider text-ink-2 mb-2">
            Pacotes de Capacidades Habilitados para este Agente:
          </span>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {TOOL_CATEGORY_OPTIONS.map((cat) => {
              const checked = selectedCategories.includes(cat.id);
              return (
                <label
                  key={cat.id}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs cursor-pointer transition-colors ${
                    checked
                      ? 'bg-surface border-ink text-ink font-bold'
                      : 'bg-surface/40 border-line text-ink-2'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleCategory(cat.id)}
                  />
                  <span>{cat.label}</span>
                </label>
              );
            })}
          </div>
        </div>

        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wider text-ink-2 mb-1">
            Missão para o Agente Separado
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={standaloneMission}
              onChange={(e) => setStandaloneMission(e.target.value)}
              className="flex-1 bg-surface border border-line rounded-lg px-3 py-2 text-xs text-ink"
            />
            <button
              type="button"
              disabled={runningStandalone}
              onClick={() => void handleRunStandaloneAgent()}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold bg-ink text-surface cursor-pointer disabled:opacity-50"
            >
              {runningStandalone ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Play size={14} />
              )}
              Executar Agente Isolado
            </button>
          </div>
        </div>

        {standaloneOutput && (
          <div className="bg-surface border border-line rounded-xl p-4 text-xs text-ink whitespace-pre-wrap leading-relaxed max-h-64 overflow-y-auto">
            {standaloneOutput}
          </div>
        )}
      </div>

      {/* 3. Playbooks / Receitas Multi-Plataforma Automatizadas (Execução Direta Passo a Passo) */}
      {playbooks.length > 0 && (
        <div className="bg-surface-2/60 border border-line rounded-xl p-5 space-y-4">
          <div>
            <h3 className="text-sm font-black uppercase tracking-wider text-ink flex items-center gap-2">
              <Layers size={16} className="text-[var(--color-heading-cyan)]" />
              Playbooks Autônomos Multi-Plataforma (Execução Encadeada em 1 Clique)
            </h3>
            <p className="text-xs text-ink-2 mt-0.5">
              Orquestra múltiplas ferramentas universais em sequência (E-mail → Trello/Monday →
              Scripts → Excel .xlsx → Smartwatch/Celular).
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3">
            {playbooks.map((pb) => {
              const isRunning = runningPlaybookId === pb.id;
              return (
                <div
                  key={pb.id}
                  className="bg-surface border border-line rounded-xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
                >
                  <div className="space-y-1.5">
                    <h4 className="text-xs font-black text-ink">{pb.title}</h4>
                    <p className="text-[11px] text-ink-2">{pb.subtitle}</p>
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {pb.platformsInvolved.map((plat) => (
                        <span
                          key={plat}
                          className="px-2 py-0.5 rounded-md bg-surface-2 border border-line text-[10px] font-bold text-ink-2"
                        >
                          {plat}
                        </span>
                      ))}
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled={Boolean(runningPlaybookId)}
                    onClick={() => void handleRunPlaybook(pb.id)}
                    className="shrink-0 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-black bg-ink text-surface cursor-pointer disabled:opacity-50"
                  >
                    {isRunning ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <Play size={14} />
                    )}
                    Executar Playbook
                  </button>
                </div>
              );
            })}
          </div>

          {playbookReport && (
            <div className="bg-surface border border-success/40 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-black text-ink">
                  Relatório de Execução: {playbookReport.title}
                </h4>
                <span className="text-[10px] font-bold text-ink-2">
                  Concluído em {(playbookReport.durationMs / 1000).toFixed(1)}s
                </span>
              </div>
              <div className="space-y-2">
                {playbookReport.steps.map((step) => (
                  <div
                    key={step.stepNumber}
                    className="p-2.5 rounded-lg bg-surface-2/70 border border-line flex items-center justify-between gap-2 text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <CheckCircle2
                        size={14}
                        className={step.success ? 'text-success' : 'text-danger'}
                      />
                      <span className="font-bold text-ink">
                        Etapa {step.stepNumber}: {step.title}
                      </span>
                    </div>
                    <span className="text-[10px] font-mono text-ink-2">{step.toolName}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 3.5 Receptor & Simulador Reativo de Eventos Inbound (16 Plataformas) */}
      <EcosystemInboundEventSimulator />

      {/* 4. Atalhos de Missões Multi-Plataforma no Swarm */}
      <div className="bg-surface-2/60 border border-line rounded-xl p-5 space-y-3">
        <h3 className="text-sm font-black uppercase tracking-wider text-ink flex items-center gap-2">
          <Sparkles size={16} className="text-[var(--color-heading-gold)]" />
          Missões Prontas Multi-Plataforma (Executar no Enxame ao Vivo)
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
          {[
            {
              icon: <Mail size={14} />,
              title: 'Varredura de E-mails (Outlook + Gmail + IMAP) por Oportunidades',
              mission:
                'Analise nossa caixa de entrada unificada de e-mails (Outlook/M365, Gmail e IMAP) em busca de sinais de compra, pedidos de proposta ou objeções, gere os scripts de resposta e avise no pop-up e no relógio (smartwatch).',
            },
            {
              icon: <ClipboardList size={14} />,
              title: 'Trello + Monday + Notion + Relatório Excel (.xlsx)',
              mission:
                'Crie um card de plano de ação comercial no Trello/Monday e uma nota executiva no Notion, gere uma planilha Excel (.xlsx) com o forecast da semana e envie alerta no Teams e Slack.',
            },
            {
              icon: <Watch size={14} />,
              title: 'Prospecção B2B + Enriquecimento + Alerta no Celular e Relógio',
              mission:
                'Descubra empresas do setor de Logística e Indústria em SP, promova e enriqueça os decisores no CRM, gere um script de Cold Call e WhatsApp e dispare um alerta rápido no Celular e no Smartwatch.',
            },
            {
              icon: <Calendar size={14} />,
              title: 'Reunião (Meet / Teams / Zoom) + Apresentação PowerPoint/Slides',
              mission:
                'Estruture uma apresentação executiva em PowerPoint/Google Slides de 5 slides para fechamento enterprise, verifique nossos links de agendamento (Meet, Teams, Zoom, Calendly) e salve o prompt na biblioteca.',
            },
          ].map((preset) => (
            <button
              key={preset.title}
              type="button"
              onClick={() => onLaunchSwarmMission(preset.mission)}
              className="text-left p-3.5 rounded-xl bg-surface border border-line hover:border-ink transition-colors cursor-pointer space-y-1"
            >
              <div className="flex items-center gap-2 text-xs font-black text-ink">
                {preset.icon}
                <span>{preset.title}</span>
              </div>
              <p className="text-[11px] text-ink-2 line-clamp-2">{preset.mission}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
