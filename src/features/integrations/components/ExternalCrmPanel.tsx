/**
 * ExternalCrmPanel — Painel moderno, acessível e robusto de conexão para CRMs externos.
 * Suporta HubSpot, Pipedrive, RD Station e Monday.com.
 * Implementa estados explícitos (disconnected, connecting, connected, syncing, error),
 * fluxo de modal acessível com validação de formato e teste de conexão ponta a ponta,
 * exibição segura de credenciais mascaradas e conformidade WCAG 2.2 AA.
 */

import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Eye,
  EyeOff,
  HelpCircle,
  KeyRound,
  Layers,
  Link2,
  Loader2,
  Lock,
  PlugZap,
  PlusCircle,
  RefreshCw,
  Share2,
  ShieldCheck,
  Trash2,
  X,
  Zap,
} from 'lucide-react';
import React, { useCallback, useEffect, useState } from 'react';
import { CompanyBrandIcon } from '../../../components/brand/CompanyBrandIcon.js';
import { Card } from '../../../components/ui/Card.js';
import { BRAND } from '../../../config/brand.js';
import { useAuth } from '../../../contexts/AuthContext.js';
import { hasRequiredRole } from '../../../lib/auth/authorization.js';
import { SoundFX } from '../../../lib/soundEffects.js';
import { toast } from '../../../lib/toast.js';

