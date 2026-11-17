'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { Bell, Gift, Home, Ticket, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CHROMELESS, isActive } from './Navbar';

const ITEMS = [
  { href: '/', label: 'Home', icon: Home },
  { href: '/offers', label: 'Offers', icon: Gift },
  { href: '/bookings', label: 'Bookings', icon: Ticket },
  { href: '/notifications', label: 'Alerts', icon: Bell },
  { href: '/profile', label: 'Profile', icon: User },
];

/** Bottom tab bar for phones. Pages should keep `pb-24 lg:pb-0` room (layout handles this). */
export function MobileNav() {
  const pathname = usePathname() || '/';
  if (CHROMELESS(pathname)) return null;
  // hide during booking flow where pages use their own sticky CTA bars
  if (/^\/(trip|passengers|summary|checkout)/.test(pathname)) return null;
  return (
    <nav aria-label="Primary mobile" className="glass fixed inset-x-0 bottom-0 z-40 border-t border-white/50 pb-[env(safe-area-inset-bottom)] lg:hidden">
      <ul className="mx-auto grid max-w-md grid-cols-5">
        {ITEMS.map((it) => {
          const active = isActive(pathname, it.href);
          return (
            <li key={it.href}>
              <Link
                href={it.href}
                aria-current={active ? 'page' : undefined}
                className={cn('relative flex min-h-[60px] flex-col items-center justify-center gap-0.5 text-[11px] font-semibold', active ? 'text-primary-700' : 'text-slate-500')}
              >
                {active && <motion.span layoutId="mnav-pill" className="absolute top-1 h-1 w-8 rounded-full gradient-brand" />}
                <it.icon className="h-5 w-5" aria-hidden />
                {it.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
