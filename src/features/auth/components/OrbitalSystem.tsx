import { motion } from 'framer-motion';

export function OrbitalSystem() {
  return (
    <div className="relative w-[500px] h-[500px] flex items-center justify-center">
      {/* Center Node */}
      <div className="absolute z-20 flex flex-col items-center justify-center w-32 h-32 rounded-full bg-obsidian border border-line shadow-2xl">
        <span className="text-[#F8F9FF] font-display font-bold text-xl">360&deg;</span>
        <span className="text-gold text-xs font-semibold tracking-widest mt-1">HUB</span>
      </div>

      {/* Orbit 1: Data */}
      <motion.div
        className="absolute w-[280px] h-[280px] rounded-full border border-line/30"
        animate={{ rotate: 360 }}
        transition={{ duration: 40, repeat: Infinity, ease: 'linear' }}
      >
        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-info shadow-[0_0_12px_rgba(59,130,246,0.6)]" />
      </motion.div>

      {/* Orbit 2: Intelligence */}
      <motion.div
        className="absolute w-[380px] h-[380px] rounded-full border border-line/20"
        animate={{ rotate: -360 }}
        transition={{ duration: 60, repeat: Infinity, ease: 'linear' }}
      >
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-3 h-3 rounded-full bg-gold shadow-[0_0_12px_rgba(212,175,55,0.6)]" />
      </motion.div>

      {/* Orbit 3: Execution */}
      <motion.div
        className="absolute w-[480px] h-[480px] rounded-full border border-line/10"
        animate={{ rotate: 360 }}
        transition={{ duration: 80, repeat: Infinity, ease: 'linear' }}
      >
        <div className="absolute top-1/2 right-0 translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-success shadow-[0_0_10px_rgba(16,185,129,0.6)]" />
      </motion.div>
    </div>
  );
}
