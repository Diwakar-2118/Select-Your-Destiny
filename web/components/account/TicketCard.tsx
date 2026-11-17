'use client';
// Booking ticket card with Track / Download / Cancel / Reschedule actions + their modals.
import { motion } from 'framer-motion';
import { ArrowRight, Bus, CalendarClock, Download, MapPin, Navigation, RotateCcw, XCircle } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { mockTrips } from './mock';
import type { Booking, Trip } from './types';
import { API_BASE, callApi, fmtDate, inr } from './useApi';
import { Btn, Dialog, Field, Pill, Skel, cx, statusTone, useToaster } from './ui';

/** Simple refund policy (client-side preview): >24h 90%, 12–24h 75%, else 50%. */
export function refundFor(b: Booking) {
  const dep = new Date(`${b.trip.journeyDate}T${b.trip.departureTime || '00:00'}`);
  const hrs = (dep.getTime() - Date.now()) / 36e5;
  const pct = hrs > 24 ? 0.9 : hrs > 12 ? 0.75 : 0.5;
  const amount = +(b.fare.grandTotal * pct).toFixed(2);
  return { pct: Math.round(pct * 100), amount, fee: +(b.fare.grandTotal - amount).toFixed(2) };
}

/** Client-side printable ticket used when the PDF endpoint is unavailable. */
function printTicket(b: Booking) {
  const w = window.open('', '_blank', 'width=720,height=900');
  if (!w) return;
  const rows = b.passengers.map(p => `<tr><td>${p.name}</td><td>${p.age}</td><td>${p.gender}</td><td>${p.seatNumber}</td></tr>`).join('');
  w.document.write(`<!doctype html><html><head><title>${b.bookingRef}</title><style>
  body{font-family:system-ui,sans-serif;color:#0F172A;padding:32px}.hd{background:linear-gradient(135deg,#2563EB,#6D28D9 60%,#F97316);color:#fff;padding:20px;border-radius:16px}
  table{width:100%;border-collapse:collapse;margin-top:16px}td,th{border-bottom:1px solid #e2e8f0;padding:8px;text-align:left}.g{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:16px}
  </style></head><body><div class="hd"><h2 style="margin:0">Select Your Destiny</h2><div>Book Smart. Travel Comfortably.</div></div>
  <div class="g"><div><b>Booking</b><br/>${b.bookingRef}</div><div><b>PNR</b><br/>${b.pnr}</div>
  <div><b>From</b><br/>${b.trip.fromCity} – ${b.boardingPoint?.name ?? ''} (${b.trip.departureTime})</div><div><b>To</b><br/>${b.trip.toCity} – ${b.droppingPoint?.name ?? ''} (${b.trip.arrivalTime})</div>
  <div><b>Date</b><br/>${b.trip.journeyDate}</div><div><b>Bus</b><br/>${b.trip.operatorName} · ${b.trip.busNumber}</div></div>
  <table><tr><th>Passenger</th><th>Age</th><th>Gender</th><th>Seat</th></tr>${rows}</table>
  <h3 style="text-align:right">Total paid: ₹${b.fare.grandTotal}</h3><script>window.onload=()=>window.print()</script></body></html>`);
  w.document.close();
}

/** Try the authenticated PDF endpoint first; fall back to client-side print. */
async function downloadTicket(b: Booking, token: string | null) {
  try {
    // Mock-mode tokens ("mock.*") are not valid for the backend, so skip the header for them.
    const auth = token && !token.startsWith('mock.') ? { Authorization: `Bearer ${token}` } : undefined;
    const res = await fetch(`${API_BASE}/bookings/${b.id}/ticket.pdf`, { headers: auth });
    if (!res.ok || !res.headers.get('content-type')?.includes('pdf')) throw new Error('no pdf');
    const url = URL.createObjectURL(await res.blob());
    const a = document.createElement('a');
    a.href = url; a.download = `${b.bookingRef}.pdf`; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  } catch {
    printTicket(b);
  }
}

