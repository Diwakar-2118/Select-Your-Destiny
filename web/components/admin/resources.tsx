'use client';
// Field configs for each admin CRUD resource + a ready-made page component wiring them to the api.
import { Star } from 'lucide-react';
import { mockAdmin } from '@/components/account/mock';
import { ToastHost, useToaster } from '@/components/account/ui';
import { callApi, useApi } from '@/components/account/useApi';
import { CrudTable } from './CrudTable';
import type { FieldDef, Row } from './CrudTable';

export type AdminResource = 'operators' | 'routes' | 'buses' | 'drivers' | 'coupons';

const BUS_TYPES = ['AC_SEATER', 'NON_AC_SEATER', 'AC_SLEEPER', 'NON_AC_SLEEPER', 'AC_SEMI_SLEEPER', 'VOLVO_MULTI_AXLE', 'ELECTRIC', 'PUSH_BACK'];

export const RESOURCE_FIELDS: Record<AdminResource, FieldDef[]> = {
  operators: [
    { key: 'id', label: 'ID', hideInForm: true },
    { key: 'name', label: 'Operator', required: true },
    { key: 'contactEmail', label: 'Email', type: 'email' },
    { key: 'phone', label: 'Phone', type: 'tel' },
    { key: 'rating', label: 'Rating', type: 'number', render: v => <span className="inline-flex items-center gap-1"><Star size={14} className="fill-amber-400 text-amber-400" />{Number(v ?? 0).toFixed(1)}</span> },
    { key: 'active', label: 'Status', type: 'boolean' },
  ],
  routes: [
    { key: 'id', label: 'ID', hideInForm: true },
    { key: 'fromCity', label: 'From', required: true },
    { key: 'toCity', label: 'To', required: true },
    { key: 'distanceKm', label: 'Distance (km)', type: 'number' },
    { key: 'durationMins', label: 'Duration (min)', type: 'number' },
    { key: 'active', label: 'Status', type: 'boolean' },
  ],
  buses: [
    { key: 'id', label: 'ID', hideInForm: true },
    { key: 'busName', label: 'Bus name', required: true },
    { key: 'busNumber', label: 'Reg. number', required: true },
    { key: 'operator', label: 'Operator' },
    { key: 'busType', label: 'Type', type: 'select', options: BUS_TYPES },
    { key: 'totalSeats', label: 'Seats', type: 'number' },
    { key: 'active', label: 'Status', type: 'boolean' },
  ],
  drivers: [
    { key: 'id', label: 'ID', hideInForm: true },
    { key: 'name', label: 'Driver', required: true },
    { key: 'phone', label: 'Phone', type: 'tel' },
    { key: 'licenseNo', label: 'License no.' },
    { key: 'experienceYears', label: 'Experience (yrs)', type: 'number' },
    { key: 'active', label: 'Status', type: 'boolean' },
  ],
  coupons: [
    { key: 'id', label: 'ID', hideInForm: true },
    { key: 'code', label: 'Code', required: true, render: v => <span className="rounded-lg bg-indigo-50 px-2 py-1 font-mono font-bold text-indigo-700">{String(v)}</span> },
    { key: 'description', label: 'Description', hideInTable: true },
    { key: 'category', label: 'Category', type: 'select', options: ['FLAT', 'FESTIVAL', 'REFERRAL', 'CASHBACK'] },
    { key: 'type', label: 'Type', type: 'select', options: ['FLAT', 'PERCENT', 'CASHBACK'] },
    { key: 'value', label: 'Value', type: 'number' },
    { key: 'minAmount', label: 'Min amount', type: 'number' },
    { key: 'maxDiscount', label: 'Max discount', type: 'number' },
    { key: 'validTill', label: 'Valid till', type: 'date' },
    { key: 'active', label: 'Status', type: 'boolean' },
  ],
};

const TITLES: Record<AdminResource, string> = { operators: 'Operators', routes: 'Routes', buses: 'Buses', drivers: 'Drivers', coupons: 'Coupons' };

/** Full CRUD page for a resource: list via api.admin.list, optimistic create/update/delete. */
export function ResourcePage({ resource }: { resource: AdminResource }) {
  return <ToastHost><ResourceInner resource={resource} /></ToastHost>;
}

function ResourceInner({ resource }: { resource: AdminResource }) {
  const toast = useToaster();
  const { data, loading, setData } = useApi<Row[]>('admin.list', [resource], () => mockAdmin[resource] ?? []);
  const title = TITLES[resource];

  return (
    <div>
      <h1 className="mb-1 text-2xl font-extrabold text-slate-900">{title}</h1>
      <p className="mb-5 text-sm text-slate-500">Create, edit and manage {title.toLowerCase()}.</p>
      <CrudTable
        title={title}
        fields={RESOURCE_FIELDS[resource]}
        rows={data}
        loading={loading}
        onCreate={async body => {
          const created = await callApi<Row>('admin.create', [resource, body], () => ({ ...body, id: Date.now() % 1e6 }));
          setData(d => [{ ...body, ...created }, ...(d ?? []).filter(r => r.id !== created.id)]);
          toast(`${title.replace(/s$/, '')} created`);
        }}
        onUpdate={async (id, body) => {
          const updated = await callApi<Row>('admin.update', [resource, id, body], () => ({ ...body, id }));
          setData(d => (d ?? []).map(r => (r.id === id ? { ...r, ...body, ...updated, id } : r)));
          toast('Changes saved');
        }}
        onDelete={async id => {
          await callApi('admin.remove', [resource, id], null);
          setData(d => (d ?? []).filter(r => r.id !== id));
          toast('Deleted', 'info');
        }}
      />
    </div>
  );
}
