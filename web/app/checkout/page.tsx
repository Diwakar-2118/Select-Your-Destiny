'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { Building, CalendarClock, CreditCard, Gift, Landmark, Loader2, Lock, ShieldCheck, Smartphone, Tag, Timer, Wallet as WalletIcon, Zap } from 'lucide-react';
import { api, errorMessage, isMockMode } from '@/lib/api';
import { savePendingPayment } from '@/lib/payment';
import { useAuth, useBooking } from '@/lib/store';
import type { PaymentMethod, SavedCard } from '@/lib/types';
import { cn, inr, inr2 } from '@/lib/utils';
import { Badge, Button, Card, Input, PageTransition, Select, Skeleton, useToast } from '@/components/ui';
import { BookingSteps } from '@/components/booking/BookingSteps';
import { FareSummary } from '@/components/booking/FareSummary';
import { useBookingGuard } from '@/components/booking/useBookingGuard';

type MethodDef = { id: PaymentMethod; label: string; sub: string; icon: React.ReactNode; group: 'UPI' | 'Cards' | 'More' };

const Txt = ({ t, c }: { t: string; c: string }) => (
  <span className="flex h-6 w-6 items-center justify-center rounded-md text-[10px] font-extrabold text-white" style={{ background: c }}>
    {t}
  </span>
);

const METHODS: MethodDef[] = [
  { id: 'UPI', label: 'UPI', sub: 'Pay with any UPI ID', icon: <Zap className="h-5 w-5 text-green-600" />, group: 'UPI' },
  { id: 'GOOGLE_PAY', label: 'Google Pay', sub: 'Fast & secure', icon: <Txt t="G" c="#4285F4" />, group: 'UPI' },
  { id: 'PHONEPE', label: 'PhonePe', sub: 'UPI & wallet', icon: <Txt t="Pe" c="#5F259F" />, group: 'UPI' },
  { id: 'PAYTM', label: 'Paytm', sub: 'UPI, wallet & postpaid', icon: <Txt t="P" c="#00BAF2" />, group: 'UPI' },
  { id: 'CREDIT_CARD', label: 'Credit Card', sub: 'Visa, Mastercard, Amex, RuPay', icon: <CreditCard className="h-5 w-5 text-primary" />, group: 'Cards' },
  { id: 'DEBIT_CARD', label: 'Debit Card', sub: 'All major banks', icon: <CreditCard className="h-5 w-5 text-secondary" />, group: 'Cards' },
  { id: 'NET_BANKING', label: 'Net Banking', sub: '50+ banks', icon: <Landmark className="h-5 w-5 text-slate-700" />, group: 'More' },
  { id: 'WALLET', label: 'Destiny Wallet', sub: 'Use your wallet balance', icon: <WalletIcon className="h-5 w-5 text-accent" />, group: 'More' },
  { id: 'LAZYPAY', label: 'LazyPay', sub: 'Buy now, pay later', icon: <Txt t="LP" c="#E91E63" />, group: 'More' },
  { id: 'EMI', label: 'EMI', sub: 'No-cost EMI on select cards', icon: <CalendarClock className="h-5 w-5 text-emerald-600" />, group: 'More' },
];

const BANKS = ['HDFC Bank', 'ICICI Bank', 'State Bank of India', 'Axis Bank', 'Kotak Mahindra', 'Yes Bank', 'Bank of Baroda', 'Punjab National Bank'];
const CASHBACK = [
  { code: 'CASH10', text: '10% cashback up to ₹150 on Destiny Wallet', method: 'WALLET' as PaymentMethod },
  { code: 'GPAY50', text: 'Flat ₹50 cashback with Google Pay UPI', method: 'GOOGLE_PAY' as PaymentMethod },
  { code: 'HDFC10', text: '10% instant discount on HDFC Credit Cards', method: 'CREDIT_CARD' as PaymentMethod },
];

