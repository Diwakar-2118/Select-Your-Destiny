'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useBooking } from '@/lib/store';

/** Redirects home when the booking flow state is missing (e.g. direct page load). */
export function useBookingGuard(requires: ('trip' | 'seats' | 'passengers' | 'booking')[]) {
  const b = useBooking();
  const router = useRouter();
  const ok =
    b.hydrated &&
    requires.every((r) =>
      r === 'trip' ? !!b.trip : r === 'seats' ? b.seats.length > 0 : r === 'passengers' ? b.passengers.length > 0 : !!b.booking,
    );
  useEffect(() => {
    if (b.hydrated && !ok) router.replace(b.trip ? `/trip/${b.trip.id}/seats` : '/');
  }, [b.hydrated, ok, b.trip, router]);
  return ok;
}
