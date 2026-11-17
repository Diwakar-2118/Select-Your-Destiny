'use client';

import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export type ToastType = 'success' | 'error' | 'info';
interface ToastItem {
  id: number;
  message: string;
  type: ToastType;
}
export interface ToastCtx {
  toast: (message: string, type?: ToastType) => void;
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
}

const Ctx = createContext<ToastCtx | null>(null);
const icons = { success: CheckCircle2, error: AlertCircle, info: Info };

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const dismiss = useCallback((id: number) => setItems((s) => s.filter((t) => t.id !== id)), []);
  const toast = useCallback(
    (message: string, type: ToastType = 'info') => {
      const id = Date.now() + Math.random();
      setItems((s) => [...s.slice(-3), { id, message, type }]);
      setTimeout(() => dismiss(id), 4000);
    },
    [dismiss],
  );
  const value = useMemo<ToastCtx>(
    () => ({ toast, success: (m) => toast(m, 'success'), error: (m) => toast(m, 'error'), info: (m) => toast(m, 'info') }),
    [toast],
  );
  return (
    <Ctx.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 top-4 z-[200] flex flex-col items-center gap-2 px-4 sm:items-end sm:pr-6"
      >
        <AnimatePresence>
          {items.map((t) => {
            const Icon = icons[t.type];
            return (
              <motion.div
                key={t.id}
                layout
                role={t.type === 'error' ? 'alert' : 'status'}
                initial={{ opacity: 0, y: -16, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, x: 40 }}
                className={cn(
                  'glass pointer-events-auto flex w-full max-w-sm items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium',
                  t.type === 'success' && 'text-green-800',
                  t.type === 'error' && 'text-red-700',
                  t.type === 'info' && 'text-ink',
                )}
              >
                <Icon className="h-5 w-5 shrink-0" aria-hidden />
                <span className="flex-1">{t.message}</span>
                <button
                  onClick={() => dismiss(t.id)}
                  aria-label="Dismiss notification"
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full hover:bg-black/5"
                >
                  <X className="h-4 w-4" />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </Ctx.Provider>
  );
}

export function useToast(): ToastCtx {
  const c = useContext(Ctx);
  if (!c) throw new Error('useToast must be used within ToastProvider');
  return c;
}