export function TicketCard({ booking: b, token, onChanged, index = 0 }: { booking: Booking; token: string | null; onChanged: (b: Booking) => void; index?: number }) {
  const [cancelOpen, setCancelOpen] = useState(false);
  const [resOpen, setResOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const toast = useToaster();
  const upcoming = b.status === 'CONFIRMED' || b.status === 'PENDING';
  const refund = refundFor(b);

  const doCancel = async () => {
    setBusy(true);
    const updated = await callApi<Booking>('cancelBooking', [b.id], () => ({ ...b, status: 'CANCELLED', paymentStatus: 'REFUNDED' }));
    setBusy(false); setCancelOpen(false);
    onChanged({ ...b, ...updated, status: 'CANCELLED' });
    toast(`Ticket cancelled. ${inr(refund.amount)} refunded to wallet.`);
  };

  return (
    <motion.article
      initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }}
      className="group overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-[0_4px_24px_-8px_rgba(15,23,42,0.08)] transition hover:shadow-xl"
      aria-label={`Booking ${b.bookingRef} from ${b.trip.fromCity} to ${b.trip.toCity}`}
    >
      <div className="h-1.5 w-full gradient-brand" style={{ background: 'linear-gradient(90deg,#2563EB,#6D28D9 60%,#F97316)' }} />
      <div className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
              <span>{b.bookingRef}</span><span aria-hidden>•</span><span>PNR {b.pnr}</span>
            </div>
            <h3 className="mt-1 flex items-center gap-2 text-lg font-bold text-slate-900">
              {b.trip.fromCity} <ArrowRight size={16} className="text-indigo-500" aria-label="to" /> {b.trip.toCity}
            </h3>
            <p className="flex items-center gap-1.5 text-sm text-slate-500"><Bus size={14} /> {b.trip.operatorName} · {b.trip.busNumber}</p>
          </div>
          <Pill tone={statusTone(b.status)}>{b.status}</Pill>
        </div>

        {/* Journey timeline */}
        <div className="mt-4 grid grid-cols-[1fr_auto_1fr] items-center gap-3 rounded-2xl bg-slate-50 p-4">
          <div>
            <p className="text-xl font-extrabold text-slate-900">{b.trip.departureTime}</p>
            <p className="flex items-center gap-1 truncate text-xs text-slate-500"><MapPin size={12} />{b.boardingPoint?.name}</p>
          </div>
          <div className="flex flex-col items-center text-xs text-slate-400">
            <span>{fmtDate(b.trip.journeyDate)}</span>
            <span className="my-1 h-px w-16 bg-gradient-to-r from-blue-500 via-violet-600 to-orange-500" />
            <span>{Math.floor(b.trip.durationMins / 60)}h {b.trip.durationMins % 60}m</span>
          </div>
          <div className="text-right">
            <p className="text-xl font-extrabold text-slate-900">{b.trip.arrivalTime}</p>
            <p className="flex items-center justify-end gap-1 truncate text-xs text-slate-500"><MapPin size={12} />{b.droppingPoint?.name}</p>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-sm">
          <span className="text-slate-600">Seats <b className="text-slate-900">{b.seatNumbers.join(', ')}</b> · {b.passengers.length} passenger{b.passengers.length > 1 ? 's' : ''}</span>
          <span className="text-lg font-extrabold text-slate-900">{inr(b.fare.grandTotal)}</span>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {upcoming && (
            <Link href={`/track/${b.id}`} className="inline-flex min-h-[44px] items-center gap-2 rounded-2xl px-4 text-sm font-semibold text-white shadow-md focus-visible:ring-2 focus-visible:ring-indigo-500"
              style={{ background: 'linear-gradient(135deg,#2563EB 0%,#6D28D9 60%,#F97316 100%)' }}>
              <Navigation size={16} /> Track Bus
            </Link>
          )}
          <Btn variant="outline" onClick={() => downloadTicket(b, token)} aria-label={`Download ticket ${b.bookingRef}`}><Download size={16} /> Download Ticket</Btn>
          {upcoming && <Btn variant="outline" onClick={() => setResOpen(true)}><RotateCcw size={16} /> Reschedule</Btn>}
          {upcoming && <Btn variant="danger" onClick={() => setCancelOpen(true)}><XCircle size={16} /> Cancel Ticket</Btn>}
        </div>
      </div>

      {/* Cancel confirm */}
      <Dialog open={cancelOpen} onClose={() => setCancelOpen(false)} title="Cancel ticket?"
        footer={<><Btn variant="secondary" onClick={() => setCancelOpen(false)}>Keep ticket</Btn><Btn variant="danger" loading={busy} onClick={doCancel}>Confirm cancellation</Btn></>}>
        <p className="text-sm text-slate-600">You are cancelling <b>{b.bookingRef}</b> ({b.trip.fromCity} → {b.trip.toCity}, {fmtDate(b.trip.journeyDate)}).</p>
        <dl className="mt-4 space-y-2 rounded-2xl bg-slate-50 p-4 text-sm">
          <div className="flex justify-between"><dt className="text-slate-500">Amount paid</dt><dd className="font-semibold">{inr(b.fare.grandTotal)}</dd></div>
          <div className="flex justify-between"><dt className="text-slate-500">Cancellation charges</dt><dd className="font-semibold text-red-600">− {inr(refund.fee)}</dd></div>
          <div className="flex justify-between border-t border-slate-200 pt-2"><dt className="font-bold">Refund to wallet ({refund.pct}%)</dt><dd className="text-lg font-extrabold text-emerald-600">{inr(refund.amount)}</dd></div>
        </dl>
      </Dialog>

      <RescheduleDialog open={resOpen} onClose={() => setResOpen(false)} booking={b} onDone={nb => { onChanged(nb); toast('Journey rescheduled successfully'); }} />
    </motion.article>
  );
}

