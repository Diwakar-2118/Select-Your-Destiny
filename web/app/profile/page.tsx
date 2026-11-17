'use client';
// Profile hub: avatar, personal details, saved passengers & cards, wallet, history, preferences, logout.
import { motion } from 'framer-motion';
import { ArrowDownLeft, ArrowUpRight, Bell, Camera, CreditCard, History, LifeBuoy, LogOut, Trash2, UserRound, Users, Wallet as WalletIcon } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { mockBookings, mockCards, mockPassengers, mockUser, mockWallet } from '@/components/account/mock';
import { useSession } from '@/components/account/session';
import type { Booking, SavedCard, SavedPassenger, UserLite, Wallet } from '@/components/account/types';
import { Btn, Field, GRADIENT, PageShell, Panel, Pill, Skel, ToastHost, cx, useToaster } from '@/components/account/ui';
import { callApi, fmtDate, inr, useApi } from '@/components/account/useApi';

export default function ProfilePage() {
  return <ToastHost><ProfileInner /></ToastHost>;
}

function Section({ icon, title, children, action }: { icon: ReactNode; title: string; children: ReactNode; action?: ReactNode }) {
  return (
    <Panel as="section" aria-label={title}>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="flex items-center gap-2 font-bold text-slate-900"><span className="grid h-9 w-9 place-items-center rounded-xl bg-indigo-50 text-indigo-600">{icon}</span>{title}</h2>
        {action}
      </div>
      {children}
    </Panel>
  );
}

