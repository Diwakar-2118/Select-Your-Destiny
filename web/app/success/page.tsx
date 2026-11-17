'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import confetti from 'canvas-confetti';
import { QRCodeSVG } from 'qrcode.react';
import { ArrowRight, Download, Home, Mail, MapPin, MessageSquare, Share2, Ticket } from 'lucide-react';
import { api, errorMessage } from '@/lib/api';
import { useBooking } from '@/lib/store';
import type { Booking } from '@/lib/types';
import { BUS_TYPE_LABEL, formatDate, inr2 } from '@/lib/utils';
import { Badge, Button, Card, PageTransition, Skeleton, useToast } from '@/components/ui';
import { useBookingGuard } from '@/components/booking/useBookingGuard';

function printableTicket(bk: Booking, qrSvg: string) {
  const t = bk.trip;
  return `<!doctype html><html><head><meta charset="utf-8"><title>Ticket ${bk.bookingRef}</title>
<style>body{font-family:Inter,system-ui,sans-serif;color:#0F172A;margin:32px}h1{margin:0;background:linear-gradient(135deg,#2563EB,#6D28D9 60%,#F97316);-webkit-background-clip:text;color:transparent}
.box{border:1px solid #E5E7EB;border-radius:16px;padding:20px;margin-top:16px}.row{display:flex;justify-content:space-between;gap:16px}.muted{color:#64748B;font-size:13px}table{width:100%;border-collapse:collapse}td,th{text-align:left;padding:6px 0;border-bottom:1px solid #F3F4F6;font-size:14px}</style></head>
<body><h1>Select Your Destiny</h1><div class="muted">Book Smart. Travel Comfortably.</div>
<div class="box row"><div><div class="muted">Booking ID</div><b>${bk.bookingRef}</b><div class="muted" style="margin-top:8px">PNR</div><b>${bk.pnr}</b><div class="muted" style="margin-top:8px">Status</div><b>${bk.status}</b></div><div>${qrSvg}</div></div>
<div class="box"><div class="row"><div><b>${t.fromCity}</b><div class="muted">${bk.boardingPoint.time} · ${bk.boardingPoint.name}</div></div><div style="text-align:right"><b>${t.toCity}</b><div class="muted">${bk.droppingPoint.time} · ${bk.droppingPoint.name}</div></div></div>
<p class="muted">${formatDate(t.journeyDate, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} · ${t.operatorName} · ${t.busName} (${t.busNumber}) · ${BUS_TYPE_LABEL[t.busType]}</p></div>
<div class="box"><table><tr><th>Passenger</th><th>Age</th><th>Gender</th><th>Seat</th></tr>${bk.passengers.map((p) => `<tr><td>${p.name}</td><td>${p.age}</td><td>${p.gender}</td><td>${p.seatNumber}</td></tr>`).join('')}</table></div>
<div class="box row"><span>Total paid</span><b>${inr2(bk.fare.grandTotal)}</b></div>
<p class="muted">Please carry a valid photo ID. Report at boarding point 15 minutes before departure.</p></body></html>`;
}

