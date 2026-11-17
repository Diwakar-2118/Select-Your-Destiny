'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Mail, MapPin, Phone, ShieldCheck } from 'lucide-react';
import { CHROMELESS } from './Navbar';
import { Logo } from './Logo';

const COLS = [
  { title: 'Company', links: [['About us', '/'], ['Offers', '/offers'], ['Careers', '/'], ['Blog', '/']] },
  { title: 'Help', links: [['Support', '/support'], ['My Bookings', '/bookings'], ['Cancel ticket', '/bookings'], ['Track bus', '/bookings']] },
  { title: 'Top routes', links: [['Bengaluru → Chennai', '/search?from=Bengaluru&to=Chennai'], ['Mumbai → Pune', '/search?from=Mumbai&to=Pune'], ['Delhi → Jaipur', '/search?from=Delhi&to=Jaipur'], ['Mumbai → Goa', '/search?from=Mumbai&to=Goa']] },
];

export function Footer() {
  const pathname = usePathname() || '/';
  if (CHROMELESS(pathname)) return null;
  return (
    <footer className="mt-16 border-t border-gray-100 bg-card/60 pb-24 lg:pb-0">
      <div className="container-app grid gap-10 py-12 md:grid-cols-5">
        <div className="md:col-span-2">
          <Logo />
          <p className="mt-4 max-w-sm text-sm text-muted">
            Premium intercity bus travel across India. Compare 2,500+ operators, pick your favourite seat and travel comfortably.
          </p>
          <ul className="mt-5 space-y-2 text-sm text-slate-600">
            <li className="flex items-center gap-2"><Phone className="h-4 w-4 text-primary" /> 1800-123-4567</li>
            <li className="flex items-center gap-2"><Mail className="h-4 w-4 text-primary" /> care@selectyourdestiny.in</li>
            <li className="flex items-center gap-2"><MapPin className="h-4 w-4 text-primary" /> Bengaluru, India</li>
          </ul>
        </div>
        {COLS.map((c) => (
          <nav key={c.title} aria-label={c.title}>
            <h3 className="text-sm font-bold text-ink">{c.title}</h3>
            <ul className="mt-3 space-y-1">
              {c.links.map(([label, href]) => (
                <li key={label}>
                  <Link href={href} className="inline-flex min-h-[36px] items-center text-sm text-slate-600 hover:text-primary">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>
      <div className="border-t border-gray-200">
        <div className="container-app flex flex-col items-center justify-between gap-2 py-5 text-xs text-muted sm:flex-row">
          <p>© {new Date().getFullYear()} Select Your Destiny. All rights reserved.</p>
          <p className="flex items-center gap-1"><ShieldCheck className="h-4 w-4 text-green-600" /> 100% secure payments</p>
        </div>
      </div>
    </footer>
  );
}
