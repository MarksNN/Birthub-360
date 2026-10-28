import { motion } from 'framer-motion';
import { Layers, LineChart, Settings, Target } from 'lucide-react';

interface PlaceholderProps {
  title: string;
  description: string;
  icon: 'target' | 'linechart' | 'layers' | 'settings';
}

const iconMap = {
  target: Target,
  linechart: LineChart,
  layers: Layers,
  settings: Settings,
};

export function ModulePlaceholder({ title, description, icon }: PlaceholderProps) {
  const Icon = iconMap[icon];
  return (
    <div className="flex-1 w-full h-full p-8 flex items-center justify-center bg-gray-50 dark:bg-midnight/20">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full text-center space-y-6 p-10 bg-white dark:bg-[var(--surface)] border border-[var(--line)] rounded-2xl shadow-xl"
      >
        <div className="w-16 h-16 mx-auto bg-brand/10 text-brand rounded-xl flex items-center justify-center">
          <Icon size={32} />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-[var(--ink)] mb-2 font-display">{title}</h2>
          <p className="text-sm text-[var(--ink-2)] leading-relaxed font-mono">{description}</p>
        </div>
        <div className="pt-4 border-t border-[var(--line)]">
          <p className="text-xs text-[var(--ink-3)] font-mono uppercase tracking-widest">
            Módulo em desenvolvimento
          </p>
        </div>
      </motion.div>
    </div>
  );
}
