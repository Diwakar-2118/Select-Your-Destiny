'use client';
// My Bookings: Upcoming / Completed / Cancelled tabs with actionable ticket cards.
import { AnimatePresence, motion } from 'framer-motion';
import { Ticket } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { TicketCard } from '@/components/account/TicketCard';
import { mockBookings } from '@/components/account/mock';
import { useSession } from '@/components/account/session';
import type { Booking } from '@/components/account/types';
import { Btn, Empty, PageShell, Skel, TabBar, ToastHost } from '@/components/account/ui';
import { useApi } from '@/components/account/useApi';

type Tab = 'UPCOMING' | 'COMPLETED' | 'CANCELLED';
const match: Record<Tab, (b: Booking) => boolean> = {
  UPCOMING: b => b.status === 'CONFIRMED' || b.status === 'PENDING',
  COMPLETED: b => b.status === 'COMPLETED',
  CANCELLED: b => b.status === 'CANCELLED',
};

export default function BookingsPage() {
  return <ToastHost><BookingsInner /></ToastHost>;
}

function BookingsInner() {
  const [tab, setTab] = useState<Tab>('UPCOMING');
  const { token } = useSession();
  const { data, loading, setData } = useApi<Booking[]>('getBookings', [tab], () => mockBookings.filter(match[tab]));
  // Locally-updated bookings move between tabs (e.g. cancel moves to Cancelled).
  const list = (data ?? []).filter(match[tab]);

  const onChanged = (nb: Booking) => setData(prev => (prev ?? []).map(b => (b.id === nb.id ? nb : b)));

  return (
    <PageShell title="My Bookings" subtitle="Manage, track and download your tickets" icon={<Ticket />}>
      <div className="mb-5 max-w-lg">
        <TabBar label="Booking status" value={tab} onChange={setTab}
          tabs={[{ value: 'UPCOMING', label: 'Upcoming' }, { value: 'COMPLETED', label: 'Completed' }, { value: 'CANCELLED', label: 'Cancelled' }]} />
      </div>
      <div role="tabpanel" aria-busy={loading}>
        {loading ? (
          <div className="grid gap-4 md:grid-cols-2">{[0, 1, 2, 3].map(i => <Skel key={i} className="h-64" />)}</div>
        ) : list.length === 0 ? (
          <Empty icon={<Ticket />} title={`No ${tab.toLowerCase()} trips`} text="When you book a journey it will show up here."
            action={<Link href="/"><Btn>Book a bus</Btn></Link>} />
        ) : (
          <AnimatePresence mode="popLayout">
            <motion.div key={tab} className="grid gap-4 md:grid-cols-2" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              {list.map((b, i) => <TicketCard key={b.id} booking={b} token={token} index={i} onChanged={onChanged} />)}
            </motion.div>
          </AnimatePresence>
        )}
      </div>
    </PageShell>
  );
}
