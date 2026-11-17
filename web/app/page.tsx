'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  BadgePercent,
  ChevronLeft,
  ChevronRight,
  Clock,
  Copy,
  History,
  LocateFixed,
  MapPin,
  Navigation,
  ShieldCheck,
  Sparkles,
  Star,
  Trash2,
  Wifi,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useBooking, type SearchParamsState } from '@/lib/store';
import type { Coupon, PopularRoute } from '@/lib/types';
import { formatDate, inr, todayISO } from '@/lib/utils';
import { Badge, Card, Skeleton, useToast } from '@/components/ui';
import { RECENT_KEY, SearchForm, loadRecent, saveRecent, searchUrl } from '@/components/booking/SearchForm';
import { BusIllustration } from '@/components/booking/BusIllustration';

const QUICK_CITIES = ['Bengaluru', 'Chennai', 'Hyderabad', 'Mumbai', 'Pune', 'Delhi', 'Goa', 'Jaipur', 'Kochi', 'Mysuru'];

const NEARBY = [
  { name: 'Majestic Bus Stand', area: 'Kempegowda, Bengaluru', km: 1.2, buses: 142 },
  { name: 'Silk Board Junction', area: 'BTM Layout, Bengaluru', km: 3.8, buses: 96 },
  { name: 'Hebbal Flyover', area: 'Hebbal, Bengaluru', km: 6.4, buses: 74 },
  { name: 'Electronic City Toll', area: 'Hosur Road, Bengaluru', km: 9.1, buses: 58 },
];

const OFFER_GRADIENTS = [
  'from-primary to-secondary',
  'from-secondary to-accent',
  'from-accent to-pink-500',
  'from-emerald-500 to-primary',
  'from-pink-500 to-secondary',
];

