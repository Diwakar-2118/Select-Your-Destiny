'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, Clock, Info, MapPin, Star } from 'lucide-react';
import { ApiError, api, errorMessage } from '@/lib/api';
import { useAuth, useBooking } from '@/lib/store';
import type { Point, Seat, SeatLayout, Trip } from '@/lib/types';
import { BUS_TYPE_LABEL, cn, computeFare, formatDate, formatDuration, inr } from '@/lib/utils';
import { Button, Card, PageTransition, Skeleton, Tabs, useToast } from '@/components/ui';
import { SeatDeck, SeatLegend } from '@/components/booking/SeatMap';
import { BookingSteps } from '@/components/booking/BookingSteps';

const MAX_SEATS = 6;

function PointPicker({ title, points, value, onChange, name }: { title: string; points: Point[]; value: Point | null; onChange: (p: Point) => void; name: string }) {
  return (
    <fieldset>
      <legend className="mb-2 text-sm font-bold text-ink">{title}</legend>
      <div className="space-y-2">
        {points.map((p) => (
          <label
            key={p.id}
            className={cn(
              'flex min-h-[56px] cursor-pointer items-start gap-3 rounded-2xl border p-3 transition',
              value?.id === p.id ? 'border-primary bg-primary-50' : 'border-gray-200 hover:border-primary/50',
            )}
          >
            <input type="radio" name={name} className="mt-1 h-5 w-5 accent-primary" checked={value?.id === p.id} onChange={() => onChange(p)} />
            <span className="flex-1">
              <span className="flex items-center justify-between gap-2">
                <span className="font-semibold text-ink">{p.name}</span>
                <span className="text-sm font-bold text-primary">{p.time}</span>
              </span>
              <span className="mt-0.5 block text-xs text-muted">{p.address}</span>
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export default function SeatsPage() {
  const { id } = useParams<{ id: string }>();
  const tripId = Number(id);
  const router = useRouter();
  const toast = useToast();
  const { isAuthenticated } = useAuth();
  const booking = useBooking();
  const [trip, setTrip] = useState<Trip | null>(booking.trip?.id === tripId ? booking.trip : null);
  const [layout, setLayout] = useState<SeatLayout | null>(null);
  const [deck, setDeck] = useState<'LOWER' | 'UPPER'>('LOWER');
  const [selected, setSelected] = useState<Seat[]>([]);
  const [boarding, setBoarding] = useState<Point | null>(null);
  const [dropping, setDropping] = useState<Point | null>(null);
  const [mobileTab, setMobileTab] = useState('seats');
  const [locking, setLocking] = useState(false);

  const load = useCallback(async () => {
    try {
      const [t, l] = await Promise.all([booking.trip?.id === tripId ? Promise.resolve(booking.trip) : api.getTrip(tripId), api.getSeatLayout(tripId)]);
      setTrip(t);
      setLayout(l);
      if (booking.trip?.id !== tripId) booking.selectTrip(t);
    } catch (e) {
      toast.error(errorMessage(e));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tripId]);

  useEffect(() => {
    void load();
  }, [load]);

  // restore previous selection from store
  useEffect(() => {
    if (!booking.hydrated || !layout) return;
    if (booking.trip?.id === tripId) {
      const nums = booking.seats.map((s) => s.seatNumber);
      setSelected(layout.seats.filter((s) => nums.includes(s.seatNumber) && s.status === 'AVAILABLE'));
      setBoarding(booking.boardingPoint);
      setDropping(booking.droppingPoint);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [booking.hydrated, layout]);

  useEffect(() => {
    if (trip && !boarding) setBoarding(trip.boardingPoints[0] ?? null);
    if (trip && !dropping) setDropping(trip.droppingPoints[trip.droppingPoints.length - 1] ?? null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trip]);

  const toggle = (seat: Seat) => {
    setSelected((cur) => {
      if (cur.some((s) => s.seatNumber === seat.seatNumber)) return cur.filter((s) => s.seatNumber !== seat.seatNumber);
      if (cur.length >= MAX_SEATS) {
        toast.error(`You can select up to ${MAX_SEATS} seats per booking`);
        return cur;
      }
      if (seat.isLadies) toast.info(`${seat.seatNumber} is reserved for female passengers`);
      return [...cur, seat];
    });
  };

  const fare = useMemo(() => computeFare(selected, trip?.discountPercent ?? 0), [selected, trip]);
  const seatNums = selected.map((s) => s.seatNumber);

  const proceed = async () => {
    if (!trip || !layout) return;
    if (!selected.length) return toast.error('Please select at least one seat');
    if (!boarding || !dropping) {
      setMobileTab('points');
      return toast.error('Please choose boarding and dropping points');
    }
    booking.update({ seats: selected, boardingPoint: boarding, droppingPoint: dropping });
    if (!isAuthenticated) {
      toast.info('Please login to continue booking');
      router.push(`/login?next=${encodeURIComponent(`/trip/${tripId}/seats`)}`);
      return;
    }
    setLocking(true);
    try {
      if (booking.lock && booking.trip?.id === tripId && booking.seats.length) {
        await api.releaseSeats(tripId, booking.seats.map((s) => s.seatNumber)).catch(() => undefined);
      }
      const lock = await api.lockSeats(tripId, seatNums);
      booking.update({ lock, seats: selected, boardingPoint: boarding, droppingPoint: dropping });
      toast.success(`Seats ${seatNums.join(', ')} held for 10 minutes`);
      router.push('/passengers');
    } catch (e) {
      if (e instanceof ApiError && e.status === 409) {
        toast.error('Some seats were just taken. Refreshing seat map…');
        setSelected([]);
        void load();
      } else if (e instanceof ApiError && e.status === 401) {
        router.push(`/login?next=${encodeURIComponent(`/trip/${tripId}/seats`)}`);
      } else toast.error(errorMessage(e));
    } finally {
      setLocking(false);
    }
  };

  return (
    <PageTransition className="container-app py-6 pb-40 lg:pb-10">
      <button onClick={() => router.back()} className="mb-4 inline-flex min-h-[44px] items-center gap-2 text-sm font-semibold text-muted hover:text-ink">
        <ArrowLeft className="h-4 w-4" /> Back to results
      </button>
      <BookingSteps current={0} />

      {/* trip header */}
      {trip ? (
        <Card variant="default" className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-extrabold text-ink">{trip.operatorName}</h1>
            <p className="text-sm text-muted">
              {trip.busName} · {BUS_TYPE_LABEL[trip.busType]} ·{' '}
              <span className="inline-flex items-center gap-0.5 font-semibold text-green-700">
                <Star className="h-3.5 w-3.5 fill-green-600" /> {trip.rating}
              </span>
            </p>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <div className="text-right">
              <p className="font-extrabold">{trip.departureTime}</p>
              <p className="text-muted">{trip.fromCity}</p>
            </div>
            <div className="flex flex-col items-center text-xs text-muted">
              <Clock className="h-4 w-4" /> {formatDuration(trip.durationMins)}
            </div>
            <div>
              <p className="font-extrabold">{trip.arrivalTime}</p>
              <p className="text-muted">{trip.toCity}</p>
            </div>
            <span className="hidden rounded-xl bg-white px-3 py-2 font-semibold sm:inline">{formatDate(trip.journeyDate)}</span>
          </div>
        </Card>
      ) : (
        <Skeleton className="mb-6 h-24" />
      )}

      <Tabs
        className="mb-4 lg:hidden"
        fullWidth
        value={mobileTab}
        onChange={setMobileTab}
        ariaLabel="Booking step"
        tabs={[
          { id: 'seats', label: 'Select seats' },
          { id: 'points', label: 'Boarding & drop' },
        ]}
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <div className="space-y-6">
          {/* seat map */}
          <section className={cn(mobileTab !== 'seats' && 'hidden lg:block')} aria-labelledby="seat-h">
            <Card padding="lg">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <h2 id="seat-h" className="text-lg font-bold">
                  Select your seats <span className="text-sm font-medium text-muted">(max {MAX_SEATS})</span>
                </h2>
                {layout?.hasUpperDeck && (
                  <div role="radiogroup" aria-label="Deck" className="inline-flex rounded-2xl bg-card p-1 sm:hidden">
                    {(['LOWER', 'UPPER'] as const).map((d) => (
                      <button
                        key={d}
                        role="radio"
                        aria-checked={deck === d}
                        onClick={() => setDeck(d)}
                        className={cn('min-h-[40px] rounded-xl px-4 text-sm font-semibold', deck === d ? 'bg-white text-primary-700 shadow-soft' : 'text-muted')}
                      >
                        {d === 'LOWER' ? 'Lower' : 'Upper'}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <SeatLegend />
              <div className="mt-5 overflow-x-auto pb-2">
                {!layout ? (
                  <div className="flex gap-6">
                    <Skeleton className="h-[480px] w-60" />
                    <Skeleton className="hidden h-[480px] w-60 sm:block" />
                  </div>
                ) : (
                  <div className="flex flex-wrap justify-center gap-6 lg:justify-start">
                    <div className={cn(layout.hasUpperDeck && deck !== 'LOWER' && 'hidden sm:block')}>
                      <SeatDeck layout={layout} deck="LOWER" selected={seatNums} onToggle={toggle} />
                    </div>
                    {layout.hasUpperDeck && (
                      <div className={cn(deck !== 'UPPER' && 'hidden sm:block')}>
                        <SeatDeck layout={layout} deck="UPPER" selected={seatNums} onToggle={toggle} />
                      </div>
                    )}
                  </div>
                )}
              </div>
              <p className="mt-4 flex items-start gap-2 rounded-xl bg-primary-50 p-3 text-xs text-primary-800">
                <Info className="mt-0.5 h-4 w-4 shrink-0" /> Seat numbering: D = seater/push back, S = sleeper, LS = lower sleeper, US = upper sleeper. Pink seats are reserved for ladies.
              </p>
            </Card>
          </section>

          {/* boarding / dropping */}
          {trip && (
            <section className={cn(mobileTab !== 'points' && 'hidden lg:block')} aria-label="Boarding and dropping points">
              <Card padding="lg" className="grid gap-6 md:grid-cols-2">
                <PointPicker title="Boarding point" name="boarding" points={trip.boardingPoints} value={boarding} onChange={setBoarding} />
                <PointPicker title="Dropping point" name="dropping" points={trip.droppingPoints} value={dropping} onChange={setDropping} />
              </Card>
            </section>
          )}
        </div>

        {/* sticky summary */}
        <aside className="hidden lg:block">
          <div className="sticky top-20">
            <Card padding="lg" className="space-y-4">
              <h2 className="text-lg font-bold">Booking summary</h2>
              <div>
                <p className="text-xs font-semibold uppercase text-muted">Selected seats</p>
                <div className="mt-2 flex min-h-[36px] flex-wrap gap-2">
                  <AnimatePresence>
                    {selected.length ? (
                      selected.map((s) => (
                        <motion.span
                          key={s.seatNumber}
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          exit={{ scale: 0 }}
                          className={cn('rounded-lg px-2.5 py-1 text-sm font-bold text-white', s.isLadies ? 'bg-seat-ladies' : 'bg-primary')}
                        >
                          {s.seatNumber} · {inr(s.price)}
                        </motion.span>
                      ))
                    ) : (
                      <span className="text-sm text-muted">No seats selected yet</span>
                    )}
                  </AnimatePresence>
                </div>
              </div>
              {(boarding || dropping) && (
                <div className="space-y-2 rounded-2xl bg-card p-3 text-sm">
                  {boarding && (
                    <p className="flex gap-2">
                      <MapPin className="h-4 w-4 shrink-0 text-green-600" /> <span><b>{boarding.time}</b> {boarding.name}</span>
                    </p>
                  )}
                  {dropping && (
                    <p className="flex gap-2">
                      <MapPin className="h-4 w-4 shrink-0 text-red-500" /> <span><b>{dropping.time}</b> {dropping.name}</span>
                    </p>
                  )}
                </div>
              )}
              <dl className="space-y-1.5 text-sm">
                <div className="flex justify-between"><dt className="text-muted">Seat price</dt><dd className="font-semibold">{inr(fare.baseFare)}</dd></div>
                {fare.discount > 0 && <div className="flex justify-between text-green-600"><dt>Discount ({trip?.discountPercent}%)</dt><dd className="font-semibold">− {inr(fare.discount)}</dd></div>}
                <div className="flex justify-between"><dt className="text-muted">Taxes & fees</dt><dd className="font-semibold">{inr(fare.gst + fare.platformFee + fare.convenienceFee)}</dd></div>
                <div className="flex justify-between border-t border-dashed pt-2 text-base"><dt className="font-bold">Total</dt><dd className="font-extrabold">{inr(fare.grandTotal)}</dd></div>
              </dl>
              <Button fullWidth size="lg" loading={locking} disabled={!selected.length} onClick={proceed}>
                Continue
              </Button>
            </Card>
          </div>
        </aside>
      </div>

      {/* mobile sticky bar */}
      <div className="glass fixed inset-x-0 bottom-0 z-40 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] lg:hidden">
        <div className="mx-auto flex max-w-xl items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="truncate text-xs font-semibold text-muted">{selected.length ? `Seats: ${seatNums.join(', ')}` : 'Select seats'}</p>
            <p className="text-xl font-extrabold">{inr(fare.grandTotal)}</p>
          </div>
          <Button size="lg" loading={locking} disabled={!selected.length} onClick={proceed}>
            Continue
          </Button>
        </div>
      </div>
    </PageTransition>
  );
}
