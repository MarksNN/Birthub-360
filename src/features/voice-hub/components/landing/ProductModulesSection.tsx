import type React from 'react';
import { motion } from 'framer-motion';
import { Users, PhoneCall, BarChart3, Boxes, Sliders, Building2, CheckCircle2 } from 'lucide-react';

interface ModuleCardProps {
  icon: React.ElementType;
  title: string;
  subtitle: string;
  features: string[];
}

function ModuleCard({ icon: Icon, title, subtitle, features }: ModuleCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4 }}
      className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.02] p-6 lg:p-8 flex flex-col justify-between hover:border-brand/40 transition-all shadow-sm"
    >
      <div className="space-y-4">
        <div className="w-12 h-12 rounded-xl bg-brand/10 border border-brand/20 flex items-center justify-center text-brand">
          <Icon className="w-6 h-6" />
        </div>

        <div>
          <h3 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
            {title}
          </h3>
          <p className="text-xs text-brand font-medium tracking-wide uppercase mt-1">{subtitle}</p>
        </div>

        <ul className="space-y-2.5 pt-2 border-t border-slate-100 dark:border-white/5">
          {features.map((feature) => (
            <li
              key={feature}
              className="flex items-start gap-2.5 text-xs text-slate-600 dark:text-white/70"
            >
              <CheckCircle2 className="w-4 h-4 text-brand shrink-0 mt-0.5" />
              <span>{feature}</span>
            </li>
          ))}
        </ul>
      </div>
    </motion.div>
  );
}

export function ProductModulesSection(): React.ReactElement {
  return (
    <section
      id="modulos"
      className="py-20 bg-slate-100 dark:bg-midnight border-b border-slate-200 dark:border-slate-800 relative text-left"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mb-16 space-y-4">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Plataforma Completa — Módulos Integrados
          </h2>
          <p className="text-base sm:text-lg text-slate-600 dark:text-white/70 leading-relaxed">
            Uma suíte de engenharia projetada para cada estágio da operação comercial, sem silos de
            dados e com governança unificada.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <ModuleCard
            icon={Users}
            title="Módulo SDR & Prospecção"
            subtitle="Pilar 02 & 03 — Inteligência & Orquestração"
            features={[
              'Enriquecimento em cascata (Apollo / Hunter / Google)',
              'Qualificação de PICs e decisores-chave',
              'Playbooks dinâmicos com roteiro anti-objeção',
              'Cadência multi-canal automatizada',
            ]}
          />

          <ModuleCard
            icon={PhoneCall}
            title="Voice Hub & Discador Neural"
            subtitle="Pilar 08 — Engajamento Comercial"
            features={[
              'Síntese de voz de baixíssima latência (Livekit / ElevenLabs)',
              'Detecção inteligente de caixas postais e secretárias',
              'Transcrição síncrona e extração de insights de chamada',
              'Registro instantâneo de interações no histórico do lead',
            ]}
          />

          <ModuleCard
            icon={BarChart3}
            title="Commercial Intelligence"
            subtitle="Pilar 04 & 05 — Performance & Previsibilidade"
            features={[
              'Análise de gargalos em cada etapa do funil de vendas',
              'Benchmark individual e coletivo de consultores',
              'Matriz Win/Loss com clusterização semântica de motivos',
              'Forecast dinâmico ponderado por engajamento real',
            ]}
          />

          <ModuleCard
            icon={Boxes}
            title="Hub Central & CRM 360°"
            subtitle="Pilar 01 — Núcleo Comercial"
            features={[
              'Gestão visual de pipeline estilo Kanban ágil',
              'Dossiê completo de contas, empresas e propostas',
              'Histórico consolidado de toque e auditoria de ações',
              'Isolamento total multi-inquilino (Multi-Tenancy Silo/Pool)',
            ]}
          />

          <ModuleCard
            icon={Sliders}
            title="Automação & Integrações"
            subtitle="Pilar 07 — Conectividade"
            features={[
              'Conector via API REST e webhooks para Bitrix24',
              'Webhooks de alta vazão com fila assíncrona (BullMQ)',
              'Disparo automatizado de mensagens no WhatsApp',
              'Exportação estruturada de relatórios operacionais',
            ]}
          />

          <ModuleCard
            icon={Building2}
            title="Governança & Cockpit Executivo"
            subtitle="Administração & Gestão de Acessos"
            features={[
              'Controle estrito de papéis (RBAC: Admin, Gestor, SDR, Closer)',
              'Gestão de orçamentos e tokens de IA por organização',
              'Logs de auditoria e segurança contra vazamento de PII',
              'Comando geral de monitoramento e telemetria',
            ]}
          />
        </div>
      </div>
    </section>
  );
}
