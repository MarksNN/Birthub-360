import { motion } from 'framer-motion';
import { ArrowRight, Database, PhoneCall, Search, Trophy } from 'lucide-react';
import type React from 'react';

interface TimelineStep {
  step: string;
  title: string;
  description: string;
  icon: React.ElementType;
  details: string[];
}

const STEPS: TimelineStep[] = [
  {
    step: '01',
    title: 'Ingestão & Conexão de Dados',
    description:
      'Conecte seu CRM, Bitrix24, planilhas e bases proprietárias com sincronização bidirecional em tempo real.',
    icon: Database,
    details: [
      'Mapeamento automático de campos',
      'Desduplicação inteligente',
      'Isolamento multi-inquilino seguro',
    ],
  },
  {
    step: '02',
    title: 'Enriquecimento & Qualificação com IA',
    description:
      'Agentes pesquisam e qualificam decisores-chave (PICs) cruzando dados públicos e playbooks corporativos.',
    icon: Search,
    details: [
      'Scoring preditivo de ICP',
      'Descoberta de e-mails corporativos e WhatsApp',
      'Mapeamento de organograma empresarial',
    ],
  },
  {
    step: '03',
    title: 'Engajamento Ativo & Voice Hub',
    description:
      'Agentes de voz hiper-realistas e cadências multi-canal iniciam o contato com quebra de objeções adaptativa.',
    icon: PhoneCall,
    details: [
      'Discagem preditiva de baixíssima latência',
      'Detecção precisa de secretárias eletrônicas',
      'Transcrição e análise de sentimento em tempo real',
    ],
  },
  {
    step: '04',
    title: 'Transição Qualificada & Receita',
    description:
      'Leads maduros são entregues diretamente na agenda do Closer com dossiê completo de contexto.',
    icon: Trophy,
    details: [
      'Agendamento síncrono no Google Calendar',
      'Atualização automática do pipeline no Bitrix24',
      'Métricas de conversão registradas no dashboard',
    ],
  },
];

export function HowItWorksTimeline(): React.ReactElement {
  return (
    <section
      id="funcionamento"
      className="py-20 bg-white dark:bg-slate-900 border-b border-slate-250 dark:border-slate-800 text-left relative"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mb-16 space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand/10 border border-brand/20 text-xs font-semibold text-brand tracking-wide">
            <span>Fluxo de Execução</span>
          </div>

          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-tight">
            Como o Birth Hub 360° opera do primeiro dado ao contrato fechado.
          </h2>

          <p className="text-base sm:text-lg text-slate-600 dark:text-white/70 leading-relaxed">
            Uma esteira orquestrada que elimina tarefas manuais repetitivas e multiplica a
            capacidade produtiva da sua equipe comercial.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 relative">
          {STEPS.map((step, idx) => {
            const Icon = step.icon;
            return (
              <motion.div
                key={step.step}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: idx * 0.1 }}
                className="relative flex flex-col justify-between rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02] p-6 lg:p-7 hover:border-brand/40 transition-all shadow-sm"
              >
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <span className="text-3xl font-black text-brand tracking-tighter">
                      {step.step}
                    </span>
                    <div className="w-10 h-10 rounded-xl bg-brand/10 border border-brand/20 flex items-center justify-center text-brand">
                      <Icon className="w-5 h-5" />
                    </div>
                  </div>

                  <h3 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight mb-2">
                    {step.title}
                  </h3>

                  <p className="text-xs text-slate-600 dark:text-white/60 leading-relaxed mb-6">
                    {step.description}
                  </p>
                </div>

                <div className="pt-4 border-t border-slate-200/60 dark:border-white/5 space-y-2">
                  {step.details.map((detail) => (
                    <div
                      key={detail}
                      className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-white/50"
                    >
                      <ArrowRight className="w-3 h-3 text-brand shrink-0" />
                      <span>{detail}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
