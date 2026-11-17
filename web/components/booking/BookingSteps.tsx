import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

const STEPS = ['Seats', 'Passengers', 'Summary', 'Payment'];

export function BookingSteps({ current }: { current: number }) {
  return (
    <nav aria-label="Booking progress" className="mb-6">
      <ol className="flex items-center gap-2">
        {STEPS.map((s, i) => {
          const done = i < current;
          const active = i === current;
          return (
            <li key={s} className="flex flex-1 items-center gap-2" aria-current={active ? 'step' : undefined}>
              <span
                className={cn(
                  'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold transition',
                  done ? 'bg-green-500 text-white' : active ? 'gradient-brand text-white shadow-lift' : 'bg-card text-muted',
                )}
              >
                {done ? <Check className="h-4 w-4" /> : i + 1}
              </span>
              <span className={cn('hidden text-sm font-semibold sm:inline', active ? 'text-ink' : 'text-muted')}>{s}</span>
              {i < STEPS.length - 1 && <span className={cn('h-0.5 flex-1 rounded-full', done ? 'bg-green-500' : 'bg-gray-200')} aria-hidden />}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
