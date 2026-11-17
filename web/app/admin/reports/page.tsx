'use client';
// Reports: pick a date range, view the filtered summary and export CSVs.
import { Download, FileSpreadsheet } from 'lucide-react';
import { useState } from 'react';
import { mockDashboard } from '@/components/account/mock';
import type { Dashboard } from '@/components/account/types';
import { Btn, Field, Panel, Skel } from '@/components/account/ui';
import { inr, useApi } from '@/components/account/useApi';
import { ChartCard, KpiCards, RevenueArea } from '@/components/admin/Charts';
import { downloadCsv, toCsv } from '@/components/admin/CrudTable';

const iso = (d: Date) => d.toISOString().slice(0, 10);

export default function ReportsPage() {
  const [from, setFrom] = useState(iso(new Date(Date.now() - 13 * 864e5)));
  const [to, setTo] = useState(iso(new Date()));
  const [range, setRange] = useState({ from, to });
  const invalid = from > to;
  const { data, loading } = useApi<Dashboard>('admin.reports', [range.from, range.to], mockDashboard);

  const exportDaily = () => data && downloadCsv(`report-daily-${range.from}_${range.to}.csv`,
    toCsv([{ key: 'date', label: 'Date' }, { key: 'count', label: 'Bookings' }, { key: 'revenue', label: 'Revenue' }], data.bookingsByDay));
  const exportFull = () => {
    if (!data) return;
    const lines = [
      `Report,${range.from} to ${range.to}`,
      `Total bookings,${data.totalBookings}`, `Revenue,${data.revenue}`, `Active buses,${data.activeBuses}`, `Users,${data.users}`, '',
      toCsv([{ key: 'date', label: 'Date' }, { key: 'count', label: 'Bookings' }, { key: 'revenue', label: 'Revenue' }], data.bookingsByDay), '',
      toCsv([{ key: 'route', label: 'Route' }, { key: 'bookings', label: 'Bookings' }], data.topRoutes), '',
      toCsv([{ key: 'method', label: 'Payment method' }, { key: 'amount', label: 'Amount' }], data.paymentSplit),
    ];
    downloadCsv(`report-${range.from}_${range.to}.csv`, lines.join('\n'));
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900">Reports</h1>
        <p className="text-sm text-slate-500">Generate business reports for any period and export to CSV.</p>
      </div>
      <Panel>
        <form className="flex flex-wrap items-end gap-3" onSubmit={e => { e.preventDefault(); if (!invalid) setRange({ from, to }); }}>
          <Field label="From" type="date" value={from} max={to} onChange={e => setFrom(e.target.value)} />
          <Field label="To" type="date" value={to} min={from} onChange={e => setTo(e.target.value)} />
          <Btn type="submit" disabled={invalid}><FileSpreadsheet size={16} /> Generate</Btn>
          <div className="ml-auto flex flex-wrap gap-2">
            <Btn type="button" variant="outline" onClick={exportDaily} disabled={!data}><Download size={16} /> Daily CSV</Btn>
            <Btn type="button" variant="outline" onClick={exportFull} disabled={!data}><Download size={16} /> Full report CSV</Btn>
          </div>
        </form>
        {invalid && <p className="mt-2 text-sm text-red-600" role="alert">“From” date must be before “To” date.</p>}
      </Panel>

      <KpiCards d={loading ? undefined : data} />

      <ChartCard title={`Revenue ${range.from} → ${range.to}`}>{data && !loading ? <RevenueArea data={data.bookingsByDay} /> : <Skel className="h-full" />}</ChartCard>

      <Panel className="overflow-x-auto p-0">
        <table className="w-full min-w-[480px] text-left text-sm">
          <caption className="sr-only">Daily breakdown</caption>
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-4 py-3">Date</th><th className="px-4 py-3">Bookings</th><th className="px-4 py-3">Revenue</th></tr></thead>
          <tbody className="divide-y divide-slate-100">
            {(data?.bookingsByDay ?? []).map(d => (
              <tr key={d.date}><td className="px-4 py-2.5">{d.date}</td><td className="px-4 py-2.5">{d.count}</td><td className="px-4 py-2.5 font-semibold">{inr(d.revenue)}</td></tr>
            ))}
          </tbody>
        </table>
      </Panel>
    </div>
  );
}
