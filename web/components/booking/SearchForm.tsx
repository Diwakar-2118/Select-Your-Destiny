'use client';

import { useEffect, useId, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowLeftRight, Bus, CalendarDays, MapPin, Search, Users } from 'lucide-react';
import { api } from '@/lib/api';
import { useBooking, type SearchParamsState } from '@/lib/store';
import type { BusType, City } from '@/lib/types';
import { BUS_TYPE_LABEL, cn, todayISO } from '@/lib/utils';
import { Button } from '@/components/ui';

export const RECENT_KEY = 'syd_recent_searches';

export function loadRecent(): SearchParamsState[] {
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]') as SearchParamsState[];
  } catch {
    return [];
  }
}
export function saveRecent(s: SearchParamsState) {
  try {
    const list = loadRecent().filter((r) => !(r.from === s.from && r.to === s.to));
    localStorage.setItem(RECENT_KEY, JSON.stringify([s, ...list].slice(0, 6)));
  } catch {
    /* ignore */
  }
}

export function searchUrl(s: SearchParamsState) {
  const q = new URLSearchParams({ from: s.from, to: s.to, date: s.date, pax: String(s.passengers) });
  if (s.returnDate) q.set('return', s.returnDate);
  if (s.busType) q.set('busType', s.busType);
  return `/search?${q.toString()}`;
}

function Field({ label, icon, children, htmlFor, className }: { label: string; icon: React.ReactNode; children: React.ReactNode; htmlFor: string; className?: string }) {
  return (
    <div className={cn('group relative rounded-2xl border border-gray-200 bg-white px-4 py-2 transition focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/15', className)}>
      <label htmlFor={htmlFor} className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted">
        {icon}
        {label}
      </label>
      {children}
    </div>
  );
}

const fieldInput = 'w-full min-h-[32px] bg-transparent text-base font-semibold text-ink placeholder:font-medium placeholder:text-gray-400 focus:outline-none focus-visible:outline-none';