export default function HomePage() {
  const router = useRouter();
  const toast = useToast();
  const { setSearch } = useBooking();
  const [prefill, setPrefill] = useState<Partial<SearchParamsState>>({});
  const [recent, setRecent] = useState<SearchParamsState[]>([]);
  const [offers, setOffers] = useState<Coupon[] | null>(null);
  const [routes, setRoutes] = useState<PopularRoute[] | null>(null);
  const [locating, setLocating] = useState(false);
  const carousel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setRecent(loadRecent());
    api.getOffers().then(setOffers).catch(() => setOffers([]));
    api.getPopularRoutes().then(setRoutes).catch(() => setRoutes([]));
  }, []);

  // auto-advance carousel
  useEffect(() => {
    const el = carousel.current;
    if (!el || !offers?.length) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const t = setInterval(() => {
      if (el.matches(':hover, :focus-within')) return;
      const atEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 8;
      el.scrollTo({ left: atEnd ? 0 : el.scrollLeft + el.clientWidth * 0.8, behavior: 'smooth' });
    }, 4500);
    return () => clearInterval(t);
  }, [offers]);

  const scrollOffers = (dir: number) => carousel.current?.scrollBy({ left: dir * carousel.current.clientWidth * 0.8, behavior: 'smooth' });

  const pickCity = (c: string) => {
    setPrefill((p) => (!p.from || (p.from && p.to) ? { from: c, to: '' } : { ...p, to: c }));
  };

  const goRoute = (from: string, to: string, date = todayISO(1)) => {
    const s: SearchParamsState = { from, to, date, passengers: 1 };
    setSearch(s);
    saveRecent(s);
    router.push(searchUrl(s));
  };

  const copy = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      toast.success(`Coupon ${code} copied`);
    } catch {
      toast.info(`Use code ${code} at checkout`);
    }
  };

  const locate = () => {
    if (!navigator.geolocation) return toast.error('Location not supported on this device');
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      () => {
        setLocating(false);
        toast.success('Showing boarding points near you');
      },
      () => {
        setLocating(false);
        toast.info('Location unavailable — showing popular points in Bengaluru');
      },
      { timeout: 6000 },
    );
  };

  return (
    <div className="pb-8">
      {/* HERO */}
      <section className="relative overflow-hidden gradient-brand pb-28 pt-10 text-white sm:pt-14">
        <div className="pointer-events-none absolute -right-20 -top-20 h-80 w-80 rounded-full bg-white/10 blur-3xl" aria-hidden />
        <div className="pointer-events-none absolute -bottom-24 left-10 h-72 w-72 rounded-full bg-accent/30 blur-3xl" aria-hidden />
        <div className="container-app relative grid items-center gap-8 lg:grid-cols-[1.1fr_1fr]">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <Badge tone="neutral" className="!bg-white/20 !text-white" icon={<Sparkles className="h-3.5 w-3.5" />}>
              India&apos;s premium bus booking
            </Badge>
            <h1 className="mt-4 text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl">
              Book Smart.
              <br />
              Travel Comfortably.
            </h1>
            <p className="mt-3 max-w-lg text-white/85">
              2,500+ operators, 1 lakh+ routes, live tracking and instant refunds — all in one place.
            </p>
            <ul className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-sm font-medium text-white/90">
              <li className="flex items-center gap-1.5"><ShieldCheck className="h-4 w-4" /> Safe & sanitised</li>
              <li className="flex items-center gap-1.5"><Navigation className="h-4 w-4" /> Live tracking</li>
              <li className="flex items-center gap-1.5"><Wifi className="h-4 w-4" /> Free WiFi buses</li>
            </ul>
          </motion.div>
          <motion.div className="hidden lg:block" initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 }}>
            <BusIllustration className="w-full drop-shadow-2xl" />
          </motion.div>
        </div>
      </section>

      {/* SEARCH CARD */}
      <div className="container-app relative z-10 -mt-24">
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card variant="glass" padding="lg" className="!bg-white/85 shadow-2xl">
            <SearchForm initial={prefill} />
            <div className="mt-5">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Quick cities</p>
              <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
                {QUICK_CITIES.map((c) => (
                  <motion.button
                    key={c}
                    whileTap={{ scale: 0.94 }}
                    onClick={() => pickCity(c)}
                    className="min-h-[40px] shrink-0 rounded-full border border-gray-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:border-primary hover:text-primary"
                  >
                    {c}
                  </motion.button>
                ))}
              </div>
            </div>
          </Card>
        </motion.div>
      </div>

      {/* RECENT */}
      {recent.length > 0 && (
        <section className="container-app mt-10" aria-labelledby="recent-h">
          <div className="mb-3 flex items-center justify-between">
            <h2 id="recent-h" className="flex items-center gap-2 text-lg font-bold">
              <History className="h-5 w-5 text-primary" /> Recent searches
            </h2>
            <button
              onClick={() => {
                localStorage.removeItem(RECENT_KEY);
                setRecent([]);
              }}
              className="inline-flex min-h-[44px] items-center gap-1 text-sm font-semibold text-muted hover:text-red-600"
            >
              <Trash2 className="h-4 w-4" /> Clear
            </button>
          </div>
          <div className="no-scrollbar flex gap-3 overflow-x-auto pb-2">
            {recent.map((r, i) => (
              <button
                key={i}
                onClick={() => goRoute(r.from, r.to, r.date >= todayISO() ? r.date : todayISO(1))}
                className="min-h-[44px] shrink-0 rounded-2xl bg-card px-4 py-3 text-left transition hover:bg-primary-50"
              >
                <span className="flex items-center gap-2 font-semibold text-ink">
                  {r.from} <ArrowRight className="h-4 w-4 text-primary" /> {r.to}
                </span>
                <span className="text-xs text-muted">
                  {formatDate(r.date)} · {r.passengers} pax
                </span>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* OFFERS */}
      <section className="container-app mt-12" aria-labelledby="offers-h" aria-roledescription="carousel">
        <div className="mb-4 flex items-end justify-between">
          <div>
            <h2 id="offers-h" className="flex items-center gap-2 text-2xl font-extrabold">
              <BadgePercent className="h-6 w-6 text-accent" /> Offers for you
            </h2>
            <p className="text-sm text-muted">Save more on every trip</p>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/offers" className="hidden min-h-[44px] items-center px-2 text-sm font-semibold text-primary hover:underline sm:inline-flex">
              View all
            </Link>
            <button onClick={() => scrollOffers(-1)} aria-label="Previous offers" className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-card hover:bg-gray-200">
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button onClick={() => scrollOffers(1)} aria-label="Next offers" className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-card hover:bg-gray-200">
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </div>
        <div ref={carousel} className="no-scrollbar flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2">
          {offers === null
            ? [0, 1, 2].map((i) => <Skeleton key={i} className="h-40 w-[85%] shrink-0 sm:w-[46%] lg:w-[31%]" />)
            : offers.map((o, i) => (
                <motion.article
                  key={o.id}
                  whileHover={{ y: -4 }}
                  className={`relative flex h-44 w-[85%] shrink-0 snap-start flex-col justify-between overflow-hidden rounded-2xl bg-gradient-to-br p-5 text-white shadow-lift sm:w-[46%] lg:w-[31%] ${OFFER_GRADIENTS[i % OFFER_GRADIENTS.length]}`}
                  aria-label={`Offer ${o.code}`}
                >
                  <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/15" aria-hidden />
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-white/80">{o.category}</span>
                    <p className="mt-1 text-xl font-extrabold leading-snug">
                      {o.type === 'FLAT' ? `Flat ${inr(o.value)} OFF` : o.type === 'PERCENT' ? `${o.value}% OFF` : `${o.value}% Cashback`}
                    </p>
                    <p className="mt-1 line-clamp-2 text-sm text-white/85">{o.description}</p>
                  </div>
                  <div className="flex items-center justify-between">
                    <button onClick={() => copy(o.code)} className="glass-dark inline-flex min-h-[40px] items-center gap-2 rounded-xl px-3 text-sm font-bold tracking-wider" aria-label={`Copy code ${o.code}`}>
                      {o.code} <Copy className="h-3.5 w-3.5" />
                    </button>
                    <span className="text-xs text-white/80">Till {formatDate(o.validTill, { day: 'numeric', month: 'short' })}</span>
                  </div>
                </motion.article>
              ))}
        </div>
      </section>

      {/* POPULAR ROUTES */}
      <section className="container-app mt-12" aria-labelledby="routes-h">
        <h2 id="routes-h" className="text-2xl font-extrabold">Popular routes</h2>
        <p className="text-sm text-muted">Most booked by travellers this week</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {routes === null
            ? Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-24" />)
            : routes.map((r, i) => (
                <motion.button
                  key={`${r.from}-${r.to}`}
                  initial={{ opacity: 0, y: 12 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.04 }}
                  whileHover={{ y: -3 }}
                  onClick={() => goRoute(r.from, r.to)}
                  className="group flex min-h-[44px] items-center justify-between rounded-2xl bg-card p-4 text-left transition hover:bg-white hover:shadow-lift"
                >
                  <div>
                    <p className="flex items-center gap-1.5 font-bold text-ink">
                      {r.from} <ArrowRight className="h-4 w-4 text-primary transition group-hover:translate-x-1" /> {r.to}
                    </p>
                    <p className="mt-1 text-sm text-muted">
                      Starting from <span className="font-bold text-green-600">{inr(r.startingFare)}</span>
                    </p>
                  </div>
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-primary shadow-soft">
                    <ArrowRight className="h-4 w-4" />
                  </span>
                </motion.button>
              ))}
        </div>
      </section>

      {/* NEARBY BOARDING POINTS */}
      <section className="container-app mt-12" aria-labelledby="nearby-h">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 id="nearby-h" className="text-2xl font-extrabold">Nearby boarding points</h2>
            <p className="text-sm text-muted">Catch your bus from the closest stop</p>
          </div>
          <button onClick={locate} className="inline-flex min-h-[44px] items-center gap-2 rounded-2xl bg-primary-50 px-4 text-sm font-semibold text-primary-700 hover:bg-primary-100">
            <LocateFixed className={`h-4 w-4 ${locating ? 'animate-spin' : ''}`} /> Use my location
          </button>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {NEARBY.map((p) => (
            <Card key={p.name} variant="white" hover className="flex gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl gradient-brand text-white">
                <MapPin className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <p className="truncate font-bold text-ink">{p.name}</p>
                <p className="truncate text-xs text-muted">{p.area}</p>
                <p className="mt-2 flex items-center gap-3 text-xs font-semibold text-slate-600">
                  <span className="flex items-center gap-1"><Navigation className="h-3.5 w-3.5 text-primary" /> {p.km} km</span>
                  <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5 text-accent" /> {p.buses} buses today</span>
                </p>
              </div>
            </Card>
          ))}
        </div>
      </section>

      {/* TRUST */}
      <section className="container-app mt-12">
        <div className="grid gap-4 rounded-3xl bg-brand-soft p-6 sm:grid-cols-3 sm:p-8">
          {[
            { icon: Star, title: '4.8 / 5 rating', text: 'Loved by 2 crore+ travellers' },
            { icon: ShieldCheck, title: 'Secure payments', text: 'PCI-DSS compliant checkout' },
            { icon: BadgePercent, title: 'Instant refunds', text: 'Cancel anytime, refund to wallet' },
          ].map((f) => (
            <div key={f.title} className="flex items-center gap-4">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-primary shadow-soft">
                <f.icon className="h-6 w-6" />
              </span>
              <div>
                <p className="font-bold">{f.title}</p>
                <p className="text-sm text-muted">{f.text}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
