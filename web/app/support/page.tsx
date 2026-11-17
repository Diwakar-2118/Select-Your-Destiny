'use client';
// Help centre: simulated 24/7 chat, call support, raise ticket + my tickets, FAQ accordion.
import { AnimatePresence, motion } from 'framer-motion';
import { Bot, ChevronDown, Headphones, LifeBuoy, MessageCircle, Phone, Send, TicketCheck } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { mockFaqs, mockTickets } from '@/components/account/mock';
import type { Faq, SupportTicket } from '@/components/account/types';
import { Btn, Field, GRADIENT, PageShell, Panel, Pill, Skel, ToastHost, cx, statusTone, useToaster } from '@/components/account/ui';
import { callApi, fmtDate, useApi } from '@/components/account/useApi';

const SUPPORT_PHONE = '+18001234567';

export default function SupportPage() {
  return <ToastHost><SupportInner /></ToastHost>;
}

/** Keyword-based canned replies for the demo chat bot. */
function botReply(q: string): string {
  const s = q.toLowerCase();
  if (/refund/.test(s)) return 'Refunds for cancellations go to your Destiny Wallet instantly. Bank refunds take 5–7 business days.';
  if (/cancel/.test(s)) return 'You can cancel from My Bookings → Upcoming → Cancel Ticket. The refund amount is shown before you confirm.';
  if (/track|where|late|delay/.test(s)) return 'Open My Bookings and tap Track Bus to see live location, ETA and driver contact.';
  if (/reschedul|change date/.test(s)) return 'Tap Reschedule on your upcoming ticket, pick a new date and choose a bus on the same route.';
  if (/coupon|offer|discount/.test(s)) return 'Check the Offers page for the latest coupons. Try FIRST100 for ₹100 off your first trip!';
  if (/hi|hello|hey/.test(s)) return 'Hello! 👋 How can I help with your journey today?';
  return 'Thanks for reaching out. A support specialist will join shortly. Meanwhile you can raise a ticket below for tracking.';
}

type Msg = { from: 'bot' | 'me'; text: string };

function ChatWidget() {
  const [msgs, setMsgs] = useState<Msg[]>([{ from: 'bot', text: 'Hi, I am Destiny Assist. Ask me about refunds, cancellations, tracking or offers.' }]);
  const [text, setText] = useState('');
  const [typing, setTyping] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }, [msgs, typing]);

  const send = (e?: React.FormEvent) => {
    e?.preventDefault();
    const q = text.trim();
    if (!q) return;
    setMsgs(m => [...m, { from: 'me', text: q }]);
    setText(''); setTyping(true);
    setTimeout(() => { setMsgs(m => [...m, { from: 'bot', text: botReply(q) }]); setTyping(false); }, 900 + Math.random() * 600);
  };

  return (
    <Panel className="flex h-[480px] flex-col p-0">
      <div className="flex items-center gap-3 rounded-t-2xl p-4 text-white" style={{ background: GRADIENT }}>
        <span className="grid h-10 w-10 place-items-center rounded-xl bg-white/20"><Bot /></span>
        <div><p className="font-bold">24/7 Live Chat</p><p className="flex items-center gap-1 text-xs text-white/80"><span className="h-2 w-2 rounded-full bg-emerald-300" /> Online · replies instantly</p></div>
      </div>
      <div className="flex-1 space-y-2 overflow-y-auto bg-slate-50 p-4" role="log" aria-live="polite" aria-label="Chat messages">
        {msgs.map((m, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className={cx('flex', m.from === 'me' ? 'justify-end' : 'justify-start')}>
            <p className={cx('max-w-[80%] rounded-2xl px-3 py-2 text-sm shadow-sm', m.from === 'me' ? 'rounded-br-md bg-indigo-600 text-white' : 'rounded-bl-md bg-white text-slate-700')}>{m.text}</p>
          </motion.div>
        ))}
        {typing && <p className="w-16 rounded-2xl bg-white px-3 py-2 text-center text-slate-400 shadow-sm" aria-label="Assistant is typing"><span className="animate-pulse">•••</span></p>}
        <div ref={endRef} />
      </div>
      <form onSubmit={send} className="flex gap-2 border-t border-slate-100 p-3">
        <label htmlFor="chat-input" className="sr-only">Type your message</label>
        <input id="chat-input" value={text} onChange={e => setText(e.target.value)} placeholder="Type your message…"
          className="min-h-[44px] flex-1 rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100" />
        <Btn type="submit" aria-label="Send message" disabled={!text.trim()}><Send size={16} /></Btn>
      </form>
    </Panel>
  );
}