export function SearchForm({ initial, compact, onSearched }: { initial?: Partial<SearchParamsState>; compact?: boolean; onSearched?: () => void }) {
  const router = useRouter();
  const { search, setSearch } = useBooking();
  const id = useId().replace(/:/g, '');
  const [cities, setCities] = useState<City[]>([]);
  const [showReturn, setShowReturn] = useState(!!initial?.returnDate);
  const [swapRot, setSwapRot] = useState(0);
  const [error, setError] = useState('');
  const [form, setForm] = useState<SearchParamsState>({
    from: initial?.from ?? search?.from ?? '',
    to: initial?.to ?? search?.to ?? '',
    date: initial?.date ?? (search?.date && search.date >= todayISO() ? search.date : todayISO(1)),
    returnDate: initial?.returnDate ?? '',
    passengers: initial?.passengers ?? search?.passengers ?? 1,
    busType: initial?.busType ?? '',
  });

  useEffect(() => {
    api.getCities().then(setCities).catch(() => undefined);
  }, []);
  useEffect(() => {
    if (initial) setForm((f) => ({ ...f, ...Object.fromEntries(Object.entries(initial).filter(([, v]) => v !== undefined && v !== '')) }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initial?.from, initial?.to, initial?.date]);

  const swap = () => {
    setSwapRot((r) => r + 180);
    setForm((f) => ({ ...f, from: f.to, to: f.from }));
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.from.trim() || !form.to.trim()) return setError('Please enter both source and destination');
    if (form.from.trim().toLowerCase() === form.to.trim().toLowerCase()) return setError('Source and destination cannot be the same');
    if (!form.date) return setError('Please select a journey date');
    if (showReturn && form.returnDate && form.returnDate < form.date) return setError('Return date must be after journey date');
    setError('');
    const s: SearchParamsState = { ...form, from: form.from.trim(), to: form.to.trim(), returnDate: showReturn ? form.returnDate : '' };
    setSearch(s);
    saveRecent(s);
    router.push(searchUrl(s));
    onSearched?.();
  };

  return (
    <form onSubmit={submit} aria-label="Search buses" noValidate>
      <datalist id={`${id}-cities`}>
        {cities.map((c) => (
          <option key={c.id} value={c.name}>
            {c.state}
          </option>
        ))}
      </datalist>
      <div className={cn('grid gap-3', compact ? 'lg:grid-cols-[1fr_auto_1fr_1fr_auto]' : 'md:grid-cols-2 lg:grid-cols-[1fr_auto_1fr]')}>
        <Field label="From" htmlFor={`${id}-from`} icon={<MapPin className="h-3.5 w-3.5" />}>
          <input
            id={`${id}-from`}
            list={`${id}-cities`}
            className={fieldInput}
            placeholder="Leaving from"
            autoComplete="off"
            value={form.from}
            onChange={(e) => setForm({ ...form, from: e.target.value })}
          />
        </Field>
        <div className="flex items-center justify-center md:col-span-2 lg:col-span-1 md:-my-6 lg:my-0">
          <motion.button
            type="button"
            onClick={swap}
            animate={{ rotate: swapRot }}
            whileTap={{ scale: 0.9 }}
            aria-label="Swap source and destination"
            className="z-10 inline-flex h-11 w-11 items-center justify-center rounded-full border border-gray-200 bg-white text-primary shadow-soft hover:bg-primary-50"
          >
            <ArrowLeftRight className="h-5 w-5" />
          </motion.button>
        </div>
        <Field label="To" htmlFor={`${id}-to`} icon={<MapPin className="h-3.5 w-3.5" />}>
          <input
            id={`${id}-to`}
            list={`${id}-cities`}
            className={fieldInput}
            placeholder="Going to"
            autoComplete="off"
            value={form.to}
            onChange={(e) => setForm({ ...form, to: e.target.value })}
          />
        </Field>
        {compact ? (
          <>
            <Field label="Date" htmlFor={`${id}-date`} icon={<CalendarDays className="h-3.5 w-3.5" />}>
              <input id={`${id}-date`} type="date" min={todayISO()} className={fieldInput} value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
            </Field>
            <Button type="submit" size="lg" leftIcon={<Search className="h-5 w-5" />} className="h-full">
              Modify
            </Button>
          </>
        ) : null}
      </div>

      {!compact && (
        <>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="Journey date" htmlFor={`${id}-date`} icon={<CalendarDays className="h-3.5 w-3.5" />}>
              <input id={`${id}-date`} type="date" min={todayISO()} className={fieldInput} value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
              <div className="mt-1 flex gap-1.5">
                {[0, 1].map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setForm({ ...form, date: todayISO(d) })}
                    className={cn('rounded-full px-2.5 py-0.5 text-xs font-semibold', form.date === todayISO(d) ? 'bg-primary text-white' : 'bg-card text-slate-600 hover:bg-gray-200')}
                  >
                    {d === 0 ? 'Today' : 'Tomorrow'}
                  </button>
                ))}
              </div>
            </Field>
            <Field label="Return date (optional)" htmlFor={`${id}-ret`} icon={<CalendarDays className="h-3.5 w-3.5" />}>
              {showReturn ? (
                <input id={`${id}-ret`} type="date" min={form.date} className={fieldInput} value={form.returnDate} onChange={(e) => setForm({ ...form, returnDate: e.target.value })} />
              ) : (
                <button id={`${id}-ret`} type="button" onClick={() => setShowReturn(true)} className="min-h-[32px] text-base font-semibold text-primary">
                  + Add return
                </button>
              )}
            </Field>
            <Field label="Passengers" htmlFor={`${id}-pax`} icon={<Users className="h-3.5 w-3.5" />}>
              <div className="flex items-center justify-between">
                <button type="button" aria-label="Decrease passengers" onClick={() => setForm({ ...form, passengers: Math.max(1, form.passengers - 1) })} className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-card text-lg font-bold hover:bg-gray-200">
                  −
                </button>
                <output id={`${id}-pax`} aria-live="polite" className="text-base font-semibold">
                  {form.passengers} {form.passengers > 1 ? 'Travellers' : 'Traveller'}
                </output>
                <button type="button" aria-label="Increase passengers" onClick={() => setForm({ ...form, passengers: Math.min(6, form.passengers + 1) })} className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-card text-lg font-bold hover:bg-gray-200">
                  +
                </button>
              </div>
            </Field>
            <Field label="Bus type" htmlFor={`${id}-type`} icon={<Bus className="h-3.5 w-3.5" />}>
              <select id={`${id}-type`} className={cn(fieldInput, 'cursor-pointer')} value={form.busType} onChange={(e) => setForm({ ...form, busType: e.target.value as BusType | '' })}>
                <option value="">All bus types</option>
                {(Object.keys(BUS_TYPE_LABEL) as BusType[]).map((t) => (
                  <option key={t} value={t}>
                    {BUS_TYPE_LABEL[t]}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <Button type="submit" size="lg" fullWidth className="mt-4" leftIcon={<Search className="h-5 w-5" />}>
            Search Buses
          </Button>
        </>
      )}
      {error && (
        <p role="alert" className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
          {error}
        </p>
      )}
    </form>
  );
}
