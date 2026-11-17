'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowRight, Building2, CheckCircle2, Clock, Mail, MapPin, Pencil, Smartphone, Tag, Ticket, Users, X } from 'lucide-react';
import { api, errorMessage } from '@/lib/api';
import { useBooking } from '@/lib/store';
import type { Coupon } from '@/lib/types';
import { BUS_TYPE_LABEL, cn, computeFare, formatDate, formatDuration, inr } from '@/lib/utils';
import { Badge, Button, Card, Input, PageTransition, Skeleton, useToast } from '@/components/ui';
import { BookingSteps } from '@/components/booking/BookingSteps';
import { FareSummary } from '@/components/booking/FareSummary';
import { useBookingGuard } from '@/components/booking/useBookingGuard';
import { buildRequest } from '@/components/booking/request';

export default function SummaryPage() {
  const ok = useBookingGuard(['trip', 'seats', 'passengers']);
  const router = useRouter();
  const toast = useToast();
  const b = useBooking();
  const [code, setCode] = useState('');
  const [couponMsg, setCouponMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [applying, setApplying] = useState(false);
  const [offers, setOffers] = useState<Coupon[]>([]);
  const [loadingFare, setLoadingFare] = useState(true);
  const [proceeding, setProceeding] = useState(false);

  const quote = useCallback(
    async (coupon?: string) => {
      const req = buildRequest(b, coupon);
      if (!req) return;
      setLoadingFare(true);
      try {
        const f = await api.quote(req);
        b.setFare(f);
      } catch {
        // fall back to local calculation per contract fare rules
        b.setFare(computeFare(b.seats, b.trip?.discountPercent ?? 0));
      } finally {
        setLoadingFare(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [b.trip, b.seats, b.passengers, b.boardingPoint, b.droppingPoint],
  );

  useEffect(() => {
    if (!ok) return;
    setCode(b.couponCode);
    void quote(b.couponCode || undefined);
    api.getOffers().then((o) => setOffers(o.filter((x) => x.active && x.type !== 'CASHBACK').slice(0, 4))).catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ok]);

  if (!ok || !b.trip) {
    return (
      <div className="container-app space-y-4 py-10">
        <Skeleton className="h-10 w-1/2" />
        <Skeleton className="h-80" />
      </div>
    );
  }
  const trip = b.trip;

  const apply = async (c = code) => {
    const cc = c.trim().toUpperCase();
    if (!cc) return setCouponMsg({ ok: false, text: 'Enter a coupon code' });
    setApplying(true);
    try {
      const base = b.fare?.baseFare ?? computeFare(b.seats, trip.discountPercent).baseFare;
      const v = await api.validateCoupon(cc, base);
      setCouponMsg({ ok: v.valid, text: v.message });
      if (v.valid) {
        setCode(cc);
        b.setCoupon(cc);
        await quote(cc);
        toast.success(v.message);
      }
    } catch (e) {
      setCouponMsg({ ok: false, text: errorMessage(e) });
    } finally {
      setApplying(false);
    }
  };

  const removeCoupon = async () => {
    b.setCoupon('');
    setCode('');
    setCouponMsg(null);
    await quote();
  };

  const proceed = async () => {
    const req = buildRequest(b, b.couponCode);
    if (!req) return;
    setProceeding(true);
    try {
      const booking = await api.createBooking(req);
      b.setBooking(booking);
      if (booking.fare) b.setFare(booking.fare);
      router.push('/checkout');
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setProceeding(false);
    }
  };

  return (
    <PageTransition className="container-app py-6 pb-32 lg:pb-10">
      <BookingSteps current={2} />
      <h1 className="mb-6 text-2xl font-extrabold">Review your booking</h1>

      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <div className="space-y-6">
          {/* journey */}
          <Card padding="lg">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold">{trip.operatorName}</h2>
                <p className="text-sm text-muted">{trip.busName} · {trip.busNumber}</p>
                <Badge className="mt-2">{BUS_TYPE_LABEL[trip.busType]}</Badge>
              </div>
              <Link href={`/trip/${trip.id}/seats`} className="inline-flex min-h-[44px] items-center gap-1 text-sm font-semibold text-primary">
                <Pencil className="h-4 w-4" /> Change seats
              </Link>
            </div>
            <div className="mt-5 grid grid-cols-[1fr_auto_1fr] items-center gap-3 rounded-2xl bg-card p-4">
              <div>
                <p className="text-xs text-muted">{formatDate(trip.journeyDate)}</p>
                <p className="text-2xl font-extrabold">{b.boardingPoint?.time ?? trip.departureTime}</p>
                <p className="font-semibold">{trip.fromCity}</p>
                <p className="mt-1 flex items-start gap-1 text-xs text-muted"><MapPin className="h-3.5 w-3.5 shrink-0 text-green-600" /> {b.boardingPoint?.name}</p>
              </div>
              <div className="flex flex-col items-center text-xs text-muted">
                <Clock className="h-4 w-4 text-primary" />
                {formatDuration(trip.durationMins)}
                <ArrowRight className="mt-1 h-4 w-4" />
              </div>
              <div className="text-right">
                <p className="text-xs text-muted">Arrival</p>
                <p className="text-2xl font-extrabold">{b.droppingPoint?.time ?? trip.arrivalTime}</p>
                <p className="font-semibold">{trip.toCity}</p>
                <p className="mt-1 flex items-start justify-end gap-1 text-xs text-muted"><MapPin className="h-3.5 w-3.5 shrink-0 text-red-500" /> {b.droppingPoint?.name}</p>
              </div>
            </div>
          </Card>

          {/* passengers */}
          <Card padding="lg">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-lg font-bold"><Users className="h-5 w-5 text-primary" /> Passengers</h2>
              <Link href="/passengers" className="inline-flex min-h-[44px] items-center gap-1 text-sm font-semibold text-primary"><Pencil className="h-4 w-4" /> Edit</Link>
            </div>
            <ul className="divide-y divide-gray-100">
              {b.passengers.map((p) => (
                <li key={p.seatNumber} className="flex items-center justify-between py-3">
                  <div>
                    <p className="font-semibold">{p.name}</p>
                    <p className="text-sm text-muted">{p.age} yrs · {p.gender.charAt(0) + p.gender.slice(1).toLowerCase()}</p>
                  </div>
                  <Badge tone="primary">Seat {p.seatNumber}</Badge>
                </li>
              ))}
            </ul>
            <div className="mt-4 grid gap-2 rounded-2xl bg-card p-4 text-sm sm:grid-cols-2">
              <p className="flex items-center gap-2"><Smartphone className="h-4 w-4 text-primary" /> +91 {b.contact.mobile}</p>
              <p className="flex items-center gap-2 truncate"><Mail className="h-4 w-4 text-primary" /> {b.contact.email}</p>
              {b.contact.emergencyContact && <p className="flex items-center gap-2">Emergency: +91 {b.contact.emergencyContact}</p>}
              {b.gst.gstNumber && <p className="flex items-center gap-2"><Building2 className="h-4 w-4 text-primary" /> {b.gst.gstCompany} · {b.gst.gstNumber}</p>}
            </div>
          </Card>

          {/* coupons */}
          <Card padding="lg">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-bold"><Ticket className="h-5 w-5 text-accent" /> Apply coupon</h2>
            {b.couponCode ? (
              <div className="flex items-center justify-between rounded-2xl border-2 border-dashed border-green-400 bg-green-50 p-4">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="h-6 w-6 text-green-600" />
                  <div>
                    <p className="font-bold text-green-800">{b.couponCode} applied</p>
                    <p className="text-sm text-green-700">You save {inr(b.fare?.couponDiscount ?? 0)}</p>
                  </div>
                </div>
                <button onClick={removeCoupon} aria-label="Remove coupon" className="inline-flex h-11 w-11 items-center justify-center rounded-full hover:bg-green-100">
                  <X className="h-5 w-5" />
                </button>
              </div>
            ) : (
              <>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    void apply();
                  }}
                  className="flex gap-2"
                >
                  <Input label="Coupon code" srOnlyLabel placeholder="Enter coupon code" leftIcon={<Tag className="h-4 w-4" />} value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} className="uppercase" />
                  <Button type="submit" variant="secondary" loading={applying}>Apply</Button>
                </form>
                {couponMsg && (
                  <p role="status" className={cn('mt-2 text-sm font-medium', couponMsg.ok ? 'text-green-700' : 'text-red-600')}>{couponMsg.text}</p>
                )}
                {(offers.length > 0 || trip.couponCode) && (
                  <div className="mt-4 grid gap-2 sm:grid-cols-2">
                    {offers.map((o) => (
                      <motion.button
                        key={o.id}
                        whileTap={{ scale: 0.97 }}
                        type="button"
                        onClick={() => apply(o.code)}
                        className={cn(
                          'min-h-[44px] rounded-2xl border border-dashed p-3 text-left transition hover:border-primary hover:bg-primary-50',
                          o.code === trip.couponCode ? 'border-accent bg-accent-50' : 'border-gray-300',
                        )}
                      >
                        <p className="font-bold tracking-wide text-primary-700">{o.code}{o.code === trip.couponCode && <span className="ml-2 text-xs text-accent">Recommended</span>}</p>
                        <p className="text-xs text-muted">{o.description}</p>
                      </motion.button>
                    ))}
                  </div>
                )}
              </>
            )}
          </Card>
        </div>

        {/* fare */}
        <aside>
          <div className="sticky top-20 space-y-4">
            <Card padding="lg">
              <h2 className="mb-4 text-lg font-bold">Fare breakdown</h2>
              {loadingFare || !b.fare ? (
                <div className="space-y-3">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-4" />)}</div>
              ) : (
                <FareSummary fare={b.fare} seatsCount={b.seats.length} />
              )}
              <Button fullWidth size="lg" className="mt-6 hidden lg:inline-flex" loading={proceeding} disabled={loadingFare} onClick={proceed} rightIcon={<ArrowRight className="h-5 w-5" />}>
                Proceed to Checkout
              </Button>
            </Card>
            <p className="px-2 text-center text-xs text-muted">By proceeding you agree to our cancellation policy and terms of travel.</p>
          </div>
        </aside>
      </div>

      <div className="glass fixed inset-x-0 bottom-0 z-40 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] lg:hidden">
        <div className="mx-auto flex max-w-xl items-center justify-between gap-4">
          <div>
            <p className="text-xs text-muted">Grand total</p>
            <p className="text-xl font-extrabold">{inr(b.fare?.grandTotal ?? 0)}</p>
          </div>
          <Button size="lg" loading={proceeding} disabled={loadingFare} onClick={proceed}>Proceed to Checkout</Button>
        </div>
      </div>
    </PageTransition>
  );
}