export interface CrmConnection {
  id: string;
  provider: string;
  label: string;
  inboundEventsEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ExternalCrmPanelProps {
  providerKey: 'hubspot' | 'pipedrive' | 'rdstation' | 'monday';
  displayName: string;
  authType: 'oauth2' | 'api_key';
  iconSrc?: string;
  organizationId?: string;
}

interface ProviderMeta {
  emoji: string;
  tagline: string;
  description: string;
  docsUrl?: string;
  tokenLabel: string;
  tokenPlaceholder: string;
  tokenHelp: string;
  requiresDomain?: boolean;
  domainLabel?: string;
  domainPlaceholder?: string;
  requiresBoardId?: boolean;
  boardIdLabel?: string;
  boardIdPlaceholder?: string;
  capabilities: Array<{ label: string; type: 'read' | 'write' | 'sync' }>;
  truthText: string;
  badgeBg: string;
  badgeText: string;
  accentColor: string;
}

const PROVIDER_METAS: Record<string, ProviderMeta> = {
  hubspot: {
    emoji: '🟠',
    tagline: 'HubSpot CRM Hub & Sales',
    description:
      'Sincronização de contatos, empresas e negócios (Deals) com o HubSpot através de Private App Token oficial.',
    tokenLabel: 'Token de Acesso do Private App (Bearer)',
    tokenPlaceholder: 'pat-na1-... ou Bearer token',
    tokenHelp:
      'Gere em HubSpot → Configurações → Integrações → Aplicativos Privados com escopos de crm.objects.contacts e crm.objects.deals.',
    requiresDomain: true,
    domainLabel: 'Portal ID / Domínio (opcional)',
    domainPlaceholder: 'ex: 12345678 ou app.hubspot.com',
    capabilities: [
      { label: 'Leitura de Contatos e Deals', type: 'read' },
      { label: 'Escrita de Leads qualificados', type: 'write' },
      { label: 'Mapeamento de Estágios do Funil', type: 'sync' },
    ],
    truthText:
      'A conexão realiza chamadas autenticadas na API v3 do HubSpot. Os dados de contato e oportunidade são criptografados em repouso com AES-GCM-256.',
    badgeBg: 'bg-orange-50 dark:bg-orange-500/10',
    badgeText: 'text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-500/20',
    accentColor: '#FF7A59',
  },
  pipedrive: {
    emoji: '🟢',
    tagline: 'Pipedrive Sales CRM',
    description:
      'Integração direta com pipelines, pessoas e negócios do Pipedrive via API Token v1 pessoal.',
    tokenLabel: 'API Token Pessoal (v1)',
    tokenPlaceholder: 'ex: 4a2b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b',
    tokenHelp:
      'Encontre seu token em Pipedrive → Ajustes → Preferências Pessoais → API → Seu token de API pessoal.',
    requiresDomain: true,
    domainLabel: 'Subdomínio da Empresa',
    domainPlaceholder: 'ex: suaempresa.pipedrive.com',
    capabilities: [
      { label: 'Leitura de Pessoas e Negócios', type: 'read' },
      { label: 'Criação de Oportunidades no Funil', type: 'write' },
      { label: 'Suporte a Múltiplos Pipelines', type: 'sync' },
    ],
    truthText:
      'Consulta e atualiza negócios em tempo real na API REST v1 do Pipedrive. Sincronização incremental baseada no histórico de alterações.',
    badgeBg: 'bg-emerald-50 dark:bg-emerald-500/10',
    badgeText:
      'text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-500/20',
    accentColor: '#22C55E',
  },
  rdstation: {
    emoji: '🔵',
    tagline: 'RD Station CRM & Marketing',
    description:
      'Conexão para envio de oportunidades e conversões entre o Birth Hub 360 e o ecossistema RD Station.',
    tokenLabel: 'Token de Acesso / Token de Integração',
    tokenPlaceholder: 'ex: token_rd_station_...',
    tokenHelp:
      'Copie o token de integração em RD Station CRM → Configurações → Integrações → Tokens de Acesso.',
    capabilities: [
      { label: 'Leitura de Oportunidades e Contatos', type: 'read' },
      { label: 'Envio de Leads Qualificados', type: 'write' },
      { label: 'Sincronização de Status do Funil', type: 'sync' },
    ],
    truthText:
      'Envia leads enriquecidos para o funil de vendas do RD Station CRM. Não altera dados históricos sem confirmação explícita.',
    badgeBg: 'bg-blue-50 dark:bg-blue-500/10',
    badgeText: 'text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-500/20',
    accentColor: '#007FFF',
  },
  monday: {
    emoji: '🔴',
    tagline: 'Monday.com Work OS / Sales CRM',
    description:
      'Sincronização de leads e tarefas comerciais diretamente como itens de quadros (Boards) no Monday.com.',
    tokenLabel: 'API Token v2 (GraphQL)',
    tokenPlaceholder: 'eyJhbGciOiJIUzI1NiJ9...',
    tokenHelp:
      'Gere seu token de desenvolvedor em Monday.com → Perfil → Desenvolvedores → API Token v2.',
    requiresBoardId: true,
    boardIdLabel: 'ID do Quadro Comercial (Board ID)',
    boardIdPlaceholder: 'ex: 9876543210 (números na URL do quadro)',
    capabilities: [
      { label: 'Leitura de Colunas e Itens do Quadro', type: 'read' },
      { label: 'Criação de Itens (Leads) no Board', type: 'write' },
      { label: 'Atualização de Prazos e Responsáveis', type: 'sync' },
    ],
    truthText:
      'Conexão via GraphQL API v2 do Monday.com. Os leads são registrados com colunas mapeadas no quadro comercial definido.',
    badgeBg: 'bg-rose-50 dark:bg-rose-500/10',
    badgeText: 'text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-500/20',
    accentColor: '#F62B54',
  },
};

export function ExternalCrmPanel({ providerKey, displayName, authType }: ExternalCrmPanelProps) {
  const { currentUser } = useAuth();
  const canManage = !!currentUser && hasRequiredRole(currentUser.role, ['ADMIN', 'GESTOR']);

  const meta = PROVIDER_METAS[providerKey] ?? {
    emoji: '🔌',
    tagline: `${displayName} Integration`,
    description: `Conexão e sincronização de dados com ${displayName}.`,
    tokenLabel: authType === 'api_key' ? 'API Key / Token' : 'Access Token (OAuth)',
    tokenPlaceholder: 'Insira o token de acesso...',
    tokenHelp: `Obtenha a chave de API ou token de acesso nas configurações de desenvolvedor do ${displayName}.`,
    capabilities: [
      { label: 'Leitura de registros', type: 'read' },
      { label: 'Envio de leads', type: 'write' },
    ],
    truthText: `Comunicação direta com a API do ${displayName}. Credenciais criptografadas em repouso.`,
    badgeBg: 'bg-surface-2',
    badgeText: 'text-ink-2 border-line',
    accentColor: '#6366F1',
  };

  const [connections, setConnections] = useState<CrmConnection[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadedOnce, setLoadedOnce] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form State
  const [formLabel, setFormLabel] = useState('');
  const [formToken, setFormToken] = useState('');
  const [formDomain, setFormDomain] = useState('');
  const [formBoardId, setFormBoardId] = useState('');
  const [formInboundEvents, setFormInboundEvents] = useState(false);
  const [showTokenText, setShowTokenText] = useState(false);
  const [formValidationErrors, setFormValidationErrors] = useState<Record<string, string>>({});

  // Action States
  const [saving, setSaving] = useState(false);
  const [testingBeforeSave, setTestingBeforeSave] = useState(false);
  const [pingResult, setPingResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{
    id: string;
    success: boolean;
    message: string;
  } | null>(null);
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [syncResult, setSyncResult] = useState<{
    id: string;
    success: boolean;
    message: string;
  } | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchConnections = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/integrations/external-crm?provider=${providerKey}`, {
        method: 'GET',
      });
      if (!res.ok) {
        throw new Error(`Falha ao carregar conexões de ${displayName} (status ${res.status})`);
      }
      const data = (await res.json()) as CrmConnection[];
      setConnections(data);
      setLoadedOnce(true);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Erro ao consultar conexões';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [providerKey, displayName]);

  useEffect(() => {
    fetchConnections();
  }, [fetchConnections]);

  // Validation
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    if (!formToken.trim()) {
      errors.token = 'O token de autenticação é obrigatório.';
    } else if (formToken.trim().length < 5) {
      errors.token = 'O token informado é muito curto para ser válido.';
    }

    if (meta.requiresBoardId && !formBoardId.trim()) {
      errors.boardId = 'O ID do Quadro (Board ID) é obrigatório para o Monday.com.';
    }

    if (meta.requiresDomain && formDomain.trim()) {
      if (
        providerKey === 'pipedrive' &&
        !formDomain.includes('.') &&
        !formDomain.includes('pipedrive')
      ) {
        errors.domain = 'Formato recomendado: suaempresa.pipedrive.com ou subdomínio.';
      }
    }

    setFormValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleOpenModal = () => {
    SoundFX.play('click');
    setFormLabel(`${displayName} Principal`);
    setFormToken('');
    setFormDomain('');
    setFormBoardId('');
    setFormInboundEvents(false);
    setShowTokenText(false);
    setFormValidationErrors({});
    setTestingBeforeSave(false);
    setPingResult(null);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    if (saving || testingBeforeSave) return;
    setIsModalOpen(false);
  };

  // Ping / Test connection before saving
  const handlePingBeforeSave = async () => {
    if (!validateForm()) {
      SoundFX.play('error');
      return;
    }

    setTestingBeforeSave(true);
    setPingResult(null);
    try {
      const res = await fetch(`/api/integrations/${providerKey}/ping`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: providerKey,
          token: formToken.trim(),
          apiKey: formToken.trim(),
          accessToken: formToken.trim(),
          domain: formDomain.trim(),
          boardId: formBoardId.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.valid) {
        throw new Error(data.error || 'Credenciais inválidas ou rejeitadas pelo provedor.');
      }

      SoundFX.play('success');
      setPingResult({
        success: true,
        message: data.message || `Conexão com ${displayName} validada com sucesso!`,
      });
      toast.success(data.message || `Conexão com ${displayName} validada com sucesso!`);
    } catch (err: unknown) {
      SoundFX.play('error');
      const msg = err instanceof Error ? err.message : 'Falha na validação em tempo real.';
      setPingResult({ success: false, message: msg });
      toast.error(msg);
    } finally {
      setTestingBeforeSave(false);
    }
  };

  // Save connection
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) {
      SoundFX.play('error');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const config: Record<string, string> = {};
      if (authType === 'api_key') {
        config.apiKey = formToken.trim();
      } else {
        config.accessToken = formToken.trim();
      }
      if (formDomain.trim()) config.domain = formDomain.trim();
      if (formBoardId.trim()) config.boardId = formBoardId.trim();

      const res = await fetch('/api/integrations/external-crm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: providerKey,
          label: formLabel.trim() || `${displayName} Principal`,
          config,
          inboundEventsEnabled: formInboundEvents,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || `Erro ao registrar conexão com ${displayName}.`);
      }

      SoundFX.play('success');
      toast.success(`Conexão com ${displayName} salva com sucesso!`);
      setIsModalOpen(false);
      await fetchConnections();
    } catch (err: unknown) {
      SoundFX.play('error');
      const msg = err instanceof Error ? err.message : 'Falha ao salvar conexão.';
      setError(msg);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  // Test connection
  const handleTestConnection = async (connectionId: string) => {
    SoundFX.play('click');
    setTestingId(connectionId);
    setTestResult(null);
    try {
      const res = await fetch(`/api/integrations/external-crm/${connectionId}/test`, {
        method: 'POST',
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        const errorMsg =
          data.error || 'Credenciais inválidas ou sem permissão de acesso no CRM externo.';
        setTestResult({ id: connectionId, success: false, message: errorMsg });
        SoundFX.play('error');
        toast.error(errorMsg);
      } else {
        const okMsg = data.message || 'Conexão validada e ativa com sucesso!';
        setTestResult({ id: connectionId, success: true, message: okMsg });
        SoundFX.play('success');
        toast.success(okMsg);
      }
    } catch {
      const failMsg = 'Erro de comunicação ao validar credenciais do CRM.';
      setTestResult({ id: connectionId, success: false, message: failMsg });
      SoundFX.play('error');
      toast.error(failMsg);
    } finally {
      setTestingId(null);
    }
  };

  // Sync leads
  const handleSyncLeads = async (connectionId: string) => {
    SoundFX.play('click');
    setSyncingId(connectionId);
    setSyncResult(null);
    try {
      const res = await fetch(`/api/integrations/external-crm/${connectionId}/sync`, {
        method: 'POST',
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        const errMsg = data.error || 'Erro ao sincronizar registros com o CRM.';
        setSyncResult({ id: connectionId, success: false, message: errMsg });
        SoundFX.play('error');
        toast.error(errMsg);
      } else {
        const okMsg =
          data.message ||
          `${data.importedCount ?? 0} registro(s) sincronizado(s) com ${displayName}!`;
        setSyncResult({ id: connectionId, success: true, message: okMsg });
        SoundFX.play('success');
        toast.success(okMsg);
        await fetchConnections();
      }
    } catch {
      const errMsg = 'Falha ao processar sincronização de leads.';
      setSyncResult({ id: connectionId, success: false, message: errMsg });
      SoundFX.play('error');
      toast.error(errMsg);
    } finally {
      setSyncingId(null);
    }
  };

  // Delete connection
  const handleDeleteConnection = async (connectionId: string, label: string) => {
    if (
      !window.confirm(`Tem certeza que deseja desconectar e remover "${label}" do ${displayName}?`)
    ) {
      return;
    }
    SoundFX.play('click');
    setDeletingId(connectionId);
    try {
      const res = await fetch(`/api/integrations/external-crm/${connectionId}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        throw new Error('Falha ao desconectar CRM.');
      }
      SoundFX.play('click');
      toast.success(`Conexão "${label}" removida com sucesso.`);
      setConnections((prev) => prev.filter((c) => c.id !== connectionId));
    } catch (e: unknown) {
      SoundFX.play('error');
      const msg = e instanceof Error ? e.message : 'Erro ao remover conexão.';
      toast.error(msg);
      setError(msg);
    } finally {
      setDeletingId(null);
    }
  };

  const isConnected = connections.length > 0;

  return (
    <Card className="glass-card p-6 md:p-8 border border-line shadow-sm rounded-2xl bg-surface transition-colors">
      {/* Header Principal */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-line">
        <div className="flex items-center gap-4">
          <div
            className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border ${meta.badgeBg} ${meta.badgeText}`}
          >
            <span className="text-2xl" aria-hidden="true">
              {meta.emoji}
            </span>
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xl font-bold text-brand-ink dark:text-[#00D4FF] flex items-center gap-2"><CompanyBrandIcon name={providerKey} className="w-6 h-6 inline-block" /> {displayName}</h2>
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider border ${
                  isConnected
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/20'
                    : 'bg-surface-2 text-ink-2 border-line'
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-ink-3'}`}
                  aria-hidden="true"
                />
                {isConnected ? 'Conectado' : 'Desconectado'}
              </span>
            </div>
            <p className="text-sm text-sky-700 dark:text-[#70D6FF] mt-0.5">{meta.tagline}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-center">
          <button
            type="button"
            onClick={fetchConnections}
            disabled={loading}
            aria-label={`Atualizar status de ${displayName}`}
            className="p-2.5 rounded-xl border border-line bg-surface-2 text-ink-2 hover:text-ink hover:bg-surface-3 transition-colors disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
            title="Atualizar lista"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            type="button"
            onClick={handleOpenModal}
            disabled={!canManage}
            title={canManage ? undefined : 'Requer permissão de Gestor ou Administrador'}
            className="flex items-center gap-2 px-4 py-2.5 bg-brand text-on-brand font-bold text-sm rounded-xl shadow-sm hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-60 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
          >
            <PlusCircle className="w-4 h-4" />
            {isConnected ? 'Nova Conexão' : 'Conectar CRM'}
          </button>
        </div>
      </div>

      <div className="mt-6 space-y-6">
        {/* Truth Box & Capacidades Reais (§25) */}
        <div className="rounded-xl border border-line bg-surface-2 p-4 text-xs text-ink-2 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 font-bold uppercase tracking-wide border ${
                isConnected
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300'
                  : 'bg-surface-3 text-ink-2 border-line'
              }`}
            >
              {isConnected ? (
                <PlugZapIcon className="w-3.5 h-3.5" />
              ) : (
                <Clock className="w-3.5 h-3.5" />
              )}
              {isConnected ? 'status: ativo' : 'status: desconectado'}
            </span>

            {meta.capabilities.map((cap, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 font-medium border bg-surface-1 text-ink-2 border-line"
              >
                {cap.type === 'read' && <Eye className="w-3.5 h-3.5 text-sky-500" />}
                {cap.type === 'write' && <Zap className="w-3.5 h-3.5 text-amber-500" />}
                {cap.type === 'sync' && <Layers className="w-3.5 h-3.5 text-violet-500" />}
                {cap.label}
              </span>
            ))}
          </div>
          <p className="leading-relaxed">
            {meta.truthText} As comunicações com {displayName} respeitam isolamento multi-tenant por
            organização e integridade referencial.
          </p>
        </div>

        {/* Global Error Banner */}
        {error && (
          <div
            role="alert"
            className="flex items-start gap-3 p-4 rounded-xl border border-danger/30 bg-danger/10 text-danger text-sm"
          >
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold">Ocorreu um erro na comunicação com {displayName}:</p>
              <p className="mt-0.5 text-xs opacity-90">{error}</p>
            </div>
            <button
              type="button"
              onClick={() => setError(null)}
              className="text-danger hover:opacity-80 p-1"
              aria-label="Fechar alerta de erro"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Permission Notice */}
        {!canManage && (
          <div className="p-3.5 rounded-xl border border-amber-300/40 bg-amber-500/10 flex items-center gap-2.5 text-xs text-amber-800 dark:text-amber-200">
            <Lock className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400" />
            <span>
              Você está em modo de visualização. Para adicionar, testar credenciais ou sincronizar
              conexões com o {displayName}, é necessário perfil de Gestor ou Administrador.
            </span>
          </div>
        )}

        {/* Lista de Conexões Ativas */}
        {loadedOnce && isConnected && (
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-ink flex items-center gap-2">
              <Share2 className="w-4 h-4 text-brand" />
              Conexões Ativas ({connections.length})
            </h3>

            <div className="grid grid-cols-1 gap-3">
              {connections.map((conn) => {
                const isTesting = testingId === conn.id;
                const isSyncing = syncingId === conn.id;
                const isDeleting = deletingId === conn.id;
                const thisTestResult = testResult?.id === conn.id ? testResult : null;
                const thisSyncResult = syncResult?.id === conn.id ? syncResult : null;

                return (
                  <div
                    key={conn.id}
                    className="p-4 rounded-xl border border-line bg-surface-1 hover:border-brand/30 transition-all shadow-xs space-y-3"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <span className="w-3.5 h-3.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)] shrink-0" />
                        <div>
                          <p className="text-sm font-bold text-ink">{conn.label}</p>
                          <div className="flex items-center gap-2 text-xs text-ink-2 flex-wrap">
                            <span className="inline-flex items-center gap-1 font-mono">
                              <ShieldCheck className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                              Credenciais criptografadas (AES-256)
                            </span>
                            <span>•</span>
                            <span>
                              Criado em {new Date(conn.createdAt).toLocaleDateString('pt-BR')}
                            </span>
                            {conn.inboundEventsEnabled && (
                              <>
                                <span>•</span>
                                <span className="text-brand font-medium">Webhooks Ativos</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Botões de Ação por Conexão */}
                      <div className="flex items-center gap-2 flex-wrap self-end sm:self-center">
                        <button
                          type="button"
                          onClick={() => handleTestConnection(conn.id)}
                          disabled={isTesting || isSyncing || isDeleting || !canManage}
                          title={
                            canManage
                              ? 'Testa autenticação com o servidor do CRM'
                              : 'Requer permissão de Gestor ou Administrador'
                          }
                          className="px-3 py-1.5 text-xs font-bold rounded-lg border border-line bg-surface-2 text-ink hover:bg-surface-3 transition-colors disabled:opacity-50 flex items-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                        >
                          {isTesting ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin text-brand" />
                          ) : (
                            <KeyRound className="w-3.5 h-3.5 text-brand" />
                          )}
                          {isTesting ? 'Validando...' : 'Testar Conexão'}
                        </button>

                        <button
                          type="button"
                          onClick={() => handleSyncLeads(conn.id)}
                          disabled={isTesting || isSyncing || isDeleting || !canManage}
                          title={
                            canManage
                              ? 'Importa e sincroniza leads do CRM externo'
                              : 'Requer permissão de Gestor ou Administrador'
                          }
                          className="px-3 py-1.5 text-xs font-bold rounded-lg bg-soft text-brand-ink dark:text-brand border border-brand/20 hover:bg-brand/20 transition-colors disabled:opacity-50 flex items-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                        >
                          {isSyncing ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin text-brand" />
                          ) : (
                            <RefreshCw className="w-3.5 h-3.5 text-brand" />
                          )}
                          {isSyncing ? 'Sincronizando...' : 'Sincronizar'}
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeleteConnection(conn.id, conn.label)}
                          disabled={isTesting || isSyncing || isDeleting || !canManage}
                          title={
                            canManage
                              ? 'Desconectar este portal'
                              : 'Requer permissão de Gestor ou Administrador'
                          }
                          className="p-1.5 text-danger-active dark:text-danger hover:bg-danger/10 rounded-lg transition-colors disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger"
                          aria-label={`Desconectar ${conn.label}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Feedback inline do teste de conexão */}
                    {thisTestResult && (
                      <div
                        className={`p-2.5 rounded-lg text-xs flex items-center gap-2 border ${
                          thisTestResult.success
                            ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-800 dark:text-emerald-200 border-emerald-200 dark:border-emerald-500/20'
                            : 'bg-red-50 dark:bg-red-500/10 text-red-800 dark:text-red-200 border-red-200 dark:border-red-500/20'
                        }`}
                      >
                        {thisTestResult.success ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        ) : (
                          <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                        )}
                        <span>{thisTestResult.message}</span>
                      </div>
                    )}

                    {/* Feedback inline de sincronização */}
                    {thisSyncResult && (
                      <div
                        className={`p-2.5 rounded-lg text-xs flex items-center gap-2 border ${
                          thisSyncResult.success
                            ? 'bg-blue-50 dark:bg-blue-500/10 text-blue-800 dark:text-blue-200 border-blue-200 dark:border-blue-500/20'
                            : 'bg-red-50 dark:bg-red-500/10 text-red-800 dark:text-red-200 border-red-200 dark:border-red-500/20'
                        }`}
                      >
                        {thisSyncResult.success ? (
                          <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
                        ) : (
                          <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                        )}
                        <span>{thisSyncResult.message}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Empty State / Disconnected */}
        {loadedOnce && !isConnected && (
          <div className="p-8 rounded-2xl border border-dashed border-line bg-surface-2/40 text-center space-y-4">
            <div
              className={`w-14 h-14 mx-auto rounded-2xl flex items-center justify-center text-3xl border ${meta.badgeBg} ${meta.badgeText}`}
            >
              {meta.emoji}
            </div>
            <div className="max-w-md mx-auto space-y-1">
              <h3 className="text-base font-bold text-ink">
                Nenhum portal {displayName} conectado
              </h3>
              <p className="text-xs text-ink-2 leading-relaxed">
                Conecte seu CRM {displayName} para sincronizar leads em tempo real, enriquecer
                oportunidades e centralizar seu pipeline no {BRAND.name}.
              </p>
            </div>
            <button
              type="button"
              onClick={handleOpenModal}
              disabled={!canManage}
              title={canManage ? undefined : 'Requer permissão de Gestor ou Administrador'}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-brand text-on-brand font-bold text-sm rounded-xl shadow-sm hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-60 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
            >
              <Link2 className="w-4 h-4" />
              Conectar {displayName}
            </button>
          </div>
        )}
      </div>

      {/* Modal Dialog para Conectar / Configurar Nova Conexão */}
      {isModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="crm-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
          onKeyDown={(e) => {
            if (e.key === 'Escape') handleCloseModal();
          }}
        >
          <div
            className="w-full max-w-lg rounded-2xl border border-line bg-surface p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-line">
              <div className="flex items-center gap-3">
                <span className="text-2xl" aria-hidden="true">
                  {meta.emoji}
                </span>
                <div>
                  <h3 id="crm-modal-title" className="text-lg font-bold text-ink">
                    Conectar {displayName}
                  </h3>
                  <p className="text-xs text-ink-2">Preencha as credenciais da integração</p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleCloseModal}
                disabled={saving}
                className="p-2 text-ink-2 hover:text-ink hover:bg-surface-2 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                aria-label="Fechar janela"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSave} className="space-y-4">
              {/* Nome / Rótulo da Conexão */}
              <div>
                <label
                  htmlFor="modal-crm-label"
                  className="block text-xs font-semibold text-ink-2 mb-1"
                >
                  Nome de Identificação (opcional)
                </label>
                <input
                  id="modal-crm-label"
                  type="text"
                  value={formLabel}
                  onChange={(e) => setFormLabel(e.target.value)}
                  placeholder={`Ex: ${displayName} Comercial`}
                  disabled={saving}
                  className="w-full px-3.5 py-2 text-sm rounded-lg border border-line bg-surface-1 text-ink placeholder:text-ink-3 outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand transition-colors"
                />
              </div>

              {/* Token / Credencial Principal */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label
                    htmlFor="modal-crm-token"
                    className="text-xs font-semibold text-ink-2 flex items-center gap-1.5"
                  >
                    <KeyRound className="w-3.5 h-3.5 text-brand" />
                    {meta.tokenLabel}
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowTokenText((v) => !v)}
                    className="text-[11px] text-ink-2 hover:text-ink inline-flex items-center gap-1"
                    tabIndex={-1}
                  >
                    {showTokenText ? (
                      <>
                        <EyeOff className="w-3 h-3" /> Ocultar
                      </>
                    ) : (
                      <>
                        <Eye className="w-3 h-3" /> Ver
                      </>
                    )}
                  </button>
                </div>
                <input
                  id="modal-crm-token"
                  type={showTokenText ? 'text' : 'password'}
                  required
                  value={formToken}
                  onChange={(e) => {
                    setFormToken(e.target.value);
                    if (formValidationErrors.token) {
                      setFormValidationErrors((prev) => ({ ...prev, token: '' }));
                    }
                  }}
                  placeholder={meta.tokenPlaceholder}
                  disabled={saving}
                  autoComplete="off"
                  className={`w-full px-3.5 py-2 text-sm font-mono rounded-lg border ${
                    formValidationErrors.token ? 'border-danger' : 'border-line'
                  } bg-surface-1 text-ink placeholder:text-ink-3 outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand transition-colors`}
                />
                {formValidationErrors.token && (
                  <p className="mt-1 text-xs text-danger">{formValidationErrors.token}</p>
                )}
                <p className="mt-1 text-[11px] text-ink-3 leading-relaxed flex items-start gap-1">
                  <HelpCircle className="w-3 h-3 shrink-0 mt-0.5 text-ink-3" />
                  {meta.tokenHelp}
                </p>
              </div>

              {/* Domínio / Portal (se aplicável) */}
              {meta.requiresDomain && (
                <div>
                  <label
                    htmlFor="modal-crm-domain"
                    className="block text-xs font-semibold text-ink-2 mb-1"
                  >
                    {meta.domainLabel ?? 'Domínio / Subdomínio'}
                  </label>
                  <input
                    id="modal-crm-domain"
                    type="text"
                    value={formDomain}
                    onChange={(e) => {
                      setFormDomain(e.target.value);
                      if (formValidationErrors.domain) {
                        setFormValidationErrors((prev) => ({ ...prev, domain: '' }));
                      }
                    }}
                    placeholder={meta.domainPlaceholder}
                    disabled={saving}
                    className={`w-full px-3.5 py-2 text-sm rounded-lg border ${
                      formValidationErrors.domain ? 'border-danger' : 'border-line'
                    } bg-surface-1 text-ink placeholder:text-ink-3 outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand transition-colors`}
                  />
                  {formValidationErrors.domain && (
                    <p className="mt-1 text-xs text-danger">{formValidationErrors.domain}</p>
                  )}
                </div>
              )}

              {/* ID do Quadro (Monday.com) */}
              {meta.requiresBoardId && (
                <div>
                  <label
                    htmlFor="modal-crm-board"
                    className="block text-xs font-semibold text-ink-2 mb-1"
                  >
                    {meta.boardIdLabel ?? 'ID do Quadro (Board ID)'}
                  </label>
                  <input
                    id="modal-crm-board"
                    type="text"
                    required
                    value={formBoardId}
                    onChange={(e) => {
                      setFormBoardId(e.target.value);
                      if (formValidationErrors.boardId) {
                        setFormValidationErrors((prev) => ({ ...prev, boardId: '' }));
                      }
                    }}
                    placeholder={meta.boardIdPlaceholder}
                    disabled={saving}
                    className={`w-full px-3.5 py-2 text-sm font-mono rounded-lg border ${
                      formValidationErrors.boardId ? 'border-danger' : 'border-line'
                    } bg-surface-1 text-ink placeholder:text-ink-3 outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand transition-colors`}
                  />
                  {formValidationErrors.boardId && (
                    <p className="mt-1 text-xs text-danger">{formValidationErrors.boardId}</p>
                  )}
                </div>
              )}

              {/* Switch Webhook de Entrada */}
              <div className="p-3 rounded-xl border border-line bg-surface-2 flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-bold text-ink">Habilitar Webhooks de Entrada</p>
                  <p className="text-[11px] text-ink-2">
                    Recebe atualizações de leads e negócios automaticamente quando alterados no{' '}
                    {displayName}.
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    checked={formInboundEvents}
                    onChange={(e) => setFormInboundEvents(e.target.checked)}
                    disabled={saving}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-line rounded-full peer-checked:bg-brand transition-colors peer-disabled:opacity-40" />
                  <div className="absolute left-0.5 top-0.5 w-4 h-4 bg-white rounded-full transition-transform peer-checked:translate-x-4 shadow-xs" />
                </label>
              </div>

              {/* Banner de Resultado do Teste em Tempo Real */}
              {pingResult && (
                <div
                  className={`p-3 rounded-xl border text-xs flex items-start gap-2.5 transition-all ${
                    pingResult.success
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/20'
                      : 'bg-red-50 text-red-800 border-red-200 dark:bg-red-500/10 dark:text-red-300 dark:border-red-500/20'
                  }`}
                >
                  {pingResult.success ? (
                    <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600 dark:text-emerald-400" />
                  ) : (
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600 dark:text-red-400" />
                  )}
                  <p className="font-medium leading-relaxed">{pingResult.message}</p>
                </div>
              )}

              {/* Botões do Modal */}
              <div className="flex items-center justify-between gap-3 pt-3 border-t border-line">
                <button
                  type="button"
                  disabled={testingBeforeSave || saving}
                  onClick={handlePingBeforeSave}
                  className="px-4 py-2 bg-surface-2 hover:bg-surface-3 text-ink font-semibold text-sm rounded-xl border border-line flex items-center gap-2 transition-all active:scale-[0.98] disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                >
                  {testingBeforeSave ? (
                    <Loader2 className="w-4 h-4 animate-spin text-brand" />
                  ) : (
                    <PlugZap className="w-4 h-4 text-brand" />
                  )}
                  {testingBeforeSave ? 'Testando Conexão...' : 'Testar Conexão'}
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    disabled={saving || testingBeforeSave}
                    className="px-4 py-2 text-sm font-medium text-ink-2 hover:text-ink hover:bg-surface-2 rounded-xl transition-colors disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={saving || testingBeforeSave}
                    className="px-5 py-2 bg-brand text-on-brand font-bold text-sm rounded-xl shadow-sm hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-60 flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                  >
                    {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                    {saving ? 'Validando e Salvando...' : 'Salvar Conexão'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </Card>
  );
}

function PlugZapIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M6.3 20.3a2.4 2.4 0 0 0 3.4 0L12 18l-6-6-2.3 2.3a2.4 2.4 0 0 0 0 3.4Z" />
      <path d="m2 22 3-3" />
      <path d="M7.5 13.5 10 11" />
      <path d="M10.5 16.5 13 14" />
      <path d="m17 6 3-3" />
      <path d="m14 9 3-3" />
      <path d="M17.7 3.7a2.4 2.4 0 0 1 0 3.4L15.4 9.4l-6-6 2.3-2.3a2.4 2.4 0 0 1 3.4 0Z" />
    </svg>
  );
}
