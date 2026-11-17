// Types mirrored 1:1 from docs/CONTRACT.md — keep in sync with backend DTOs.

export type BusType =
  | 'AC_SEATER' | 'NON_AC_SEATER' | 'AC_SLEEPER' | 'NON_AC_SLEEPER'
  | 'AC_SEMI_SLEEPER' | 'VOLVO_MULTI_AXLE' | 'ELECTRIC' | 'PUSH_BACK';
export type Amenity =
  | 'CHARGING_PORT' | 'WATER_BOTTLE' | 'BLANKET' | 'LIVE_TRACKING' | 'CCTV' | 'WIFI' | 'READING_LIGHT';
export type SeatKind = 'PUSH_BACK' | 'SLEEPER' | 'UPPER_SLEEPER' | 'LOWER_SLEEPER';
export type SeatStatus = 'AVAILABLE' | 'BOOKED' | 'LOCKED' | 'SELECTED';
export type BookingStatus = 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED';
export type PaymentMethod =
  | 'UPI' | 'GOOGLE_PAY' | 'PHONEPE' | 'PAYTM' | 'CREDIT_CARD' | 'DEBIT_CARD'
  | 'NET_BANKING' | 'WALLET' | 'LAZYPAY' | 'EMI';

export interface ApiEnvelope<T> { success: boolean; data: T; message: string; }

export interface User {
  id: number; name: string; email: string; mobile: string; role: 'USER' | 'ADMIN';
  avatarUrl?: string; walletBalance: number;
}
export interface AuthResponse { token: string; user: User; }
export interface City { id: number; name: string; state: string; }
export interface Point { id: number; name: string; address: string; time: string; }
export interface Trip {
  id: number; busId: number; busName: string; operatorName: string; busNumber: string;
  busType: BusType; ac: boolean; rating: number; reviews: number;
  fromCity: string; toCity: string; journeyDate: string;
  departureTime: string; arrivalTime: string; durationMins: number;
  boardingPoints: Point[]; droppingPoints: Point[];
  availableSeats: number; windowSeats: number; totalSeats: number;
  amenities: Amenity[]; fare: number; discountPercent: number; couponCode?: string;
}
export interface Seat {
  id: number; seatNumber: string; kind: SeatKind; deck: 'LOWER' | 'UPPER';
  row: number; col: number; isWindow: boolean; isLadies: boolean; price: number; status: SeatStatus;
}
export interface SeatLayout { tripId: number; seats: Seat[]; rows: number; cols: number; hasUpperDeck: boolean; }
export interface PassengerInput { name: string; age: number; gender: 'MALE' | 'FEMALE' | 'OTHER'; seatNumber: string; }
export interface BookingRequest {
  tripId: number; seatNumbers: string[]; passengers: PassengerInput[];
  contactMobile: string; contactEmail: string; emergencyContact?: string;
  boardingPointId: number; droppingPointId: number; gstNumber?: string; gstCompany?: string; couponCode?: string;
}
export interface FareBreakdown {
  baseFare: number; gst: number; platformFee: number; convenienceFee: number;
  discount: number; couponDiscount: number; grandTotal: number;
}
export interface Booking {
  id: number; bookingRef: string; pnr: string; status: BookingStatus;
  trip: Trip; seatNumbers: string[]; passengers: PassengerInput[];
  boardingPoint: Point; droppingPoint: Point; fare: FareBreakdown;
  contactMobile: string; contactEmail: string; createdAt: string;
  paymentStatus: 'PENDING' | 'SUCCESS' | 'FAILED' | 'REFUNDED';
}
export interface Coupon {
  id: number; code: string; description: string; type: 'FLAT' | 'PERCENT' | 'CASHBACK';
  value: number; minAmount: number; maxDiscount: number; validTill: string; active: boolean;
  category: 'FLAT' | 'FESTIVAL' | 'REFERRAL' | 'CASHBACK';
}
export interface Notification {
  id: number;
  type: 'BOOKING_CONFIRMED' | 'BUS_DELAYED' | 'BUS_ARRIVED' | 'OFFER' | 'COUPON' | 'PAYMENT_SUCCESS';
  title: string; body: string; read: boolean; createdAt: string;
}
export interface TrackingInfo {
  bookingId: number; busNumber: string; lat: number; lng: number; etaMins: number;
  driverName: string; driverPhone: string; speedKmph: number; lastUpdated: string;
}
export interface SupportTicket {
  id: number; subject: string; description: string; status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED'; createdAt: string;
}

// Non-contract helper shapes returned by endpoints
export interface PopularRoute { from: string; to: string; startingFare: number; }
export interface CouponValidation { valid: boolean; discount: number; message: string; }
export interface PaymentInit { paymentId: number | string; gatewayOrderId: string; amount: number; redirectUrl?: string; }
export interface SavedCard { id: number; brand: string; last4: string; expiry: string; holder: string; }
export interface Faq { id?: number; question: string; answer: string; }

export type DepartureSlot = 'MORNING' | 'AFTERNOON' | 'EVENING' | 'NIGHT';
export type SortKey = 'PRICE_ASC' | 'RATING_DESC' | 'DEPARTURE' | 'ARRIVAL';
export interface SearchFilters {
  ac?: boolean; sleeper?: boolean; departure?: DepartureSlot; operator?: string;
  amenities?: Amenity[]; sort?: SortKey; busType?: BusType;
}
export interface SearchQuery { from: string; to: string; date: string; returnDate?: string; passengers: number; busType?: BusType; }