export default function SuccessPage() {
  const ok = useBookingGuard(['booking']);
  const { booking } = useBooking();
  const toast = useToast();
  const qrRef = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    if (!ok) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const colors = ['#2563EB', '#6D28D9', '#F97316', '#22C55E', '#EC4899'];
    confetti({ particleCount: 140, spread: 90, origin: { y: 0.55 }, colors });
    const end = Date.now() + 1600;
    const frame = () => {
      confetti({ particleCount: 4, angle: 60, spread: 60, origin: { x: 0 }, colors });
      confetti({ particleCount: 4, angle: 120, spread: 60, origin: { x: 1 }, colors });
      if (Date.now() < end) requestAnimationFrame(frame);
    };
    frame();
  }, [ok]);

  if (!ok || !booking) {
    return (
      <div className="container-app py-10">
        <Skeleton className="mx-auto h-96 max-w-2xl" />
      </div>
    );
  }
  const t = booking.trip;
  const qrValue = JSON.stringify({ ref: booking.bookingRef, pnr: booking.pnr, seats: booking.seatNumbers, trip: t.id });
  const shareText = `My bus ticket ${booking.bookingRef} (PNR ${booking.pnr}): ${t.fromCity} → ${t.toCity} on ${formatDate(t.journeyDate)} at ${booking.boardingPoint.time}, seats ${booking.seatNumbers.join(', ')} — booked on Select Your Destiny.`;

  const download = async () => {
    setBusy('pdf');
    try {
      const blob = await api.downloadTicket(booking.id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ticket-${booking.bookingRef}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      // backend unavailable → open printable ticket (Save as PDF)
      const w = window.open('', '_blank');
      if (w) {
        w.document.write(printableTicket(booking, qrRef.current?.innerHTML ?? ''));
        w.document.close();
        w.focus();
        setTimeout(() => w.print(), 300);
      } else toast.error('Please allow pop-ups to download your ticket');
    } finally {
      setBusy(null);
    }
  };

  const share = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: `Ticket ${booking.bookingRef}`, text: shareText, url: window.location.origin + '/bookings' });
      } catch {
        /* user cancelled */
      }
    } else {
      try {
        await navigator.clipboard.writeText(shareText);
        toast.success('Ticket details copied to clipboard');
      } catch {
        toast.info(shareText);
      }
    }
  };

  const send = async (channel: 'EMAIL' | 'SMS') => {
    setBusy(channel);
    try {
      await api.shareBooking(booking.id, channel);
      toast.success(channel === 'EMAIL' ? `Ticket emailed to ${booking.contactEmail}` : `Ticket sent via SMS to +91 ${booking.contactMobile}`);
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(null);
    }
  };

  return (
    <PageTransition className="container-app py-10">
      <div className="mx-auto max-w-3xl">
        <div className="text-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 220, damping: 14 }}
            className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-green-500 shadow-[0_12px_40px_-8px_rgba(34,197,94,0.6)]"
          >
            <svg viewBox="0 0 52 52" className="h-14 w-14" aria-hidden>
              <path
                d="M14 27 l8 8 l16 -18"
                fill="none"
                stroke="#fff"
                strokeWidth="5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="check-draw"
              />
            </svg>
          </motion.div>
          <motion.h1 initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="mt-6 text-3xl font-extrabold">
            Booking confirmed!
          </motion.h1>
          <p className="mt-2 text-muted">
            Your ticket has been sent to <b className="text-ink">{booking.contactEmail}</b> and <b className="text-ink">+91 {booking.contactMobile}</b>
          </p>
        </div>

        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55 }}>
          <Card padding="none" className="mt-8 overflow-hidden">
            <div className="gradient-brand flex flex-wrap items-center justify-between gap-4 p-5 text-white sm:p-6">
              <div>
                <p className="text-xs uppercase tracking-wider text-white/80">Booking ID</p>
                <p className="text-2xl font-extrabold tracking-wide">{booking.bookingRef}</p>
                <p className="mt-2 text-xs uppercase tracking-wider text-white/80">PNR</p>
                <p className="text-lg font-bold tracking-wide">{booking.pnr}</p>
              </div>
              <div ref={qrRef} className="rounded-2xl bg-white p-3" aria-label="Ticket QR code" role="img">
                <QRCodeSVG value={qrValue} size={120} fgColor="#0F172A" level="M" />
              </div>
            </div>

            {/* perforation */}
            <div className="relative h-0 border-t-2 border-dashed border-gray-200">
              <span className="absolute -left-3 -top-3 h-6 w-6 rounded-full bg-white" />
              <span className="absolute -right-3 -top-3 h-6 w-6 rounded-full bg-white" />
            </div>

            <div className="space-y-5 p-5 sm:p-6">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone="success">{booking.status}</Badge>
                <Badge tone="neutral">Payment {booking.paymentStatus}</Badge>
                <Badge tone="primary">{BUS_TYPE_LABEL[t.busType]}</Badge>
              </div>
              <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
                <div>
                  <p className="text-2xl font-extrabold">{booking.boardingPoint.time}</p>
                  <p className="font-semibold">{t.fromCity}</p>
                  <p className="flex items-start gap-1 text-xs text-muted"><MapPin className="h-3.5 w-3.5 shrink-0 text-green-600" /> {booking.boardingPoint.name}</p>
                </div>
                <ArrowRight className="h-5 w-5 text-primary" />
                <div className="text-right">
                  <p className="text-2xl font-extrabold">{booking.droppingPoint.time}</p>
                  <p className="font-semibold">{t.toCity}</p>
                  <p className="flex items-start justify-end gap-1 text-xs text-muted"><MapPin className="h-3.5 w-3.5 shrink-0 text-red-500" /> {booking.droppingPoint.name}</p>
                </div>
              </div>
              <div className="grid gap-3 rounded-2xl bg-card p-4 text-sm sm:grid-cols-3">
                <div><p className="text-muted">Date</p><p className="font-bold">{formatDate(t.journeyDate)}</p></div>
                <div><p className="text-muted">Operator</p><p className="font-bold">{t.operatorName}</p></div>
                <div><p className="text-muted">Bus no.</p><p className="font-bold">{t.busNumber}</p></div>
              </div>
              <ul className="divide-y divide-gray-100">
                {booking.passengers.map((p) => (
                  <li key={p.seatNumber} className="flex items-center justify-between py-2.5 text-sm">
                    <span><b>{p.name}</b> <span className="text-muted">· {p.age} · {p.gender.charAt(0)}</span></span>
                    <Badge tone="primary">Seat {p.seatNumber}</Badge>
                  </li>
                ))}
              </ul>
              <div className="flex items-center justify-between border-t border-dashed border-gray-200 pt-4">
                <span className="font-semibold">Total paid</span>
                <span className="text-2xl font-extrabold">{inr2(booking.fare.grandTotal)}</span>
              </div>
            </div>
          </Card>
        </motion.div>

        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Button variant="primary" leftIcon={<Download className="h-5 w-5" />} loading={busy === 'pdf'} onClick={download}>PDF</Button>
          <Button variant="white" leftIcon={<Share2 className="h-5 w-5" />} onClick={share}>Share</Button>
          <Button variant="white" leftIcon={<Mail className="h-5 w-5" />} loading={busy === 'EMAIL'} onClick={() => send('EMAIL')}>Email</Button>
          <Button variant="white" leftIcon={<MessageSquare className="h-5 w-5" />} loading={busy === 'SMS'} onClick={() => send('SMS')}>SMS</Button>
        </div>

        <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
          <Link href="/bookings" className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-2xl bg-primary-50 px-6 font-semibold text-primary-700 hover:bg-primary-100">
            <Ticket className="h-5 w-5" /> View my bookings
          </Link>
          <Link href="/" className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-2xl bg-card px-6 font-semibold text-ink hover:bg-gray-200">
            <Home className="h-5 w-5" /> Book another trip
          </Link>
        </div>
      </div>
    </PageTransition>
  );
}
