'use client';
// Small, self-contained UI primitives for account + admin pages.
// Kept local (instead of components/ui/*) so these pages never break if shared component APIs drift.
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import { createContext, useCallback, useContext, useEffect, useId, useRef, useState } from 'react';
import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from 'react';

export const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ');
export const GRADIENT = 'linear-gradient(135deg,#2563EB 0%,#6D28D9 60%,#F97316 100%)';

/* ---------- Button ---------- */
type BtnVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline';
export function Btn({ variant = 'primary', className, children, loading, ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: BtnVariant; loading?: boolean }) {
  const styles: Record<BtnVariant, string> = {
    primary: 'text-white shadow-md shadow-indigo-500/20 hover:shadow-lg hover:brightness-110',
    secondary: 'bg-slate-100 text-slate-800 hover:bg-slate-200',
    ghost: 'text-slate-600 hover:bg-slate-100',
    danger: 'bg-red-50 text-red-600 hover:bg-red-100',
    outline: 'border border-slate-200 bg-white text-slate-700 hover:border-indigo-300 hover:text-indigo-700',
  };
  return (
    <button
      {...rest}
      disabled={rest.disabled || loading}
      style={variant === 'primary' ? { background: GRADIENT, ...rest.style } : rest.style}
      className={cx(
        'inline-flex min-h-[44px] items-center justify-center gap-2 rounded-2xl px-4 text-sm font-semibold transition-all',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
        styles[variant], className,
      )}
    >
      {loading && <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden />}
      {children}
    </button>
  );
}

/* ---------- Card ---------- */
export function Panel({ className, children, as: Tag = 'div', ...rest }: { className?: string; children: ReactNode; as?: 'div' | 'section' | 'article' } & Record<string, unknown>) {
  return <Tag {...rest} className={cx('rounded-2xl border border-slate-200/70 bg-white p-5 shadow-[0_4px_24px_-8px_rgba(15,23,42,0.08)]', className)}>{children}</Tag>;
}

/* ---------- Badge ---------- */
const tones = {
  blue: 'bg-blue-50 text-blue-700 ring-blue-200', green: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  red: 'bg-red-50 text-red-700 ring-red-200', amber: 'bg-amber-50 text-amber-700 ring-amber-200',
  purple: 'bg-violet-50 text-violet-700 ring-violet-200', gray: 'bg-slate-100 text-slate-600 ring-slate-200',
  orange: 'bg-orange-50 text-orange-700 ring-orange-200', pink: 'bg-pink-50 text-pink-700 ring-pink-200',
};
export type Tone = keyof typeof tones;
export function Pill({ tone = 'gray', children, className }: { tone?: Tone; children: ReactNode; className?: string }) {
  return <span className={cx('inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset', tones[tone], className)}>{children}</span>;
}
/** Map common status strings to a badge tone. */
export function statusTone(s: string): Tone {
  const k = s.toUpperCase();
  if (['CONFIRMED', 'SUCCESS', 'ACTIVE', 'RESOLVED', 'COMPLETED', 'TRUE'].includes(k)) return 'green';
  if (['CANCELLED', 'FAILED', 'INACTIVE', 'FALSE'].includes(k)) return 'red';
  if (['PENDING', 'OPEN'].includes(k)) return 'amber';
  if (['REFUNDED', 'IN_PROGRESS'].includes(k)) return 'purple';
  return 'blue';
}

/* ---------- Skeleton ---------- */
export function Skel({ className }: { className?: string }) {
  return <div aria-hidden className={cx('animate-pulse rounded-xl bg-gradient-to-r from-slate-100 via-slate-200/70 to-slate-100', className)} />;
}

/* ---------- Inputs ---------- */
export function Field({ label, error, className, ...rest }: InputHTMLAttributes<HTMLInputElement> & { label: string; error?: string }) {
  const id = useId();
  return (
    <label htmlFor={rest.id ?? id} className={cx('block', className)}>
      <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</span>
      <input
        id={rest.id ?? id}
        {...rest}
        className="min-h-[44px] w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
      />
      {error && <span className="mt-1 block text-xs text-red-600">{error}</span>}
    </label>
  );
}
export function SelectField({ label, options, className, ...rest }: SelectHTMLAttributes<HTMLSelectElement> & { label: string; options: { value: string; label: string }[] }) {
  const id = useId();
  return (
    <label htmlFor={id} className={cx('block', className)}>
      <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</span>
      <select id={id} {...rest} className="min-h-[44px] w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100">
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </label>
  );
}