function FaqItem({ f, open, onToggle, idx }: { f: Faq; open: boolean; onToggle: () => void; idx: number }) {
  return (
    <div className="border-b border-slate-100 last:border-0">
      <button onClick={onToggle} aria-expanded={open} aria-controls={`faq-${idx}`} className="flex min-h-[52px] w-full items-center justify-between gap-3 px-5 text-left font-semibold text-slate-800">
        {f.question}
        <ChevronDown size={18} className={cx('shrink-0 text-slate-400 transition-transform', open && 'rotate-180')} />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div id={`faq-${idx}`} initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <p className="px-5 pb-4 text-sm text-slate-600">{f.answer}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function SupportInner() {
  const toast = useToaster();
  const tickets = useApi<SupportTicket[]>('getTickets', [], mockTickets);
  const faqs = useApi<Faq[]>('getFaqs', [], mockFaqs);
  const [open, setOpen] = useState<number | null>(0);
  const [form, setForm] = useState({ subject: '', description: '' });
  const [saving, setSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.subject.trim() || form.description.trim().length < 10) return toast('Please add a subject and at least 10 characters of detail', 'error');
    setSaving(true);
    const t = await callApi<SupportTicket>('createTicket', [form], () => ({ id: Date.now(), ...form, status: 'OPEN', createdAt: new Date().toISOString() }));
    tickets.setData(list => [t, ...(list ?? [])]);
    setForm({ subject: '', description: '' }); setSaving(false);
    toast(`Ticket #${t.id} raised. We will respond within 2 hours.`);
  };

  return (
    <PageShell title="Help & Support" subtitle="We're here for you 24/7" icon={<LifeBuoy />}
      actions={<a href={`tel:${SUPPORT_PHONE}`} className="inline-flex min-h-[44px] items-center gap-2 rounded-2xl bg-white px-4 text-sm font-bold text-indigo-700 shadow" aria-label="Call support"><Phone size={16} /> Call Support</a>}>
      <div className="mb-5 grid gap-4 sm:grid-cols-3">
        {[
          { icon: <MessageCircle />, title: 'Live chat', text: 'Average reply < 1 min', href: '#chat' },
          { icon: <Headphones />, title: 'Call us', text: '1800-123-4567 (toll free)', href: `tel:${SUPPORT_PHONE}` },
          { icon: <TicketCheck />, title: 'Raise a ticket', text: 'Track issues end to end', href: '#ticket' },
        ].map(c => (
          <a key={c.title} href={c.href} className="flex min-h-[44px] items-center gap-3 rounded-2xl border border-slate-200/70 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-indigo-50 text-indigo-600">{c.icon}</span>
            <span><span className="block font-bold">{c.title}</span><span className="text-xs text-slate-500">{c.text}</span></span>
          </a>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <div id="chat"><ChatWidget /></div>

        <div id="ticket" className="space-y-5">
          <Panel>
            <h2 className="mb-3 font-bold">Raise a ticket</h2>
            <form onSubmit={submit} className="space-y-3">
              <Field label="Subject" value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })} placeholder="e.g. Refund not received" />
              <label className="block">
                <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Describe the issue</span>
                <textarea rows={4} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100" placeholder="Booking ID, what happened, and how we can help" />
              </label>
              <Btn type="submit" loading={saving}>Submit ticket</Btn>
            </form>
          </Panel>
          <Panel>
            <h2 className="mb-3 font-bold">My tickets</h2>
            {tickets.loading ? <Skel className="h-24" /> : (tickets.data ?? []).length === 0 ? <p className="text-sm text-slate-500">No tickets yet.</p> : (
              <ul className="divide-y divide-slate-100">
                {(tickets.data ?? []).map(t => (
                  <li key={t.id} className="flex items-start justify-between gap-3 py-3">
                    <div><p className="font-semibold">#{t.id} · {t.subject}</p><p className="text-xs text-slate-500">{fmtDate(t.createdAt)} · {t.description}</p></div>
                    <Pill tone={statusTone(t.status)}>{t.status.replace('_', ' ')}</Pill>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      </div>

      <section aria-label="Frequently asked questions" className="mt-8">
        <h2 className="mb-3 text-lg font-bold">Frequently asked questions</h2>
        <Panel className="p-0">
          {faqs.loading ? <Skel className="m-5 h-40" /> : (faqs.data ?? []).map((f, i) => (
            <FaqItem key={i} f={f} idx={i} open={open === i} onToggle={() => setOpen(open === i ? null : i)} />
          ))}
        </Panel>
      </section>
    </PageShell>
  );
}
