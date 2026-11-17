/**
 * Pending PSP (Toucan) payment kept in sessionStorage across the redirect to the hosted checkout,
 * so /payment/return knows which booking to confirm when the customer comes back.
 */
export interface PendingPayment {
  orderNo: string;
  paymentId: string;
  bookingId: number;
  /** true = no backend (Vercel standalone): status comes from /api/toucan/status */
  standalone: boolean;
}

const KEY = 'syd_pending_payment';

export function savePendingPayment(p: PendingPayment) {
  try { sessionStorage.setItem(KEY, JSON.stringify(p)); } catch { /* storage unavailable */ }
}

export function readPendingPayment(): PendingPayment | null {
  try {
    const v = sessionStorage.getItem(KEY);
    return v ? (JSON.parse(v) as PendingPayment) : null;
  } catch {
    return null;
  }
}

export function clearPendingPayment() {
  try { sessionStorage.removeItem(KEY); } catch { /* ignore */ }
}
