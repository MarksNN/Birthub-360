import { motion } from 'framer-motion';
import { ArrowUpRight, Globe } from 'lucide-react';
import type React from 'react';

interface IntegrationItem {
  name: string;
  category: string;
  description: string;
  status: 'Nativo' | 'Oficial' | 'Certificado';
}

const INTEGRATIONS: IntegrationItem[] = [
  {
    name: 'Bitrix24 CRM',
    category: 'CRM & ERP',
    description: 'Sincronização bidirecional de deals, contatos e atividades',
    status: 'Nativo',
  },
  {
    name: 'WhatsApp Cloud API',
    category: 'Mensageria',
    description: 'Disparo de cadências e atendimento com agentes de IA',
    status: 'Oficial',
  },
  {
    name: 'Google Workspace',
    category: 'Produtividade',
    description: 'Integração de agendas, reuniões no Meet e e-mails Gmail',
    status: 'Oficial',
  },
  {
    name: 'Apollo.io & Hunter',
    category: 'Enriquecimento',
    description: 'Descoberta e validação de decisores e dados corporativos',
    status: 'Nativo',
  },
  {
    name: 'LiveKit Voice Engine',
    category: 'Infraestrutura de Áudio',
    description: 'Transporte de voz ultra-rápido com WebRTC em tempo real',
    status: 'Certificado',
  },
  {
    name: 'LiteLLM / OpenAI / Groq',
    category: 'Modelos de IA',
    description: 'Orquestração de LLMs com failover automático e controle de custos',
    status: 'Nativo',
  },
];

export function IntegrationsGrid(): React.ReactElement {
  return (
    <section className="py-20 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 text-left relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mb-16 space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand/10 border border-brand/20 text-xs font-semibold text-brand tracking-wide">
            <Globe className="w-3.5 h-3.5" />
            <span>Ecossistema Aberto</span>
          </div>

          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-tight">
            Conectividade total com o seu stack de vendas.
          </h2>

          <p className="text-base sm:text-lg text-slate-600 dark:text-white/70 leading-relaxed">
            O Birth Hub 360° não exige que você abandone suas ferramentas atuais — ele se integra a
            elas potencializando a inteligência da operação.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {INTEGRATIONS.map((item, idx) => (
            <motion.div
              key={item.name}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.35, delay: idx * 0.05 }}
              className="rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02] p-6 hover:border-brand/40 transition-all flex flex-col justify-between shadow-sm"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-[11px] font-semibold tracking-wider uppercase px-2.5 py-0.5 rounded-full bg-brand/10 text-brand border border-brand/20">
                    {item.status}
                  </span>
                  <span className="text-xs text-slate-400 dark:text-white/40">{item.category}</span>
                </div>

                <h3 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight mb-2">
                  {item.name}
                </h3>
                <p className="text-xs text-slate-600 dark:text-white/60 leading-relaxed">
                  {item.description}
                </p>
              </div>

              <div className="mt-4 pt-4 border-t border-slate-200/60 dark:border-white/5 flex items-center justify-between text-xs font-medium text-brand cursor-pointer group">
                <span>Ver documentação da API</span>
                <ArrowUpRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
