'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, BusFront, ChevronLeft, ChevronRight, Moon, SlidersHorizontal, Sun, Sunrise, Sunset, X } from 'lucide-react';
import { api, errorMessage } from '@/lib/api';
import { useBooking } from '@/lib/store';
import type { Amenity, BusType, DepartureSlot, SortOption, Trip } from '@/lib/types';
import { AMENITY_LABEL, cn, departureSlot, formatDate, isSleeperType, todayISO } from '@/lib/utils';
import { Button, EmptyState, PageTransition } from '@/components/ui';
import { BusCard, BusCardSkeleton } from '@/components/booking/BusCard';
import { SearchForm } from '@/components/booking/SearchForm';

interface Filters {
  ac: boolean;
  nonAc: boolean;
  sleeper: boolean;
  seater: boolean;
  slots: DepartureSlot[];
  operators: string[];
  amenities: Amenity[];
}
const EMPTY: Filters = { ac: false, nonAc: false, sleeper: false, seater: false, slots: [], operators: [], amenities: [] };

const SLOTS: { id: DepartureSlot; label: string; range: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'MORNING', label: 'Morning', range: '5 AM – 12 PM', icon: Sunrise },
  { id: 'AFTERNOON', label: 'Afternoon', range: '12 – 5 PM', icon: Sun },
  { id: 'EVENING', label: 'Evening', range: '5 – 9 PM', icon: Sunset },
  { id: 'NIGHT', label: 'Night', range: '9 PM – 5 AM', icon: Moon },
];
const SORTS: { id: SortOption; label: string }[] = [
  { id: 'PRICE_ASC', label: 'Lowest price' },
  { id: 'RATING_DESC', label: 'Highest rating' },
  { id: 'DEPARTURE', label: 'Earliest departure' },
  { id: 'ARRIVAL', label: 'Earliest arrival' },
];

function toggle<T>(arr: T[], v: T) {
  return arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v];
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl border px-3 text-sm font-semibold transition',
        active ? 'border-primary bg-primary-50 text-primary-700' : 'border-gray-200 bg-white text-slate-600 hover:border-primary/50',
      )}
    >
      {children}
    </button>
  );
}

function FilterPanel({ f, setF, operators }: { f: Filters; setF: (f: Filters) => void; operators: string[] }) {
  return (
    <div className="space-y-6">
      <fieldset>
        <legend className="mb-2 text-sm font-bold text-ink">Bus type</legend>
        <div className="grid grid-cols-2 gap-2">
          <Chip active={f.ac} onClick={() => setF({ ...f, ac: !f.ac })}>AC</Chip>
          <Chip active={f.nonAc} onClick={() => setF({ ...f, nonAc: !f.nonAc })}>Non AC</Chip>
          <Chip active={f.sleeper} onClick={() => setF({ ...f, sleeper: !f.sleeper })}>Sleeper</Chip>
          <Chip active={f.seater} onClick={() => setF({ ...f, seater: !f.seater })}>Seater</Chip>
        </div>
      </fieldset>
      <fieldset>
        <legend className="mb-2 text-sm font-bold text-ink">Departure time</legend>
        <div className="grid grid-cols-2 gap-2">
          {SLOTS.map((s) => (
            <button
              key={s.id}
              type="button"
              aria-pressed={f.slots.includes(s.id)}
              onClick={() => setF({ ...f, slots: toggle(f.slots, s.id) })}
              className={cn(
                'flex min-h-[64px] flex-col items-center justify-center rounded-xl border p-2 text-xs transition',
                f.slots.includes(s.id) ? 'border-primary bg-primary-50 text-primary-700' : 'border-gray-200 bg-white text-slate-600 hover:border-primary/50',
              )}
            >
              <s.icon className="mb-1 h-5 w-5" />
              <span className="font-bold">{s.label}</span>
              <span className="text-[10px] opacity-80">{s.range}</span>
            </button>
          ))}
        </div>
      </fieldset>
      <fieldset>
        <legend className="mb-2 text-sm font-bold text-ink">Operators</legend>
        <div className="max-h-56 space-y-1 overflow-y-auto pr-1">
          {operators.map((o) => (
            <label key={o} className="flex min-h-[40px] cursor-pointer items-center gap-3 rounded-lg px-2 text-sm hover:bg-card">
              <input type="checkbox" className="h-5 w-5 accent-primary" checked={f.operators.includes(o)} onChange={() => setF({ ...f, operators: toggle(f.operators, o) })} />
              {o}
            </label>
          ))}
        </div>
      </fieldset>
      <fieldset>
        <legend className="mb-2 text-sm font-bold text-ink">Amenities</legend>
        <div className="space-y-1">
          {(Object.keys(AMENITY_LABEL) as Amenity[]).map((a) => (
            <label key={a} className="flex min-h-[40px] cursor-pointer items-center gap-3 rounded-lg px-2 text-sm hover:bg-card">
              <input type="checkbox" className="h-5 w-5 accent-primary" checked={f.amenities.includes(a)} onChange={() => setF({ ...f, amenities: toggle(f.amenities, a) })} />
              {AMENITY_LABEL[a]}
            </label>
          ))}
        </div>
      </fieldset>
    </div>
  );
}

