import type { Amenity, BusType, FareBreakdown, Seat } from './types';

export function cn(...classes: unknown[]): string {
  return classes.filter(Boolean).join(' ');
}

export const inr = (n: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n || 0);

export const inr2 = (n: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(
    n || 0,
  );

export const round2 = (n: number) => Math.round(n * 100) / 100;

export function formatDuration(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h}h ${m.toString().padStart(2, '0')}m`;
}

export function formatDate(d: string, opts: Intl.DateTimeFormatOptions = { weekday: 'short', day: 'numeric', month: 'short' }) {
  const date = new Date(d.length === 10 ? `${d}T00:00:00` : d);
  if (isNaN(date.getTime())) return d;
  return date.toLocaleDateString('en-IN', opts);
}

export function todayISO(offsetDays = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export const BUS_TYPE_LABEL: Record<BusType, string> = {
  AC_SEATER: 'A/C Seater',
  NON_AC_SEATER: 'Non A/C Seater',
  AC_SLEEPER: 'A/C Sleeper',
  NON_AC_SLEEPER: 'Non A/C Sleeper',
  AC_SEMI_SLEEPER: 'A/C Semi Sleeper',
  VOLVO_MULTI_AXLE: 'Volvo Multi-Axle',
  ELECTRIC: 'Electric',
  PUSH_BACK: 'Push Back',
};

export const AMENITY_LABEL: Record<Amenity, string> = {
  CHARGING_PORT: 'Charging Port',
  WATER_BOTTLE: 'Water Bottle',
  BLANKET: 'Blanket',
  LIVE_TRACKING: 'Live Tracking',
  CCTV: 'CCTV',
  WIFI: 'WiFi',
  READING_LIGHT: 'Reading Light',
};

export const isSleeperType = (t: BusType) => t === 'AC_SLEEPER' || t === 'NON_AC_SLEEPER';

export function departureSlot(time: string): 'MORNING' | 'AFTERNOON' | 'EVENING' | 'NIGHT' {
  const h = parseInt(time.slice(0, 2), 10);
  if (h >= 5 && h < 12) return 'MORNING';
  if (h >= 12 && h < 17) return 'AFTERNOON';
  if (h >= 17 && h < 21) return 'EVENING';
  return 'NIGHT';
}

/** Fare rules from the contract. */
export function computeFare(seats: Pick<Seat, 'price'>[], discountPercent: number, couponDiscount = 0): FareBreakdown {
  const baseFare = round2(seats.reduce((s, x) => s + x.price, 0));
  const gst = round2(baseFare * 0.05);
  const platformFee = seats.length ? 15 : 0;
  const convenienceFee = round2(baseFare * 0.02);
  const discount = round2((baseFare * (discountPercent || 0)) / 100);
  const grandTotal = round2(Math.max(0, baseFare + gst + platformFee + convenienceFee - discount - couponDiscount));
  return { baseFare, gst, platformFee, convenienceFee, discount, couponDiscount: round2(couponDiscount), grandTotal };
}
