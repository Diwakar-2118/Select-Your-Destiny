'use client';
// Offers: flat discounts, festival deals, referral bonus (code + share), cashback and copyable coupons.
import { motion } from 'framer-motion';
import { Check, Copy, Gift, PartyPopper, Percent, Share2, Sparkles, TicketPercent, Wallet } from 'lucide-react';
import { useState } from 'react';
import type { ReactNode } from 'react';
import { mockOffers } from '@/components/account/mock';
import { useSession } from '@/components/account/session';
import type { Coupon } from '@/components/account/types';
import { Btn, GRADIENT, PageShell, Panel, Skel, ToastHost, useToaster } from '@/components/account/ui';
import { fmtDate, inr, useApi } from '@/components/account/useApi';

export default function OffersPage() {
  return <ToastHost><OffersInner /></ToastHost>;
}

/** Copy text to clipboard with a textarea fallback for older browsers. */
async function copy(text: string) {
  try { await navigator.clipboard.writeText(text); return true; } catch {
    const ta = document.createElement('textarea'); ta.value = text; document.body.appendChild(ta); ta.select();
    const ok = document.execCommand('copy'); ta.remove(); return ok;
  }
}

function CopyBtn({ code }: { code: string }) {
  const [done, setDone] = useState(false);
  const toast = useToaster();
  return (
    <Btn variant="outline" aria-label={`Copy coupon code ${code}`} onClick={async () => {
      if (await copy(code)) { setDone(true); toast(`${code} copied`); setTimeout(() => setDone(false), 1500); }
    }}>
      {done ? <Check size={16} className="text-emerald-600" /> : <Copy size={16} />} <span className="font-mono tracking-wider">{code}</span>
    </Btn>
  );
}

const valueText = (c: Coupon) => (c.type === 'PERCENT' ? `${c.value}% OFF` : c.type === 'CASHBACK' ? (c.value <= 100 && c.maxDiscount > c.value ? `${c.value}% CASHBACK` : `${inr(c.value)} CASHBACK`) : `${inr(c.value)} OFF`);

function OfferCard({ c, i }: { c: Coupon; i: number }) {
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }} whileHover={{ y: -3 }}
      className="relative flex flex-col overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-[0_4px_24px_-8px_rgba(15,23,42,0.1)]">
      <div className="p-4 text-white" style={{ background: GRADIENT }}>
        <p className="text-2xl font-extrabold">{valueText(c)}</p>
        <p className="text-xs text-white/80">Valid till {fmtDate(c.validTill)}</p>
      </div>
      {/* ticket notches */}
      <span className="absolute left-[-10px] top-[76px] h-5 w-5 rounded-full bg-white" aria-hidden />
      <span className="absolute right-[-10px] top-[76px] h-5 w-5 rounded-full bg-white" aria-hidden />
      <div className="flex flex-1 flex-col gap-3 border-t-2 border-dashed border-slate-200 p-4">
        <p className="text-sm text-slate-700">{c.description}</p>
        <p className="text-xs text-slate-500">Min. booking {inr(c.minAmount)}{c.maxDiscount ? ` · Max ${inr(c.maxDiscount)}` : ''}</p>
        <div className="mt-auto"><CopyBtn code={c.code} /></div>
      </div>
    </motion.div>
  );
}

function Group({ icon, title, items }: { icon: ReactNode; title: string; items: Coupon[] }) {
  if (!items.length) return null;
  return (
    <section aria-label={title} className="mb-8">
      <h2 className="mb-3 flex items-center gap-2 text-lg font-bold text-slate-900"><span className="grid h-9 w-9 place-items-center rounded-xl bg-indigo-50 text-indigo-600">{icon}</span>{title}</h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{items.map((c, i) => <OfferCard key={c.id} c={c} i={i} />)}</div>
    </section>
  );
}

function OffersInner() {
  const { data, loading } = useApi<Coupon[]>('getOffers', [], mockOffers);
  const { user } = useSession();
  const toast = useToaster();
  const offers = (data ?? []).filter(c => c.active !== false);
  const by = (cat: Coupon['category']) => offers.filter(c => c.category === cat);
  const referral = `SYD${(user?.name ?? 'TRAVELER').replace(/\W/g, '').slice(0, 5).toUpperCase()}${user?.id ?? 100}`;

  const share = async () => {
    const text = `Book your next bus on Select Your Destiny and get ₹200 off with my code ${referral}!`;
    const url = typeof window !== 'undefined' ? window.location.origin : '';
    try {
      if (navigator.share) await navigator.share({ title: 'Select Your Destiny', text, url });
      else if (await copy(`${text} ${url}`)) toast('Invite message copied');
    } catch { /* user cancelled share */ }
  };

  return (
    <PageShell title="Offers & Rewards" subtitle="Save more on every journey" icon={<Sparkles />}>
      {loading ? <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{[0, 1, 2, 3, 4, 5].map(i => <Skel key={i} className="h-52" />)}</div> : (
        <>
          <Group icon={<Percent size={18} />} title="Flat Discount" items={by('FLAT')} />
          <Group icon={<PartyPopper size={18} />} title="Festival Offers" items={by('FESTIVAL')} />

          {/* Referral */}
          <section aria-label="Referral Bonus" className="mb-8">
            <h2 className="mb-3 flex items-center gap-2 text-lg font-bold text-slate-900"><span className="grid h-9 w-9 place-items-center rounded-xl bg-indigo-50 text-indigo-600"><Gift size={18} /></span>Referral Bonus</h2>
            <Panel className="relative overflow-hidden">
              <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full opacity-20 blur-2xl" style={{ background: GRADIENT }} />
              <div className="relative flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-xl font-extrabold">Invite friends, earn {inr(by('REFERRAL')[0]?.value ?? 200)} each</p>
                  <p className="text-sm text-slate-500">Your friend gets the same bonus on their first booking.</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <CopyBtn code={referral} />
                  <Btn onClick={share}><Share2 size={16} /> Share invite</Btn>
                </div>
              </div>
            </Panel>
          </section>

          <Group icon={<Wallet size={18} />} title="Cashback" items={by('CASHBACK')} />

          {/* All coupon codes in a compact list */}
          <section aria-label="Coupon Codes">
            <h2 className="mb-3 flex items-center gap-2 text-lg font-bold text-slate-900"><span className="grid h-9 w-9 place-items-center rounded-xl bg-indigo-50 text-indigo-600"><TicketPercent size={18} /></span>Coupon Codes</h2>
            <Panel className="divide-y divide-slate-100 p-0">
              {offers.map(c => (
                <div key={c.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
                  <div><p className="font-semibold">{valueText(c)}</p><p className="text-xs text-slate-500">{c.description}</p></div>
                  <CopyBtn code={c.code} />
                </div>
              ))}
            </Panel>
          </section>
        </>
      )}
    </PageShell>
  );
}
