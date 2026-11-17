'use client';
// Analytics: deeper charts derived from the dashboard dataset.
import { mockDashboard } from '@/components/account/mock';
import type { Dashboard } from '@/components/account/types';
import { Panel, Skel } from '@/components/account/ui';
import { useApi } from '@/components/account/useApi';
import { BookingsRevenueChart, ChartCard, PaymentSplitChart, RevenueArea, TopRoutesChart, rupees } from '@/components/admin/Charts';

export default function AnalyticsPage() {
  const { data } = useApi<Dashboard>('admin.dashboard', [], mockDashboard);
  const days = data?.bookingsByDay ?? [];
  const totalRev = days.reduce((s, d) => s + d.revenue, 0);
  const totalCnt = days.reduce((s, d) => s + d.count, 0);
  const peak = days.reduce<{ date: string; count: number } | null>((p, d) => (!p || d.count > p.count ? d : p), null);
  const stats = [
    { label: 'Avg. ticket value', value: totalCnt ? rupees(totalRev / totalCnt) : '—' },
    { label: 'Avg. bookings / day', value: days.length ? Math.round(totalCnt / days.length).toLocaleString('en-IN') : '—' },
    { label: 'Peak day', value: peak ? `${peak.date} (${peak.count})` : '—' },
    { label: '14-day revenue', value: rupees(totalRev) },
  ];
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900">Analytics</h1>
        <p className="text-sm text-slate-500">Trends across bookings, revenue, routes and payment methods.</p>
      </div>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map(s => (
          <Panel key={s.label} className="p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{s.label}</p>
            {data ? <p className="mt-1 text-xl font-extrabold">{s.value}</p> : <Skel className="mt-2 h-7" />}
          </Panel>
        ))}
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        <ChartCard title="Revenue trend">{data ? <RevenueArea data={days} /> : <Skel className="h-full" />}</ChartCard>
        <ChartCard title="Bookings vs revenue">{data ? <BookingsRevenueChart data={days} /> : <Skel className="h-full" />}</ChartCard>
        <ChartCard title="Route demand">{data ? <TopRoutesChart data={data.topRoutes} /> : <Skel className="h-full" />}</ChartCard>
        <ChartCard title="Payment methods">{data ? <PaymentSplitChart data={data.paymentSplit} /> : <Skel className="h-full" />}</ChartCard>
      </div>
    </div>
  );
}