function SearchInner() {
  const params = useSearchParams();
  const router = useRouter();
  const { selectTrip, setSearch, search } = useBooking();
  const from = params.get('from') || search?.from || 'Bengaluru';
  const to = params.get('to') || search?.to || 'Chennai';
  const date = params.get('date') || todayISO(1);
  const pax = Number(params.get('pax') || 1);
  const busType = (params.get('busType') || '') as BusType | '';
  const ret = params.get('return') || '';

  const [trips, setTrips] = useState<Trip[] | null>(null);
  const [error, setError] = useState('');
  const [f, setF] = useState<Filters>(EMPTY);
  const [sort, setSort] = useState<SortOption>('DEPARTURE');
  const [drawer, setDrawer] = useState(false);
  const [modify, setModify] = useState(false);

  useEffect(() => {
    setTrips(null);
    setError('');
    setSearch({ from, to, date, passengers: pax, busType, returnDate: ret });
    api
      .searchTrips({ from, to, date, busType: busType || undefined })
      .then(setTrips)
      .catch((e) => {
        setError(errorMessage(e));
        setTrips([]);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [from, to, date, busType]);

  const operators = useMemo(() => Array.from(new Set((trips || []).map((t) => t.operatorName))).sort(), [trips]);

  const results = useMemo(() => {
    if (!trips) return null;
    let r = trips.filter((t) => {
      if ((f.ac || f.nonAc) && !((f.ac && t.ac) || (f.nonAc && !t.ac))) return false;
      const sl = isSleeperType(t.busType);
      if ((f.sleeper || f.seater) && !((f.sleeper && sl) || (f.seater && !sl))) return false;
      if (f.slots.length && !f.slots.includes(departureSlot(t.departureTime))) return false;
      if (f.operators.length && !f.operators.includes(t.operatorName)) return false;
      if (f.amenities.length && !f.amenities.every((a) => t.amenities.includes(a))) return false;
      return true;
    });
    const price = (t: Trip) => t.fare * (1 - t.discountPercent / 100);
    r = [...r].sort((a, b) =>
      sort === 'PRICE_ASC'
        ? price(a) - price(b)
        : sort === 'RATING_DESC'
          ? b.rating - a.rating
          : sort === 'ARRIVAL'
            ? a.arrivalTime.localeCompare(b.arrivalTime)
            : a.departureTime.localeCompare(b.departureTime),
    );
    return r;
  }, [trips, f, sort]);

  const activeCount = [f.ac, f.nonAc, f.sleeper, f.seater].filter(Boolean).length + f.slots.length + f.operators.length + f.amenities.length;

  const shiftDate = (d: number) => {
    const dt = new Date(`${date}T00:00:00`);
    dt.setDate(dt.getDate() + d);
    const iso = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
    if (iso < todayISO()) return;
    const q = new URLSearchParams(params.toString());
    q.set('date', iso);
    router.push(`/search?${q.toString()}`);
  };

  const book = (t: Trip) => {
    selectTrip(t);
    router.push(`/trip/${t.id}/seats`);
  };

  return (
    <PageTransition>
      {/* header strip */}
      <div className="gradient-brand text-white">
        <div className="container-app py-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="flex flex-wrap items-center gap-2 text-xl font-extrabold sm:text-2xl">
                {from} <ArrowRight className="h-5 w-5" /> {to}
              </h1>
              <p className="text-sm text-white/85">
                {formatDate(date, { weekday: 'long', day: 'numeric', month: 'long' })} · {pax} traveller{pax > 1 ? 's' : ''}
                {ret && ` · Return ${formatDate(ret)}`}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => shiftDate(-1)} disabled={date <= todayISO()} aria-label="Previous day" className="glass-dark inline-flex h-11 w-11 items-center justify-center rounded-xl disabled:opacity-40">
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button onClick={() => shiftDate(1)} aria-label="Next day" className="glass-dark inline-flex h-11 w-11 items-center justify-center rounded-xl">
                <ChevronRight className="h-5 w-5" />
              </button>
              <button onClick={() => setModify((m) => !m)} aria-expanded={modify} className="glass-dark min-h-[44px] rounded-xl px-4 text-sm font-semibold">
                {modify ? 'Close' : 'Modify'}
              </button>
            </div>
          </div>
          <AnimatePresence>
            {modify && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                <div className="mt-4 rounded-2xl bg-white p-4 text-ink">
                  <SearchForm compact initial={{ from, to, date, passengers: pax }} onSearched={() => setModify(false)} />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <div className="container-app grid gap-6 py-6 lg:grid-cols-[280px_1fr]">
        {/* sidebar */}
        <aside className="hidden lg:block" aria-label="Filters">
          <div className="sticky top-20 rounded-2xl border border-gray-100 bg-white p-5 shadow-soft">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="flex items-center gap-2 font-bold">
                <SlidersHorizontal className="h-4 w-4" /> Filters
              </h2>
              {activeCount > 0 && (
                <button onClick={() => setF(EMPTY)} className="min-h-[44px] text-sm font-semibold text-primary">
                  Clear all
                </button>
              )}
            </div>
            <FilterPanel f={f} setF={setF} operators={operators} />
          </div>
        </aside>

        <section aria-label="Search results">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted" aria-live="polite">
              {results ? (
                <>
                  <span className="font-bold text-ink">{results.length}</span> buses found
                </>
              ) : (
                'Searching buses…'
              )}
            </p>
            <div className="flex items-center gap-2">
              <button onClick={() => setDrawer(true)} className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 text-sm font-semibold lg:hidden">
                <SlidersHorizontal className="h-4 w-4" /> Filters
                {activeCount > 0 && <span className="rounded-full bg-primary px-1.5 text-xs text-white">{activeCount}</span>}
              </button>
              <label htmlFor="sort" className="sr-only">
                Sort by
              </label>
              <select id="sort" value={sort} onChange={(e) => setSort(e.target.value as SortOption)} className="min-h-[44px] rounded-xl border border-gray-200 bg-white px-3 text-sm font-semibold">
                {SORTS.map((s) => (
                  <option key={s.id} value={s.id}>
                    Sort: {s.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="no-scrollbar mb-4 flex gap-2 overflow-x-auto">
            {SORTS.map((s) => (
              <Chip key={s.id} active={sort === s.id} onClick={() => setSort(s.id)}>
                {s.label}
              </Chip>
            ))}
          </div>

          {error && <p role="alert" className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}

          <div className="space-y-4">
            {results === null ? (
              Array.from({ length: 4 }).map((_, i) => <BusCardSkeleton key={i} />)
            ) : results.length === 0 ? (
              <EmptyState
                icon={<BusFront className="h-8 w-8" />}
                title="No buses match your filters"
                description="Try removing a few filters or pick another date."
                action={activeCount > 0 ? <Button onClick={() => setF(EMPTY)}>Clear filters</Button> : undefined}
              />
            ) : (
              results.map((t, i) => <BusCard key={t.id} trip={t} index={i} onBook={book} />)
            )}
          </div>
        </section>
      </div>

      {/* mobile drawer */}
      <AnimatePresence>
        {drawer && (
          <div className="fixed inset-0 z-[90] lg:hidden" role="dialog" aria-modal="true" aria-label="Filters">
            <motion.div className="absolute inset-0 bg-slate-900/50" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setDrawer(false)} />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              className="absolute inset-x-0 bottom-0 flex max-h-[85vh] flex-col rounded-t-3xl bg-white"
            >
              <div className="flex items-center justify-between border-b border-gray-100 p-4">
                <h2 className="text-lg font-bold">Filters</h2>
                <button onClick={() => setDrawer(false)} aria-label="Close filters" className="inline-flex h-11 w-11 items-center justify-center rounded-full hover:bg-card">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-4">
                <FilterPanel f={f} setF={setF} operators={operators} />
              </div>
              <div className="grid grid-cols-2 gap-3 border-t border-gray-100 p-4">
                <Button variant="outline" onClick={() => setF(EMPTY)}>
                  Clear
                </Button>
                <Button onClick={() => setDrawer(false)}>Show {results?.length ?? 0} buses</Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </PageTransition>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="container-app space-y-4 py-10">{[0, 1, 2].map((i) => <BusCardSkeleton key={i} />)}</div>}>
      <SearchInner />
    </Suspense>
  );
}
