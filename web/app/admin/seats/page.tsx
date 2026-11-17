'use client';
// Seat-layout editor: choose a bus, multi-select seats, toggle ladies / window / disabled, set price, save.
import { motion } from 'framer-motion';
import { Armchair, BedSingle, CheckSquare, Save, Square } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { mockAdmin } from '@/components/account/mock';
import { Btn, Field, Panel, SelectField, Skel, ToastHost, TabBar, cx, useToaster } from '@/components/account/ui';
import { callApi, inr, useApi } from '@/components/account/useApi';
import type { Row } from '@/components/admin/CrudTable';

interface EdSeat {
  id: number; seatNumber: string; kind: string; deck: 'LOWER' | 'UPPER'; row: number; col: number;
  isWindow: boolean; isLadies: boolean; price: number; status: string; disabled?: boolean;
}
interface EdLayout { tripId: number; seats: EdSeat[]; rows: number; cols: number; hasUpperDeck: boolean }

/** Local layout generator matching the contract numbering rules (fallback when API has none). */
function genLayout(busId: number, busType: string, total: number): EdLayout {
  const sleeper = /SLEEPER/.test(busType) && !/SEMI/.test(busType);
  const seats: EdSeat[] = [];
  if (sleeper) {
    const per = Math.ceil(total / 2), rows = Math.ceil(per / 3);
    (['LOWER', 'UPPER'] as const).forEach(deck => {
      let n = 1;
      for (let r = 0; r < rows; r++) for (const c of [0, 2, 3]) {
        if (n > per) break;
        seats.push({ id: seats.length + 1, seatNumber: `${deck === 'LOWER' ? 'LS' : 'US'}${n++}`, kind: deck === 'LOWER' ? 'LOWER_SLEEPER' : 'UPPER_SLEEPER', deck, row: r, col: c, isWindow: c !== 2, isLadies: false, price: deck === 'LOWER' ? 1199 : 1099, status: 'AVAILABLE' });
      }
    });
    return { tripId: busId, seats, rows, cols: 4, hasUpperDeck: true };
  }
  const rows = Math.ceil(total / 4);
  let n = 1;
  for (let r = 0; r < rows; r++) for (const c of [0, 1, 3, 4]) {
    if (n > total) break;
    seats.push({ id: n, seatNumber: `D${n++}`, kind: 'PUSH_BACK', deck: 'LOWER', row: r, col: c, isWindow: c === 0 || c === 4, isLadies: false, price: 799, status: 'AVAILABLE' });
  }
  return { tripId: busId, seats, rows, cols: 5, hasUpperDeck: false };
}

export default function SeatsPage() {
  return <ToastHost><SeatsInner /></ToastHost>;
}

