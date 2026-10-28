import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDown, HelpCircle } from 'lucide-react';
import type React from 'react';
import { useState } from 'react';

interface FaqItem {
  question: string;
  answer: string;
}

const FAQ_DATA: FaqItem[] = [
  {
    question: 'Como funciona a integração com o Bitrix24?',
    answer:
      'A integração com o Bitrix24 opera via API REST e webhooks em tempo real. Ela sincroniza automaticamente negócios (deals), contatos, empresas, tarefas e histórico de atividades com total integridade e observabilidade.',
  },
  {
    question: 'Qual é o modelo de cobrança para chamadas de voz e IA?',
    answer:
      'Trabalhamos com transparência total: planos com franquia inclusa e governança de orçamento. Você pode conectar suas próprias chaves de API (Bring Your Own Key) ou utilizar o saldo gerenciado pela plataforma com limites rígidos configuráveis por organização.',
  },
  {
    question: 'Os dados da minha empresa e dos meus leads estão protegidos pela LGPD?',
    answer:
      'Sim. Todos os dados são processados com isolamento multi-tenant intransigente. Informações pessoais identificáveis (PII) utilizam criptografia em repouso AES-256 e blind indexes auditados.',
  },
  {
    question: 'É possível personalizar o tom de voz e os scripts dos agentes de IA?',
    answer:
      'Totalmente. Cada agente pode ser configurado com playbooks autorais da sua empresa, matriz de quebra de objeções personalizada, regras de conformidade e múltiplos perfis de voz ultra-realistas.',
  },
];

export function PricingFaqSection(): React.ReactElement {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const toggleFaq = (index: number) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  return (
    <section
      id="faq"
      className="py-20 bg-slate-50 dark:bg-midnight border-b border-slate-200 dark:border-slate-800 text-left relative"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto mb-16 space-y-4 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand/10 border border-brand/20 text-xs font-semibold text-brand tracking-wide">
            <HelpCircle className="w-3.5 h-3.5" />
            <span>Perguntas Frequentes</span>
          </div>

          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-tight">
            Tudo o que você precisa saber sobre o Birth Hub 360°.
          </h2>

          <p className="text-base sm:text-lg text-slate-600 dark:text-white/70 leading-relaxed">
            Respostas diretas sobre governança, integração, custos e implementação do ecossistema.
          </p>
        </div>

        {/* FAQ Sanfonado Acessível */}
        <div className="max-w-3xl mx-auto space-y-4">
          {FAQ_DATA.map((item, idx) => {
            const isOpen = openFaq === idx;
            return (
              <div
                key={item.question}
                className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.02] overflow-hidden shadow-sm transition-all"
              >
                <button
                  type="button"
                  onClick={() => toggleFaq(idx)}
                  className="w-full py-5 px-6 flex items-center justify-between text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                  aria-expanded={isOpen}
                >
                  <span className="text-base font-bold text-slate-900 dark:text-white tracking-tight">
                    {item.question}
                  </span>
                  <ChevronDown
                    className={`w-5 h-5 text-brand shrink-0 transition-transform duration-200 ${
                      isOpen ? 'rotate-180' : ''
                    }`}
                  />
                </button>

                <AnimatePresence>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="px-6 pb-6 text-sm text-slate-600 dark:text-white/70 leading-relaxed border-t border-slate-100 dark:border-white/5 pt-4"
                    >
                      {item.answer}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
