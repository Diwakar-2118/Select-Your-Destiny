'use client';
// Generic admin data table: search, column sort, pagination, optional filters,
// add/edit modal generated from a field config, and delete confirmation.
// Pass `readOnly` to use it as a plain list (bookings, payments).
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, Download, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { Btn, Dialog, Field, Pill, SelectField, Skel, cx, statusTone } from '@/components/account/ui';

export type Row = Record<string, unknown> & { id?: number | string };

export interface FieldDef {
  key: string;
  label: string;
  type?: 'text' | 'number' | 'email' | 'tel' | 'date' | 'select' | 'boolean';
  options?: string[];
  required?: boolean;
  /** hide from table columns (still in form) */
  hideInTable?: boolean;
  /** hide from form (still in table) */
  hideInForm?: boolean;
  render?: (value: unknown, row: Row) => ReactNode;
}

export interface FilterDef { key: string; label: string; options: string[] }

interface Props {
  title: string;
  fields: FieldDef[];
  rows: Row[] | undefined;
  loading?: boolean;
  readOnly?: boolean;
  filters?: FilterDef[];
  pageSize?: number;
  onCreate?: (body: Row) => Promise<void> | void;
  onUpdate?: (id: number | string, body: Row) => Promise<void> | void;
  onDelete?: (id: number | string) => Promise<void> | void;
  /** extra toolbar content (e.g. date range) */
  toolbar?: ReactNode;
}

/** Default cell rendering: booleans + status-like strings become badges, money-ish keys get ₹. */
function renderCell(f: FieldDef, row: Row): ReactNode {
  const v = row[f.key];
  if (f.render) return f.render(v, row);
  if (typeof v === 'boolean') return <Pill tone={v ? 'green' : 'red'}>{v ? 'Active' : 'Inactive'}</Pill>;
  if (v == null || v === '') return <span className="text-slate-300">—</span>;
  if (/status/i.test(f.key)) return <Pill tone={statusTone(String(v))}>{String(v).replace(/_/g, ' ')}</Pill>;
  if (/amount|revenue|fare|price/i.test(f.key) && typeof v === 'number') return `₹${v.toLocaleString('en-IN')}`;
  return String(v);
}

