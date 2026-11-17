import type { useBooking } from '@/lib/store';
import type { BookingRequest } from '@/lib/types';

/** Build a contract BookingRequest from booking-flow state. */
export function buildRequest(b: ReturnType<typeof useBooking>, couponCode?: string): BookingRequest | null {
  if (!b.trip || !b.boardingPoint || !b.droppingPoint) return null;
  return {
    tripId: b.trip.id,
    seatNumbers: b.seats.map((s) => s.seatNumber),
    passengers: b.passengers,
    contactMobile: b.contact.mobile,
    contactEmail: b.contact.email,
    emergencyContact: b.contact.emergencyContact || undefined,
    boardingPointId: b.boardingPoint.id,
    droppingPointId: b.droppingPoint.id,
    gstNumber: b.gst.gstNumber || undefined,
    gstCompany: b.gst.gstCompany || undefined,
    couponCode: couponCode || undefined,
  };
}
