'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Bell, Gift, Home, LayoutDashboard, LifeBuoy, LogIn, LogOut, Menu, Ticket, User, X } from 'lucide-react';
import { useAuth } from '@/lib/store';
import { cn } from '@/lib/utils';
import { Logo } from './Logo';

export interface NavLink {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  adminOnly?: boolean;
}

export const NAV_LINKS: NavLink[] = [
  { href: '/', label: 'Home', icon: Home },
  { href: '/offers', label: 'Offers', icon: Gift },
  { href: '/bookings', label: 'My Bookings', icon: Ticket },
  { href: '/notifications', label: 'Notifications', icon: Bell },
  { href: '/profile', label: 'Profile', icon: User },
  { href: '/support', label: 'Support', icon: LifeBuoy },
  { href: '/admin', label: 'Admin', icon: LayoutDashboard, adminOnly: true },
];

/** Routes rendered without the customer chrome (splash, admin console). */
export const CHROMELESS = (p: string) => p.startsWith('/splash') || p.startsWith('/admin');

export function isActive(pathname: string, href: string) {
  return href === '/' ? pathname === '/' : pathname.startsWith(href);
}

export function Navbar() {
  const pathname = usePathname() || '/';
  const router = useRouter();
  const { user, isAdmin, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  useEffect(() => setOpen(false), [pathname]);

  if (CHROMELESS(pathname)) return null;
  const links = NAV_LINKS.filter((l) => !l.adminOnly || isAdmin);

  return (
    <header
      className={cn(
        'sticky top-0 z-50 transition-all duration-300',
        scrolled ? 'glass border-b border-white/40' : 'bg-white/90 backdrop-blur',
      )}
    >
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-2 focus:z-50 focus:rounded-xl focus:bg-white focus:px-4 focus:py-2 focus:shadow">
        Skip to content
      </a>
      <nav className="container-app flex h-16 items-center justify-between gap-4" aria-label="Main">
        <Logo />
        <ul className="hidden items-center gap-1 lg:flex">
          {links.map((l) => {
            const active = isActive(pathname, l.href);
            return (
              <li key={l.href}>
                <Link
                  href={l.href}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'relative inline-flex min-h-[44px] items-center gap-1.5 rounded-xl px-3 text-sm font-semibold transition-colors',
                    active ? 'text-primary-700' : 'text-slate-600 hover:bg-card hover:text-ink',
                  )}
                >
                  <l.icon className="h-4 w-4" />
                  {l.label}
                  {active && <motion.span layoutId="nav-underline" className="absolute inset-x-3 -bottom-0.5 h-0.5 rounded-full gradient-brand" />}
                </Link>
              </li>
            );
          })}
        </ul>
        <div className="flex items-center gap-2">
          {user ? (
            <div className="hidden items-center gap-2 sm:flex">
              <Link href="/profile" className="inline-flex min-h-[44px] items-center gap-2 rounded-2xl bg-card px-3 text-sm font-semibold text-ink hover:bg-gray-200">
                <span className="flex h-7 w-7 items-center justify-center rounded-full gradient-brand text-xs text-white">
                  {user.name.charAt(0).toUpperCase()}
                </span>
                <span className="max-w-[120px] truncate">{user.name.split(' ')[0]}</span>
              </Link>
              <button
                onClick={() => {
                  signOut();
                  router.push('/');
                }}
                className="inline-flex h-11 w-11 items-center justify-center rounded-2xl text-muted hover:bg-card hover:text-ink"
                aria-label="Sign out"
              >
                <LogOut className="h-5 w-5" />
              </button>
            </div>
          ) : (
            <Link
              href={`/login?next=${encodeURIComponent(pathname)}`}
              className="hidden min-h-[44px] items-center gap-2 rounded-2xl gradient-brand px-5 text-sm font-semibold text-white shadow-lift sm:inline-flex"
            >
              <LogIn className="h-4 w-4" /> Login
            </Link>
          )}
          <button
            className="inline-flex h-11 w-11 items-center justify-center rounded-2xl hover:bg-card lg:hidden"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            aria-controls="mobile-menu"
            aria-label={open ? 'Close menu' : 'Open menu'}
          >
            {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </nav>
      <AnimatePresence>
        {open && (
          <motion.div
            id="mobile-menu"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-t border-gray-100 bg-white lg:hidden"
          >
            <ul className="container-app grid gap-1 py-3">
              {links.map((l) => (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    aria-current={isActive(pathname, l.href) ? 'page' : undefined}
                    className={cn(
                      'flex min-h-[48px] items-center gap-3 rounded-2xl px-4 font-semibold',
                      isActive(pathname, l.href) ? 'bg-primary-50 text-primary-700' : 'text-ink hover:bg-card',
                    )}
                  >
                    <l.icon className="h-5 w-5" /> {l.label}
                  </Link>
                </li>
              ))}
              <li>
                {user ? (
                  <button
                    onClick={() => {
                      signOut();
                      router.push('/');
                    }}
                    className="flex min-h-[48px] w-full items-center gap-3 rounded-2xl px-4 font-semibold text-red-600 hover:bg-red-50"
                  >
                    <LogOut className="h-5 w-5" /> Sign out
                  </button>
                ) : (
                  <Link href="/login" className="flex min-h-[48px] items-center justify-center gap-2 rounded-2xl gradient-brand px-4 font-semibold text-white">
                    <LogIn className="h-5 w-5" /> Login / Sign up
                  </Link>
                )}
              </li>
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
