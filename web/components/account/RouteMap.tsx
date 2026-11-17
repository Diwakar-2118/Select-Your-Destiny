'use client';
// Styled SVG route map used when no Google Maps key is configured.
// Bus marker glides along a curved route according to `progress` (0..1).
import { motion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';

const ROUTE = 'M 60 300 C 160 120, 260 360, 380 200 S 560 80, 640 160 S 720 300, 760 90';

export function RouteMap({ progress, from, to }: { progress: number; from: string; to: string }) {
  const pathRef = useRef<SVGPathElement>(null);
  const [pt, setPt] = useState({ x: 60, y: 300, angle: 0 });
  const [len, setLen] = useState(1);

  useEffect(() => {
    const p = pathRef.current;
    if (!p) return;
    const total = p.getTotalLength();
    setLen(total);
    const at = Math.max(0, Math.min(1, progress)) * total;
    const a = p.getPointAtLength(at);
    const b = p.getPointAtLength(Math.min(total, at + 1));
    setPt({ x: a.x, y: a.y, angle: (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI });
  }, [progress]);

  return (
    <svg viewBox="0 0 820 380" role="img" aria-label={`Route map from ${from} to ${to}, bus ${Math.round(progress * 100)}% of the way`} className="h-full w-full">
      <defs>
        <linearGradient id="rg" x1="0" x2="1"><stop offset="0" stopColor="#2563EB" /><stop offset="0.6" stopColor="#6D28D9" /><stop offset="1" stopColor="#F97316" /></linearGradient>
        <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse"><path d="M 40 0 L 0 0 0 40" fill="none" stroke="#E2E8F0" strokeWidth="1" /></pattern>
        <filter id="glow"><feGaussianBlur stdDeviation="4" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
      </defs>
      <rect width="820" height="380" fill="#F8FAFC" />
      <rect width="820" height="380" fill="url(#grid)" />
      {/* decorative "map" blobs */}
      <ellipse cx="200" cy="90" rx="120" ry="50" fill="#DCFCE7" opacity="0.6" />
      <ellipse cx="560" cy="300" rx="150" ry="55" fill="#DBEAFE" opacity="0.7" />
      <path d={ROUTE} fill="none" stroke="#CBD5E1" strokeWidth="14" strokeLinecap="round" />
      <path ref={pathRef} d={ROUTE} fill="none" stroke="url(#rg)" strokeWidth="6" strokeLinecap="round"
        strokeDasharray={len} strokeDashoffset={len * (1 - progress)} style={{ transition: 'stroke-dashoffset 1.2s ease' }} />
      {/* endpoints */}
      <g><circle cx="60" cy="300" r="10" fill="#2563EB" /><text x="60" y="335" textAnchor="middle" className="fill-slate-700 text-[14px] font-semibold">{from}</text></g>
      <g><circle cx="760" cy="90" r="10" fill="#F97316" /><text x="760" y="70" textAnchor="middle" className="fill-slate-700 text-[14px] font-semibold">{to}</text></g>
      {/* bus marker */}
      <motion.g animate={{ x: pt.x, y: pt.y }} transition={{ type: 'spring', damping: 20, stiffness: 60 }}>
        <motion.circle r="22" fill="#6D28D9" opacity="0.18" animate={{ r: [18, 30, 18] }} transition={{ repeat: Infinity, duration: 2 }} />
        <g transform={`rotate(${pt.angle})`} filter="url(#glow)">
          <rect x="-16" y="-10" width="32" height="20" rx="6" fill="url(#rg)" />
          <rect x="6" y="-7" width="7" height="14" rx="2" fill="#fff" opacity="0.85" />
        </g>
      </motion.g>
    </svg>
  );
}
