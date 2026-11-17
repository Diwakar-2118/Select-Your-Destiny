'use client';
// Live bus tracking: Google Maps embed (if key configured) or SVG route fallback, polled every 10s.
import { motion } from 'framer-motion';
import { Bus, Clock, Gauge, Navigation, Phone, RefreshCw, User } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { RouteMap } from '@/components/account/RouteMap';
import { mockBookings, mockTracking } from '@/components/account/mock';
import type { Booking, TrackingInfo } from '@/components/account/types';
import { Btn, GRADIENT, PageShell, Panel, Skel } from '@/components/account/ui';
import { useApi } from '@/components/account/useApi';

const MAPS_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY;
const POLL_MS = 10_000;

/** Mock tracking that advances with wall-clock time so the demo visibly moves. */
function simulated(id: number): TrackingInfo {
  const base = mockTracking(id);
  const p = ((Date.now() / 1000) % 900) / 900; // loops every 15 min
  return {
    ...base,
    lat: 12.9716 + (13.0827 - 12.9716) * p,
    lng: 77.5946 + (80.2707 - 77.5946) * p,
    etaMins: Math.max(1, Math.round(360 * (1 - p))),
    speedKmph: 48 + Math.round(Math.random() * 30),
    lastUpdated: new Date().toISOString(),
  };
}

export default function TrackPage() {
  const params = useParams<{ id: string }>();
  const id = Number(params?.id ?? 0);
  const booking = useApi<Booking>('getBooking', [id], () => mockBookings.find(b => b.id === id) ?? mockBookings[0]);
  const track = useApi<TrackingInfo>('getTracking', [id], () => simulated(id), { pollMs: POLL_MS });
  const t = track.data;
  const trip = booking.data?.trip;
  const total = trip?.durationMins || 360;
  const progress = t ? Math.min(0.98, Math.max(0.02, 1 - t.etaMins / total)) : 0;
  const from = trip?.fromCity ?? 'Origin';
  const to = trip?.toCity ?? 'Destination';

  const stats = t ? [
    { icon: <Clock size={18} />, label: 'ETA', value: t.etaMins >= 60 ? `${Math.floor(t.etaMins / 60)}h ${t.etaMins % 60}m` : `${t.etaMins} min` },
    { icon: <Gauge size={18} />, label: 'Speed', value: `${t.speedKmph} km/h` },
    { icon: <Bus size={18} />, label: 'Bus number', value: t.busNumber },
  ] : [];

  return (
    <PageShell title="Live Tracking" subtitle={`${from} → ${to}${booking.data ? ` · ${booking.data.bookingRef}` : ''}`} icon={<Navigation />}
      actions={<span className="inline-flex items-center gap-2 rounded-full bg-white/20 px-3 py-1 text-xs font-semibold"><span className="h-2 w-2 animate-pulse rounded-full bg-emerald-300" /> Live · refreshes every 10s</span>}>
      <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
        {/* Map */}
        <Panel className="relative overflow-hidden p-0">
          <div className="aspect-[16/10] w-full">
            {!t ? <Skel className="h-full w-full rounded-none" /> : MAPS_KEY ? (
              <iframe
                title="Live bus location on Google Maps"
                className="h-full w-full border-0"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                src={`https://www.google.com/maps/embed/v1/place?key=${encodeURIComponent(MAPS_KEY)}&q=${t.lat},${t.lng}&zoom=11`}
              />
            ) : (
              <RouteMap progress={progress} from={from} to={to} />
            )}
          </div>
          <div className="absolute left-3 top-3 rounded-xl bg-white/80 px-3 py-1.5 text-xs font-medium text-slate-600 shadow backdrop-blur glass">
            Updated {t ? new Date(t.lastUpdated).toLocaleTimeString('en-IN') : '…'}
          </div>
        </Panel>

        {/* Details */}
        <div className="space-y-4">
          <Panel>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Journey progress</p>
            <div className="mt-2 h-3 overflow-hidden rounded-full bg-slate-100" role="progressbar" aria-valuenow={Math.round(progress * 100)} aria-valuemin={0} aria-valuemax={100} aria-label="Journey progress">
              <motion.div className="h-full rounded-full" style={{ background: GRADIENT }} animate={{ width: `${progress * 100}%` }} transition={{ duration: 1 }} />
            </div>
            <div className="mt-1 flex justify-between text-xs text-slate-500"><span>{from}</span><span>{Math.round(progress * 100)}%</span><span>{to}</span></div>
          </Panel>

          <div className="grid grid-cols-3 gap-3 lg:grid-cols-1">
            {track.loading && !t ? [0, 1, 2].map(i => <Skel key={i} className="h-20" />) : stats.map(s => (
              <Panel key={s.label} className="flex flex-col gap-1 p-4 lg:flex-row lg:items-center lg:gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-indigo-50 text-indigo-600">{s.icon}</span>
                <div><p className="text-xs text-slate-500">{s.label}</p><p className="font-bold text-slate-900">{s.value}</p></div>
              </Panel>
            ))}
          </div>

          {t && (
            <Panel className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="grid h-12 w-12 place-items-center rounded-2xl text-white" style={{ background: GRADIENT }}><User /></span>
                <div><p className="text-xs text-slate-500">Your driver</p><p className="font-bold text-slate-900">{t.driverName}</p></div>
              </div>
              <a href={`tel:${t.driverPhone}`} aria-label={`Call driver ${t.driverName}`}
                className="inline-flex min-h-[44px] items-center gap-2 rounded-2xl bg-emerald-500 px-4 text-sm font-semibold text-white shadow hover:bg-emerald-600">
                <Phone size={16} /> Call
              </a>
            </Panel>
          )}

          <div className="flex gap-2">
            <Btn variant="outline" onClick={track.reload} className="flex-1"><RefreshCw size={16} /> Refresh now</Btn>
            <Link href="/bookings" className="flex-1"><Btn variant="secondary" className="w-full">My bookings</Btn></Link>
          </div>
        </div>
      </div>
    </PageShell>
  );
}
