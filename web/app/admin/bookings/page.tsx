'use client';
// Admin bookings list with status/payment filters and status badges.
import { useMemo } from 'react';
import { mockAdminBookings } from '@/components/account/mock';
import { fmtDate, useApi } from '@/components/account/useApi';
import { CrudTable } from '@/components/admin/CrudTable';
import type { FieldDef, Row } from '@/components/admin/CrudTable';

const FIELDS: FieldDef[] = [
  { key: 'bookingRef', label: 'Booking', render: v => <span className="font-mono font-semibold">{String(v)}</span> },
  { key: 'customer', label: 'Customer' },
  { key: 'route', label: 'Route' },
  { key: 'journeyDate', label: 'Journey', render: v => fmtDate(String(v ?? '')) },
  { key: 'seats', label: 'Seats' },
  { key: 'amount', label: 'Amount' },
  { key: 'status', label: 'Status' },
  { key: 'paymentStatus', label: 'Payment' },
];

/** Accept either full Booking objects (lib/api) or pre-flattened rows. */
function flatten(r: Row): Row {
  const trip = r.trip as Record<string, unknown> | undefined;
  const fare = r.fare as Record<string, unknown> | undefined;
  const pax = r.passengers as { name: string }[] | undefined;
  return {
    id: r.id,
    bookingRef: r.bookingRef,
    customer: r.customer ?? pax?.[0]?.name ?? r.contactEmail,
    route: r.route ?? (trip ? `${trip.fromCity} → ${trip.toCity}` : ''),
    journeyDate: r.journeyDate ?? trip?.journeyDate,
    seats: Array.isArray(r.seatNumbers) ? (r.seatNumbers as string[]).join(', ') : r.seats,
    amount: r.amount ?? fare?.grandTotal,
    status: r.status,
    paymentStatus: r.paymentStatus,
  };
}

export default function AdminBookingsPage() {
  const { data, loading } = useApi<Row[]>('admin.bookings', [], mockAdminBookings);
  const rows = useMemo(() => (data ?? []).map(flatten), [data]);
  return (
    <div>
      <h1 className="mb-1 text-2xl font-extrabold text-slate-900">Bookings</h1>
      <p className="mb-5 text-sm text-slate-500">All customer bookings across operators.</p>
      <CrudTable title="Bookings" fields={FIELDS} rows={rows} loading={loading} readOnly pageSize={10}
        filters={[
          { key: 'status', label: 'Status', options: ['PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED'] },
          { key: 'paymentStatus', label: 'Payment', options: ['PENDING', 'SUCCESS', 'FAILED', 'REFUNDED'] },
        ]} />
    </div>
  );
}
