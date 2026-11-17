'use client';
// Admin chrome: responsive sidebar navigation + ADMIN role guard (with dev-only demo bypass).
import { AnimatePresence, motion } from 'framer-motion';
import { Armchair, BarChart3, Building2, Bus, CreditCard, FileSpreadsheet, LayoutDashboard, Map, Menu, ShieldAlert, Ticket, TicketPercent, UserCog, X } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { useSession } from '@/components/account/session';
import { Btn, GRADIENT, Skel, cx } from '@/components/account/ui';

export const ADMIN_NAV = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/operators', label: 'Operators', icon: Building2 },
  { href: '/admin/routes', label: 'Routes', icon: Map },
  { href: '/admin/buses', label: 'Buses', icon: Bus },
  { href: '/admin/seats', label: 'Seats', icon: Armchair },
  { href: '/admin/drivers', label: 'Drivers', icon: UserCog },
  { href: '/admin/coupons', label: 'Coupons', icon: TicketPercent },
  { href: '/admin/bookings', label: 'Bookings', icon: Ticket },
  { href: '/admin/payments', label: 'Payments', icon: CreditCard },
  { href: '/admin/reports', label: 'Reports', icon: FileSpreadsheet },
  { href: '/admin/analytics', label: 'Analytics', icon: BarChart3 },
];

const BYPASS_KEY = 'syd_admin_demo';
const IS_DEV = process.env.NODE_ENV !== 'production' || process.env.NEXT_PUBLIC_ADMIN_DEMO === 'true';

function NavList({ onNavigate }: { onNavigate?: () => void }) {
  const path = usePathname();
  return (
    <nav aria-label="Admin navigation" className="space-y-1">
      {ADMIN_NAV.map(({ href, label, icon: Icon }) => {
        const active = href === '/admin' ? path === '/admin' : path?.startsWith(href);
        return (
          <Link key={href} href={href} onClick={onNavigate} aria-current={active ? 'page' : undefined}
            className={cx('relative flex min-h-[44px] items-center gap-3 rounded-xl px-3 text-sm font-semibold transition-colors',
              active ? 'text-white' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900')}>
            {active && <motion.span layoutId="admin-nav" className="absolute inset-0 rounded-xl shadow-md" style={{ background: GRADIENT }} transition={{ type: 'spring', damping: 30, stiffness: 380 }} />}
            <Icon size={18} className="relative" />
            <span className="relative">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

export function AdminShell({ children }: { children: ReactNode }) {
  const { user, isAdmin, loading } = useSession();
  const [bypass, setBypass] = useState(false);
  const [ready, setReady] = useState(false);
  const [open, setOpen] = useState(false);
  const path = usePathname() ?? '';

  useEffect(() => {
    try { setBypass(IS_DEV && localStorage.getItem(BYPASS_KEY) === '1'); } catch { /* ignore */ }
    setReady(true);
  }, []);

  if (!ready || loading) return <div className="mx-auto max-w-6xl p-6"><Skel className="h-96" /></div>;

  if (!isAdmin && !bypass) {
    return (
      <div className="grid min-h-[70vh] place-items-center px-4">
        <div className="max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-xl">
          <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-2xl text-white" style={{ background: GRADIENT }}><ShieldAlert size={28} /></div>
          <h1 className="text-xl font-extrabold">Admins only</h1>
          <p className="mt-2 text-sm text-slate-500">
            {user ? `You are signed in as ${user.email}, which does not have admin access.` : 'Please sign in with an admin account to open the control panel.'}
            {' '}Demo admin: <b>admin@destiny.com / Admin@123</b>
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            <Link href="/login"><Btn>Sign in</Btn></Link>
            {IS_DEV && (
              <Btn variant="outline" onClick={() => { try { localStorage.setItem(BYPASS_KEY, '1'); } catch { /* ignore */ } setBypass(true); }}>
                Continue in demo mode
              </Btn>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-slate-50/60">
      {/* Desktop sidebar */}
      <aside className="sticky top-16 hidden h-[calc(100vh-4rem)] w-64 shrink-0 flex-col border-r border-slate-200/70 bg-white/80 p-4 backdrop-blur-xl lg:flex">
        <Link href="/admin" className="mb-6 flex items-center gap-2 px-2">
          <span className="grid h-10 w-10 place-items-center rounded-xl text-white" style={{ background: GRADIENT }}><Bus size={20} /></span>
          <span><span className="block text-sm font-extrabold leading-tight">Select Your Destiny</span><span className="text-xs text-slate-500">Admin Console</span></span>
        </Link>
        <NavList />
        <div className="mt-auto rounded-xl bg-slate-50 p-3 text-xs text-slate-500">
          Signed in as <b className="text-slate-700">{user?.name ?? 'Demo Admin'}</b>
          {bypass && !isAdmin && (
            <button className="mt-1 block text-indigo-600 underline" onClick={() => { try { localStorage.removeItem(BYPASS_KEY); } catch { /* ignore */ } setBypass(false); }}>Exit demo mode</button>
          )}
        </div>
      </aside>

      {/* Mobile drawer */}
      <AnimatePresence>
        {open && (
          <motion.div className="fixed inset-0 z-50 bg-slate-900/40 lg:hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setOpen(false)}>
            <motion.aside initial={{ x: -280 }} animate={{ x: 0 }} exit={{ x: -280 }} transition={{ type: 'spring', damping: 28 }}
              onClick={e => e.stopPropagation()} className="h-full w-72 bg-white p-4 shadow-2xl">
              <div className="mb-4 flex items-center justify-between">
                <span className="font-extrabold">Admin Console</span>
                <button onClick={() => setOpen(false)} aria-label="Close menu" className="grid h-11 w-11 place-items-center rounded-xl hover:bg-slate-100"><X /></button>
              </div>
              <NavList onNavigate={() => setOpen(false)} />
            </motion.aside>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="min-w-0 flex-1">
        <div className="sticky top-16 z-30 flex items-center gap-3 border-b border-slate-200/70 bg-white/80 px-4 py-2 backdrop-blur-xl lg:hidden">
          <button onClick={() => setOpen(true)} aria-label="Open admin menu" className="grid h-11 w-11 place-items-center rounded-xl hover:bg-slate-100"><Menu /></button>
          <span className="font-bold">Admin Console</span>
        </div>
        <motion.div key={path} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }} className="mx-auto max-w-7xl p-4 sm:p-6">
          {children}
        </motion.div>
      </div>
    </div>
  );
}

