// Local mirror of the contract types used by account/admin pages.
// Kept local so these pages stay compilable even if lib/types.ts drifts.
export type BookingStatus = 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED';
export interface Point { id: number; name: string; address: string; time: string }
export interface Trip {
  id: number; busId: number; busName: string; operatorName: string; busNumber: string;
  busType: string; ac: boolean; rating: number; reviews: number;
  fromCity: string; toCity: string; journeyDate: string;
  departureTime: string; arrivalTime: string; durationMins: number;
  boardingPoints: Point[]; droppingPoints: Point[];
  availableSeats: number; windowSeats: number; totalSeats: number;
  amenities: string[]; fare: number; discountPercent: number; couponCode?: string;
}
export interface PassengerInput { name: string; age: number; gender: 'MALE' | 'FEMALE' | 'OTHER'; seatNumber: string }
export interface FareBreakdown { baseFare: number; gst: number; platformFee: number; convenienceFee: number; discount: number; couponDiscount: number; grandTotal: number }
export interface Booking {
  id: number; bookingRef: string; pnr: string; status: BookingStatus;
  trip: Trip; seatNumbers: string[]; passengers: PassengerInput[];
  boardingPoint: Point; droppingPoint: Point; fare: FareBreakdown;
  contactMobile: string; contactEmail: string; createdAt: string;
  paymentStatus: 'PENDING' | 'SUCCESS' | 'FAILED' | 'REFUNDED';
}
export interface Coupon {
  id: number; code: string; description: string; type: 'FLAT' | 'PERCENT' | 'CASHBACK'; value: number;
  minAmount: number; maxDiscount: number; validTill: string; active: boolean;
  category: 'FLAT' | 'FESTIVAL' | 'REFERRAL' | 'CASHBACK';
}
export type NotificationType = 'BOOKING_CONFIRMED' | 'BUS_DELAYED' | 'BUS_ARRIVED' | 'OFFER' | 'COUPON' | 'PAYMENT_SUCCESS';
export interface AppNotification { id: number; type: NotificationType; title: string; body: string; read: boolean; createdAt: string }
export interface TrackingInfo { bookingId: number; busNumber: string; lat: number; lng: number; etaMins: number; driverName: string; driverPhone: string; speedKmph: number; lastUpdated: string }
export interface SupportTicket { id: number; subject: string; description: string; status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED'; createdAt: string }
export interface UserLite { id: number; name: string; email: string; mobile: string; role: 'USER' | 'ADMIN'; avatarUrl?: string; walletBalance: number }
export interface SavedPassenger { id: number; name: string; age: number; gender: 'MALE' | 'FEMALE' | 'OTHER' }
export interface SavedCard { id: number; brand: string; last4: string; holder?: string; holderName?: string; expiry: string }
export interface WalletTxn { id: number; type: 'CREDIT' | 'DEBIT'; amount: number; description: string; createdAt: string }
export interface Wallet { balance: number; transactions: WalletTxn[] }
export interface Faq { id?: number; question: string; answer: string }
export interface Dashboard {
  totalBookings: number; revenue: number; activeBuses: number; users: number;
  bookingsByDay: { date: string; count: number; revenue: number }[];
  topRoutes: { route: string; bookings: number }[];
  paymentSplit: { method: string; amount: number }[];
}