/* ---------- Modal ---------- */
export function Dialog({ open, onClose, title, children, footer, wide }: { open: boolean; onClose: () => void; title: string; children: ReactNode; footer?: ReactNode; wide?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    const prev = document.activeElement as HTMLElement | null;
    setTimeout(() => ref.current?.querySelector<HTMLElement>('input,select,textarea,button')?.focus(), 30);
    return () => { document.removeEventListener('keydown', onKey); prev?.focus?.(); };
  }, [open, onClose]);
  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-[100] flex items-end justify-center bg-slate-900/40 p-0 backdrop-blur-sm sm:items-center sm:p-4"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
          <motion.div
            ref={ref} role="dialog" aria-modal="true" aria-label={title}
            onClick={e => e.stopPropagation()}
            initial={{ y: 40, opacity: 0, scale: 0.98 }} animate={{ y: 0, opacity: 1, scale: 1 }} exit={{ y: 40, opacity: 0 }}
            transition={{ type: 'spring', damping: 26, stiffness: 320 }}
            className={cx('max-h-[92vh] w-full overflow-y-auto rounded-t-3xl bg-white shadow-2xl sm:rounded-2xl', wide ? 'sm:max-w-2xl' : 'sm:max-w-md')}
          >
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white/90 px-5 py-3 backdrop-blur">
              <h2 className="text-base font-bold text-slate-900">{title}</h2>
              <button onClick={onClose} aria-label="Close dialog" className="grid h-11 w-11 place-items-center rounded-xl text-slate-500 hover:bg-slate-100"><X size={18} /></button>
            </div>
            <div className="px-5 py-4">{children}</div>
            {footer && <div className="flex flex-wrap justify-end gap-2 border-t border-slate-100 px-5 py-3">{footer}</div>}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ---------- Tabs ---------- */
export function TabBar<T extends string>({ tabs, value, onChange, label }: { tabs: { value: T; label: string; count?: number }[]; value: T; onChange: (v: T) => void; label: string }) {
  return (
    <div role="tablist" aria-label={label} className="flex gap-1 overflow-x-auto rounded-2xl bg-slate-100 p-1">
      {tabs.map(t => {
        const active = t.value === value;
        return (
          <button key={t.value} role="tab" aria-selected={active} onClick={() => onChange(t.value)}
            onKeyDown={e => {
              const i = tabs.findIndex(x => x.value === value);
              if (e.key === 'ArrowRight') onChange(tabs[(i + 1) % tabs.length].value);
              if (e.key === 'ArrowLeft') onChange(tabs[(i - 1 + tabs.length) % tabs.length].value);
            }}
            className={cx('relative min-h-[44px] flex-1 whitespace-nowrap rounded-xl px-4 text-sm font-semibold transition-colors', active ? 'text-slate-900' : 'text-slate-500 hover:text-slate-800')}>
            {active && <motion.span layoutId={`tab-${label}`} className="absolute inset-0 rounded-xl bg-white shadow-sm" transition={{ type: 'spring', damping: 30, stiffness: 400 }} />}
            <span className="relative">{t.label}{t.count !== undefined && <span className="ml-1.5 rounded-full bg-indigo-100 px-1.5 text-xs text-indigo-700">{t.count}</span>}</span>
          </button>
        );
      })}
    </div>
  );
}

/* ---------- Empty state ---------- */
export function Empty({ icon, title, text, action }: { icon: ReactNode; title: string; text?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 px-6 py-14 text-center">
      <div className="mb-3 grid h-14 w-14 place-items-center rounded-2xl text-white" style={{ background: GRADIENT }}>{icon}</div>
      <h3 className="font-bold text-slate-900">{title}</h3>
      {text && <p className="mt-1 max-w-sm text-sm text-slate-500">{text}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

/* ---------- Page shell with hero header ---------- */
export function PageShell({ title, subtitle, icon, children, actions }: { title: string; subtitle?: string; icon?: ReactNode; children: ReactNode; actions?: ReactNode }) {
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }} className="mx-auto w-full max-w-6xl px-4 pb-16 pt-6 sm:px-6">
      <header className="relative mb-6 overflow-hidden rounded-2xl p-6 text-white shadow-lg" style={{ background: GRADIENT }}>
        <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
        <div className="relative flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {icon && <div className="grid h-12 w-12 place-items-center rounded-2xl bg-white/20 backdrop-blur">{icon}</div>}
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight">{title}</h1>
              {subtitle && <p className="text-sm text-white/80">{subtitle}</p>}
            </div>
          </div>
          {actions}
        </div>
      </header>
      {children}
    </motion.div>
  );
}

/* ---------- Toast ---------- */
type ToastItem = { id: number; text: string; tone: 'success' | 'error' | 'info' };
const ToastCtx = createContext<(text: string, tone?: ToastItem['tone']) => void>(() => {});
export function ToastHost({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const push = useCallback((text: string, tone: ToastItem['tone'] = 'success') => {
    const id = Date.now() + Math.random();
    setItems(s => [...s, { id, text, tone }]);
    setTimeout(() => setItems(s => s.filter(i => i.id !== id)), 3200);
  }, []);
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed bottom-4 left-1/2 z-[200] flex w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 flex-col gap-2">
        <AnimatePresence>
          {items.map(t => (
            <motion.div key={t.id} initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ opacity: 0, y: 10 }}
              className={cx('pointer-events-auto rounded-2xl px-4 py-3 text-sm font-medium text-white shadow-xl',
                t.tone === 'error' ? 'bg-red-600' : t.tone === 'info' ? 'bg-slate-900' : 'bg-emerald-600')}>
              {t.text}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastCtx.Provider>
  );
}
export const useToaster = () => useContext(ToastCtx);
