import { motion } from 'framer-motion';
import { ArrowRight, Play, Sparkles } from 'lucide-react';
import type React from 'react';
import { Link } from 'react-router-dom';

interface HeroSectionProps {
  onOpenDemo?: () => void;
}

export function HeroSection({ onOpenDemo }: HeroSectionProps): React.ReactElement {
  return (
    <section className="relative pt-12 lg:pt-20 pb-16 border-b border-slate-200 dark:border-slate-800 overflow-hidden text-left z-10 bg-midnight">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Lado Esquerdo: Copy e Ações */}
          <div className="lg:col-span-7 space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs font-medium text-brand tracking-wide"
            >
              <Sparkles className="w-3.5 h-3.5 text-brand" />
              <span>Ecossistema Comercial Autônomo 360°</span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-tight"
            >
              Dados que Conectam. <br />
              Inteligência que Decide. <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand via-amber-200 to-amber-400">
                Resultados que Acontecem.
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="text-lg text-white/70 max-w-2xl leading-relaxed"
            >
              A plataforma unificada que conecta dados, automação e inteligência artificial para
              acelerar decisões comerciais, diagnóstico de funil e prospecção com agentes autônomos.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="flex flex-wrap items-center gap-4 pt-2"
            >
              <Link
                to="/login"
                className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-brand text-midnight font-bold text-sm tracking-wide shadow-lg hover:bg-amber-400 transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                <span>Acessar Plataforma</span>
                <ArrowRight className="w-4 h-4" />
              </Link>

              {onOpenDemo && (
                <button
                  type="button"
                  onClick={onOpenDemo}
                  className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-white/5 hover:bg-white/10 text-white font-medium text-sm border border-white/10 transition-all"
                >
                  <Play className="w-4 h-4 text-white/60 fill-current" />
                  <span>Ver Demonstração</span>
                </button>
              )}
            </motion.div>
          </div>

          {/* Lado Direito: Preview do Command Deck */}
          <div className="lg:col-span-5 relative">
            <div className="relative rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-xl shadow-2xl">
              <div className="h-64 sm:h-80 w-full rounded-xl bg-midnight/80 border border-white/5 flex flex-col items-center justify-center text-center p-6 space-y-4">
                <div className="w-16 h-16 rounded-2xl bg-brand/10 border border-brand/30 flex items-center justify-center">
                  <Sparkles className="w-8 h-8 text-brand animate-pulse" />
                </div>
                <div>
                  <h2 className="text-white font-semibold text-base">Núcleo Central Ativo</h2>
                  <p className="text-white/50 text-xs mt-1">Orquestração em tempo real</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
