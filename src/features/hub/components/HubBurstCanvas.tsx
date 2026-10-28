import { motion } from 'framer-motion';
import type React from 'react';
import { forwardRef, useImperativeHandle } from 'react';

export interface BurstHandle {
  triggerBurst: (x?: number, y?: number, colorRgb?: string) => void;
  trigger: (x?: number, y?: number, colorRgb?: string) => void;
}

export const HubBurstCanvas = forwardRef<BurstHandle, React.HTMLAttributes<HTMLDivElement>>(
  (_props, ref) => {
    useImperativeHandle(ref, () => ({
      triggerBurst: (_x?: number, _y?: number, _colorRgb?: string) => {},
      trigger: (_x?: number, _y?: number, _colorRgb?: string) => {},
    }));

    return (
      <div className="relative w-full h-full flex items-center justify-center">
        {/* Central Node */}
        <div className="absolute z-10 w-24 h-24 rounded-full bg-obsidian shadow-2xl flex items-center justify-center border border-line">
          <div className="w-16 h-16 rounded-full border border-gold/30 animate-spin-slow flex items-center justify-center">
            <div className="w-8 h-8 rounded-full bg-gold/20 backdrop-blur-sm" />
          </div>
        </div>

        {/* Burst Rings */}
        <motion.div
          className="absolute w-[300px] h-[300px] rounded-full border border-gold/10"
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: [0.8, 1.2, 1.5], opacity: [0, 1, 0] }}
          transition={{ duration: 4, repeat: Infinity, ease: 'easeOut' }}
        />
        <motion.div
          className="absolute w-[450px] h-[450px] rounded-full border border-info/10"
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: [0.8, 1.2, 1.5], opacity: [0, 1, 0] }}
          transition={{ duration: 4, repeat: Infinity, ease: 'easeOut', delay: 1.3 }}
        />

        {/* Connecting Nodes */}
        <div className="absolute top-[30%] left-[25%] w-3 h-3 bg-info rounded-full shadow-[0_0_10px_rgba(59,130,246,0.5)]" />
        <div className="absolute bottom-[20%] right-[30%] w-3 h-3 bg-success rounded-full shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
        <div className="absolute top-[40%] right-[20%] w-3 h-3 bg-warning rounded-full shadow-[0_0_10px_rgba(245,158,11,0.5)]" />

        {/* SVG Connections (Static abstraction) */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-20">
          <line
            x1="50%"
            y1="50%"
            x2="25%"
            y2="30%"
            stroke="currentColor"
            strokeWidth="1"
            strokeDasharray="4 4"
          />
          <line
            x1="50%"
            y1="50%"
            x2="70%"
            y2="80%"
            stroke="currentColor"
            strokeWidth="1"
            strokeDasharray="4 4"
          />
          <line
            x1="50%"
            y1="50%"
            x2="80%"
            y2="40%"
            stroke="currentColor"
            strokeWidth="1"
            strokeDasharray="4 4"
          />
        </svg>
      </div>
    );
  },
);

HubBurstCanvas.displayName = 'HubBurstCanvas';
