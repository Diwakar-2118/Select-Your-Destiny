import { NextResponse } from 'next/server';
import { checkStatus, toucanEnabled } from '@/lib/server/toucan';

export const dynamic = 'force-dynamic';

/** GET /api/toucan/status?order=: authoritative status straight from Toucan (standalone mode). */
export async function GET(req: Request) {
  const order = new URL(req.url).searchParams.get('order');
  if (!order || !/^\d{15,}$/.test(order)) return NextResponse.json({ success: false, message: 'Invalid order' }, { status: 400 });
  if (!toucanEnabled()) return NextResponse.json({ success: false, message: 'Toucan is not configured' }, { status: 503 });
  try {
    const s = await checkStatus(order);
    const status = s.approved ? 'SUCCESS' : s.success && s.actionCode ? 'FAILED' : 'PENDING';
    return NextResponse.json({ success: true, data: { orderNo: order, status, amount: s.amount, rrn: s.rrn } });
  } catch (e) {
    return NextResponse.json({ success: false, message: (e as Error).message }, { status: 502 });
  }
}
