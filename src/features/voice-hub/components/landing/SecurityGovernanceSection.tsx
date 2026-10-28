import { motion } from 'framer-motion';
import { CheckCircle2, FileKey, History, Lock, ShieldCheck, UserCheck } from 'lucide-react';
import type React from 'react';

interface SecurityFeature {
  title: string;
  description: string;
  icon: React.ElementType;
}

const SECURITY_ITEMS: SecurityFeature[] = [
  {
    title: 'Isolamento de Dados Multi-Inquilino',
    description:
      'Arquitetura rigorosamente isolada por organizationId em todas as queries e rotinas de banco, sem risco de vazamento entre contas.',
    icon: Lock,
  },
  {
    title: 'Conformidade Estrita com LGPD e GDPR',
    description:
      'Campos de PII criptografados em repouso com chave simétrica AES-256 e blind index seguro para buscas determinísticas auditadas.',
    icon: ShieldCheck,
  },
  {
    title: 'Trilha de Auditoria Imutável (Audit Trail)',
    description:
      'Cada ação de prospecção, chamada de voz, alteração de permissão e disparo de IA é carimbada com timestamp e autor.',
    icon: History,
  },
  {
    title: 'Controle de Acessos Baseado em Papéis (RBAC)',
    description:
      'Matriz granular de privilégios separando administradores, gestores comerciais, SDRs, closers e visualizadores convidados.',
    icon: UserCheck,
  },
  {
    title: 'Cofre e Rotação de Credenciais de Provedores',
    description:
      'Armazenamento isolado de tokens de APIs (Apollo, Hunter, Bitrix24, OpenAI) com validação de assinatura e TTL estrito.',
    icon: FileKey,
  },
];

export function SecurityGovernanceSection(): React.ReactElement {
  return (
    <section
      id="seguranca"
      className="py-20 bg-slate-50 dark:bg-midnight border-b border-slate-200 dark:border-slate-800 text-left relative"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mb-16 space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand/10 border border-brand/20 text-xs font-semibold text-brand tracking-wide">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Blindagem Enterprise</span>
          </div>

          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-tight">
            Segurança, privacidade e governança por padrão de projeto.
          </h2>

          <p className="text-base sm:text-lg text-slate-600 dark:text-white/70 leading-relaxed">
            Desenvolvido para atender aos mais altos requisitos corporativos de compliance e
            segurança da informação.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {SECURITY_ITEMS.map((item, idx) => {
            const Icon = item.icon;
            return (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.35, delay: idx * 0.05 }}
                className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.02] p-6 lg:p-7 shadow-sm hover:border-brand/40 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="w-10 h-10 rounded-xl bg-brand/10 border border-brand/20 flex items-center justify-center text-brand mb-4">
                    <Icon className="w-5 h-5" />
                  </div>

                  <h3 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight mb-2">
                    {item.title}
                  </h3>

                  <p className="text-xs text-slate-600 dark:text-white/60 leading-relaxed">
                    {item.description}
                  </p>
                </div>

                <div className="mt-4 pt-4 border-t border-slate-100 dark:border-white/5 flex items-center gap-2 text-[11px] font-semibold text-emerald-500">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Validado pelo Security Gate</span>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
