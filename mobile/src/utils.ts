import { BusType } from './types';

export const inr = (n: number) =>
  `₹${(Math.round(n * 100) / 100).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

export const duration = (mins: number) => `${Math.floor(mins / 60)}h ${mins % 60}m`;

export const busTypeLabel: Record<BusType, string> = {
  AC_SEATER: 'AC Seater', NON_AC_SEATER: 'Non AC Seater', AC_SLEEPER: 'AC Sleeper',
  NON_AC_SLEEPER: 'Non AC Sleeper', AC_SEMI_SLEEPER: 'AC Semi Sleeper',
  VOLVO_MULTI_AXLE: 'Volvo Multi-Axle', ELECTRIC: 'Electric', PUSH_BACK: 'Push Back',
};

export const prettyDate = (iso: string) => {
  const d = new Date(`${iso}T00:00:00`);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
};

export const addDays = (iso: string, n: number) => {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export const isEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim());
export const isMobile = (s: string) => /^[6-9]\d{9}$/.test(s.trim());
export const isGstin = (s: string) => /^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(s.trim().toUpperCase());
