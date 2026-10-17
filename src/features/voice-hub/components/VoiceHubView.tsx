import {
  AlertCircle,
  CheckCircle2,
  Layers,
  Mic,
  Phone,
  PhoneCall,
  PhoneOff,
  Plus,
  RefreshCw,
  Shield,
  ShieldAlert,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Badge } from '../../../components/ui/Badge.js';
import { Button } from '../../../components/ui/Button.js';
import { Card } from '../../../components/ui/Card.js';
import { SoundFX } from '../../../lib/soundEffects.js';
import {
  type ColdCallStatusData,
  type SuppressionItem,
  type ThreeCXConnectionSummary,
  type VoiceCadenceRunSummary,
  type VoiceHubConnectionSummary,
  voiceHubApi,
} from '../api/voiceHub.api.js';

export function VoiceHubView() {
  const [connections, setConnections] = useState<VoiceHubConnectionSummary[]>([]);
  const [threeCxConns, setThreeCxConns] = useState<ThreeCXConnectionSummary[]>([]);
  const [coldCallStatus, setColdCallStatus] = useState<ColdCallStatusData | null>(null);
  const [suppressions, setSuppressions] = useState<SuppressionItem[]>([]);
  const [voiceCadences, setVoiceCadences] = useState<VoiceCadenceRunSummary[]>([]);
  const [_loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Quick dialer state
  const [leadIdToCall, setLeadIdToCall] = useState('');
  const [agentType, setAgentType] = useState<'sdr' | 'nps' | 'reactivation'>('sdr');
  const [dialing, setDialing] = useState(false);
  const [dialFeedback, setDialFeedback] = useState<{
    type: 'success' | 'error' | 'warning';
    message: string;
  } | null>(null);

  // Add suppression modal state
  const [showAddSuppression, setShowAddSuppression] = useState(false);
  const [suppressPhone, setSuppressPhone] = useState('');
  const [suppressReason, setSuppressReason] = useState('');
  const [savingSuppression, setSavingSuppression] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [conns, threeCx, coldCall, supps, cadences] = await Promise.all([
        voiceHubApi.getConnections(),
        voiceHubApi.get3CXConnections(),
        voiceHubApi.getColdCallStatus(),
        voiceHubApi.getSuppressions(),
        voiceHubApi.getActiveVoiceCadences(),
      ]);

      setConnections(conns);
      setThreeCxConns(threeCx);
      setColdCallStatus(coldCall);
      setSuppressions(supps);
      setVoiceCadences(cadences);
    } catch (err) {
      console.warn('[VoiceHubView] Erro ao carregar dados de telefonia:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRefresh = () => {
    SoundFX.play('click');
    setRefreshing(true);
    loadData();
  };

  const handleDial = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!leadIdToCall.trim()) return;

    setDialing(true);
    setDialFeedback(null);
    SoundFX.play('click');

    try {
      const result = await voiceHubApi.callLead(leadIdToCall.trim(), agentType);
      SoundFX.play('success');
      setDialFeedback({
        type: 'success',
        message: `Ligação iniciada com sucesso via SDR de voz (Status: ${result.status}${
          result.callSid ? `, SID: ${result.callSid}` : ''
        }).`,
      });
      setLeadIdToCall('');
      loadData();
    } catch (err: any) {
      SoundFX.play('error');
      const msg = err?.response?.data?.error || err?.message || 'Falha ao disparar ligação de voz.';
      setDialFeedback({
        type: 'error',
        message: msg,
      });
    } finally {
      setDialing(false);
    }
  };

  const handleAddSuppression = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!suppressPhone.trim()) return;

    setSavingSuppression(true);
    try {
      await voiceHubApi.addSuppression({
        phone: suppressPhone.trim(),
        reason: suppressReason.trim() || undefined,
      });
      SoundFX.play('confirm');
      setShowAddSuppression(false);
      setSuppressPhone('');
      setSuppressReason('');
      loadData();
    } catch (err: any) {
      SoundFX.play('error');
      alert(err?.response?.data?.error || err?.message || 'Falha ao registrar bloqueio.');
    } finally {
      setSavingSuppression(false);
    }
  };

  const hasVoiceConnection = connections.length > 0 && connections.some((c) => c.enabled);
  const hasThreeCxConnection = threeCxConns.length > 0;

  const totalAttempted =
    coldCallStatus?.recentRuns.reduce((acc, r) => acc + (r.totalAttempted || 0), 0) ?? 0;
  const totalAnswered =
    coldCallStatus?.recentRuns.reduce((acc, r) => acc + (r.totalAnswered || 0), 0) ?? 0;
  const totalScheduled =
    coldCallStatus?.recentRuns.reduce((acc, r) => acc + (r.totalScheduled || 0), 0) ?? 0;

  return (
    <div className="flex-1 overflow-y-auto bg-slate-950 text-slate-100 p-6 md:p-8 space-y-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-iris/20 text-iris border border-iris/30 shadow-inner">
                <Mic className="h-6 w-6" aria-hidden="true" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
                  Voice Hub & Cockpit de Telefonia
                  <Badge variant="outline" className="border-iris/40 text-iris text-xs">
                    Capacidade 5
                  </Badge>
                </h1>
                <p className="text-sm text-slate-400">
                  Operação e orquestração de chamadas ativas com SDR de Voz, Discador 3CX e
                  desbloqueio automático de cadência.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={refreshing}
              className="border-slate-700 hover:bg-slate-800 text-slate-200"
            >
              <RefreshCw
                className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`}
                aria-hidden="true"
              />
              Atualizar
            </Button>
          </div>
        </div>

        {/* Status de Conexões de Telefonia */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="bg-slate-900 border-slate-800 p-5 shadow-sm">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-white font-semibold">
                  <PhoneCall className="h-4 w-4 text-emerald-400" />
                  <span>Birth Voices Hub (SDR IA)</span>
                </div>
                <p className="text-xs text-slate-400">
                  Motor de IA conversacional para cold calls e follow-ups telefônicos.
                </p>
              </div>
              <Badge
                variant={hasVoiceConnection ? 'default' : 'secondary'}
                className={
                  hasVoiceConnection
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                    : 'bg-slate-800 text-slate-400 border-slate-700'
                }
              >
                {hasVoiceConnection ? 'Conectado' : 'Aguardando Configuração'}
              </Badge>
            </div>
            {connections.length > 0 ? (
              <div className="mt-4 pt-3 border-t border-slate-800 text-xs text-slate-300 space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-500">Conexão ativa:</span>
                  <span className="font-mono text-slate-300">{connections[0].label}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Base URL:</span>
                  <span className="font-mono text-slate-400">{connections[0].baseUrl}</span>
                </div>
              </div>
            ) : (
              <div className="mt-4 pt-3 border-t border-slate-800 text-xs text-slate-500 italic">
                Nenhum webhook registrado em Ajustes &gt; Integrações.
              </div>
            )}
          </Card>

          <Card className="bg-slate-900 border-slate-800 p-5 shadow-sm">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-white font-semibold">
                  <Phone className="h-4 w-4 text-cyan-400" />
                  <span>PABX 3CX Call Flow</span>
                </div>
                <p className="text-xs text-slate-400">
                  Integração de telefonia SIP com ramais de consultores e gravação.
                </p>
              </div>
              <Badge
                variant={hasThreeCxConnection ? 'default' : 'secondary'}
                className={
                  hasThreeCxConnection
                    ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30'
                    : 'bg-slate-800 text-slate-400 border-slate-700'
                }
              >
                {hasThreeCxConnection ? 'Habilitado' : 'Não Vinculado'}
              </Badge>
            </div>
            {threeCxConns.length > 0 ? (
              <div className="mt-4 pt-3 border-t border-slate-800 text-xs text-slate-300 space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-500">PABX Host:</span>
                  <span className="font-mono text-slate-300">{threeCxConns[0].pbxUrl}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Ramal Ativo:</span>
                  <span className="font-mono text-cyan-300">{threeCxConns[0].extension}</span>
                </div>
              </div>
            ) : (
              <div className="mt-4 pt-3 border-t border-slate-800 text-xs text-slate-500 italic">
                Conecte seu ramal 3CX na aba de Integrações.
              </div>
            )}
          </Card>
        </div>

        {/* Métricas Bento Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-slate-900 border-slate-800 p-4">
            <div className="text-xs text-slate-400 font-medium">Chamadas Tentadas</div>
            <div className="text-2xl font-bold text-white mt-1">{totalAttempted}</div>
            <div className="text-[11px] text-slate-500 mt-1">Total de disparos no ciclo</div>
          </Card>

          <Card className="bg-slate-900 border-slate-800 p-4">
            <div className="text-xs text-slate-400 font-medium">Atendidas & Conversadas</div>
            <div className="text-2xl font-bold text-emerald-400 mt-1">{totalAnswered}</div>
            <div className="text-[11px] text-slate-500 mt-1">
              {totalAttempted > 0
                ? `${Math.round((totalAnswered / totalAttempted) * 100)}% de taxa de contato`
                : 'Sem chamadas'}
            </div>
          </Card>

          <Card className="bg-slate-900 border-slate-800 p-4">
            <div className="text-xs text-slate-400 font-medium">Reuniões Agendadas</div>
            <div className="text-2xl font-bold text-iris mt-1">{totalScheduled}</div>
            <div className="text-[11px] text-slate-500 mt-1">Convertidas pelo SDR</div>
          </Card>

          <Card className="bg-slate-900 border-slate-800 p-4">
            <div className="text-xs text-slate-400 font-medium">Cadências de Voz Ativas</div>
            <div className="text-2xl font-bold text-cyan-400 mt-1">{voiceCadences.length}</div>
            <div className="text-[11px] text-slate-500 mt-1">Toques monitorados</div>
          </Card>
        </div>

        {/* Seção Principal: Discador Rápido + Fila de Voz */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Coluna 1 e 2: Quick Dialer */}
          <div className="lg:col-span-2 space-y-4">
            <Card className="bg-slate-900 border-slate-800 p-6 space-y-4 shadow-sm">
              <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
                <div>
                  <h2 className="text-base font-semibold text-white flex items-center gap-2">
                    <PhoneCall className="h-4 w-4 text-emerald-400" />
                    Discador SDR Direto
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Selecione ou insira o ID de um lead para acionar o agente de voz com verificação
                    de opt-out e consentimento LGPD.
                  </p>
                </div>
              </div>

              <form onSubmit={handleDial} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-2 space-y-1.5">
                    <label htmlFor="lead-id-input" className="text-xs font-medium text-slate-300">
                      ID do Lead no CRM
                    </label>
                    <input
                      id="lead-id-input"
                      type="text"
                      value={leadIdToCall}
                      onChange={(e) => setLeadIdToCall(e.target.value)}
                      placeholder="ex.: lead_123456"
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-iris"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label
                      htmlFor="agent-type-select"
                      className="text-xs font-medium text-slate-300"
                    >
                      Roteiro do Agente
                    </label>
                    <select
                      id="agent-type-select"
                      value={agentType}
                      onChange={(e) =>
                        setAgentType(e.target.value as 'sdr' | 'nps' | 'reactivation')
                      }
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white focus:outline-none focus:ring-1 focus:ring-iris"
                    >
                      <option value="sdr">SDR (Qualificação)</option>
                      <option value="nps">NPS / Pós-Venda</option>
                      <option value="reactivation">Reativação Comercial</option>
                    </select>
                  </div>
                </div>

                {dialFeedback && (
                  <div
                    className={`p-3 rounded-lg border text-xs flex items-center gap-2 ${
                      dialFeedback.type === 'success'
                        ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-300'
                        : dialFeedback.type === 'warning'
                          ? 'bg-amber-950/40 border-amber-800/60 text-amber-300'
                          : 'bg-rose-950/40 border-rose-800/60 text-rose-300'
                    }`}
                  >
                    {dialFeedback.type === 'success' ? (
                      <CheckCircle2 className="h-4 w-4 shrink-0" />
                    ) : (
                      <AlertCircle className="h-4 w-4 shrink-0" />
                    )}
                    <span>{dialFeedback.message}</span>
                  </div>
                )}

                <div className="flex items-center justify-between pt-2">
                  <div className="text-xs text-slate-500 flex items-center gap-1.5">
                    <Shield className="h-3.5 w-3.5 text-slate-400" />
                    Proteção LGPD ativa (checa supressão antes do disparo)
                  </div>

                  <Button
                    type="submit"
                    variant="brand"
                    disabled={dialing || !leadIdToCall.trim()}
                    className="font-medium bg-iris hover:bg-iris text-white"
                  >
                    <PhoneCall className="h-4 w-4 mr-2" />
                    {dialing ? 'Disparando...' : 'Iniciar Chamada SDR'}
                  </Button>
                </div>
              </form>
            </Card>

            {/* Fila de Cadência com Voz */}
            <Card className="bg-slate-900 border-slate-800 p-5 space-y-3 shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <Layers className="h-4 w-4 text-cyan-400" />
                  <h3 className="text-sm font-semibold text-white">
                    Toques de Voz em Cadências Multicanais
                  </h3>
                </div>
                <span className="text-xs text-slate-400 font-mono">
                  {voiceCadences.length} ativa(s)
                </span>
              </div>

              {voiceCadences.length === 0 ? (
                <div className="py-6 text-center text-xs text-slate-500">
                  Nenhuma cadência ativa com toques de voz no momento.
                </div>
              ) : (
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {voiceCadences.map((run) => (
                    <div
                      key={run.id}
                      className="p-3 bg-slate-950/60 rounded-lg border border-slate-800/80 flex items-center justify-between text-xs"
                    >
                      <div>
                        <div className="font-semibold text-white flex items-center gap-2">
                          <span>Lead: {run.leadId}</span>
                          <Badge
                            variant="outline"
                            className="text-[10px] border-slate-700 text-slate-300"
                          >
                            Sequência: {run.sequenceId.slice(0, 8)}...
                          </Badge>
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          Toque atual: #{run.currentTouchIndex + 1}
                        </div>
                      </div>

                      <Badge className="bg-cyan-950 text-cyan-300 border-cyan-800 text-[10px]">
                        Canal Voz Ativo
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>

          {/* Coluna 3: Gestão de Opt-Out e Supressão */}
          <div className="space-y-4">
            <Card className="bg-slate-900 border-slate-800 p-5 space-y-4 shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="h-4 w-4 text-amber-400" />
                  <h3 className="text-sm font-semibold text-white">Lista de Supressão (Opt-Out)</h3>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowAddSuppression(!showAddSuppression)}
                  className="h-7 text-xs border-slate-700 text-slate-300 hover:bg-slate-800"
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Bloquear
                </Button>
              </div>

              {showAddSuppression && (
                <form
                  onSubmit={handleAddSuppression}
                  className="p-3 bg-slate-950 rounded-lg border border-slate-800 space-y-3"
                >
                  <div className="space-y-1">
                    <label
                      htmlFor="suppress-phone-input"
                      className="text-[11px] text-slate-400 font-medium"
                    >
                      Telefone a Bloquear
                    </label>
                    <input
                      id="suppress-phone-input"
                      type="text"
                      value={suppressPhone}
                      onChange={(e) => setSuppressPhone(e.target.value)}
                      placeholder="ex.: 11999998888"
                      className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded text-xs text-white"
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <label
                      htmlFor="suppress-reason-input"
                      className="text-[11px] text-slate-400 font-medium"
                    >
                      Motivo (opcional)
                    </label>
                    <input
                      id="suppress-reason-input"
                      type="text"
                      value={suppressReason}
                      onChange={(e) => setSuppressReason(e.target.value)}
                      placeholder="Solicitado via ligação"
                      className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded text-xs text-white"
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowAddSuppression(false)}
                      className="h-6 text-xs text-slate-400"
                    >
                      Cancelar
                    </Button>
                    <Button
                      type="submit"
                      variant="brand"
                      size="sm"
                      disabled={savingSuppression || !suppressPhone.trim()}
                      className="h-6 text-xs bg-amber-600 hover:bg-amber-500 text-white"
                    >
                      Confirmar
                    </Button>
                  </div>
                </form>
              )}

              {suppressions.length === 0 ? (
                <div className="py-6 text-center text-xs text-slate-500">
                  Nenhum número na lista de supressão deste tenant.
                </div>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {suppressions.map((sup) => (
                    <div
                      key={sup.id}
                      className="p-2.5 bg-slate-950/50 rounded-lg border border-slate-800 text-xs flex items-center justify-between"
                    >
                      <div>
                        <div className="font-mono text-slate-200">{sup.phone}</div>
                        <div className="text-[10px] text-slate-500">
                          {sup.reason || 'Opt-out manual'} • Fonte: {sup.source}
                        </div>
                      </div>
                      <PhoneOff className="h-3.5 w-3.5 text-rose-400" />
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
