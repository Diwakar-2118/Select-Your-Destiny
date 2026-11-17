import Link from 'next/link';
import { cn } from '@/lib/utils';

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={cn('h-9 w-9', className)} aria-hidden>
      <defs>
        <linearGradient id="syd-logo" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#2563EB" />
          <stop offset="60%" stopColor="#6D28D9" />
          <stop offset="100%" stopColor="#F97316" />
        </linearGradient>
      </defs>
      <rect width="40" height="40" rx="12" fill="url(#syd-logo)" />
      <rect x="9" y="10" width="22" height="17" rx="4" fill="#fff" />
      <rect x="11.5" y="12.5" width="7.5" height="6" rx="1.5" fill="#2563EB" />
      <rect x="21" y="12.5" width="7.5" height="6" rx="1.5" fill="#6D28D9" />
      <circle cx="14" cy="29" r="2.6" fill="#fff" />
      <circle cx="26" cy="29" r="2.6" fill="#fff" />
      <rect x="12" y="22" width="16" height="1.8" rx="0.9" fill="#F97316" />
    </svg>
  );
}

export function Logo({ className, light }: { className?: string; light?: boolean }) {
  return (
    <Link href="/" className={cn('inline-flex min-h-[44px] items-center gap-2.5', className)} aria-label="Select Your Destiny home">
      <LogoMark />
      <span className="leading-tight">
        <span className={cn('block text-base font-extrabold tracking-tight', light ? 'text-white' : 'text-ink')}>Select Your Destiny</span>
        <span className={cn('hidden text-[11px] font-medium sm:block', light ? 'text-white/80' : 'text-muted')}>
          Book Smart. Travel Comfortably.
        </span>
      </span>
    </Link>
  );
}
