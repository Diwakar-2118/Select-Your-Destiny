'use client';

import { motion } from 'framer-motion';
import type { Seat, SeatLayout } from '@/lib/types';
import { cn, inr } from '@/lib/utils';

export const SEAT_COLORS = {
  available: '#22C55E',
  booked: '#9CA3AF',
  selected: '#2563EB',
  ladies: '#EC4899',
};

function SteeringWheel() {
  return (
    <svg viewBox="0 0 32 32" className="h-8 w-8 text-slate-400" aria-label="Driver" role="img">
      <circle cx="16" cy="16" r="13" fill="none" stroke="currentColor" strokeWidth="3" />
      <circle cx="16" cy="16" r="3.5" fill="currentColor" />
      <path d="M3.5 14h9M19.5 14h9M16 19.5V29" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

function SeatButton({ seat, selected, onToggle, sleeper }: { seat: Seat; selected: boolean; onToggle: (s: Seat) => void; sleeper: boolean }) {
  const unavailable = seat.status === 'BOOKED' || seat.status === 'LOCKED';
  const color = unavailable ? SEAT_COLORS.booked : selected ? SEAT_COLORS.selected : seat.isLadies ? SEAT_COLORS.ladies : SEAT_COLORS.available;
  const label = `Seat ${seat.seatNumber}${seat.isWindow ? ', window' : ''}${seat.isLadies ? ', ladies' : ''}, ${inr(seat.price)}, ${
    unavailable ? 'booked' : selected ? 'selected' : 'available'
  }`;
  return (
    <motion.button
      type="button"
      onClick={() => !unavailable && onToggle(seat)}
      disabled={unavailable}
      aria-pressed={selected}
      aria-label={label}
      title={label}
      whileTap={unavailable ? undefined : { scale: 0.85 }}
      animate={selected ? { scale: [1, 1.15, 1] } : { scale: 1 }}
      transition={{ duration: 0.25 }}
      className={cn(
        'group relative flex flex-col items-center justify-end rounded-lg border-2 transition-colors focus-visible:ring-4 focus-visible:ring-primary/40',
        sleeper ? 'h-[88px] w-11 pb-1.5' : 'h-11 w-11 pb-1',
        unavailable ? 'cursor-not-allowed' : 'cursor-pointer hover:-translate-y-0.5',
      )}
      style={{
        borderColor: color,
        backgroundColor: selected ? color : unavailable ? '#F3F4F6' : `${color}14`,
      }}
    >
      {/* pillow / backrest */}
      <span
        aria-hidden
        className={cn('absolute rounded', sleeper ? 'left-1.5 right-1.5 top-1.5 h-2.5' : 'left-1.5 right-1.5 top-1 h-1.5')}
        style={{ backgroundColor: selected ? '#fff' : color, opacity: selected ? 0.8 : 0.6 }}
      />
      <span className={cn('text-[10px] font-bold leading-none', selected ? 'text-white' : unavailable ? 'text-gray-400' : 'text-slate-700')}>{seat.seatNumber}</span>
      {seat.isWindow && <span aria-hidden className="absolute -left-[3px] top-1/2 h-4 w-1 -translate-y-1/2 rounded-full bg-sky-400" />}
    </motion.button>
  );
}

export function SeatDeck({
  layout,
  deck,
  selected,
  onToggle,
}: {
  layout: SeatLayout;
  deck: 'LOWER' | 'UPPER';
  selected: string[];
  onToggle: (s: Seat) => void;
}) {
  const seats = layout.seats.filter((s) => s.deck === deck);
  const sleeper = seats.some((s) => s.kind !== 'PUSH_BACK');
  const cols = layout.cols;
  // aisle position: 2+2 → after col 1; 2+1 → after col 0
  const aisleAfter = cols >= 4 ? 1 : 0;
  const rows = Math.max(layout.rows, ...seats.map((s) => s.row + 1));
  const grid: (Seat | null)[][] = Array.from({ length: rows }, () => Array<Seat | null>(cols).fill(null));
  seats.forEach((s) => {
    if (grid[s.row]) grid[s.row][s.col] = s;
  });

  return (
    <div className="relative inline-block rounded-3xl border-2 border-gray-200 bg-white p-4 pt-3 shadow-soft">
      <div className="mb-3 flex items-center justify-between border-b border-dashed border-gray-200 pb-2">
        <span className="text-xs font-bold uppercase tracking-wider text-muted">{deck === 'LOWER' ? 'Lower deck' : 'Upper deck'}</span>
        {deck === 'LOWER' ? <SteeringWheel /> : <span className="h-8" />}
      </div>
      <div role="group" aria-label={`${deck.toLowerCase()} deck seats`} className="flex flex-col gap-2">
        {grid.map((row, r) => (
          <div key={r} className="flex items-center gap-2">
            {row.map((seat, c) => (
              <div key={c} className="flex items-center gap-2">
                {seat ? <SeatButton seat={seat} selected={selected.includes(seat.seatNumber)} onToggle={onToggle} sleeper={sleeper} /> : <span className={sleeper ? 'h-[88px] w-11' : 'h-11 w-11'} />}
                {c === aisleAfter && <span className="w-5 sm:w-7" aria-hidden />}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function SeatLegend() {
  const items = [
    ['Available', SEAT_COLORS.available, false],
    ['Booked', SEAT_COLORS.booked, false],
    ['Selected', SEAT_COLORS.selected, true],
    ['Ladies', SEAT_COLORS.ladies, false],
  ] as const;
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-2 text-xs font-semibold text-slate-600" aria-label="Seat legend">
      {items.map(([l, c, fill]) => (
        <li key={l} className="flex items-center gap-1.5">
          <span className="h-4 w-4 rounded border-2" style={{ borderColor: c, backgroundColor: fill ? c : `${c}22` }} aria-hidden />
          {l}
        </li>
      ))}
      <li className="flex items-center gap-1.5">
        <span className="h-4 w-1 rounded-full bg-sky-400" aria-hidden /> Window
      </li>
    </ul>
  );
}
