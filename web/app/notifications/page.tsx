'use client';
// Notifications inbox with type filters, unread toggle and mark-as-read.
import { AnimatePresence, motion } from 'framer-motion';
import { AlarmClock, Bell, BellOff, CheckCheck, CircleCheck, CreditCard, MapPinned, Megaphone, TicketPercent } from 'lucide-react';
import { useState } from 'react';
import type { ReactNode } from 'react';
import { mockNotifications } from '@/components/account/mock';
import type { AppNotification, NotificationType } from '@/components/account/types';
import { Btn, Empty, PageShell, Skel, cx } from '@/components/account/ui';
import { callApi, useApi } from '@/components/account/useApi';

const META: Record<NotificationType, { label: string; icon: ReactNode; cls: string }> = {
  BOOKING_CONFIRMED: { label: 'Booking Confirmed', icon: <CircleCheck size={20} />, cls: 'bg-emerald-50 text-emerald-600' },
  BUS_DELAYED: { label: 'Bus Delayed', icon: <AlarmClock size={20} />, cls: 'bg-amber-50 text-amber-600' },
  BUS_ARRIVED: { label: 'Bus Arrived', icon: <MapPinned size={20} />, cls: 'bg-blue-50 text-blue-600' },
  OFFER: { label: 'Offers', icon: <Megaphone size={20} />, cls: 'bg-orange-50 text-orange-600' },
  COUPON: { label: 'Coupons', icon: <TicketPercent size={20} />, cls: 'bg-pink-50 text-pink-600' },
  PAYMENT_SUCCESS: { label: 'Payment Success', icon: <CreditCard size={20} />, cls: 'bg-violet-50 text-violet-600' },
};

const timeAgo = (s: string) => {
  const m = Math.round((Date.now() - new Date(s).getTime()) / 60000);
  if (m < 60) return `${Math.max(1, m)}m ago`;
  if (m < 1440) return `${Math.round(m / 60)}h ago`;
  return `${Math.round(m / 1440)}d ago`;
};

export default function NotificationsPage() {
  const { data, loading, setData } = useApi<AppNotification[]>('getNotifications', [], mockNotifications);
  const [filter, setFilter] = useState<NotificationType | 'ALL'>('ALL');
  const [unreadOnly, setUnreadOnly] = useState(false);
  const list = (data ?? []).filter(n => (filter === 'ALL' || n.type === filter) && (!unreadOnly || !n.read));
  const unread = (data ?? []).filter(n => !n.read).length;

  const markRead = (id: number) => {
    setData(d => d?.map(n => (n.id === id ? { ...n, read: true } : n)));
    void callApi('markNotificationRead', [id], null);
  };
  const markAll = () => (data ?? []).filter(n => !n.read).forEach(n => markRead(n.id));

  return (
    <PageShell title="Notifications" subtitle={`${unread} unread`} icon={<Bell />}
      actions={<Btn variant="secondary" className="bg-white/90" onClick={markAll} disabled={!unread}><CheckCheck size={16} /> Mark all read</Btn>}>
      {/* Filters */}
      <div className="mb-5 flex flex-wrap items-center gap-2" role="group" aria-label="Filter notifications">
        {(['ALL', ...Object.keys(META)] as (NotificationType | 'ALL')[]).map(k => (
          <button key={k} onClick={() => setFilter(k)} aria-pressed={filter === k}
            className={cx('min-h-[44px] rounded-full border px-4 text-sm font-semibold transition',
              filter === k ? 'border-transparent bg-slate-900 text-white' : 'border-slate-200 bg-white text-slate-600 hover:border-indigo-300')}>
            {k === 'ALL' ? 'All' : META[k].label}
          </button>
        ))}
        <label className="ml-auto flex min-h-[44px] cursor-pointer items-center gap-2 text-sm font-medium text-slate-600">
          <input type="checkbox" checked={unreadOnly} onChange={e => setUnreadOnly(e.target.checked)} className="h-5 w-5 accent-indigo-600" /> Unread only
        </label>
      </div>

      {loading ? <div className="space-y-3">{[0, 1, 2, 3].map(i => <Skel key={i} className="h-20" />)}</div>
        : list.length === 0 ? <Empty icon={<BellOff />} title="You're all caught up" text="No notifications match this filter." />
        : (
          <ul className="space-y-3">
            <AnimatePresence initial={false}>
              {list.map((n, i) => (
                <motion.li key={n.id} layout initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} transition={{ delay: i * 0.03 }}>
                  <button onClick={() => markRead(n.id)} aria-label={`${n.title}${n.read ? '' : ', unread. Mark as read'}`}
                    className={cx('flex w-full items-start gap-4 rounded-2xl border p-4 text-left transition hover:shadow-md',
                      n.read ? 'border-slate-200/70 bg-white' : 'border-indigo-200 bg-indigo-50/40')}>
                    <span className={cx('grid h-11 w-11 shrink-0 place-items-center rounded-2xl', META[n.type]?.cls ?? 'bg-slate-100')}>{META[n.type]?.icon ?? <Bell size={20} />}</span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center justify-between gap-2">
                        <span className="font-bold text-slate-900">{n.title}</span>
                        <span className="shrink-0 text-xs text-slate-400">{timeAgo(n.createdAt)}</span>
                      </span>
                      <span className="mt-0.5 block text-sm text-slate-600">{n.body}</span>
                      <span className="mt-1 block text-xs font-semibold text-slate-400">{META[n.type]?.label}</span>
                    </span>
                    {!n.read && <span className="mt-2 h-2.5 w-2.5 shrink-0 rounded-full bg-orange-500" aria-hidden />}
                  </button>
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        )}
    </PageShell>
  );
}
