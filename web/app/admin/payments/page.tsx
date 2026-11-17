'use client';
// Admin payments list with method/status filters and a quick totals strip.
import { mockAdminPayments } from '@/components/account/mock';
import { Panel } from '@/components/account/ui';
import { fmtDate, inr, useApi } from '@/components/account/useApi';
import { CrudTable } from '@/components/admin/CrudTable';
import type { FieldDef, Row } from '@/components/admin/CrudTable';

const FIELDS: FieldDef[] = [
  { key: 'id', label: 'Payment ID' },
  { key: 'bookingRef', label: 'Booking', render: v => <span className="font-mono font-semibold">{String(v ?? '')}</span> },
  { key: 'method', label: 'Method', render: v => String(v ?? '').replace(/_/g, ' ') },
  { key: 'amount', label: 'Amount' },
  { key: 'status', label: 'Status' },
  { key: 'createdAt', label: 'Date', render: v => fmtDate(String(v ?? '')) },
];

export default function AdminPaymentsPage() {
  const { data, loading } = useApi<Row[]>('admin.payments', [], mockAdminPayments);
  const rows = data ?? [];
  const sum = (s?: string) => rows.filter(r => !s || r.status === s).reduce((a, r) => a + Number(r.amount ?? 0), 0);
  return (
    <div>
      <h1 className="mb-1 text-2xl font-extrabold text-slate-900">Payments</h1>
      <p className="mb-5 text-sm text-slate-500">Gateway transactions, refunds and failures.</p>
      <div className="mb-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[['Total processed', sum()], ['Successful', sum('SUCCESS')], ['Refunded', sum('REFUNDED')], ['Failed', sum('FAILED')]].map(([l, v]) => (
          <Panel key={String(l)} className="p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{l}</p>
            <p className="mt-1 text-xl font-extrabold">{inr(Number(v))}</p>
          </Panel>
        ))}
      </div>
      <CrudTable title="Payments" fields={FIELDS} rows={rows} loading={loading} readOnly pageSize={10}
        filters={[
          { key: 'method', label: 'Method', options: ['UPI', 'GOOGLE_PAY', 'PHONEPE', 'PAYTM', 'CREDIT_CARD', 'DEBIT_CARD', 'NET_BANKING', 'WALLET', 'LAZYPAY', 'EMI'] },
          { key: 'status', label: 'Status', options: ['PENDING', 'SUCCESS', 'FAILED', 'REFUNDED'] },
        ]} />
    </div>
  );
}
