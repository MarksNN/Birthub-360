import { useState, useRef, useEffect } from 'react';
import { Bot, Sparkles, Send, X, Loader2, Copy, Check, RefreshCw, AlertCircle } from 'lucide-react';
import { api } from '../../../lib/api.js';
import { SoundFX } from '../../../lib/soundEffects.js';

export type CopilotContext = 'CRM' | 'PROSPECTING' | 'MANAGEMENT';

interface CopilotMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  timestamp: Date;
}

interface ContextualCopilotProps {
  context: CopilotContext;
  leadId?: string;
  onClose?: () => void;
  initialPrompt?: string;
}

export function ContextualCopilot({
  context,
  leadId,
  onClose,
  initialPrompt,
}: ContextualCopilotProps) {
  const [input, setInput] = useState(initialPrompt ?? '');
  const [messages, setMessages] = useState<CopilotMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      text: `Olá! Sou o Copiloto Comercial de Inteligência contextualmente ativo para **${context}**. Como posso ajudar sua operação agora?`,
      timestamp: new Date(),
    },
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const suggestions: Record<CopilotContext, string[]> = {
    CRM: [
      'Quais leads devo priorizar hoje?',
      'Quais negócios estão estagnados no funil?',
      'Quais oportunidades precisam de enriquecimento?',
      'Qual a próxima melhor ação para este lead?',
      'Verifique se este lead possui prontidão contratual cadastrada',
    ],
    PROSPECTING: [
      'Quem abordar primeiro na minha lista de prospecção hoje?',
      'Quais empresas possuem maior aderência ao ICP?',
      'Quais contas apresentam sinais de interesse ou expansão?',
      'Gere um script de abordagem fria focado nas principais dores do ICP',
      'Quais objeções são mais relevantes para esta oportunidade?',
    ],
    MANAGEMENT: [
      'Quais negócios possuem pendências contratuais?',
      'Visão executiva do forecast de vendas e gap para a meta do mês',
      'Quais contas precisam de intervenção imediata da liderança?',
      'Qual o status de sincronização e higiene do pipeline no Bitrix/CRM?',
    ],
  };

  const currentSuggestions = suggestions[context] || [];

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  const handleSendMessage = async (textToSend?: string) => {
    const prompt = (textToSend ?? input).trim();
    if (!prompt || loading) return;

    SoundFX.play('click');
    setError(null);
    setInput('');

    const userMsg: CopilotMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      text: prompt,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    try {
      const missionPayload = {
        mission: `[Contexto: ${context}] ${prompt}`,
        leadId: leadId || undefined,
        sessionId: `copilot-${context.toLowerCase()}-${Date.now()}`,
      };

      const res = await api.post<{ messages?: string[] }>(
        '/api/agent/swarm/mission',
        missionPayload,
      );

      const returnedMessages = res?.messages;
      const responseText =
        Array.isArray(returnedMessages) && returnedMessages.length > 0
          ? returnedMessages[returnedMessages.length - 1]
          : 'Missão concluída com sucesso pelo Enxame de Agentes.';

      SoundFX.play('success');
      setMessages((prev) => [
        ...prev,
        {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          text: responseText,
          timestamp: new Date(),
        },
      ]);
    } catch (err: any) {
      const errMsg = err?.message || 'Falha ao executar missão com o copiloto.';
      setError(errMsg);
      SoundFX.play('error');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="flex flex-col h-full w-full max-w-sm sm:max-w-md bg-surface border-l border-line shadow-2xl overflow-hidden rounded-l-2xl">
      {/* Header */}
      <div className="bg-gradient-to-r from-brand to-brand-hover text-on-brand p-4 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center backdrop-blur-sm">
            <Bot size={20} className="text-white" />
          </div>
          <div>
            <h3 className="font-bold text-sm leading-tight text-white">Copiloto {context}</h3>
            <p className="text-[10px] text-white/80 font-medium tracking-wide uppercase">
              Swarm & Ferramentas Comerciais
            </p>
          </div>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar copiloto"
            className="p-1 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        )}
      </div>

      {/* Messages Feed */}
      <div ref={scrollRef} className="flex-1 p-4 overflow-y-auto bg-surface-2 flex flex-col gap-3">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
          >
            <div
              className={`max-w-[90%] p-3.5 rounded-2xl text-xs sm:text-sm leading-relaxed whitespace-pre-wrap ${
                msg.role === 'user'
                  ? 'bg-brand text-on-brand rounded-br-sm shadow-sm font-medium'
                  : 'bg-surface text-ink border border-line rounded-bl-sm shadow-sm'
              }`}
            >
              {msg.text}

              {msg.role === 'assistant' && msg.id !== 'welcome' && (
                <div className="mt-2 pt-2 border-t border-line/60 flex items-center justify-between text-[11px] text-ink-2">
                  <span>
                    {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopy(msg.id, msg.text)}
                    className="inline-flex items-center gap-1 hover:text-brand transition-colors cursor-pointer"
                  >
                    {copiedId === msg.id ? (
                      <>
                        <Check size={12} className="text-success" /> Copiado
                      </>
                    ) : (
                      <>
                        <Copy size={12} /> Copiar
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex items-center gap-2 p-3 bg-surface border border-line rounded-2xl max-w-[80%] text-xs text-ink-2 animate-pulse">
            <Loader2 size={16} className="animate-spin text-brand" />
            <span>Enxame de Agentes consultando ferramentas…</span>
          </div>
        )}

        {error && (
          <div className="p-3 bg-danger/10 border border-danger/30 rounded-xl text-xs text-danger flex items-start gap-2">
            <AlertCircle size={16} className="shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold">Erro ao processar instrução</p>
              <p className="mt-0.5 opacity-90">{error}</p>
            </div>
          </div>
        )}

        {/* Suggestion Chips */}
        {messages.length <= 2 && (
          <div className="mt-3">
            <p className="text-[11px] text-ink-2 font-bold mb-2 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles size={12} className="text-brand" /> Sugestões para {context}
            </p>
            <div className="flex flex-col gap-1.5">
              {currentSuggestions.map((suggestion, idx) => (
                <button
                  type="button"
                  key={idx}
                  className="text-left text-xs bg-surface text-ink p-2.5 rounded-xl hover:bg-surface-elevated hover:border-brand/40 transition-all border border-line flex items-center gap-2 shadow-xs cursor-pointer group"
                  onClick={() => handleSendMessage(suggestion)}
                >
                  <Sparkles
                    size={13}
                    className="shrink-0 text-brand/70 group-hover:text-brand transition-colors"
                  />
                  <span className="line-clamp-2">{suggestion}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Input Field */}
      <div className="p-3 bg-surface border-t border-line">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="relative flex items-center gap-2"
        >
          <input
            type="text"
            className="flex-1 pl-3.5 pr-10 py-2.5 bg-surface-2 border border-line rounded-xl text-xs sm:text-sm text-ink placeholder:text-ink-2 focus:ring-2 focus:ring-brand/40 focus:bg-surface focus:border-brand transition-all outline-none"
            placeholder={`Instrua o enxame em ${context}...`}
            value={input}
            disabled={loading}
            onChange={(e) => setInput(e.target.value)}
          />
          <button
            type="submit"
            disabled={!input.trim() || loading}
            aria-label="Enviar mensagem ao copiloto"
            className="absolute right-2 p-2 text-on-brand bg-brand disabled:opacity-40 disabled:hover:bg-brand hover:bg-brand-hover rounded-lg transition-colors cursor-pointer shadow-xs"
          >
            {loading ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
          </button>
        </form>
      </div>
    </div>
  );
}