export function toCsv(fields: FieldDef[], rows: Row[]) {
  const esc = (x: unknown) => `"${String(x ?? '').replace(/"/g, '""')}"`;
  return [fields.map(f => esc(f.label)).join(','), ...rows.map(r => fields.map(f => esc(r[f.key])).join(','))].join('\n');
}
export function downloadCsv(name: string, csv: string) {
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url; a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

export function CrudTable({ title, fields, rows, loading, readOnly, filters = [], pageSize = 8, onCreate, onUpdate, onDelete, toolbar }: Props) {
  const [q, setQ] = useState('');
  const [sort, setSort] = useState<{ key: string; dir: 1 | -1 } | null>(null);
  const [page, setPage] = useState(0);
  const [filterVals, setFilterVals] = useState<Record<string, string>>({});
  const [editing, setEditing] = useState<Row | null>(null); // {} for create
  const [deleting, setDeleting] = useState<Row | null>(null);
  const [busy, setBusy] = useState(false);
  const cols = fields.filter(f => !f.hideInTable);

  const view = useMemo(() => {
    let r = rows ?? [];
    const s = q.trim().toLowerCase();
    if (s) r = r.filter(row => Object.values(row).some(v => typeof v !== 'object' && String(v ?? '').toLowerCase().includes(s)));
    for (const [k, v] of Object.entries(filterVals)) if (v) r = r.filter(row => String(row[k]) === v);
    if (sort) {
      r = [...r].sort((a, b) => {
        const x = a[sort.key], y = b[sort.key];
        if (typeof x === 'number' && typeof y === 'number') return (x - y) * sort.dir;
        return String(x ?? '').localeCompare(String(y ?? '')) * sort.dir;
      });
    }
    return r;
  }, [rows, q, sort, filterVals]);

  const pages = Math.max(1, Math.ceil(view.length / pageSize));
  const cur = Math.min(page, pages - 1);
  const slice = view.slice(cur * pageSize, cur * pageSize + pageSize);

  const toggleSort = (key: string) => setSort(s => (s?.key === key ? (s.dir === 1 ? { key, dir: -1 } : null) : { key, dir: 1 }));

  const save = async (body: Row) => {
    setBusy(true);
    try {
      if (editing?.id != null) await onUpdate?.(editing.id, body);
      else await onCreate?.(body);
      setEditing(null);
    } finally { setBusy(false); }
  };

  return (
    <section aria-label={title} className="rounded-2xl border border-slate-200/70 bg-white shadow-[0_4px_24px_-8px_rgba(15,23,42,0.08)]">
      {/* Toolbar */}
      <div className="flex flex-wrap items-end gap-3 border-b border-slate-100 p-4">
        <label className="relative min-w-[200px] flex-1">
          <span className="sr-only">Search {title}</span>
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={q} onChange={e => { setQ(e.target.value); setPage(0); }} placeholder={`Search ${title.toLowerCase()}…`}
            className="min-h-[44px] w-full rounded-xl border border-slate-200 pl-9 pr-3 text-sm outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100" />
        </label>
        {filters.map(f => (
          <SelectField key={f.key} label={f.label} value={filterVals[f.key] ?? ''} className="w-40"
            onChange={e => { setFilterVals(v => ({ ...v, [f.key]: e.target.value })); setPage(0); }}
            options={[{ value: '', label: 'All' }, ...f.options.map(o => ({ value: o, label: o.replace(/_/g, ' ') }))]} />
        ))}
        {toolbar}
        <Btn variant="outline" onClick={() => downloadCsv(`${title.toLowerCase().replace(/\s+/g, '-')}.csv`, toCsv(cols, view))} aria-label={`Export ${title} as CSV`}><Download size={16} /> CSV</Btn>
        {!readOnly && <Btn onClick={() => setEditing({})}><Plus size={16} /> Add</Btn>}
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              {cols.map(f => (
                <th key={f.key} scope="col" aria-sort={sort?.key === f.key ? (sort.dir === 1 ? 'ascending' : 'descending') : 'none'} className="px-4 py-3 font-semibold">
                  <button onClick={() => toggleSort(f.key)} className="inline-flex min-h-[32px] items-center gap-1 hover:text-slate-900">
                    {f.label}
                    {sort?.key === f.key && (sort.dir === 1 ? <ArrowUp size={12} /> : <ArrowDown size={12} />)}
                  </button>
                </th>
              ))}
              {!readOnly && <th scope="col" className="px-4 py-3 text-right font-semibold">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? Array.from({ length: 5 }, (_, i) => (
              <tr key={i}><td colSpan={cols.length + 1} className="px-4 py-3"><Skel className="h-6" /></td></tr>
            )) : slice.length === 0 ? (
              <tr><td colSpan={cols.length + 1} className="px-4 py-10 text-center text-slate-500">No records found</td></tr>
            ) : (
              <AnimatePresence initial={false}>
                {slice.map((row, i) => (
                  <motion.tr key={String(row.id ?? i)} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="hover:bg-indigo-50/40">
                    {cols.map(f => <td key={f.key} className="whitespace-nowrap px-4 py-3 text-slate-700">{renderCell(f, row)}</td>)}
                    {!readOnly && (
                      <td className="whitespace-nowrap px-4 py-2 text-right">
                        <button onClick={() => setEditing(row)} aria-label={`Edit row ${row.id}`} className="inline-grid h-11 w-11 place-items-center rounded-xl text-slate-500 hover:bg-indigo-50 hover:text-indigo-600"><Pencil size={16} /></button>
                        <button onClick={() => setDeleting(row)} aria-label={`Delete row ${row.id}`} className="inline-grid h-11 w-11 place-items-center rounded-xl text-slate-500 hover:bg-red-50 hover:text-red-600"><Trash2 size={16} /></button>
                      </td>
                    )}
                  </motion.tr>
                ))}
              </AnimatePresence>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between border-t border-slate-100 px-4 py-2 text-sm text-slate-500">
        <span>{view.length} record{view.length === 1 ? '' : 's'}</span>
        <div className="flex items-center gap-1">
          <button disabled={cur === 0} onClick={() => setPage(cur - 1)} aria-label="Previous page" className="grid h-11 w-11 place-items-center rounded-xl hover:bg-slate-100 disabled:opacity-30"><ChevronLeft size={18} /></button>
          <span aria-live="polite">Page {cur + 1} / {pages}</span>
          <button disabled={cur >= pages - 1} onClick={() => setPage(cur + 1)} aria-label="Next page" className="grid h-11 w-11 place-items-center rounded-xl hover:bg-slate-100 disabled:opacity-30"><ChevronRight size={18} /></button>
        </div>
      </div>

      {editing && <EditDialog fields={fields} row={editing} busy={busy} title={`${editing.id != null ? 'Edit' : 'Add'} ${title.replace(/s$/, '')}`} onClose={() => setEditing(null)} onSave={save} />}

      <Dialog open={!!deleting} onClose={() => setDeleting(null)} title="Delete record?"
        footer={<><Btn variant="secondary" onClick={() => setDeleting(null)}>Cancel</Btn>
          <Btn variant="danger" loading={busy} onClick={async () => {
            if (deleting?.id == null) return;
            setBusy(true);
            try { await onDelete?.(deleting.id); } finally { setBusy(false); setDeleting(null); }
          }}>Delete</Btn></>}>
        <p className="text-sm text-slate-600">This permanently removes <b>{String(deleting?.name ?? deleting?.code ?? deleting?.busName ?? `#${deleting?.id}`)}</b>. This action cannot be undone.</p>
      </Dialog>
    </section>
  );
}

/** Form modal generated from the field config. */
function EditDialog({ fields, row, title, busy, onClose, onSave }: { fields: FieldDef[]; row: Row; title: string; busy: boolean; onClose: () => void; onSave: (r: Row) => void }) {
  const formFields = fields.filter(f => !f.hideInForm && f.key !== 'id');
  const [vals, setVals] = useState<Row>(() => {
    const init: Row = {};
    formFields.forEach(f => { init[f.key] = row[f.key] ?? (f.type === 'boolean' ? true : f.type === 'select' ? f.options?.[0] ?? '' : ''); });
    return init;
  });
  const set = (k: string, v: unknown) => setVals(s => ({ ...s, [k]: v }));
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const out: Row = { ...vals };
    formFields.forEach(f => { if (f.type === 'number') out[f.key] = Number(out[f.key]); });
    onSave(out);
  };
  return (
    <Dialog open onClose={onClose} title={title} wide>
      <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
        {formFields.map(f => f.type === 'boolean' ? (
          <label key={f.key} className="flex min-h-[44px] items-center gap-3 self-end rounded-xl bg-slate-50 px-3 text-sm font-medium">
            <input type="checkbox" className="h-5 w-5 accent-indigo-600" checked={!!vals[f.key]} onChange={e => set(f.key, e.target.checked)} /> {f.label}
          </label>
        ) : f.type === 'select' ? (
          <SelectField key={f.key} label={f.label} value={String(vals[f.key] ?? '')} onChange={e => set(f.key, e.target.value)}
            options={(f.options ?? []).map(o => ({ value: o, label: o.replace(/_/g, ' ') }))} />
        ) : (
          <Field key={f.key} label={f.label} type={f.type ?? 'text'} required={f.required} value={String(vals[f.key] ?? '')}
            step={f.type === 'number' ? 'any' : undefined} onChange={e => set(f.key, e.target.value)} />
        ))}
        <div className={cx('flex justify-end gap-2 sm:col-span-2')}>
          <Btn type="button" variant="secondary" onClick={onClose}>Cancel</Btn>
          <Btn type="submit" loading={busy}>Save</Btn>
        </div>
      </form>
    </Dialog>
  );
}
