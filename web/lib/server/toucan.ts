/**
 * Toucan Payments (PSP) server-side client, used by the Next.js route handlers so the payment
 * redirect flow also works when the web app is deployed on Vercel without the Spring Boot backend.
 * SERVER ONLY: reads secrets from environment variables (Vercel > Project > Settings > Environment Variables).
 */
import { createHash, randomInt } from 'crypto';

const env = (k: string, d = '') => process.env[k] ?? d;

export const toucanConfig = () => ({
  checkoutUrl: env('TOUCAN_CHECKOUT_URL', 'https://pay.testtoucanpay.in/api/auth/getpaymentsession'),
  statusUrl: env('TOUCAN_STATUS_URL', 'https://pay.toucanpay.in/api/pay/v1/checkStatus'),
  terminalId: env('TOUCAN_TERMINAL_ID'),
  merchantNumber: env('TOUCAN_MERCHANT_NUMBER'),
  mac: env('TOUCAN_MAC'),
  murl: env('TOUCAN_MURL', 'https://merchant.testtoucanpay.in/'),
  statusToken: env('TOUCAN_STATUS_TOKEN'),
  currency: env('TOUCAN_CURRENCY', 'INR'),
});

export const toucanEnabled = () => {
  const c = toucanConfig();
  return env('TOUCAN_ENABLED') === 'true' && !!c.terminalId && !!c.mac;
};

/** 14-digit timestamp + 3 random digits (spec: min 15 digits, unique per transaction). */
export function newOrderNo(): string {
  const d = new Date();
  const p = (n: number, l = 2) => String(n).padStart(l, '0');
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}${p(randomInt(1000), 3)}`;
}

/** Amount string sent as `ta` (max 2dp, no trailing zeros). The hash is computed over exactly this string. */
export const formatAmount = (n: number) => String(Math.round(n * 100) / 100);

/** `ha` = SHA-512 hex of the amount string (verified against the spec sample: sha512("23")). */
export const hashAmount = (ta: string) => createHash('sha512').update(ta, 'utf8').digest('hex');

/** Creates a hosted-checkout session and returns the URL from the 302 Location header. */
export async function createSession(input: { orderNo: string; amount: number; name: string; phone: string; email: string }) {
  const c = toucanConfig();
  const ta = formatAmount(input.amount);
  const form = new URLSearchParams({
    t: c.terminalId, o: input.orderNo, ta, c: c.currency, mac: c.mac, murl: c.murl,
    name: input.name, phone: input.phone, emailId: input.email, ha: hashAmount(ta),
  });
  const res = await fetch(c.checkoutUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: form.toString(),
    redirect: 'manual', // keep the Location header instead of following it
    cache: 'no-store',
  });
  const location = res.headers.get('location');
  if (res.status === 404) throw new Error('Merchant token (mac) not authorised by Toucan');
  if (!location) throw new Error(`Toucan returned no checkout URL (HTTP ${res.status})`);
  if (!location.includes('checkoutpage')) throw new Error('Toucan rejected the request (failure URL returned)');
  return location;
}

export interface ToucanStatus { success: boolean; actionCode?: string; amount?: number; rrn?: string; approvalCode?: string; approved: boolean }

/** Authoritative status from the Check Status API. The callback is unsigned, so always confirm here. */
export async function checkStatus(orderNo: string): Promise<ToucanStatus> {
  const c = toucanConfig();
  const res = await fetch(c.statusUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${c.statusToken}` },
    body: JSON.stringify({
      messageID: '/api/pay/v1/checkStatus',
      requestType: 'text',
      object: { invoiceNumber: orderNo, terminalNumber: c.terminalId, merchantNumber: c.merchantNumber },
    }),
    cache: 'no-store',
  });
  const j = await res.json().catch(() => ({}));
  const o = j?.object ?? {};
  const success = !!j?.success;
  return {
    success, actionCode: o.actionCode, amount: o.transactionAmount?.value, rrn: o.rrn, approvalCode: o.approvalCode,
    approved: success && o.actionCode === '00',
  };
}

/** pspRefNo = terminalNumber + invoiceNumber; custRefNo is the fallback. */
export function orderNoFromCallback(pspRefNo?: string, custRefNo?: string) {
  const t = toucanConfig().terminalId;
  if (pspRefNo && t && pspRefNo.startsWith(t)) return pspRefNo.slice(t.length);
  return custRefNo;
}