function ProfileInner() {
  const session = useSession();
  const toast = useToaster();
  const me = useApi<UserLite>('me', [], () => session.user ?? mockUser);
  const passengers = useApi<SavedPassenger[]>('getPassengers', [], mockPassengers);
  const cards = useApi<SavedCard[]>('getCards', [], mockCards);
  const wallet = useApi<Wallet>('getWallet', [], mockWallet);
  const history = useApi<Booking[]>('getBookings', ['COMPLETED'], () => mockBookings.filter(b => b.status === 'COMPLETED'));

  const [form, setForm] = useState({ name: '', email: '', mobile: '' });
  const [avatar, setAvatar] = useState<string | undefined>();
  const [saving, setSaving] = useState(false);
  const [prefs, setPrefs] = useState({ booking: true, delays: true, offers: true, sms: false, email: true });

  useEffect(() => {
    if (me.data) { setForm({ name: me.data.name, email: me.data.email, mobile: me.data.mobile }); setAvatar(me.data.avatarUrl); }
  }, [me.data]);
  useEffect(() => {
    try { const p = localStorage.getItem('syd_notif_prefs'); if (p) setPrefs(JSON.parse(p)); } catch { /* ignore */ }
  }, []);

  // Avatar preview via object URL (upload would post the file to the backend).
  const onAvatar = (f?: File) => {
    if (!f) return;
    if (!f.type.startsWith('image/')) return toast('Please choose an image file', 'error');
    setAvatar(URL.createObjectURL(f));
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    await callApi('updateMe', [{ ...form, avatarUrl: avatar }], () => ({ ...form }));
    setSaving(false);
    toast('Profile updated');
  };

  const togglePref = (k: keyof typeof prefs) => {
    const next = { ...prefs, [k]: !prefs[k] };
    setPrefs(next);
    try { localStorage.setItem('syd_notif_prefs', JSON.stringify(next)); } catch { /* ignore */ }
  };

  const removePassenger = async (id: number) => {
    passengers.setData(p => p?.filter(x => x.id !== id));
    await callApi('deletePassenger', [id], null);
    toast('Passenger removed', 'info');
  };
  const removeCard = async (id: number) => {
    cards.setData(c => c?.filter(x => x.id !== id));
    await callApi('deleteCard', [id], null);
    toast('Card removed', 'info');
  };

  const initials = (form.name || 'U').split(' ').map(s => s[0]).join('').slice(0, 2).toUpperCase();

  return (
    <PageShell title="My Profile" subtitle="Your account, wallet and preferences" icon={<UserRound />}
      actions={<Btn variant="secondary" onClick={session.logout} className="bg-white/90"><LogOut size={16} /> Logout</Btn>}>
      <div className="grid gap-5 lg:grid-cols-3">
        {/* Left column: identity + wallet */}
        <div className="space-y-5">
          <Panel className="text-center">
            <div className="relative mx-auto h-28 w-28">
              <div className="h-full w-full overflow-hidden rounded-full p-[3px]" style={{ background: GRADIENT }}>
                {avatar
                  // eslint-disable-next-line @next/next/no-img-element
                  ? <img src={avatar} alt="Profile avatar preview" className="h-full w-full rounded-full bg-white object-cover" />
                  : <div className="grid h-full w-full place-items-center rounded-full bg-white text-3xl font-extrabold text-indigo-600">{initials}</div>}
              </div>
              <label className="absolute bottom-0 right-0 grid h-11 w-11 cursor-pointer place-items-center rounded-full bg-slate-900 text-white shadow-lg focus-within:ring-2 focus-within:ring-indigo-500" aria-label="Upload avatar">
                <Camera size={18} />
                <input type="file" accept="image/*" className="sr-only" onChange={e => onAvatar(e.target.files?.[0])} />
              </label>
            </div>
            {me.loading ? <Skel className="mx-auto mt-4 h-6 w-40" /> : <h2 className="mt-4 text-lg font-bold">{form.name}</h2>}
            <p className="text-sm text-slate-500">{form.email}</p>
            {me.data?.role === 'ADMIN' && <Link href="/admin" className="mt-2 inline-block"><Pill tone="purple">Admin · open panel</Pill></Link>}
          </Panel>

          <Panel className="overflow-hidden p-0">
            <div className="p-5 text-white" style={{ background: GRADIENT }}>
              <p className="flex items-center gap-2 text-sm text-white/80"><WalletIcon size={16} /> Wallet balance</p>
              {wallet.loading ? <Skel className="mt-2 h-9 w-32 bg-white/30" /> : <p className="mt-1 text-3xl font-extrabold">{inr(wallet.data?.balance ?? me.data?.walletBalance)}</p>}
            </div>
            <ul className="divide-y divide-slate-100" aria-label="Wallet transactions">
              {(wallet.data?.transactions ?? []).map(t => (
                <li key={t.id} className="flex items-center justify-between px-5 py-3">
                  <div className="flex items-center gap-3">
                    <span className={cx('grid h-9 w-9 place-items-center rounded-xl', t.type === 'CREDIT' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600')}>
                      {t.type === 'CREDIT' ? <ArrowDownLeft size={16} /> : <ArrowUpRight size={16} />}
                    </span>
                    <div><p className="text-sm font-medium">{t.description}</p><p className="text-xs text-slate-500">{fmtDate(t.createdAt)}</p></div>
                  </div>
                  <span className={cx('text-sm font-bold', t.type === 'CREDIT' ? 'text-emerald-600' : 'text-red-600')}>{t.type === 'CREDIT' ? '+' : '−'}{inr(t.amount)}</span>
                </li>
              ))}
            </ul>
          </Panel>

          <Link href="/support" className="flex min-h-[44px] items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 font-semibold text-slate-700 shadow-sm hover:border-indigo-300">
            <LifeBuoy className="text-indigo-600" /> Help &amp; 24/7 Support
          </Link>
        </div>

        {/* Right columns */}
        <div className="space-y-5 lg:col-span-2">
          <Section icon={<UserRound size={18} />} title="Personal details">
            <form onSubmit={save} className="grid gap-4 sm:grid-cols-2">
              <Field label="Full name" value={form.name} required onChange={e => setForm({ ...form, name: e.target.value })} />
              <Field label="Mobile" type="tel" inputMode="numeric" pattern="[0-9+ ]{10,14}" value={form.mobile} onChange={e => setForm({ ...form, mobile: e.target.value })} />
              <Field label="Email" type="email" value={form.email} required onChange={e => setForm({ ...form, email: e.target.value })} className="sm:col-span-2" />
              <div className="sm:col-span-2"><Btn type="submit" loading={saving}>Save changes</Btn></div>
            </form>
          </Section>

          <div className="grid gap-5 md:grid-cols-2">
            <Section icon={<Users size={18} />} title="Saved passengers">
              <ul className="space-y-2">
                {passengers.loading ? <Skel className="h-24" /> : (passengers.data ?? []).map(p => (
                  <li key={p.id} className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2">
                    <div><p className="text-sm font-semibold">{p.name}</p><p className="text-xs text-slate-500">{p.age} yrs · {p.gender.toLowerCase()}</p></div>
                    <button onClick={() => removePassenger(p.id)} aria-label={`Remove passenger ${p.name}`} className="grid h-11 w-11 place-items-center rounded-xl text-slate-400 hover:bg-red-50 hover:text-red-600"><Trash2 size={16} /></button>
                  </li>
                ))}
              </ul>
            </Section>

            <Section icon={<CreditCard size={18} />} title="Saved cards">
              <ul className="space-y-3">
                {cards.loading ? <Skel className="h-24" /> : (cards.data ?? []).map((c, i) => (
                  <motion.li key={c.id} whileHover={{ y: -2 }} className="relative overflow-hidden rounded-2xl p-4 text-white shadow"
                    style={{ background: i % 2 ? 'linear-gradient(135deg,#0F172A,#334155)' : GRADIENT }}>
                    <p className="text-xs font-semibold tracking-widest opacity-80">{c.brand}</p>
                    <p className="mt-2 font-mono text-lg tracking-widest" aria-label={`Card ending ${c.last4}`}>•••• •••• •••• {c.last4}</p>
                    <div className="mt-1 flex justify-between text-xs opacity-80"><span>{c.holderName ?? c.holder}</span><span>{c.expiry}</span></div>
                    <button onClick={() => removeCard(c.id)} aria-label={`Remove card ending ${c.last4}`} className="absolute right-2 top-2 grid h-11 w-11 place-items-center rounded-xl hover:bg-white/15"><Trash2 size={16} /></button>
                  </motion.li>
                ))}
              </ul>
            </Section>
          </div>

          <Section icon={<History size={18} />} title="Travel history" action={<Link href="/bookings" className="text-sm font-semibold text-indigo-600">View all</Link>}>
            {history.loading ? <Skel className="h-20" /> : (history.data ?? []).length === 0 ? <p className="text-sm text-slate-500">No completed trips yet.</p> : (
              <ul className="divide-y divide-slate-100">
                {(history.data ?? []).map(b => (
                  <li key={b.id} className="flex items-center justify-between py-3">
                    <div><p className="font-semibold">{b.trip.fromCity} → {b.trip.toCity}</p><p className="text-xs text-slate-500">{fmtDate(b.trip.journeyDate)} · {b.trip.operatorName}</p></div>
                    <span className="font-bold">{inr(b.fare.grandTotal)}</span>
                  </li>
                ))}
              </ul>
            )}
          </Section>

          <Section icon={<Bell size={18} />} title="Notification preferences">
            <ul className="grid gap-2 sm:grid-cols-2">
              {([['booking', 'Booking updates'], ['delays', 'Delay & arrival alerts'], ['offers', 'Offers & coupons'], ['sms', 'SMS notifications'], ['email', 'Email notifications']] as const).map(([k, label]) => (
                <li key={k}>
                  <button role="switch" aria-checked={prefs[k]} onClick={() => togglePref(k)}
                    className="flex min-h-[44px] w-full items-center justify-between rounded-xl bg-slate-50 px-3 text-sm font-medium">
                    {label}
                    <span className={cx('relative h-6 w-11 rounded-full transition', prefs[k] ? 'bg-indigo-600' : 'bg-slate-300')}>
                      <motion.span layout className={cx('absolute top-0.5 h-5 w-5 rounded-full bg-white shadow', prefs[k] ? 'right-0.5' : 'left-0.5')} />
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </Section>
        </div>
      </div>
    </PageShell>
  );
}
