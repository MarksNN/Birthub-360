import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { Activity, BrainCircuit, Check, CheckCircle2, FileSearch, Zap } from 'lucide-react';

const AI_STEPS = [
  { id: 'context', label: 'CONTEXT', icon: FileSearch },
  { id: 'analysis', label: 'ANALYSIS', icon: Activity },
  { id: 'recommendation', label: 'RECOMMENDATION', icon: BrainCircuit },
  { id: 'approval', label: 'APPROVAL', icon: CheckCircle2 },
  { id: 'execution', label: 'EXECUTION', icon: Zap },
];

export function AiReasoningVisualizer() {
  const [activeStep, setActiveStep] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveStep((prev) => (prev < AI_STEPS.length - 1 ? prev + 1 : prev));
    }, 600); // Avança um step a cada 600ms
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="bg-[#7C3AED]/5 border border-[#7C3AED]/20 rounded-2xl p-4 w-full max-w-sm flex flex-col gap-2">
      <div className="text-[10px] font-black tracking-widest text-[#7C3AED] mb-1 flex items-center gap-1.5">
        <span className="w-1.5 h-1.5 rounded-full bg-[#7C3AED] animate-pulse" />
        AI ORCHESTRATION LAYER
      </div>

      <div className="flex flex-col gap-1.5 relative">
        {AI_STEPS.map((step, index) => {
          const isActive = index === activeStep;
          const isPast = index < activeStep;
          const Icon = step.icon;

          return (
            <div key={step.id} className="flex items-center gap-3 relative z-10">
              <div
                className={`flex items-center justify-center w-6 h-6 rounded-full border text-[10px] shrink-0 transition-all duration-300 ${
                  isActive
                    ? 'bg-[#7C3AED] border-[#7C3AED] text-[#F8F9FF] shadow-[0_0_10px_rgba(124,58,237,0.4)] scale-110'
                    : isPast
                      ? 'bg-[#7C3AED]/20 border-[#7C3AED]/30 text-[#7C3AED]'
                      : 'bg-surface-2 border-line text-ink-2'
                }`}
              >
                {isPast ? <Check className="w-3 h-3" /> : <Icon className="w-3 h-3" />}
              </div>
              <span
                className={`text-[10px] font-bold tracking-wider transition-colors duration-300 ${
                  isActive ? 'text-[#7C3AED]' : isPast ? 'text-ink' : 'text-ink-2 opacity-50'
                }`}
              >
                {step.label}
              </span>
            </div>
          );
        })}

        {/* Linha vertical conectora */}
        <div className="absolute left-3 top-3 bottom-3 w-[1px] bg-line -z-0">
          <motion.div
            className="w-full bg-[#7C3AED]"
            initial={{ height: '0%' }}
            animate={{ height: `${(activeStep / (AI_STEPS.length - 1)) * 100}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      </div>
    </div>
  );
}
