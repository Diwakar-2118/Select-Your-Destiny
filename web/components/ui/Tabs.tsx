'use client';

import React, { useId, useRef } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

export interface TabItem {
  id: string;
  label: React.ReactNode;
  icon?: React.ReactNode;
  badge?: React.ReactNode;
}

export interface TabsProps {
  tabs: TabItem[];
  value: string;
  onChange: (id: string) => void;
  className?: string;
  fullWidth?: boolean;
  ariaLabel?: string;
  /** Prefix for ids: `${idBase}-tab-${id}` / `${idBase}-panel-${id}`. Pass the same to <TabPanel>. */
  idBase?: string;
}

/** WAI-ARIA tabs with arrow-key navigation and an animated pill. */
export function Tabs({ tabs, value, onChange, className, fullWidth, ariaLabel, idBase }: TabsProps) {
  const auto = useId().replace(/:/g, '');
  const base = idBase || auto;
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const onKey = (e: React.KeyboardEvent, i: number) => {
    let n = i;
    if (e.key === 'ArrowRight') n = (i + 1) % tabs.length;
    else if (e.key === 'ArrowLeft') n = (i - 1 + tabs.length) % tabs.length;
    else if (e.key === 'Home') n = 0;
    else if (e.key === 'End') n = tabs.length - 1;
    else return;
    e.preventDefault();
    refs.current[n]?.focus();
    onChange(tabs[n].id);
  };
  return (
    <div role="tablist" aria-label={ariaLabel} className={cn('no-scrollbar flex gap-1 overflow-x-auto rounded-2xl bg-card p-1', className)}>
      {tabs.map((t, i) => {
        const active = t.id === value;
        return (
          <button
            key={t.id}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="tab"
            id={`${base}-tab-${t.id}`}
            aria-selected={active}
            aria-controls={`${base}-panel-${t.id}`}
            tabIndex={active ? 0 : -1}
            onClick={() => onChange(t.id)}
            onKeyDown={(e) => onKey(e, i)}
            className={cn(
              'relative inline-flex min-h-[44px] items-center justify-center gap-2 whitespace-nowrap rounded-xl px-4 text-sm font-semibold transition-colors',
              fullWidth && 'flex-1',
              active ? 'text-primary-700' : 'text-muted hover:text-ink',
            )}
          >
            {active && (
              <motion.span
                layoutId={`tab-pill-${base}`}
                className="absolute inset-0 rounded-xl bg-white shadow-soft"
                transition={{ type: 'spring', stiffness: 400, damping: 32 }}
              />
            )}
            <span className="relative z-10 inline-flex items-center gap-2">
              {t.icon}
              {t.label}
              {t.badge}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export function TabPanel({ idBase, id, children, className }: { idBase: string; id: string; children: React.ReactNode; className?: string }) {
  return (
    <div role="tabpanel" id={`${idBase}-panel-${id}`} aria-labelledby={`${idBase}-tab-${id}`} className={className}>
      {children}
    </div>
  );
}
