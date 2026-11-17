'use client';

/**
 * Customer lands here after the Toucan hosted checkout. The payment is never trusted from the URL:
 * we poll the authoritative status (backend, or /api/toucan/status in standalone mode) and only then
 * show the success screen.
 */
import { Suspense, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2, XCircle } from 'lucide-react';
import { api, API_URL, errorMessage, getToken } from '@/lib/api';
import { useBooking } from '@/lib/store';
import { clearPendingPayment, readPendingPayment } from '@/lib/payment';
import { Button, Card } from '@/components/ui';

type Phase = 'checking' | 'failed' | 'pending';
const MAX_ATTEMPTS = 10;

async function fetchStatus(orderNo: string, standalone: boolean): Promise<{ status: string; rrn?: string }> {
  if (standalone) {
    const r = await fetch(`/api/toucan/status?order=${encodeURIComponent(orderNo)}`, { cache: 'no-store' });
    const j = await r.json();
    if (!r.ok) throw new Error(j?.message || 'Status check failed');
    return j.data;
  }
  const r = await fetch(`${API_URL}/payments/toucan/status/${encodeURIComponent(orderNo)}`, {
    headers: { Authorization: `Bearer ${getToken() ?? ''}` },
    cache: 'no-store',
  });
  const j = await r.json();
  if (!r.ok) throw new Error(j?.message || 'Status check failed');
  return j.data;
}

function ReturnInner() {
  const router = useRouter();
  const params = useSearchParams();
  const b = useBooking();
  const [phase, setPhase] = useState<Phase>('checking');
  const [message, setMessage] = useState('');
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const pending = readPendingPayment();
    const orderNo = params.get('order') || pending?.orderNo;
    if (!orderNo) {
      setPhase('failed');
      setMessage('No payment reference found.');
      return;
    }
    const standalone = pending?.standalone ?? false;

    (async () => {
      for (let i = 0; i < MAX_ATTEMPTS; i++) {
        try {
          const s = await fetchStatus(orderNo, standalone);
          if (s.status === 'SUCCESS') {
            let booking;
            if (standalone && pending) {
              // Demo data layer: mark the locally stored booking as paid
              booking = await api.verifyPayment({ paymentId: pending.paymentId, gatewayPaymentId: s.rrn ?? orderNo, signature: 'mock', bookingId: pending.bookingId });
            } else if (pending) {
              booking = await api.getBooking(pending.bookingId);
            }
            if (booking) b.update({ booking, lock: null });
            clearPendingPayment();
            router.replace('/success');
            return;
          }
          if (s.status === 'FAILED') {
            setPhase('failed');
            setMessage('Your payment was declined. No money has been taken for this booking.');
            return;
          }
        } catch (e) {
          setMessage(errorMessage(e));
        }
        await new Promise((r) => setTimeout(r, 3000));
      }
      setPhase('pending');
    })();
  }, [params, router, b]);

  return (
    <div className="container-app flex min-h-[60vh] items-center justify-center py-10">
      <Card className="w-full max-w-md text-center" padding="lg">
        {phase === 'checking' && (
          <div role="status" aria-live="polite" className="flex flex-col items-center gap-3">
            <Loader2 className="h-10 w-10 animate-spin text-primary" aria-hidden />
            <h1 className="text-xl font-bold">Confirming your payment</h1>
            <p className="text-sm text-slate-500">Please don&apos;t close or refresh this page.</p>
          </div>
        )}
        {phase === 'failed' && (
          <div role="alert" className="flex flex-col items-center gap-3">
            <XCircle className="h-10 w-10 text-red-500" aria-hidden />
            <h1 className="text-xl font-bold">Payment failed</h1>
            <p className="text-sm text-slate-500">{message}</p>
            <Button onClick={() => router.push('/checkout')}>Try again</Button>
          </div>
        )}
        {phase === 'pending' && (
          <div role="status" className="flex flex-col items-center gap-3">
            <h1 className="text-xl font-bold">Payment is still processing</h1>
            <p className="text-sm text-slate-500">
              We haven&apos;t received a final answer from the bank yet. Your booking will be confirmed automatically
              once it arrives. Check My Bookings in a few minutes.
            </p>
            <Button onClick={() => router.push('/bookings')}>Go to My Bookings</Button>
          </div>
        )}
      </Card>
    </div>
  );
}

export default function PaymentReturnPage() {
  return (
    <Suspense fallback={null}>
      <ReturnInner />
    </Suspense>
  );
}
