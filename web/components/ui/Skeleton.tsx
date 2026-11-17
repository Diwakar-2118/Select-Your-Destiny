import React from 'react';
import { cn } from '@/lib/utils';

export function Skeleton({ className, ...rest }: React.HTMLAttributes<HTMLDivElement>) {
  return <div aria-hidden className={cn('skeleton', className)} {...rest} />;
}

/** Preset skeleton for list/card loading states. */
export function SkeletonCard({ lines = 3 }: { lines?: number }) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-soft" role="status" aria-label="Loading">
      <div className="flex items-center gap-4">
        <Skeleton className="h-12 w-12 rounded-2xl" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-3 w-1/3" />
        </div>
      </div>
      <div className="mt-4 space-y-2">
        {Array.from({ length: lines }).map((_, i) => (
          <Skeleton key={i} className="h-3" style={{ width: `${90 - i * 15}%` }} />
        ))}
      </div>
      <span className="sr-only">Loading…</span>
    </div>
  );
}
