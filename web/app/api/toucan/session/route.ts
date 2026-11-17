import { NextResponse } from 'next/server';
import { createSession, newOrderNo, toucanEnabled } from '@/lib/server/toucan';

export const dynamic = 'force-dynamic';

/** POST /api/toucan/session: standalone (no backend) mode. Creates a Toucan checkout and returns its URL. */
export async function POST(req: Request) {
  if (!toucanEnabled()) return NextResponse.json({ success: false, message: 'Toucan is not configured' }, { status: 503 });
  const b = await req.json().catch(() => ({}));
  const amount = Number(b.amount);
  if (!amount || amount <= 0) return NextResponse.json({ success: false, message: 'Invalid amount' }, { status: 400 });
  try {
    const orderNo = newOrderNo();
    const redirectUrl = await createSession({
      orderNo, amount, name: String(b.name ?? ''), phone: String(b.phone ?? ''), email: String(b.email ?? ''),
    });
    return NextResponse.json({ success: true, data: { orderNo, redirectUrl, amount } });
  } catch (e) {
    return NextResponse.json({ success: false, message: (e as Error).message }, { status: 502 });
  }
}
