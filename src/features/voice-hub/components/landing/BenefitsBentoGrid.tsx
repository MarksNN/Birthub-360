import { motion } from 'framer-motion';
import {
  ArrowUpRight,
  Bot,
  Cpu,
  LineChart,
  Mic2,
  ShieldCheck,
  Sparkles,
  Workflow,
} from 'lucide-react';
import type React from 'react';

interface BentoCardProps {
  icon: React.ElementType;
  title: string;
  description: string;
  badge?: string;
  className?: string;
}

function BentoCard({ icon: Icon, title, description, badge, className = '' }: BentoCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4 }}
      className={`relative rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.03] p-6 lg:p-8 backdrop-blur-md shadow-sm hover:shadow-md hover:border-brand/40 transition-all ${className}`}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="w-12 h-12 rounded-xl bg-brand/10 border border-brand/20 flex items-center justify-center text-brand">
          <Icon className="w-6 h-6" />
        </div>
        {badge && (
          <span className="text-[11px] font-semibold tracking-wider uppercase px-2.5 py-1 rounded-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-white/70">
            {badge}
          </span>
        )}
      </div>

      <h3 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight mb-2">
        {title}
      </h3>
      <p className="text-sm text-slate-600 dark:text-white/60 leading-relaxed">{description}</p>

      <div className="mt-4 pt-4 border-t border-slate-100 dark:border-white/5 flex items-center gap-1 text-xs font-semibold text-brand group cursor-pointer">
        <span>Conhecer capacidade</span>
        <ArrowUpRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
      </div>
    </motion.div>
  );
}

export function BenefitsBentoGrid(): React.ReactElement {
  return (
    <section
      id="beneficios"
      className="py-20 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 relative text-left"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mb-16 space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand/10 border border-brand/20 text-xs font-semibold text-brand tracking-wide">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Capacidades Autônomas</span>
          </div>

          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-tight">
            Crie Agentes de IA Autônomos que transformam operações comerciais complexas.
          </h2>

          <p className="text-base sm:text-lg text-slate-600 dark:text-white/70 leading-relaxed">
            Arquitetura desenhada para conectar enriquecimento de dados, qualificação profunda,
            síntese vocal em tempo real e governança corporativa sem fricção.
          </p>
        </div>

        {/* Bento Grid Layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <BentoCard
            icon={Bot}
            title="Agentes SDR Inteligentes"
            description="Prospecção ativa orientada pelo ICP real, scoring preditivo de decisores e quebra personalizada de objeções baseada em playbooks corporativos."
            badge="Autonomia Total"
          />

          <BentoCard
            icon={Mic2}
            title="Voice Hub Neural"
            description="Discagem preditiva e agentes de voz hiper-realistas para qualificação, agendamento de reuniões e follow-ups em larga escala com latência mínima."
            badge="Tempo Real"
          />

          <BentoCard
            icon={LineChart}
            title="Diagnóstico Comercial 360°"
            description="Monitoramento analítico em tempo real de gargalos de funil, taxas de conversão de vendedores e acurácia de forecast preditivo."
            badge="Previsibilidade"
          />

          <BentoCard
            icon={Workflow}
            title="Orquestração Multimodal"
            description="Roteamento dinâmico entre múltiplos provedores (OpenAI, Anthropic, Groq, Ollama) com controle fino de custos e fallback automático."
            badge="Alta Resiliência"
          />

          <BentoCard
            icon={Cpu}
            title="Integração Nativa de Dados"
            description="Sincronização bidirecional instantânea com Bitrix24, CRMs tradicionais, WhatsApp API e plataformas de mensagens transacionais."
            badge="Ecossistema Conectado"
          />

          <BentoCard
            icon={ShieldCheck}
            title="Governança & Segurança"
            description="Isolamento multi-tenant intransigente, auditoria de ações por sessão, conformidade estrita com a LGPD e criptografia de chaves."
            badge="Enterprise Ready"
          />
        </div>
      </div>
    </section>
  );
}
