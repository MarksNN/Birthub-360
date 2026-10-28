import {
  AlertCircle,
  BrainCircuit,
  Building2,
  Database,
  LineChart,
  Link as LinkIcon,
  Phone,
  Save,
  Settings,
  Shield,
  Sliders,
  Target,
  Workflow,
  Zap,
} from 'lucide-react';
import { useState } from 'react';
import { Badge } from '../../../components/ui/Badge.js';
import { Button } from '../../../components/ui/Button.js';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../../../components/ui/Card.js';
import { CommandCenterHeader } from '../../../components/ui/CommandCenterHeader.js';
import { Input } from '../../../components/ui/Input.js';

interface PillarSettingsProps {
  pillarName: string;
}

export function PillarSettingsPlaceholder({ pillarName }: PillarSettingsProps) {
  const [activeTab, setActiveTab] = useState<
    'ferramentas' | 'permissoes' | 'automacoes' | 'integracoes'
  >('ferramentas');

  // Estados locais interativos para as ferramentas
  const [hubStagnationDays, setHubStagnationDays] = useState(14);
  const [hubRequireLossReason, setHubRequireLossReason] = useState(true);
  const [hubDedupCnpj, setHubDedupCnpj] = useState(true);

  const [marketMinRevenue, setMarketMinRevenue] = useState('R$ 5.000.000');
  const [marketAutoEnrich, setMarketAutoEnrich] = useState(true);
  const [marketSignalAlerts, setMarketSignalAlerts] = useState(true);

  const [salesSpeedToLead, setSalesSpeedToLead] = useState(5);
  const [salesRequireBant, setSalesRequireBant] = useState(true);
  const [salesDailyTouchesLimit, setSalesDailyTouchesLimit] = useState(40);

  const [perfBenchmarkRate, setPerfBenchmarkRate] = useState(18.5);
  const [perfRepScoreActive, setPerfRepScoreActive] = useState(true);
  const [perfAnomalyAlerts, setPerfAnomalyAlerts] = useState(true);

  const [predModelType, setPredModelType] = useState<'historico' | 'manual'>('historico');
  const [predFreezeDay, setPredFreezeDay] = useState(25);
  const [predConfidenceFactor, setPredConfidenceFactor] = useState(85);

  const [aiModel, setAiModel] = useState('Claude 3.5 Sonnet');
  const [aiTemperature, setAiTemperature] = useState(0.3);
  const [aiPiiMasking, setAiPiiMasking] = useState(true);

  const [autoBiDirectional, setAutoBiDirectional] = useState(true);
  const [autoRetryCount, setAutoRetryCount] = useState(3);
  const [autoSyncInterval, setAutoSyncInterval] = useState(5);

  const [engClickToCall, setEngClickToCall] = useState(true);
  const [engRecordCalls, setEngRecordCalls] = useState(true);
  const [engWorkingHoursOnly, setEngWorkingHoursOnly] = useState(true);

  // P0 #693 (Agente 02): não existe API de persistência para configurações por pilar.
  // Antes, "Salvar" exibia "Configurações salvas com sucesso!" sem gravar nada (sucesso falso).
  // Agora o botão fica desabilitado e a tela avisa que é só pré-visualização.
  // Não inventar API `pillar.*` aqui — quando houver contrato real (Agente 01), plugar o save.
  const SAVE_UNAVAILABLE_MSG =
    'Salvar indisponível: estas configurações ainda não são gravadas no servidor.';

  const tabs = [
    { id: 'ferramentas' as const, label: 'Ferramentas & Regras', icon: Sliders },
    { id: 'permissoes' as const, label: 'Permissões & Acesso', icon: Shield },
    { id: 'automacoes' as const, label: 'Gatilhos & Automações', icon: Zap },
    { id: 'integracoes' as const, label: 'Conexões & Dados', icon: LinkIcon },
  ];

  const renderToolsByPillar = () => {
    switch (pillarName) {
      case 'Hub Comercial':
        return (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-[var(--nav-c-blue)]" />
                  <CardTitle>Regras de Governança do Pipeline (CRM)</CardTitle>
                </div>
                <CardDescription>
                  Controles de integridade cadastral e regras de movimentação no Kanban comercial.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 border-t border-[var(--line)] pt-6">
                <div className="flex items-center justify-between p-3.5 rounded-lg bg-[var(--surface-2)] border border-[var(--line)]">
                  <div>
                    <p className="font-medium text-sm">
                      Tempo Limite de Estagnação de Oportunidades
                    </p>
                    <p className="text-xs text-[var(--ink-3)]">
                      Alerta visual quando um negócio passa mais tempo que o permitido na mesma
                      etapa.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      value={hubStagnationDays}
                      onChange={(e) => setHubStagnationDays(Number(e.target.value))}
                      className="w-20 text-center text-sm font-semibold"
                    />
                    <span className="text-xs text-[var(--ink-2)] font-medium">dias</span>
                  </div>
                </div>

                <div className="flex items-center justify-between p-3.5 rounded-lg bg-[var(--surface-2)] border border-[var(--line)]">
                  <div>
                    <p className="font-medium text-sm">
                      Exigir Motivo Padronizado ao Perder Negócio
                    </p>
                    <p className="text-xs text-[var(--ink-3)]">
                      Obrigatório catalogar concorrente e motivo de perda para alimentar o módulo
                      Win/Loss.
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={hubRequireLossReason}
                      onChange={(e) => setHubRequireLossReason(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--nav-c-blue)]" />
                  </label>
                </div>

                <div className="flex items-center justify-between p-3.5 rounded-lg bg-[var(--surface-2)] border border-[var(--line)]">
                  <div>
                    <p className="font-medium text-sm">
                      Deduplicação Automática por CNPJ e Domínio
                    </p>
                    <p className="text-xs text-[var(--ink-3)]">
                      Impede a criação de contas duplicadas e vincula novos leads a contas
                      existentes.
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={hubDedupCnpj}
                      onChange={(e) => setHubDedupCnpj(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--nav-c-blue)]" />
                  </label>
                </div>
              </CardContent>
            </Card>
          </div>
        );

      case 'Inteligência de Mercado':
        return (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Target className="w-5 h-5 text-[var(--nav-c-teal)]" />
                  <CardTitle>Critérios e Enriquecimento de ICP</CardTitle>
                </div>
                <CardDescription>
                  Parâmetros de qualificação de contas e provedores de inteligência de mercado.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 border-t border-[var(--line)] pt-6">
                <div className="flex items-center justify-between p-3.5 rounded-lg bg-[var(--surface-2)] border border-[var(--line)]">
                  <div>
                    <p className="font-medium text-sm">Faturamento Mínimo Estimado para ICP</p>
                    <p className="text-xs text-[var(--ink-3)]">
                      Empresas abaixo desse piso são marcadas como SMB / Fora de Perfil.
                    </p>
                  </div>
                  <Input
                    type="text"
                    value={marketMinRevenue}
                    onChange={(e) => setMarketMinRevenue(e.target.value)}
                    className="w-40 text-sm font-semibold"
                  />
                </div>

                <div className="flex items-center justify-between p-3.5 rounded-lg bg-[var(--surface-2)] border border-[var(--line)]">
                  <div>
                    <p className="font-medium text-sm">Enriquecimento Automático em Cascata</p>
                    <p className="text-xs text-[var(--ink-3)]">
                      Consulta Receita Federal, decisores no LinkedIn e contatos telefônicos
                      verificados.
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={marketAutoEnrich}
                      onChange={(e) => setMarketAutoEnrich(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--nav-c-teal)]" />
                  </label>
                </div>

                <div className="flex items-center justify-between p-3.5 rounded-lg bg-[var(--surface-2)] border border-[var(--line)]">
                  <div>
                    <p className="font-medium text-sm">Radar de Sinais & Alertas de Contratação</p>
                    <p className="text-xs text-[var(--ink-3)]">
                      Notifica SDRs quando empresas-alvo abrem vagas em cargos comerciais
                      estratégicos.
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={marketSignalAlerts}
                      onChange={(e) => setMarketSignalAlerts(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--nav-c-teal)]" />
                  </label>
                </div>
              </CardContent>
            </Card>
          </div>
        );

      case 'Orquestração de Vendas':
        return (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Workflow className="w-5 h-5 text-[var(--nav-c-green)]" />
                  <CardTitle>SLAs de Execução & Cadência de Vendas</CardTitle>
                </div>
                <CardDescription>
                  Políticas operacionais de atendimento, passagem de bastão e limites de toque
                  diário.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 border-t border-[var(--line)] pt-6">
                <div className="flex items-center justify-between p-3.5 rounded-lg bg-[var(--surface-2)] border border-[var(--line)]">
                  <div>
                    <p className="font-medium text-sm">SLA de Speed-to-Lead Inbound</p>
                    <p className="text-xs text-[var(--ink-3)]">
                      Tempo limite para o primeiro contato telefônico após entrada do lead.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      value={salesSpeedToLead}
                      onChange={(e) => setSalesSpeedToLead(Number(e.target.value))}
                      className="w-20 text-center text-sm font-semibold"
                    />
                    <span className="text-xs text-[var(--ink-2)] font-medium">minutos</span>
                  </div>
                </div>

                <div className="flex items-center justify-between p-3.5 rounded-lg bg-[var(--surface-2)] border border-[var(--line)]">
                  <div>
                    <p className="font-medium text-sm">Checklist Obrigatório BANT / MEDDICC</p>
                    <p className="text-xs text-[var(--ink-3)]">
                      Bloqueia envio da reunião para Closer sem notas de Orçamento, Autoridade e
                      Prazo preenchidas.
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={salesRequireBant}
                      onChange={(e) => setSalesRequireBant(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--nav-c-green)]" />
                  </label>
                </div>

                <div className="flex items-center justify-between p-3.5 rounded-lg bg-[var(--surface-2)] border border-[var(--line)]">
                  <div>
                    <p className="font-medium text-sm">Capacidade Máxima Diária por SDR</p>
                    <p className="text-xs text-[var(--ink-3)]">
                      Evita sobrecarga e distribui automaticamente novos leads para vendedores
                      disponíveis.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      value={salesDailyTouchesLimit}
                      onChange={(e) => setSalesDailyTouchesLimit(Number(e.target.value))}
                      className="w-20 text-center text-sm font-semibold"
                    />
                    <span className="text-xs text-[var(--ink-2)] font-medium">toques/dia</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        );

      case 'Performance Comercial':
        return (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <LineChart className="w-5 h-5 text-[var(--nav-c-gold)]" />
                  <CardTitle>Métricas de Eficiência & Benchmarks de Funil</CardTitle>
                </div>
                <CardDescription>
                  Calibração das metas de conversão por etapa e pesos do Rep Score.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 border-t border-[var(--line)] pt-6">
                <div className="flex items-center justify-between p-3.5 rounded-lg bg-[var(--surface-2)] border border-[var(--line)]">
                  <div>
                    <p className="font-medium text-sm">Benchmark de Conversão Mínima de Funil</p>
                    <p className="text-xs text-[var(--ink-3)]">
                      Taxa esperada de MQL → Fechamento para sinalizar equipes no verde.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      value={perfBenchmarkRate}
                      onChange={(e) => setPerfBenchmarkRate(Number(e.target.value))}
                      className="w-20 text-center text-sm font-semibold"
                    />
                    <span className="text-xs text-[var(--ink-2)] font-medium">%</span>
                  </div>
                </div>

                <div className="flex items-center justify-between p-3.5 rounded-lg bg-[var(--surface-2)] border border-[var(--line)]">
                  <div>
                    <p className="font-medium text-sm">
                      Ranking e Pontuação de Vendedores (Rep Score)
                    </p>
                    <p className="text-xs text-[var(--ink-3)]">
                      Calcula o score de 0 a 100 baseado em velocidade de atendimento, conversão e
                      disciplina de CRM.
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={perfRepScoreActive}
                      onChange={(e) => setPerfRepScoreActive(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--nav-c-gold)]" />
                  </label>
                </div>

                <div className="flex items-center justify-between p-3.5 rounded-lg bg-[var(--surface-2)] border border-[var(--line)]">
                  <div>
                    <p className="font-medium text-sm">Notificações de Quedas Bruscas no Funil</p>
                    <p className="text-xs text-[var(--ink-3)]">
                      Dispara aviso à liderança quando a taxa de conversão semanal cair mais de 15%.
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={perfAnomalyAlerts}
                      onChange={(e) => setPerfAnomalyAlerts(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--nav-c-gold)]" />
                  </label>
                </div>
              </CardContent>
            </Card>
          </div>
        );

      case 'Previsibilidade Comercial':
        return (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <LineChart className="w-5 h-5 text-[var(--nav-c-teal)]" />
                  <CardTitle>Modelo Preditivo & Travas de Forecast</CardTitle>
                </div>
                <CardDescription>
                  Parâmetros de cálculo de probabilidade e data de congelamento de projeções
                  mensais.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 border-t border-[var(--line)] pt-6">
                <div className="flex items-center justify-between p-3.5 rounded-lg bg-[var(--surface-2)] border border-[var(--line)]">
                  <div>
                    <p className="font-medium text-sm">Método de Cálculo do Pipeline Ponderado</p>
                    <p className="text-xs text-[var(--ink-3)]">
                      Escolha entre Win Rate histórico dos últimos 90 dias ou valores manuais por
                      etapa.
                    </p>
                  </div>
                  <select
                    value={predModelType}
                    onChange={(e) => setPredModelType(e.target.value as 'historico' | 'manual')}
                    className="p-2 text-xs rounded-lg border border-[var(--line)] bg-[var(--surface)] text-[var(--ink)] font-medium"
                  >
                    <option value="historico">Win Rate Histórico (IA)</option>
                    <option value="manual">Taxa Fixa Manual</option>
                  </select>
                </div>

                <div className="flex items-center justify-between p-3.5 rounded-lg bg-[var(--surface-2)] border border-[var(--line)]">
                  <div>
                    <p className="font-medium text-sm">Dia de Congelamento do Commit Mensal</p>
                    <p className="text-xs text-[var(--ink-3)]">
                      Data limite em que os closers travam a previsão irrevogável para a diretoria.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-[var(--ink-2)]">Todo dia</span>
                    <Input
                      type="number"
                      value={predFreezeDay}
                      onChange={(e) => setPredFreezeDay(Number(e.target.value))}
                      className="w-16 text-center text-sm font-semibold"
                    />
                    <span className="text-xs text-[var(--ink-2)] font-medium">do mês</span>
                  </div>
                </div>

                <div className="flex items-center justify-between p-3.5 rounded-lg bg-[var(--surface-2)] border border-[var(--line)]">
                  <div>
                    <p className="font-medium text-sm">Fator de Confiança do Best Case</p>
                    <p className="text-xs text-[var(--ink-3)]">
                      Corte de probabilidade mínima para um negócio ser somado no cenário otimista.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      value={predConfidenceFactor}
                      onChange={(e) => setPredConfidenceFactor(Number(e.target.value))}
                      className="w-20 text-center text-sm font-semibold"
                    />
                    <span className="text-xs text-[var(--ink-2)] font-medium">%</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        );

      case 'Inteligência Artificial':
        return (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <BrainCircuit className="w-5 h-5 text-[var(--nav-c-iris)]" />
                  <CardTitle>Motor Cognitivo & Guardrails de Segurança</CardTitle>
                </div>
                <CardDescription>
                  Seleção do modelo de linguagem, temperatura de raciocínio e conformidade LGPD.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 border-t border-[var(--line)] pt-6">
                <div className="flex items-center justify-between p-3.5 rounded-lg bg-[var(--surface-2)] border border-[var(--line)]">
                  <div>
                    <p className="font-medium text-sm">Modelo de IA Ativo para Vendas</p>
                    <p className="text-xs text-[var(--ink-3)]">
                      Provedor utilizado no Copiloto, Roleplay e Resumo de Chamadas.
                    </p>
                  </div>
                  <select
                    value={aiModel}
                    onChange={(e) => setAiModel(e.target.value)}
                    className="p-2 text-xs rounded-lg border border-[var(--line)] bg-[var(--surface)] text-[var(--ink)] font-semibold"
                  >
                    <option value="Claude 3.5 Sonnet">Claude 3.5 Sonnet (Recomendado)</option>
                    <option value="GPT-4o">GPT-4o Omnichannel</option>
                    <option value="DeepSeek R1">DeepSeek R1 Comercial</option>
                  </select>
                </div>

                <div className="flex items-center justify-between p-3.5 rounded-lg bg-[var(--surface-2)] border border-[var(--line)]">
                  <div>
                    <p className="font-medium text-sm">
                      Temperatura de Inferência ({aiTemperature})
                    </p>
                    <p className="text-xs text-[var(--ink-3)]">
                      Valores baixos produzem respostas mais estruturadas e factuais.
                    </p>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={aiTemperature}
                    onChange={(e) => setAiTemperature(Number(e.target.value))}
                    className="w-32 accent-[var(--nav-c-iris)]"
                  />
                </div>

                <div className="flex items-center justify-between p-3.5 rounded-lg bg-[var(--surface-2)] border border-[var(--line)]">
                  <div>
                    <p className="font-medium text-sm">Sanitização e Mascaramento de PII (LGPD)</p>
                    <p className="text-xs text-[var(--ink-3)]">
                      Remove CPFs, dados bancários e senhas dos prompts antes do envio para a LLM.
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={aiPiiMasking}
                      onChange={(e) => setAiPiiMasking(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--nav-c-iris)]" />
                  </label>
                </div>
              </CardContent>
            </Card>
          </div>
        );

      case 'Automação & Conectividade':
        return (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Workflow className="w-5 h-5 text-[var(--nav-c-gold)]" />
                  <CardTitle>Sincronização de Dados & Webhooks</CardTitle>
                </div>
                <CardDescription>
                  Parâmetros de polling, taxas de retry e conectores de ERP/CRM externos.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 border-t border-[var(--line)] pt-6">
                <div className="flex items-center justify-between p-3.5 rounded-lg bg-[var(--surface-2)] border border-[var(--line)]">
                  <div>
                    <p className="font-medium text-sm">Sincronização Bidirecional com Bitrix24</p>
                    <p className="text-xs text-[var(--ink-3)]">
                      Mantém campos de leads, contatos e negócios atualizados em tempo real.
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={autoBiDirectional}
                      onChange={(e) => setAutoBiDirectional(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--nav-c-gold)]" />
                  </label>
                </div>

                <div className="flex items-center justify-between p-3.5 rounded-lg bg-[var(--surface-2)] border border-[var(--line)]">
                  <div>
                    <p className="font-medium text-sm">
                      Intervalo de Sincronização em Segundo Plano
                    </p>
                    <p className="text-xs text-[var(--ink-3)]">
                      Frequência com que os workers buscam alterações nos sistemas integrados.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      value={autoSyncInterval}
                      onChange={(e) => setAutoSyncInterval(Number(e.target.value))}
                      className="w-20 text-center text-sm font-semibold"
                    />
                    <span className="text-xs text-[var(--ink-2)] font-medium">minutos</span>
                  </div>
                </div>

                <div className="flex items-center justify-between p-3.5 rounded-lg bg-[var(--surface-2)] border border-[var(--line)]">
                  <div>
                    <p className="font-medium text-sm">Tentativas de Reenvio em Falha de Webhook</p>
                    <p className="text-xs text-[var(--ink-3)]">
                      Política de backoff exponencial para garantir entrega mesmo em instabilidades
                      de rede.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      value={autoRetryCount}
                      onChange={(e) => setAutoRetryCount(Number(e.target.value))}
                      className="w-20 text-center text-sm font-semibold"
                    />
                    <span className="text-xs text-[var(--ink-2)] font-medium">tentativas</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        );

      case 'Engajamento Comercial':
        return (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Phone className="w-5 h-5 text-[var(--nav-c-red)]" />
                  <CardTitle>Telefonia PABX & Disparo de WhatsApp</CardTitle>
                </div>
                <CardDescription>
                  Canais de comunicação, discador automático e regras de janela de contato.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 border-t border-[var(--line)] pt-6">
                <div className="flex items-center justify-between p-3.5 rounded-lg bg-[var(--surface-2)] border border-[var(--line)]">
                  <div>
                    <p className="font-medium text-sm">Click-to-Call Integrado (3CX / Voice Hub)</p>
                    <p className="text-xs text-[var(--ink-3)]">
                      Disca diretamente com 1 clique a partir de qualquer lead ou contato no CRM.
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={engClickToCall}
                      onChange={(e) => setEngClickToCall(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--nav-c-red)]" />
                  </label>
                </div>

                <div className="flex items-center justify-between p-3.5 rounded-lg bg-[var(--surface-2)] border border-[var(--line)]">
                  <div>
                    <p className="font-medium text-sm">Gravação & Transcrição Automática por IA</p>
                    <p className="text-xs text-[var(--ink-3)]">
                      Salva o áudio e gera ata da conversa com extração de próximos passos.
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={engRecordCalls}
                      onChange={(e) => setEngRecordCalls(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--nav-c-red)]" />
                  </label>
                </div>

                <div className="flex items-center justify-between p-3.5 rounded-lg bg-[var(--surface-2)] border border-[var(--line)]">
                  <div>
                    <p className="font-medium text-sm">Trava de Horário Comercial (Anti-Spam)</p>
                    <p className="text-xs text-[var(--ink-3)]">
                      Bloqueia tentativas automáticas fora do horário das 08:00 às 18:00 e feriados.
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={engWorkingHoursOnly}
                      onChange={(e) => setEngWorkingHoursOnly(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--nav-c-red)]" />
                  </label>
                </div>
              </CardContent>
            </Card>
          </div>
        );

      default:
        return (
          <Card>
            <CardHeader>
              <CardTitle>Parâmetros Gerais do Pilar ({pillarName})</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-[var(--ink-2)]">
                Módulo configurado de acordo com as diretrizes do Birth Hub 360.
              </p>
            </CardContent>
          </Card>
        );
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[var(--bg)] text-[var(--ink)]">
      <CommandCenterHeader
        title={`Configurações: ${pillarName}`}
        icon={Settings}
        actions={
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-[var(--ink-3)] hidden md:inline">
              Em breve
            </span>
            <Button
              variant="default"
              size="sm"
              disabled
              aria-disabled="true"
              title={SAVE_UNAVAILABLE_MSG}
              aria-label={SAVE_UNAVAILABLE_MSG}
            >
              <Save className="w-4 h-4 mr-2" /> Salvar indisponível
            </Button>
          </div>
        }
      />

      <div className="flex-1 flex overflow-hidden">
        {/* Settings Sidebar */}
        <div className="w-64 border-r border-[var(--line)] bg-[var(--surface)] p-4 flex flex-col gap-2 shrink-0">
          <div className="px-3 py-1 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--ink-3)]">
              Painel de Ajustes
            </span>
          </div>
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-[var(--nav-c-blue)]/10 text-[var(--nav-c-blue)] font-semibold shadow-sm'
                    : 'text-[var(--ink-2)] hover:bg-[var(--surface-2)] hover:text-[var(--ink)]'
                }`}
              >
                <Icon size={18} />
                {tab.label}
              </button>
            );
          })}

          <div className="mt-auto p-3.5 rounded-xl bg-[var(--surface-2)] border border-[var(--line)]">
            <span className="text-xs font-semibold text-[var(--ink)] block mb-1">
              Status do Pilar
            </span>
            <div className="flex items-center gap-1.5 text-xs text-[var(--ink-2)] font-medium">
              <span className="w-2 h-2 rounded-full bg-[var(--ink-3)]" />
              Configuração não persistida
            </div>
          </div>
        </div>

        {/* Settings Content area */}
        <div className="flex-1 p-8 overflow-y-auto">
          <div className="max-w-3xl space-y-6">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Badge variant="outline" className="text-xs font-semibold">
                  {pillarName}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  Pré-visualização
                </Badge>
              </div>
              <h2 className="text-2xl font-bold">{tabs.find((t) => t.id === activeTab)?.label}</h2>
              <p className="text-[var(--ink-2)] text-sm">
                Gerencie regras operacionais, governança e conectores exclusivos do{' '}
                <strong>{pillarName}</strong>.
              </p>
            </div>

            <div
              role="note"
              className="flex gap-3 p-4 rounded-xl border border-[var(--nav-c-gold)]/30 bg-[var(--nav-c-gold)]/5"
            >
              <AlertCircle
                className="w-5 h-5 shrink-0 mt-0.5 text-[var(--nav-c-gold)]"
                aria-hidden="true"
              />
              <div className="text-sm">
                <p className="font-semibold text-[var(--ink)]">Pré-visualização — nada é salvo</p>
                <p className="text-xs text-[var(--ink-2)] mt-1">
                  Os valores abaixo são padrões ilustrativos. Alterações feitas aqui{' '}
                  <strong>não são gravadas</strong> e se perdem ao sair da tela. Salvar estará
                  disponível quando a API de configurações do pilar existir.
                </p>
              </div>
            </div>

            {/* Render Tab Contents */}
            {activeTab === 'ferramentas' && renderToolsByPillar()}

            {activeTab === 'permissoes' && (
              <Card>
                <CardHeader>
                  <CardTitle>Controle de Acesso Modular (RBAC)</CardTitle>
                  <CardDescription>
                    Nível de privilégio concedido a cada papel para visualização e edição dentro de{' '}
                    {pillarName}.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 border-t border-[var(--line)] pt-6">
                  {[
                    { role: 'Admin', desc: 'Acesso total, auditoria e edição de parâmetros' },
                    {
                      role: 'Gestor Comercial',
                      desc: 'Edição de metas, distribuição e relatórios',
                    },
                    { role: 'Closer / AE', desc: 'Leitura de dados e execução de negociações' },
                    {
                      role: 'SDR / Pré-Vendas',
                      desc: 'Operação de toques e qualificação de leads',
                    },
                    {
                      role: 'Visualizador',
                      desc: 'Apenas leitura executiva sem permissão de escrita',
                    },
                  ].map((item) => (
                    <div
                      key={item.role}
                      className="flex items-center justify-between p-3.5 bg-[var(--surface-2)] rounded-xl border border-[var(--line)]"
                    >
                      <div>
                        <p className="font-semibold text-sm">{item.role}</p>
                        <p className="text-xs text-[var(--ink-3)]">{item.desc}</p>
                      </div>
                      <div className="flex items-center gap-4">
                        <label className="flex items-center gap-2 text-xs font-medium cursor-pointer">
                          <input
                            type="checkbox"
                            defaultChecked={true}
                            className="rounded border-[var(--line)] text-[var(--nav-c-blue)] focus:ring-[var(--nav-c-blue)]"
                          />
                          Ver
                        </label>
                        <label className="flex items-center gap-2 text-xs font-medium cursor-pointer">
                          <input
                            type="checkbox"
                            defaultChecked={!item.role.includes('Visualizador')}
                            className="rounded border-[var(--line)] text-[var(--nav-c-blue)] focus:ring-[var(--nav-c-blue)]"
                          />
                          Editar
                        </label>
                        <label className="flex items-center gap-2 text-xs font-medium cursor-pointer">
                          <input
                            type="checkbox"
                            defaultChecked={
                              item.role.includes('Admin') || item.role.includes('Gestor')
                            }
                            className="rounded border-[var(--line)] text-[var(--nav-c-blue)] focus:ring-[var(--nav-c-blue)]"
                          />
                          Excluir
                        </label>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {activeTab === 'automacoes' && (
              <Card>
                <CardHeader>
                  <CardTitle>Gatilhos & Eventos do Pilar</CardTitle>
                  <CardDescription>
                    Ações automáticas disparadas mediante eventos que ocorrem em {pillarName}.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 border-t border-[var(--line)] pt-6">
                  {[
                    {
                      name: 'Notificar gestor em desvio de SLA',
                      trigger: 'Tempo na etapa ultrapassa o limite de estagnação',
                      active: true,
                    },
                    {
                      name: 'Disparar webhook externo em ganho',
                      trigger: 'Negócio marcado como Ganho (Deal Won)',
                      active: true,
                    },
                    {
                      name: 'Sincronizar tarefas no calendário pessoal',
                      trigger: 'Nova atividade ou reunião agendada',
                      active: false,
                    },
                  ].map((auto) => (
                    <div
                      key={auto.name}
                      className="flex items-center justify-between p-3.5 bg-[var(--surface-2)] rounded-xl border border-[var(--line)]"
                    >
                      <div>
                        <p className="font-semibold text-sm">{auto.name}</p>
                        <p className="text-xs text-[var(--ink-3)]">{auto.trigger}</p>
                      </div>
                      <Badge
                        variant="default"
                        className={
                          auto.active
                            ? 'bg-[var(--nav-c-green)]/10 text-[var(--nav-c-green)]'
                            : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
                        }
                      >
                        {auto.active ? 'Ativo' : 'Pausado'}
                      </Badge>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {activeTab === 'integracoes' && (
              <Card>
                <CardHeader>
                  <CardTitle>Conexões de Dados & APIs</CardTitle>
                  <CardDescription>
                    Sistemas externos e bancos de dados vinculados diretamente a {pillarName}.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 border-t border-[var(--line)] pt-6">
                  {[
                    {
                      name: 'Banco de Dados Principal (PostgreSQL / Prisma)',
                      status: 'Não monitorado aqui',
                    },
                    {
                      name: 'Fila de Mensageria (Redis / BullMQ)',
                      status: 'Não monitorado aqui',
                    },
                    {
                      name: 'Gateway de Telemetria e Logs (OpenTelemetry)',
                      status: 'Não monitorado aqui',
                    },
                  ].map((conn) => (
                    <div
                      key={conn.name}
                      className="flex items-center justify-between p-3.5 bg-[var(--surface-2)] rounded-xl border border-[var(--line)]"
                    >
                      <div className="flex items-center gap-3">
                        <Database className="w-4 h-4 text-[var(--ink-3)]" aria-hidden="true" />
                        <div>
                          <p className="font-semibold text-sm">{conn.name}</p>
                          <p className="text-xs text-[var(--ink-3)]">
                            Saúde e latência reais ficam no painel de observabilidade.
                          </p>
                        </div>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {conn.status}
                      </Badge>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Aviso de Isolamento de Tenancy */}
            <div className="p-4 bg-[var(--nav-c-blue)]/5 border border-[var(--nav-c-blue)]/20 rounded-xl flex gap-3 mt-6">
              <Shield className="text-[var(--nav-c-blue)] shrink-0 w-5 h-5 mt-0.5" />
              <div>
                <h4 className="font-semibold text-sm text-[var(--nav-c-blue)]">
                  Isolamento Seguro por Organização (Multi-Tenant)
                </h4>
                <p className="text-xs text-[var(--ink-2)] mt-1">
                  Todas as regras e limites definidos nesta tela afetam unicamente a sua organização
                  e estão protegidos por Row-Level Security e criptografia em repouso.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