const fmtCard = (v: string) => v.replace(/\D/g, '').slice(0, 16).replace(/(.{4})/g, '$1 ').trim();
const fmtExp = (v: string) => {
  const d = v.replace(/\D/g, '').slice(0, 4);
  return d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d;
};
function luhn(num: string) {
  const s = num.replace(/\D/g, '');
  let sum = 0;
  for (let i = 0; i < s.length; i++) {
    let d = Number(s[s.length - 1 - i]);
    if (i % 2) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
  }
  return s.length >= 13 && sum % 10 === 0;
}

export default function CheckoutPage() {
  const ok = useBookingGuard(['trip', 'booking']);
  const router = useRouter();
  const toast = useToast();
  const { user } = useAuth();
  const b = useBooking();
  const [method, setMethod] = useState<PaymentMethod>('UPI');
  const [upi, setUpi] = useState('');
  const [appMobile, setAppMobile] = useState('');
  const [card, setCard] = useState({ number: '', name: '', expiry: '', cvv: '' });
  const [savedCards, setSavedCards] = useState<SavedCard[]>([]);
  const [savedCardId, setSavedCardId] = useState<number | null>(null);
  const [savedCvv, setSavedCvv] = useState('');
  const [bank, setBank] = useState('');
  const [emiBank, setEmiBank] = useState('HDFC Bank');
  const [tenure, setTenure] = useState(3);
  const [walletBal, setWalletBal] = useState<number | null>(null);
  const [promo, setPromo] = useState('');
  const [promoMsg, setPromoMsg] = useState<{ ok: boolean; text: string; discount: number } | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [paying, setPaying] = useState<null | 'init' | 'verify'>(null);
  const [remaining, setRemaining] = useState<number | null>(null);

  useEffect(() => {
    if (!ok) return;
    api.getCards().then(setSavedCards).catch(() => undefined);
    api.getWallet().then((w) => setWalletBal(w.balance)).catch(() => setWalletBal(user?.walletBalance ?? 0));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ok]);

  useEffect(() => {
    if (!b.lock?.expiresAt) return;
    const tick = () => setRemaining(Math.max(0, Math.floor((new Date(b.lock!.expiresAt).getTime() - Date.now()) / 1000)));
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [b.lock]);

  const fare = b.booking?.fare ?? b.fare;
  const total = Math.max(0, (fare?.grandTotal ?? 0) - (promoMsg?.ok ? promoMsg.discount : 0));

  const emiPlans = useMemo(
    () =>
      [3, 6, 9, 12].map((m) => {
        const rate = m === 3 ? 0 : 0.13;
        const r = rate / 12;
        const emi = r === 0 ? total / m : (total * r * Math.pow(1 + r, m)) / (Math.pow(1 + r, m) - 1);
        return { months: m, emi, interest: emi * m - total, noCost: rate === 0 };
      }),
    [total],
  );

  if (!ok || !b.booking || !b.trip) {
    return (
      <div className="container-app space-y-4 py-10">
        <Skeleton className="h-10 w-1/2" />
        <Skeleton className="h-96" />
      </div>
    );
  }
  const booking = b.booking;

  const applyPromo = async () => {
    const c = promo.trim().toUpperCase();
    if (!c) return;
    try {
      const v = await api.validateCoupon(c, fare?.baseFare ?? total);
      setPromoMsg({ ok: v.valid, text: v.message, discount: v.valid ? v.discount : 0 });
      if (v.valid) toast.success(v.message);
    } catch (e) {
      setPromoMsg({ ok: false, text: errorMessage(e), discount: 0 });
    }
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (method === 'UPI' && !/^[\w.-]{2,}@[a-zA-Z]{2,}$/.test(upi)) e.upi = 'Enter a valid UPI ID (e.g. name@okaxis)';
    if (['GOOGLE_PAY', 'PHONEPE', 'PAYTM', 'LAZYPAY'].includes(method) && !/^[6-9]\d{9}$/.test(appMobile)) e.appMobile = 'Enter the 10-digit mobile linked to your account';
    if (method === 'CREDIT_CARD' || method === 'DEBIT_CARD') {
      if (savedCardId) {
        if (!/^\d{3,4}$/.test(savedCvv)) e.savedCvv = 'Enter CVV';
      } else {
        if (!luhn(card.number)) e.number = 'Enter a valid card number';
        if (card.name.trim().length < 2) e.name = 'Enter name on card';
        const [mm, yy] = card.expiry.split('/').map(Number);
        const now = new Date();
        if (!mm || mm > 12 || !yy || 2000 + yy < now.getFullYear() || (2000 + yy === now.getFullYear() && mm < now.getMonth() + 1)) e.expiry = 'Invalid expiry';
        if (!/^\d{3,4}$/.test(card.cvv)) e.cvv = 'Invalid CVV';
      }
    }
    if (method === 'NET_BANKING' && !bank) e.bank = 'Choose your bank';
    if (method === 'WALLET' && (walletBal ?? 0) < total) e.wallet = `Insufficient balance. Add ${inr(total - (walletBal ?? 0))} or choose another method.`;
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const pay = async () => {
    if (!validate()) {
      toast.error('Please complete payment details');
      return;
    }
    if (remaining === 0) {
      toast.error('Seat hold expired. Please reselect seats.');
      router.push(`/trip/${b.trip!.id}/seats`);
      return;
    }
    setPaying('init');
    try {
      const init = await api.initiatePayment({ bookingId: booking.id, method, promoCode: promoMsg?.ok ? promo.trim().toUpperCase() : undefined });

      // Toucan PSP: redirect to the hosted checkout. Backend mode returns redirectUrl directly;
      // standalone (Vercel, no backend) mode creates the session through our Next.js route.
      if (method !== 'WALLET') {
        let redirectUrl = init.redirectUrl;
        let orderNo = init.gatewayOrderId;
        const standalone = !redirectUrl && isMockMode();
        if (standalone) {
          const res = await fetch('/api/toucan/session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              amount: init.amount ?? booking.fare.grandTotal,
              name: booking.passengers[0]?.name ?? '',
              phone: booking.contactMobile,
              email: booking.contactEmail,
            }),
          });
          const j = await res.json().catch(() => null);
          if (res.ok && j?.data?.redirectUrl) {
            redirectUrl = j.data.redirectUrl;
            orderNo = j.data.orderNo;
          } else if (res.status !== 503) {
            throw new Error(j?.message || 'Could not start payment');
          } // 503 = Toucan not configured: fall through to the demo gateway below
        }
        if (redirectUrl) {
          savePendingPayment({ orderNo, paymentId: init.paymentId, bookingId: booking.id, standalone });
          window.location.href = redirectUrl;
          return;
        }
      }

      setPaying('verify');
      await new Promise((r) => setTimeout(r, 1200)); // simulated gateway
      const confirmed = await api.verifyPayment({
        paymentId: init.paymentId,
        gatewayPaymentId: `pay_${Math.random().toString(36).slice(2, 14)}`,
        signature: 'mock',
        bookingId: booking.id,
      });
      b.update({ booking: confirmed, lock: null });
      router.push('/success');
    } catch (e) {
      toast.error(`Payment failed: ${errorMessage(e)}`);
      setPaying(null);
    }
  };

  const mins = remaining !== null ? Math.floor(remaining / 60) : null;
  const secs = remaining !== null ? remaining % 60 : null;

  return (
    <PageTransition className="container-app py-6 pb-32 lg:pb-10">
      <BookingSteps current={3} />
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold">Checkout</h1>
          <p className="text-sm text-muted">Booking {booking.bookingRef} · {b.trip.fromCity} → {b.trip.toCity}</p>
        </div>
        {remaining !== null && (
          <Badge tone={remaining < 120 ? 'danger' : 'warning'} icon={<Timer className="h-3.5 w-3.5" />} className="!py-2 !text-sm" aria-live="polite">
            Seats held for {mins}:{String(secs).padStart(2, '0')}
          </Badge>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <div className="space-y-6">
          {/* cashback offers */}
          <Card variant="default">
            <p className="mb-3 flex items-center gap-2 text-sm font-bold"><Gift className="h-4 w-4 text-accent" /> Cashback & bank offers</p>
            <div className="no-scrollbar flex gap-3 overflow-x-auto">
              {CASHBACK.map((c) => (
                <button
                  key={c.code}
                  onClick={() => {
                    setMethod(c.method);
                    setPromo(c.code);
                  }}
                  className="min-h-[44px] w-64 shrink-0 rounded-2xl border border-dashed border-accent/50 bg-white p-3 text-left hover:border-accent"
                >
                  <p className="text-sm font-bold text-accent-600">{c.code}</p>
                  <p className="text-xs text-slate-600">{c.text}</p>
                </button>
              ))}
            </div>
          </Card>

          <Card padding="none" className="overflow-hidden">
            <div className="grid md:grid-cols-[240px_1fr]">
              {/* methods list */}
              <div role="radiogroup" aria-label="Payment method" className="border-b border-gray-100 bg-card/60 p-2 md:border-b-0 md:border-r">
                {(['UPI', 'Cards', 'More'] as const).map((g) => (
                  <div key={g} className="mb-2">
                    <p className="px-3 pb-1 pt-2 text-[11px] font-bold uppercase tracking-wider text-muted">{g}</p>
                    {METHODS.filter((m) => m.group === g).map((m) => (
                      <button
                        key={m.id}
                        role="radio"
                        aria-checked={method === m.id}
                        onClick={() => {
                          setMethod(m.id);
                          setErrors({});
                        }}
                        className={cn(
                          'relative flex min-h-[52px] w-full items-center gap-3 rounded-xl px-3 text-left text-sm transition',
                          method === m.id ? 'bg-white font-bold text-primary-700 shadow-soft' : 'font-semibold text-slate-700 hover:bg-white/70',
                        )}
                      >
                        {method === m.id && <motion.span layoutId="pm-bar" className="absolute left-0 top-2 bottom-2 w-1 rounded-full gradient-brand" />}
                        {m.icon}
                        <span>{m.label}</span>
                      </button>
                    ))}
                  </div>
                ))}
              </div>

              {/* sub form */}
              <div className="p-5 sm:p-6">
                <AnimatePresence mode="wait">
                  <motion.div key={method} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }} transition={{ duration: 0.18 }}>
                    <h2 className="text-lg font-bold">{METHODS.find((m) => m.id === method)?.label}</h2>
                    <p className="mb-5 text-sm text-muted">{METHODS.find((m) => m.id === method)?.sub}</p>

                    {method === 'UPI' && (
                      <div className="space-y-4">
                        <Input label="UPI ID" placeholder="yourname@okaxis" value={upi} onChange={(e) => setUpi(e.target.value.trim())} error={errors.upi} leftIcon={<Zap className="h-4 w-4" />} hint="A payment request will be sent to your UPI app" />
                        <div className="flex flex-wrap gap-2">
                          {['@okaxis', '@ybl', '@paytm', '@okhdfcbank'].map((s) => (
                            <button key={s} type="button" onClick={() => setUpi((u) => `${u.split('@')[0] || 'demo'}${s}`)} className="min-h-[36px] rounded-full bg-card px-3 text-xs font-semibold hover:bg-gray-200">
                              {s}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {['GOOGLE_PAY', 'PHONEPE', 'PAYTM', 'LAZYPAY'].includes(method) && (
                      <div className="space-y-4">
                        <Input
                          label={method === 'LAZYPAY' ? 'LazyPay registered mobile' : 'Mobile number linked to app'}
                          inputMode="numeric"
                          maxLength={10}
                          leftIcon={<Smartphone className="h-4 w-4" />}
                          value={appMobile}
                          onChange={(e) => setAppMobile(e.target.value.replace(/\D/g, ''))}
                          error={errors.appMobile}
                        />
                        <p className="rounded-xl bg-primary-50 p-3 text-sm text-primary-800">
                          {method === 'LAZYPAY'
                            ? 'Pay within 15 days at zero interest. Credit limit subject to eligibility.'
                            : 'You will receive a collect request in the app. Approve it to complete payment.'}
                        </p>
                      </div>
                    )}

                    {(method === 'CREDIT_CARD' || method === 'DEBIT_CARD') && (
                      <div className="space-y-4">
                        {savedCards.length > 0 && (
                          <div className="space-y-2" role="radiogroup" aria-label="Saved cards">
                            {savedCards.map((c) => (
                              <label key={c.id} className={cn('flex min-h-[56px] cursor-pointer items-center gap-3 rounded-2xl border p-3', savedCardId === c.id ? 'border-primary bg-primary-50' : 'border-gray-200')}>
                                <input type="radio" name="saved-card" className="h-5 w-5 accent-primary" checked={savedCardId === c.id} onChange={() => setSavedCardId(c.id)} />
                                <CreditCard className="h-5 w-5 text-primary" />
                                <span className="flex-1 text-sm">
                                  <b>{c.brand}</b> •••• {c.last4} <span className="text-muted">· exp {c.expiry}</span>
                                </span>
                                {savedCardId === c.id && (
                                  <input
                                    aria-label="CVV"
                                    inputMode="numeric"
                                    maxLength={4}
                                    placeholder="CVV"
                                    value={savedCvv}
                                    onChange={(e) => setSavedCvv(e.target.value.replace(/\D/g, ''))}
                                    className={cn('h-10 w-20 rounded-xl border px-3 text-sm', errors.savedCvv ? 'border-red-400' : 'border-gray-200')}
                                  />
                                )}
                              </label>
                            ))}
                            <button type="button" onClick={() => setSavedCardId(null)} className={cn('min-h-[44px] text-sm font-semibold', savedCardId === null ? 'text-primary' : 'text-muted')}>
                              + Use a new card
                            </button>
                          </div>
                        )}
                        {savedCardId === null && (
                          <div className="grid gap-4 sm:grid-cols-2">
                            <Input containerClassName="sm:col-span-2" label="Card number" inputMode="numeric" autoComplete="cc-number" placeholder="4111 1111 1111 1111" value={card.number} onChange={(e) => setCard({ ...card, number: fmtCard(e.target.value) })} error={errors.number} leftIcon={<CreditCard className="h-4 w-4" />} />
                            <Input containerClassName="sm:col-span-2" label="Name on card" autoComplete="cc-name" value={card.name} onChange={(e) => setCard({ ...card, name: e.target.value.toUpperCase() })} error={errors.name} />
                            <Input label="Expiry (MM/YY)" inputMode="numeric" autoComplete="cc-exp" placeholder="08/29" value={card.expiry} onChange={(e) => setCard({ ...card, expiry: fmtExp(e.target.value) })} error={errors.expiry} />
                            <Input label="CVV" type="password" inputMode="numeric" autoComplete="cc-csc" maxLength={4} value={card.cvv} onChange={(e) => setCard({ ...card, cvv: e.target.value.replace(/\D/g, '') })} error={errors.cvv} />
                          </div>
                        )}
                      </div>
                    )}

                    {method === 'NET_BANKING' && (
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4" role="radiogroup" aria-label="Popular banks">
                          {BANKS.slice(0, 4).map((bk) => (
                            <button
                              key={bk}
                              type="button"
                              role="radio"
                              aria-checked={bank === bk}
                              onClick={() => setBank(bk)}
                              className={cn('flex min-h-[64px] flex-col items-center justify-center gap-1 rounded-2xl border p-2 text-xs font-semibold', bank === bk ? 'border-primary bg-primary-50 text-primary-700' : 'border-gray-200 hover:border-primary/50')}
                            >
                              <Building className="h-5 w-5" /> {bk.replace(' Bank', '')}
                            </button>
                          ))}
                        </div>
                        <Select label="Or choose from all banks" placeholder="Select bank" value={bank} onChange={(e) => setBank(e.target.value)} options={BANKS.map((x) => ({ value: x, label: x }))} error={errors.bank} />
                      </div>
                    )}

                    {method === 'WALLET' && (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between rounded-2xl gradient-brand p-5 text-white">
                          <div>
                            <p className="text-sm text-white/80">Available balance</p>
                            <p className="text-3xl font-extrabold">{walletBal === null ? '…' : inr2(walletBal)}</p>
                          </div>
                          <WalletIcon className="h-10 w-10 text-white/70" />
                        </div>
                        {errors.wallet ? (
                          <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm font-medium text-red-700">{errors.wallet}</p>
                        ) : (
                          walletBal !== null && <p className="text-sm text-muted">Balance after payment: <b className="text-ink">{inr2(Math.max(0, walletBal - total))}</b></p>
                        )}
                      </div>
                    )}

                    {method === 'EMI' && (
                      <div className="space-y-4">
                        <Select label="Card issuing bank" value={emiBank} onChange={(e) => setEmiBank(e.target.value)} options={BANKS.map((x) => ({ value: x, label: x }))} />
                        <fieldset>
                          <legend className="mb-2 text-sm font-medium">Choose tenure</legend>
                          <div className="space-y-2">
                            {emiPlans.map((p) => (
                              <label key={p.months} className={cn('flex min-h-[56px] cursor-pointer items-center gap-3 rounded-2xl border p-3', tenure === p.months ? 'border-primary bg-primary-50' : 'border-gray-200')}>
                                <input type="radio" name="tenure" className="h-5 w-5 accent-primary" checked={tenure === p.months} onChange={() => setTenure(p.months)} />
                                <span className="flex-1 text-sm">
                                  <b>{inr2(p.emi)}</b>/month × {p.months} months
                                  <span className="block text-xs text-muted">{p.noCost ? 'No-cost EMI' : `Interest ${inr2(p.interest)} @ 13% p.a.`}</span>
                                </span>
                                {p.noCost && <Badge tone="success">No cost</Badge>}
                              </label>
                            ))}
                          </div>
                        </fieldset>
                      </div>
                    )}
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>
          </Card>
        </div>

        <aside>
          <div className="sticky top-20 space-y-4">
            <Card padding="lg">
              <h2 className="mb-4 text-lg font-bold">Payment summary</h2>
              {fare ? <FareSummary fare={fare} seatsCount={booking.seatNumbers.length} extraDiscount={promoMsg?.ok ? promoMsg.discount : 0} extraLabel={`Promo ${promo.toUpperCase()}`} /> : <Skeleton className="h-40" />}
              <form
                className="mt-5 flex gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  void applyPromo();
                }}
              >
                <Input label="Promo code" srOnlyLabel placeholder="Promo code" leftIcon={<Tag className="h-4 w-4" />} value={promo} onChange={(e) => setPromo(e.target.value.toUpperCase())} />
                <Button type="submit" variant="secondary">Apply</Button>
              </form>
              {promoMsg && <p role="status" className={cn('mt-2 text-sm font-medium', promoMsg.ok ? 'text-green-700' : 'text-red-600')}>{promoMsg.text}</p>}
              <Button fullWidth size="lg" className="mt-5 hidden lg:inline-flex" leftIcon={<Lock className="h-5 w-5" />} loading={!!paying} onClick={pay}>
                Pay Securely {inr2(total)}
              </Button>
              <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-muted">
                <ShieldCheck className="h-4 w-4 text-green-600" /> 256-bit SSL · PCI-DSS compliant
              </p>
            </Card>
          </div>
        </aside>
      </div>

      <div className="glass fixed inset-x-0 bottom-0 z-40 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] lg:hidden">
        <Button fullWidth size="lg" leftIcon={<Lock className="h-5 w-5" />} loading={!!paying} onClick={pay}>
          Pay Securely {inr2(total)}
        </Button>
      </div>

      {/* processing overlay */}
      <AnimatePresence>
        {paying && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-900/60 p-6 backdrop-blur" role="alertdialog" aria-live="assertive" aria-label="Processing payment">
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="w-full max-w-sm rounded-3xl bg-white p-8 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full gradient-brand">
                <Loader2 className="h-8 w-8 animate-spin text-white" />
              </div>
              <p className="mt-5 text-lg font-bold">{paying === 'init' ? 'Initiating secure payment…' : 'Verifying payment…'}</p>
              <p className="mt-1 text-sm text-muted">Please don&apos;t close or refresh this page.</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </PageTransition>
  );
}
