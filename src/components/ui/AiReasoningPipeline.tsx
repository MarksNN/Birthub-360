import { AnimatePresence, motion } from 'framer-motion';
import { Brain, CheckCircle2, Database, Sparkles, Zap } from 'lucide-react';

export type AiReasoningStep = 'CONTEXT' | 'ANALYSIS' | 'RECOMMENDATION' | 'APPROVAL' | 'EXECUTION';

interface AiReasoningPipelineProps {
  currentStep: AiReasoningStep;
  details?: Record<AiReasoningStep, string>;
}

const STEPS = [
  {
    id: 'CONTEXT',
    label: 'CONTEXT',
    icon: Database,
    color: 'text-blue-400',
    activeBg: 'bg-blue-400/10',
  },
  {
    id: 'ANALYSIS',
    label: 'ANALYSIS',
    icon: Brain,
    color: 'text-indigo-400',
    activeBg: 'bg-indigo-400/10',
  },
  {
    id: 'RECOMMENDATION',
    label: 'RECOMMENDATION',
    icon: Sparkles,
    color: 'text-brand',
    activeBg: 'bg-brand/10',
  },
  {
    id: 'APPROVAL',
    label: 'APPROVAL',
    icon: CheckCircle2,
    color: 'text-amber-400',
    activeBg: 'bg-amber-400/10',
  },
  {
    id: 'EXECUTION',
    label: 'EXECUTION',
    icon: Zap,
    color: 'text-emerald-400',
    activeBg: 'bg-emerald-400/10',
  },
] as const;

export function AiReasoningPipeline({ currentStep, details }: AiReasoningPipelineProps) {
  const currentIndex = STEPS.findIndex((s) => s.id === currentStep);

  return (
    <div className="w-full font-mono">
      <div className="flex flex-col relative space-y-4">
        {STEPS.map((step, index) => {
          const isActive = index === currentIndex;
          const isPast = index < currentIndex;
          const Icon = step.icon;

          return (
            <div key={step.id} className="relative flex items-start gap-4">
              {/* Connector line */}
              {index !== STEPS.length - 1 && (
                <div className="absolute left-3 top-8 bottom-[-16px] w-[1px] bg-white/5">
                  {(isPast || isActive) && (
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: '100%' }}
                      transition={{ duration: 0.5 }}
                      className={`w-full bg-gradient-to-b ${isPast ? step.color : 'from-brand to-transparent'}`}
                    />
                  )}
                </div>
              )}

              {/* Node */}
              <div className="relative z-10 flex flex-col items-center">
                <motion.div
                  animate={{
                    borderColor: isActive
                      ? 'rgba(212,175,55,0.5)'
                      : isPast
                        ? 'rgba(255,255,255,0.2)'
                        : 'rgba(255,255,255,0.05)',
                    backgroundColor: isActive
                      ? 'rgba(212,175,55,0.1)'
                      : isPast
                        ? 'rgba(255,255,255,0.05)'
                        : 'rgba(0,0,0,0)',
                  }}
                  className={`w-6 h-6 rounded-full border flex items-center justify-center transition-colors duration-500`}
                >
                  <Icon
                    className={`w-3 h-3 ${isActive ? step.color : isPast ? 'text-[#F8F9FF]/50' : 'text-[#F8F9FF]/20'}`}
                  />
                </motion.div>
                {isActive && (
                  <motion.div
                    layoutId="active-glow"
                    className="absolute inset-0 rounded-full animate-ping opacity-20 bg-brand"
                  />
                )}
              </div>

              {/* Content */}
              <div
                className={`flex flex-col pb-2 ${isActive ? 'opacity-100' : isPast ? 'opacity-50' : 'opacity-20'}`}
              >
                <span
                  className={`text-[11px] font-bold tracking-widest uppercase ${isActive ? step.color : 'text-[#F8F9FF]'}`}
                >
                  {step.label}
                </span>

                <AnimatePresence mode="wait">
                  {isActive && details?.[step.id as AiReasoningStep] && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mt-1 text-[12px] font-sans text-[#F8F9FF]/70 max-w-sm overflow-hidden"
                    >
                      {details[step.id as AiReasoningStep]}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
