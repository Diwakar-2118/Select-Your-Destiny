'use client';
// Admin dashboard: KPIs, bookings/revenue trend, top routes, payment split.
import { mockDashboard } from '@/components/account/mock';
import type { Dashboard } from '@/components/account/types';
import { Skel } from '@/components/account/ui';
import { useApi } from '@/components/account/useApi';
import { BookingsRevenueChart, ChartCard, KpiCards, PaymentSplitChart, TopRoutesChart } from '@/components/admin/Charts';

export default function AdminDashboardPage() {
  const { data } = useApi<Dashboard>('admin.dashboard', [], mockDashboard);
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900">Dashboard</h1>
        <p className="text-sm text-slate-500">Overview of bookings, revenue and fleet activity.</p>
      </div>
      <KpiCards d={data} />
      <div className="grid gap-5 xl:grid-cols-3">
        <ChartCard title="Bookings & revenue (last 14 days)" className="xl:col-span-2">
          {data ? <BookingsRevenueChart data={data.bookingsByDay} /> : <Skel className="h-full" />}
        </ChartCard>
        <ChartCard title="Payment split">
          {data ? <PaymentSplitChart data={data.paymentSplit} /> : <Skel className="h-full" />}
        </ChartCard>
      </div>
      <ChartCard title="Top routes">
        {data ? <TopRoutesChart data={data.topRoutes} /> : <Skel className="h-full" />}
      </ChartCard>
    </div>
  );
}
