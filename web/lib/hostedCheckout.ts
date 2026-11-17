/**
 * Starts the Toucan hosted checkout for a booking and returns the URL to redirect the browser to.
 * The customer picks UPI / card / net banking etc. on Toucan's own page, so we don't collect a method.
 *
 * - Backend mode: POST /payments/initiate returns `redirectUrl` (backend talks to Toucan).
 * - Standalone mode (Vercel, no backend): our Next.js route /api/toucan/session talks to Toucan.
 * Returns null when Toucan is not configured, so the caller can fall back to the demo checkout.
 */
import { api, isMockMode } from '@/lib/api';
import { savePendingPayment } from '@/lib/payment';
import type { Booking, PaymentMethod } from '@/lib/types';

export async function startHostedCheckout(
  booking: Booking,
  opts: { method?: PaymentMethod; promoCode?: string } = {},
): Promise<string | null> {
  // Method is only recorded for reporting; the real choice happens on Toucan's page.
  const init = await api.initiatePayment({ bookingId: booking.id, method: opts.method ?? 'UPI', promoCode: opts.promoCode });
  let redirectUrl = init.redirectUrl;
  let orderNo = init.gatewayOrderId;
  const standalone = !redirectUrl && isMockMode();

  if (standalone) {
    const res = await fetch('/api/toucan/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amount: init.amount || booking.fare.grandTotal,
        name: booking.passengers[0]?.name ?? '',
        phone: booking.contactMobile,
        email: booking.contactEmail,
      }),
    });
    const j = await res.json().catch(() => null);
    if (res.status === 503) return null; // Toucan not configured on this deployment
    if (!res.ok || !j?.data?.redirectUrl) throw new Error(j?.message || 'Could not start payment');
    redirectUrl = j.data.redirectUrl;
    orderNo = j.data.orderNo;
  }
  if (!redirectUrl) return null;

  savePendingPayment({ orderNo, paymentId: init.paymentId, bookingId: booking.id, standalone });
  return redirectUrl;
}
