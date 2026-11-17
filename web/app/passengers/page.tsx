'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { Building2, ChevronDown, Mail, MapPin, Phone, ShieldAlert, Smartphone, User as UserIcon, UserPlus } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth, useBooking } from '@/lib/store';
import type { PassengerInput, SavedPassenger } from '@/lib/types';
import { cn, formatDate } from '@/lib/utils';
import { Badge, Button, Card, Input, PageTransition, Select, Skeleton, useToast } from '@/components/ui';
import { BookingSteps } from '@/components/booking/BookingSteps';
import { useBookingGuard } from '@/components/booking/useBookingGuard';

type Errors = Record<string, string>;
const GENDERS = [
  { value: 'MALE', label: 'Male' },
  { value: 'FEMALE', label: 'Female' },
  { value: 'OTHER', label: 'Other' },
];

export default function PassengersPage() {
  const ok = useBookingGuard(['trip', 'seats']);
  const router = useRouter();
  const toast = useToast();
  const { user, isAuthenticated } = useAuth();
  const b = useBooking();
  const [pax, setPax] = useState<PassengerInput[]>([]);
  const [contact, setContact] = useState({ mobile: '', email: '', emergencyContact: '' });
  const [boardingId, setBoardingId] = useState<number | null>(null);
  const [droppingId, setDroppingId] = useState<number | null>(null);
  const [gstOpen, setGstOpen] = useState(false);
  const [gst, setGst] = useState({ gstNumber: '', gstCompany: '' });
  const [savePax, setSavePax] = useState(false);
  const [saved, setSaved] = useState<SavedPassenger[]>([]);
  const [errors, setErrors] = useState<Errors>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!ok) return;
    setPax(
      b.seats.map((s) => {
        const prev = b.passengers.find((p) => p.seatNumber === s.seatNumber);
        return prev ?? { name: '', age: 0, gender: s.isLadies ? 'FEMALE' : 'MALE', seatNumber: s.seatNumber };
      }),
    );
    setContact({
      mobile: b.contact.mobile || user?.mobile || '',
      email: b.contact.email || user?.email || '',
      emergencyContact: b.contact.emergencyContact || '',
    });
    setBoardingId(b.boardingPoint?.id ?? b.trip?.boardingPoints[0]?.id ?? null);
    setDroppingId(b.droppingPoint?.id ?? b.trip?.droppingPoints[0]?.id ?? null);
    if (b.gst.gstNumber) {
      setGst({ gstNumber: b.gst.gstNumber, gstCompany: b.gst.gstCompany || '' });
      setGstOpen(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ok]);

  useEffect(() => {
    if (isAuthenticated) api.getPassengers().then(setSaved).catch(() => undefined);
  }, [isAuthenticated]);

  if (!ok || !b.trip) {
    return (
      <div className="container-app space-y-4 py-10">
        <Skeleton className="h-10 w-1/2" />
        <Skeleton className="h-64" />
      </div>
    );
  }
  const trip = b.trip;

  const setP = (i: number, patch: Partial<PassengerInput>) => setPax((list) => list.map((p, j) => (j === i ? { ...p, ...patch } : p)));

  const fillSaved = (sp: SavedPassenger) => {
    const idx = pax.findIndex((p) => !p.name);
    const i = idx < 0 ? 0 : idx;
    const seat = b.seats[i];
    if (seat?.isLadies && sp.gender !== 'FEMALE') return toast.error(`Seat ${seat.seatNumber} is reserved for ladies`);
    setP(i, { name: sp.name, age: sp.age, gender: sp.gender });
  };

  const validate = (): boolean => {
    const e: Errors = {};
    pax.forEach((p, i) => {
      if (p.name.trim().length < 2) e[`name${i}`] = 'Enter full name';
      else if (!/^[A-Za-z .'-]+$/.test(p.name.trim())) e[`name${i}`] = 'Use letters only';
      if (!p.age || p.age < 1 || p.age > 120) e[`age${i}`] = 'Age 1–120';
      if (b.seats[i]?.isLadies && p.gender !== 'FEMALE') e[`gender${i}`] = 'Ladies seat — female passenger only';
    });
    if (!/^[6-9]\d{9}$/.test(contact.mobile)) e.mobile = 'Enter a valid 10-digit mobile';
    if (!/^\S+@\S+\.\S+$/.test(contact.email)) e.email = 'Enter a valid email';
    if (contact.emergencyContact && !/^[6-9]\d{9}$/.test(contact.emergencyContact)) e.emergency = 'Enter a valid 10-digit number';
    if (contact.emergencyContact && contact.emergencyContact === contact.mobile) e.emergency = 'Use a different number';
    if (!boardingId) e.boarding = 'Select boarding point';
    if (!droppingId) e.dropping = 'Select dropping point';
    if (gstOpen && gst.gstNumber && !/^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(gst.gstNumber.toUpperCase())) e.gstNumber = 'Invalid GSTIN format';
    if (gstOpen && gst.gstNumber && !gst.gstCompany.trim()) e.gstCompany = 'Enter company name';
    setErrors(e);
    if (Object.keys(e).length) {
      const first = Object.keys(e)[0];
      toast.error('Please fix the highlighted fields');
      setTimeout(() => document.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus(), 50);
      void first;
      return false;
    }
    return true;
  };

  const submit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    const passengers = pax.map((p) => ({ ...p, name: p.name.trim(), age: Number(p.age) }));
    b.update({
      passengers,
      contact: { mobile: contact.mobile, email: contact.email, emergencyContact: contact.emergencyContact || undefined },
      boardingPoint: trip.boardingPoints.find((p) => p.id === boardingId) ?? b.boardingPoint,
      droppingPoint: trip.droppingPoints.find((p) => p.id === droppingId) ?? b.droppingPoint,
      gst: gstOpen && gst.gstNumber ? { gstNumber: gst.gstNumber.toUpperCase(), gstCompany: gst.gstCompany } : {},
      fare: null,
      booking: null,
    });
    if (savePax && isAuthenticated) {
      const existing = new Set(saved.map((s) => s.name.toLowerCase()));
      await Promise.all(
        passengers.filter((p) => !existing.has(p.name.toLowerCase())).map((p) => api.addPassenger({ name: p.name, age: p.age, gender: p.gender }).catch(() => undefined)),
      );
      toast.success('Passengers saved to your profile');
    }
    setSubmitting(false);
    router.push('/summary');
  };

  return (
    <PageTransition className="container-app py-6 pb-32 lg:pb-10">
      <BookingSteps current={1} />
      <div className="mb-6 flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-2xl font-extrabold">Passenger details</h1>
          <p className="text-sm text-muted">
            {trip.fromCity} → {trip.toCity} · {formatDate(trip.journeyDate)} · {trip.operatorName}
          </p>
        </div>
        <Badge tone="primary">{b.seats.length} seat{b.seats.length > 1 ? 's' : ''}: {b.seats.map((s) => s.seatNumber).join(', ')}</Badge>
      </div>

      <form onSubmit={submit} noValidate className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="space-y-6">
          {saved.length > 0 && (
            <Card variant="default">
              <p className="mb-2 flex items-center gap-2 text-sm font-bold"><UserPlus className="h-4 w-4 text-primary" /> Quick fill from saved travellers</p>
              <div className="flex flex-wrap gap-2">
                {saved.map((s) => (
                  <button key={s.id} type="button" onClick={() => fillSaved(s)} className="min-h-[44px] rounded-xl border border-gray-200 bg-white px-3 text-sm font-semibold hover:border-primary hover:text-primary">
                    {s.name} · {s.age} · {s.gender[0]}
                  </button>
                ))}
              </div>
            </Card>
          )}

          {pax.map((p, i) => {
            const seat = b.seats[i];
            return (
              <motion.div key={p.seatNumber} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                <Card padding="lg">
                  <fieldset>
                    <legend className="mb-4 flex w-full items-center justify-between gap-2">
                      <span className="flex items-center gap-2 text-base font-bold">
                        <span className="flex h-8 w-8 items-center justify-center rounded-full gradient-brand text-sm text-white">{i + 1}</span>
                        Passenger {i + 1}
                      </span>
                      <span className="flex gap-1.5">
                        <Badge tone="primary">Seat {p.seatNumber}</Badge>
                        {seat?.isLadies && <Badge tone="danger" className="!bg-pink-50 !text-pink-700">Ladies</Badge>}
                        {seat?.isWindow && <Badge tone="neutral">Window</Badge>}
                      </span>
                    </legend>
                    <div className="grid gap-4 sm:grid-cols-[1fr_120px]">
                      <Input label="Full name" required autoComplete="name" leftIcon={<UserIcon className="h-4 w-4" />} value={p.name} onChange={(e) => setP(i, { name: e.target.value })} error={errors[`name${i}`]} />
                      <Input
                        label="Age"
                        required
                        inputMode="numeric"
                        maxLength={3}
                        value={p.age ? String(p.age) : ''}
                        onChange={(e) => setP(i, { age: Number(e.target.value.replace(/\D/g, '')) || 0 })}
                        error={errors[`age${i}`]}
                      />
                    </div>
                    <div className="mt-4" role="radiogroup" aria-label={`Gender for passenger ${i + 1}`}>
                      <p className="mb-1.5 text-sm font-medium">Gender <span className="text-red-500" aria-hidden>*</span></p>
                      <div className="grid grid-cols-3 gap-2">
                        {GENDERS.map((g) => (
                          <button
                            key={g.value}
                            type="button"
                            role="radio"
                            aria-checked={p.gender === g.value}
                            disabled={seat?.isLadies && g.value !== 'FEMALE'}
                            onClick={() => setP(i, { gender: g.value as PassengerInput['gender'] })}
                            className={cn(
                              'min-h-[44px] rounded-xl border text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-40',
                              p.gender === g.value ? 'border-primary bg-primary-50 text-primary-700' : 'border-gray-200 hover:border-primary/50',
                            )}
                          >
                            {g.label}
                          </button>
                        ))}
                      </div>
                      {errors[`gender${i}`] && <p role="alert" className="mt-1 text-xs font-medium text-red-600">{errors[`gender${i}`]}</p>}
                    </div>
                  </fieldset>
                </Card>
              </motion.div>
            );
          })}

          <Card padding="lg">
            <h2 className="mb-1 text-base font-bold">Contact details</h2>
            <p className="mb-4 text-sm text-muted">Your ticket & updates will be sent here</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label="Mobile number"
                required
                inputMode="numeric"
                maxLength={10}
                autoComplete="tel"
                leftIcon={<Smartphone className="h-4 w-4" />}
                value={contact.mobile}
                onChange={(e) => setContact({ ...contact, mobile: e.target.value.replace(/\D/g, '') })}
                error={errors.mobile}
              />
              <Input label="Email" required type="email" autoComplete="email" leftIcon={<Mail className="h-4 w-4" />} value={contact.email} onChange={(e) => setContact({ ...contact, email: e.target.value })} error={errors.email} />
              <Input
                containerClassName="sm:col-span-2"
                label="Emergency contact (optional)"
                inputMode="numeric"
                maxLength={10}
                leftIcon={<ShieldAlert className="h-4 w-4" />}
                value={contact.emergencyContact}
                onChange={(e) => setContact({ ...contact, emergencyContact: e.target.value.replace(/\D/g, '') })}
                error={errors.emergency}
                hint="We'll notify this number in case of emergencies"
              />
            </div>
          </Card>

          <Card padding="lg">
            <h2 className="mb-4 flex items-center gap-2 text-base font-bold"><MapPin className="h-4 w-4 text-primary" /> Boarding & dropping</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <Select
                label="Boarding point"
                required
                value={boardingId ? String(boardingId) : ''}
                onChange={(e) => setBoardingId(Number(e.target.value))}
                options={trip.boardingPoints.map((p) => ({ value: String(p.id), label: `${p.time} · ${p.name}` }))}
                error={errors.boarding}
              />
              <Select
                label="Dropping point"
                required
                value={droppingId ? String(droppingId) : ''}
                onChange={(e) => setDroppingId(Number(e.target.value))}
                options={trip.droppingPoints.map((p) => ({ value: String(p.id), label: `${p.time} · ${p.name}` }))}
                error={errors.dropping}
              />
            </div>
          </Card>

          <Card padding="none">
            <button
              type="button"
              onClick={() => setGstOpen((o) => !o)}
              aria-expanded={gstOpen}
              aria-controls="gst-panel"
              className="flex min-h-[56px] w-full items-center justify-between px-5 text-left"
            >
              <span className="flex items-center gap-2 font-bold"><Building2 className="h-4 w-4 text-primary" /> Add GST details <span className="text-sm font-normal text-muted">(optional, for business travel)</span></span>
              <ChevronDown className={cn('h-5 w-5 transition', gstOpen && 'rotate-180')} />
            </button>
            <AnimatePresence initial={false}>
              {gstOpen && (
                <motion.div id="gst-panel" initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
                  <div className="grid gap-4 px-5 pb-5 sm:grid-cols-2">
                    <Input label="GSTIN" placeholder="29ABCDE1234F1Z5" maxLength={15} value={gst.gstNumber} onChange={(e) => setGst({ ...gst, gstNumber: e.target.value.toUpperCase() })} error={errors.gstNumber} />
                    <Input label="Company name" value={gst.gstCompany} onChange={(e) => setGst({ ...gst, gstCompany: e.target.value })} error={errors.gstCompany} />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </Card>

          {isAuthenticated && (
            <label className="flex min-h-[44px] cursor-pointer items-center gap-3 text-sm font-medium">
              <input type="checkbox" checked={savePax} onChange={(e) => setSavePax(e.target.checked)} className="h-5 w-5 accent-primary" />
              Save these passengers to my profile for faster booking
            </label>
          )}
        </div>

        <aside>
          <div className="sticky top-20 space-y-4">
            <Card variant="gradient" padding="lg">
              <p className="text-sm text-white/80">Your journey</p>
              <p className="mt-1 text-xl font-extrabold">{trip.fromCity} → {trip.toCity}</p>
              <p className="text-sm text-white/85">{formatDate(trip.journeyDate, { weekday: 'long', day: 'numeric', month: 'short' })} · {trip.departureTime}</p>
              <p className="mt-3 text-sm text-white/85">{trip.operatorName}</p>
              <p className="text-sm text-white/85">Seats {b.seats.map((s) => s.seatNumber).join(', ')}</p>
            </Card>
            <Card variant="default" className="flex items-start gap-3 text-sm text-slate-600">
              <Phone className="mt-0.5 h-4 w-4 shrink-0 text-primary" /> Your seats are held for 10 minutes. Complete payment to confirm.
            </Card>
            <Button type="submit" fullWidth size="lg" loading={submitting} className="hidden lg:inline-flex">
              Continue to summary
            </Button>
          </div>
        </aside>

        <div className="glass fixed inset-x-0 bottom-0 z-40 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] lg:hidden">
          <Button type="submit" fullWidth size="lg" loading={submitting}>
            Continue to summary
          </Button>
        </div>
      </form>
    </PageTransition>
  );
}
