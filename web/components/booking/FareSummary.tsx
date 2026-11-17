import type { FareBreakdown } from '@/lib/types';
import { inr2 } from '@/lib/utils';

export function FareSummary({ fare, seatsCount, extraDiscount = 0, extraLabel }: { fare: FareBreakdown; seatsCount?: number; extraDiscount?: number; extraLabel?: string }) {
  const rows: [string, number, 'add' | 'sub'][] = [
    [`Base fare${seatsCount ? ` (${seatsCount} seat${seatsCount > 1 ? 's' : ''})` : ''}`, fare.baseFare, 'add'],
    ['GST (5%)', fare.gst, 'add'],
    ['Platform fee', fare.platformFee, 'add'],
    ['Convenience fee (2%)', fare.convenienceFee, 'add'],
    ['Discount', fare.discount, 'sub'],
    ['Coupon discount', fare.couponDiscount, 'sub'],
  ];
  if (extraDiscount > 0) rows.push([extraLabel || 'Promo', extraDiscount, 'sub']);
  const total = Math.max(0, fare.grandTotal - extraDiscount);
  return (
    <dl className="space-y-2.5 text-sm">
      {rows.map(([label, v, kind]) =>
        kind === 'sub' && v <= 0 ? null : (
          <div key={label} className="flex items-center justify-between">
            <dt className="text-slate-600">{label}</dt>
            <dd className={kind === 'sub' ? 'font-semibold text-green-600' : 'font-semibold text-ink'}>
              {kind === 'sub' ? '− ' : ''}
              {inr2(v)}
            </dd>
          </div>
        ),
      )}
      <div className="flex items-center justify-between border-t border-dashed border-gray-300 pt-3">
        <dt className="text-base font-bold text-ink">Grand total</dt>
        <dd className="text-xl font-extrabold text-ink">{inr2(total)}</dd>
      </div>
    </dl>
  );
}