function SeatsInner() {
  const toast = useToaster();
  const buses = useApi<Row[]>('admin.list', ['buses'], () => mockAdmin.buses);
  const [busId, setBusId] = useState<number | null>(null);
  const bus = buses.data?.find(b => Number(b.id) === busId);
  const [layout, setLayout] = useState<EdLayout | null>(null);
  const [loading, setLoading] = useState(false);
  const [deck, setDeck] = useState<'LOWER' | 'UPPER'>('LOWER');
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [price, setPrice] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (busId == null && buses.data?.length) setBusId(Number(buses.data[0].id)); }, [buses.data, busId]);

  // Load layout whenever the bus changes.
  useEffect(() => {
    if (busId == null) return;
    let alive = true;
    setLoading(true); setSel(new Set()); setDeck('LOWER');
    const fb = () => genLayout(busId, String(bus?.busType ?? 'AC_SEATER'), Number(bus?.totalSeats ?? 40));
    callApi<EdLayout>('admin.getBusSeats', [busId], fb).then(l => {
      if (!alive) return;
      setLayout(l?.seats?.length ? { ...l, seats: l.seats.map(s => ({ ...s, disabled: s.disabled ?? s.status === 'LOCKED' })) } : fb());
      setLoading(false);
    });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busId]);

  const deckSeats = useMemo(() => (layout?.seats ?? []).filter(s => s.deck === deck), [layout, deck]);
  const maxRow = Math.max(0, ...deckSeats.map(s => s.row));
  const maxCol = Math.max(0, ...deckSeats.map(s => s.col));

  const toggleSel = (n: string) => setSel(s => { const x = new Set(s); if (x.has(n)) x.delete(n); else x.add(n); return x; });
  const patch = (fn: (s: EdSeat) => Partial<EdSeat>) => setLayout(l => l && { ...l, seats: l.seats.map(s => (sel.has(s.seatNumber) ? { ...s, ...fn(s) } : s)) });
  const selected = (layout?.seats ?? []).filter(s => sel.has(s.seatNumber));
  const allOn = (k: 'isLadies' | 'isWindow' | 'disabled') => selected.length > 0 && selected.every(s => !!s[k]);

  const save = async () => {
    if (!layout || busId == null) return;
    setSaving(true);
    const body = { ...layout, seats: layout.seats.map(s => ({ ...s, status: s.disabled ? 'LOCKED' : 'AVAILABLE' })) };
    await callApi('admin.updateBusSeats', [busId, body], () => body);
    setSaving(false);
    toast('Seat layout saved');
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">Seat layout</h1>
          <p className="text-sm text-slate-500">Select seats, then toggle attributes or set a price.</p>
        </div>
        <Btn onClick={save} loading={saving} disabled={!layout}><Save size={16} /> Save layout</Btn>
      </div>

      <Panel className="flex flex-wrap items-end gap-3">
        {buses.loading ? <Skel className="h-11 w-64" /> : (
          <SelectField label="Bus" className="min-w-[260px]" value={busId ?? ''} onChange={e => setBusId(Number(e.target.value))}
            options={(buses.data ?? []).map(b => ({ value: String(b.id), label: `${b.busName ?? b.name} · ${b.busNumber}` }))} />
        )}
        {layout?.hasUpperDeck && (
          <div className="w-64"><TabBar label="Deck" value={deck} onChange={setDeck} tabs={[{ value: 'LOWER', label: 'Lower deck' }, { value: 'UPPER', label: 'Upper deck' }]} /></div>
        )}
        <div className="ml-auto flex flex-wrap gap-3 text-xs text-slate-600" aria-label="Legend">
          <span className="flex items-center gap-1"><i className="h-3 w-3 rounded bg-[#22C55E]" /> Available</span>
          <span className="flex items-center gap-1"><i className="h-3 w-3 rounded bg-[#EC4899]" /> Ladies</span>
          <span className="flex items-center gap-1"><i className="h-3 w-3 rounded bg-[#9CA3AF]" /> Disabled</span>
          <span className="flex items-center gap-1"><i className="h-3 w-3 rounded bg-[#2563EB]" /> Selected</span>
        </div>
      </Panel>

      <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
        {/* Visual layout */}
        <Panel>
          {loading || !layout ? <Skel className="h-96" /> : (
            <div className="mx-auto w-fit rounded-3xl border-2 border-slate-200 bg-slate-50 p-4">
              <div className="mb-3 flex justify-end"><span className="rounded-lg bg-slate-200 px-2 py-1 text-xs font-semibold text-slate-600" aria-hidden>Driver</span></div>
              <div role="grid" aria-label={`${deck.toLowerCase()} deck seats`} className="grid gap-2"
                style={{ gridTemplateColumns: `repeat(${maxCol + 1}, minmax(44px, 52px))`, gridTemplateRows: `repeat(${maxRow + 1}, auto)` }}>
                {deckSeats.map(s => {
                  const on = sel.has(s.seatNumber);
                  const sleeper = /SLEEPER/.test(s.kind);
                  return (
                    <motion.button key={s.seatNumber} role="gridcell" aria-selected={on} whileTap={{ scale: 0.92 }}
                      aria-label={`Seat ${s.seatNumber}${s.isWindow ? ', window' : ''}${s.isLadies ? ', ladies' : ''}${s.disabled ? ', disabled' : ''}, ${inr(s.price)}`}
                      onClick={() => toggleSel(s.seatNumber)}
                      style={{ gridColumn: s.col + 1, gridRow: s.row + 1, background: on ? '#2563EB' : s.disabled ? '#9CA3AF' : s.isLadies ? '#EC4899' : '#22C55E' }}
                      className={cx('relative flex flex-col items-center justify-center rounded-xl text-[10px] font-bold text-white shadow-sm transition',
                        sleeper ? 'min-h-[84px]' : 'min-h-[48px]', on && 'ring-4 ring-blue-200')}>
                      {sleeper ? <BedSingle size={14} /> : <Armchair size={14} />}
                      {s.seatNumber}
                      <span className="font-medium opacity-90">₹{s.price}</span>
                      {s.isWindow && <span className="absolute -left-1 top-1/2 h-4 w-1 -translate-y-1/2 rounded bg-sky-400" aria-hidden />}
                    </motion.button>
                  );
                })}
              </div>
            </div>
          )}
        </Panel>

        {/* Inspector */}
        <Panel className="h-fit space-y-4 lg:sticky lg:top-20">
          <div className="flex items-center justify-between">
            <h2 className="font-bold">{selected.length ? `${selected.length} seat${selected.length > 1 ? 's' : ''} selected` : 'No seats selected'}</h2>
            <div className="flex gap-1">
              <Btn variant="ghost" className="px-2" onClick={() => setSel(new Set(deckSeats.map(s => s.seatNumber)))}>All</Btn>
              <Btn variant="ghost" className="px-2" onClick={() => setSel(new Set())}>Clear</Btn>
            </div>
          </div>
          {selected.length > 0 && <p className="text-xs text-slate-500">{selected.map(s => s.seatNumber).join(', ')}</p>}
          {([['isLadies', 'Ladies seat'], ['isWindow', 'Window seat'], ['disabled', 'Disabled (not bookable)']] as const).map(([k, label]) => {
            const on = allOn(k);
            return (
              <button key={k} disabled={!selected.length} onClick={() => patch(() => ({ [k]: !on }))} aria-pressed={on}
                className="flex min-h-[44px] w-full items-center justify-between rounded-xl bg-slate-50 px-3 text-sm font-medium disabled:opacity-40">
                {label} {on ? <CheckSquare size={18} className="text-indigo-600" /> : <Square size={18} className="text-slate-400" />}
              </button>
            );
          })}
          <form className="flex items-end gap-2" onSubmit={e => { e.preventDefault(); const p = Number(price); if (p > 0) { patch(() => ({ price: p })); setPrice(''); } }}>
            <Field label="Set price (₹)" type="number" min={1} value={price} onChange={e => setPrice(e.target.value)} className="flex-1" />
            <Btn type="submit" disabled={!selected.length || !(Number(price) > 0)}>Apply</Btn>
          </form>
          {layout && (
            <dl className="grid grid-cols-2 gap-2 rounded-xl bg-slate-50 p-3 text-xs">
              <dt className="text-slate-500">Total seats</dt><dd className="text-right font-semibold">{layout.seats.length}</dd>
              <dt className="text-slate-500">Ladies</dt><dd className="text-right font-semibold">{layout.seats.filter(s => s.isLadies).length}</dd>
              <dt className="text-slate-500">Window</dt><dd className="text-right font-semibold">{layout.seats.filter(s => s.isWindow).length}</dd>
              <dt className="text-slate-500">Disabled</dt><dd className="text-right font-semibold">{layout.seats.filter(s => s.disabled).length}</dd>
            </dl>
          )}
        </Panel>
      </div>
    </div>
  );
}
