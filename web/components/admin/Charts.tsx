'use client';
// KPI cards + recharts visualisations shared by Dashboard, Reports and Analytics.
import { motion } from 'framer-motion';
import { Bus, IndianRupee, Ticket, Users } from 'lucide-react';
import type { ReactNode } from 'react';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { Dashboard } from '@/components/account/types';
import { GRADIENT, Panel, Skel } from '@/components/account/ui';

export const BRAND = ['#2563EB', '#6D28D9', '#F97316', '#0EA5E9', '#EC4899', '#22C55E', '#64748B'];
const compact = (n: number) => new Intl.NumberFormat('en-IN', { notation: 'compact', maximumFractionDigits: 1 }).format(n);
export const rupees = (n: number) => `₹${compact(n)}`;

export function KpiCards({ d }: { d?: Dashboard }) {
  const items: { label: string; value: string; icon: ReactNode }[] = d ? [
    { label: 'Total bookings', value: compact(d.totalBookings), icon: <Ticket /> },
    { label: 'Revenue', value: rupees(d.revenue), icon: <IndianRupee /> },
    { label: 'Active buses', value: compact(d.activeBuses), icon: <Bus /> },
    { label: 'Users', value: compact(d.users), icon: <Users /> },
  ] : [];
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {!d ? [0, 1, 2, 3].map(i => <Skel key={i} className="h-28" />) : items.map((k, i) => (
        <motion.div key={k.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
          className="relative overflow-hidden rounded-2xl border border-slate-200/70 bg-white p-5 shadow-[0_4px_24px_-8px_rgba(15,23,42,0.08)]">
          <div className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full opacity-15 blur-xl" style={{ background: GRADIENT }} />
          <span className="grid h-11 w-11 place-items-center rounded-xl text-white" style={{ background: GRADIENT }}>{k.icon}</span>
          <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-slate-500">{k.label}</p>
          <p className="text-2xl font-extrabold text-slate-900">{k.value}</p>
        </motion.div>
      ))}
    </div>
  );
}

export function ChartCard({ title, children, className }: { title: string; children: ReactNode; className?: string }) {
  return (
    <Panel className={className}>
      <h2 className="mb-3 font-bold text-slate-900">{title}</h2>
      <div className="h-72 w-full" role="img" aria-label={title}>{children}</div>
    </Panel>
  );
}

const axis = { stroke: '#94A3B8', fontSize: 12, tickLine: false, axisLine: false } as const;
const tip = { contentStyle: { borderRadius: 12, border: '1px solid #E2E8F0', boxShadow: '0 8px 24px -8px rgba(15,23,42,.15)' } };

export function BookingsRevenueChart({ data }: { data: Dashboard['bookingsByDay'] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid stroke="#F1F5F9" vertical={false} />
        <XAxis dataKey="date" {...axis} />
        <YAxis yAxisId="l" {...axis} width={40} />
        <YAxis yAxisId="r" orientation="right" {...axis} width={56} tickFormatter={v => rupees(Number(v))} />
        <Tooltip {...tip} formatter={(v, n) => (n === 'Revenue' ? `₹${Number(v).toLocaleString('en-IN')}` : String(v))} />
        <Legend />
        <Line yAxisId="l" type="monotone" dataKey="count" name="Bookings" stroke="#2563EB" strokeWidth={2.5} dot={false} />
        <Line yAxisId="r" type="monotone" dataKey="revenue" name="Revenue" stroke="#F97316" strokeWidth={2.5} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function RevenueArea({ data }: { data: Dashboard['bookingsByDay'] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <defs><linearGradient id="ra" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#6D28D9" stopOpacity={0.35} /><stop offset="1" stopColor="#6D28D9" stopOpacity={0} /></linearGradient></defs>
        <CartesianGrid stroke="#F1F5F9" vertical={false} />
        <XAxis dataKey="date" {...axis} />
        <YAxis {...axis} width={56} tickFormatter={v => rupees(Number(v))} />
        <Tooltip {...tip} formatter={v => `₹${Number(v).toLocaleString('en-IN')}`} />
        <Area type="monotone" dataKey="revenue" name="Revenue" stroke="#6D28D9" strokeWidth={2.5} fill="url(#ra)" />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function TopRoutesChart({ data }: { data: Dashboard['topRoutes'] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 0 }}>
        <CartesianGrid stroke="#F1F5F9" horizontal={false} />
        <XAxis type="number" {...axis} />
        <YAxis type="category" dataKey="route" {...axis} width={110} />
        <Tooltip {...tip} cursor={{ fill: '#F1F5F9' }} />
        <Bar dataKey="bookings" name="Bookings" radius={[0, 8, 8, 0]} barSize={18}>
          {data.map((_, i) => <Cell key={i} fill={BRAND[i % 3]} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function PaymentSplitChart({ data }: { data: Dashboard['paymentSplit'] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie data={data} dataKey="amount" nameKey="method" innerRadius="55%" outerRadius="85%" paddingAngle={3} stroke="#fff" strokeWidth={2}>
          {data.map((_, i) => <Cell key={i} fill={BRAND[i % BRAND.length]} />)}
        </Pie>
        <Tooltip {...tip} formatter={v => `₹${Number(v).toLocaleString('en-IN')}`} />
        <Legend formatter={v => String(v).replace(/_/g, ' ')} />
      </PieChart>
    </ResponsiveContainer>
  );
}
