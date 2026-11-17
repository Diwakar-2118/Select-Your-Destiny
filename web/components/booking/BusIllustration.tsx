'use client';

import { motion, useReducedMotion } from 'framer-motion';

/** Large animated SVG bus used on splash/hero. */
export function BusIllustration({ className }: { className?: string }) {
  const reduce = useReducedMotion();
  const spin = reduce ? {} : { rotate: 360 };
  return (
    <svg viewBox="0 0 480 260" className={className} role="img" aria-label="Illustration of a bus driving">
      <defs>
        <linearGradient id="bus-body" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#2563EB" />
          <stop offset="65%" stopColor="#6D28D9" />
          <stop offset="100%" stopColor="#F97316" />
        </linearGradient>
        <linearGradient id="bus-glass" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#E0F2FE" />
          <stop offset="100%" stopColor="#BFDBFE" />
        </linearGradient>
      </defs>
      {/* road */}
      <rect x="0" y="222" width="480" height="8" rx="4" fill="#E5E7EB" />
      <motion.g animate={reduce ? {} : { x: [0, -120] }} transition={{ repeat: Infinity, duration: 1.2, ease: 'linear' }}>
        {Array.from({ length: 8 }).map((_, i) => (
          <rect key={i} x={i * 120} y="236" width="60" height="5" rx="2.5" fill="#CBD5E1" />
        ))}
      </motion.g>
      {/* speed lines */}
      {!reduce &&
        [60, 100, 140].map((y, i) => (
          <motion.rect
            key={y}
            y={y}
            height="4"
            rx="2"
            fill="#93C5FD"
            initial={{ x: 40, width: 0, opacity: 0 }}
            animate={{ x: [40, 0], width: [0, 50], opacity: [0, 1, 0] }}
            transition={{ repeat: Infinity, duration: 1.1, delay: i * 0.25 }}
          />
        ))}
      <motion.g animate={reduce ? {} : { y: [0, -3, 0] }} transition={{ repeat: Infinity, duration: 0.6, ease: 'easeInOut' }}>
        {/* body */}
        <rect x="70" y="40" width="360" height="160" rx="28" fill="url(#bus-body)" />
        <rect x="70" y="150" width="360" height="14" fill="#fff" opacity="0.18" />
        {/* windshield */}
        <path d="M380 58 h26 a14 14 0 0 1 14 14 v52 h-40z" fill="url(#bus-glass)" />
        {/* windows */}
        {[0, 1, 2, 3].map((i) => (
          <rect key={i} x={96 + i * 68} y="62" width="56" height="58" rx="10" fill="url(#bus-glass)" />
        ))}
        {/* passengers */}
        {[0, 1, 2, 3].map((i) => (
          <circle key={i} cx={124 + i * 68} cy="100" r="9" fill="#6D28D9" opacity="0.35" />
        ))}
        {/* door */}
        <rect x="360" y="132" width="16" height="56" rx="4" fill="#fff" opacity="0.35" />
        {/* lights */}
        <motion.circle
          cx="420"
          cy="176"
          r="8"
          fill="#FDE68A"
          animate={reduce ? {} : { opacity: [1, 0.5, 1] }}
          transition={{ repeat: Infinity, duration: 1.4 }}
        />
        <rect x="74" y="170" width="10" height="16" rx="3" fill="#FCA5A5" />
        {/* brand stripe */}
        <text x="110" y="148" fill="#fff" fontSize="18" fontWeight="800" fontFamily="Inter, sans-serif" letterSpacing="1">
          SELECT YOUR DESTINY
        </text>
      </motion.g>
      {/* wheels */}
      {[150, 350].map((cx) => (
        <g key={cx}>
          <circle cx={cx} cy="200" r="26" fill="#0F172A" />
          <motion.g style={{ originX: `${cx}px`, originY: '200px' }} animate={spin} transition={{ repeat: Infinity, duration: 0.8, ease: 'linear' }}>
            <circle cx={cx} cy="200" r="12" fill="#E5E7EB" />
            <rect x={cx - 2} y="188" width="4" height="24" fill="#64748B" />
            <rect x={cx - 12} y="198" width="24" height="4" fill="#64748B" />
          </motion.g>
        </g>
      ))}
    </svg>
  );
}