/** Pick a new date → list trips on the same route → confirm reschedule. */
function RescheduleDialog({ open, onClose, booking: b, onDone }: { open: boolean; onClose: () => void; booking: Booking; onDone: (b: Booking) => void }) {
  const tomorrow = new Date(Date.now() + 864e5).toISOString().slice(0, 10);
  const [date, setDate] = useState(tomorrow);
  const [trips, setTrips] = useState<Trip[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [picked, setPicked] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  const search = async () => {
    setLoading(true); setPicked(null);
    const q = { from: b.trip.fromCity, to: b.trip.toCity, date };
    const res = await callApi<Trip[]>('searchTrips', [q], () => mockTrips(date, b.trip.fromCity, b.trip.toCity));
    setTrips(Array.isArray(res) ? res : []);
    setLoading(false);
  };

  const confirm = async () => {
    const t = trips?.find(x => x.id === picked);
    if (!t) return;
    setSaving(true);
    // lib/api signature: reschedule(id, newTripId, seatNumbers)
    const nb = await callApi<Booking>('reschedule', [b.id, t.id, b.seatNumbers],() => ({ ...b, trip: { ...t, boardingPoints: [], droppingPoints: [] } }));
    setSaving(false);
    onDone({ ...b, ...nb });
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} title="Reschedule journey" wide
      footer={<><Btn variant="secondary" onClick={onClose}>Close</Btn><Btn disabled={!picked} loading={saving} onClick={confirm}><CalendarClock size={16} /> Confirm reschedule</Btn></>}>
      <p className="text-sm text-slate-600">{b.trip.fromCity} → {b.trip.toCity} · Seats {b.seatNumbers.join(', ')}</p>
      <div className="mt-3 flex flex-wrap items-end gap-2">
        <Field label="New journey date" type="date" min={tomorrow} value={date} onChange={e => setDate(e.target.value)} className="flex-1" />
        <Btn onClick={search} loading={loading}>Find buses</Btn>
      </div>
      <div className="mt-4 space-y-2" role="radiogroup" aria-label="Available buses">
        {loading && [0, 1, 2].map(i => <Skel key={i} className="h-16" />)}
        {!loading && trips?.length === 0 && <p className="text-sm text-slate-500">No buses on this date. Try another date.</p>}
        {!loading && trips?.map(t => (
          <button key={t.id} role="radio" aria-checked={picked === t.id} onClick={() => setPicked(t.id)}
            className={cx('flex min-h-[44px] w-full items-center justify-between rounded-2xl border p-3 text-left transition',
              picked === t.id ? 'border-indigo-500 bg-indigo-50 ring-2 ring-indigo-200' : 'border-slate-200 hover:border-indigo-300')}>
            <div>
              <p className="font-semibold text-slate-900">{t.operatorName}</p>
              <p className="text-xs text-slate-500">{t.departureTime} → {t.arrivalTime} · {t.availableSeats} seats left</p>
            </div>
            <span className="font-bold">{inr(t.fare)}</span>
          </button>
        ))}
      </div>
    </Dialog>
  );
}
