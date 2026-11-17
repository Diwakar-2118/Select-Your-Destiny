import { NextResponse } from 'next/server';
import { checkStatus, orderNoFromCallback, toucanEnabled } from '@/lib/server/toucan';

export const dynamic = 'force-dynamic';

/**
 * POST /api/toucan/callback: Toucan server-to-server callback (standalone mode).
 * The payload is unsigned, so it is only logged and re-verified with Check Status; the customer return
 * page runs the same verification before showing success. When the Spring Boot backend is deployed,
 * register the backend callback (/api/payments/toucan/callback) with Toucan instead.
 */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as Record<string, string>;
  const order = orderNoFromCallback(body.pspRefNo, body.custRefNo);
  if (order && toucanEnabled()) {
    try {
      const s = await checkStatus(order);
      console.log('[toucan] callback', { order, reported: body.status, verified: s.approved, actionCode: s.actionCode });
    } catch (e) {
      console.warn('[toucan] callback verification failed', order, (e as Error).message);
    }
  }
  return NextResponse.json({ success: true });
}
