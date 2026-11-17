// Types mirrored verbatim from docs/CONTRACT.md

export type BusType =
  | 'AC_SEATER'
  | 'NON_AC_SEATER'
  | 'AC_SLEEPER'
  | 'NON_AC_SLEEPER'
  | 'AC_SEMI_SLEEPER'
  | 'VOLVO_MULTI_AXLE'
  | 'ELECTRIC'
  | 'PUSH_BACK';
export type Amenity = 'CHARGING_PORT' | 'WATER_BOTTLE' | 'BLANKET' | 'LIVE_TRACKING' | 'CCTV' | 'WIFI' | 'READING_LIGHT';
export type SeatKind = 'PUSH_BACK' | 'SLEEPER' | 'UPPER_SLEEPER' | 'LOWER_SLEEPER';
export type SeatStatus = 'AVAILABLE' | 'BOOKED' | 'LOCKED' | 'SELECTED';
export type BookingStatus = 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED';
export type PaymentMethod =
  | 'UPI'
  | 'GOOGLE_PAY'
  | 'PHONEPE'
  | 'PAYTM'
  | 'CREDIT_CARD'
  | 'DEBIT_CARD'
  | 'NET_BANKING'
  | 'WALLET'
  | 'LAZYPAY'
  | 'EMI';

export interface User {
  id: number;
  name: string;
  email: string;
  mobile: string;
  role: 'USER' | 'ADMIN';
  avatarUrl?: string;
  walletBalance: number;
}
export interface AuthResponse {
  token: string;
  user: User;
}
export interface City {
  id: number;
  name: string;
  state: string;
}
export interface Point {
  id: number;
  name: string;
  address: string;
  time: string /* HH:mm */;
}
export interface Trip {
  id: number;
  busId: number;
  busName: string;
  operatorName: string;
  busNumber: string;
  busType: BusType;
  ac: boolean;
  rating: number;
  reviews: number;
  fromCity: string;
  toCity: string;
  journeyDate: string /* yyyy-MM-dd */;
  departureTime: string;
  arrivalTime: string;
  durationMins: number;
  boardingPoints: Point[];
  droppingPoints: Point[];
  availableSeats: number;
  windowSeats: number;
  totalSeats: number;
  amenities: Amenity[];
  fare: number;
  discountPercent: number;
  couponCode?: string;
}
export interface Seat {
  id: number;
  seatNumber: string /* D1, S1, US1, LS1 */;
  kind: SeatKind;
  deck: 'LOWER' | 'UPPER';
  row: number;
  col: number;
  isWindow: boolean;
  isLadies: boolean;
  price: number;
  status: SeatStatus;
}
export interface SeatLayout {
  tripId: number;
  seats: Seat[];
  rows: number;
  cols: number;
  hasUpperDeck: boolean;
}
export interface PassengerInput {
  name: string;
  age: number;
  gender: 'MALE' | 'FEMALE' | 'OTHER';
  seatNumber: string;
}
export interface BookingRequest {
  tripId: number;
  seatNumbers: string[];
  passengers: PassengerInput[];
  contactMobile: string;
  contactEmail: string;
  emergencyContact?: string;
  boardingPointId: number;
  droppingPointId: number;
  gstNumber?: string;
  gstCompany?: string;
  couponCode?: string;
}
export interface FareBreakdown {
  baseFare: number;
  gst: number;
  platformFee: number;
  convenienceFee: number;
  discount: number;
  couponDiscount: number;
  grandTotal: number;
}
export interface Booking {
  id: number;
  bookingRef: string /* SYD-XXXXXX */;
  pnr: string;
  status: BookingStatus;
  trip: Trip;
  seatNumbers: string[];
  passengers: PassengerInput[];
  boardingPoint: Point;
  droppingPoint: Point;
  fare: FareBreakdown;
  contactMobile: string;
  contactEmail: string;
  createdAt: string;
  paymentStatus: 'PENDING' | 'SUCCESS' | 'FAILED' | 'REFUNDED';
}
export interface Coupon {
  id: number;
  code: string;
  description: string;
  type: 'FLAT' | 'PERCENT' | 'CASHBACK';
  value: number;
  minAmount: number;
  maxDiscount: number;
  validTill: string;
  active: boolean;
  category: 'FLAT' | 'FESTIVAL' | 'REFERRAL' | 'CASHBACK';
}
export interface Notification {
  id: number;
  type: 'BOOKING_CONFIRMED' | 'BUS_DELAYED' | 'BUS_ARRIVED' | 'OFFER' | 'COUPON' | 'PAYMENT_SUCCESS';
  title: string;
  body: string;
  read: boolean;
  createdAt: string;
}
export interface TrackingInfo {
  bookingId: number;
  busNumber: string;
  lat: number;
  lng: number;
  etaMins: number;
  driverName: string;
  driverPhone: string;
  speedKmph: number;
  lastUpdated: string;
}
export interface SupportTicket {
  id: number;
  subject: string;
  description: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED';
  createdAt: string;
}

// ---- Additional helper types derived from endpoint shapes in the contract ----
export interface ApiEnvelope<T> {
  success: boolean;
  data: T;
  message: string;
}
export interface PopularRoute {
  from: string;
  to: string;
  startingFare: number;
}
export type DepartureSlot = 'MORNING' | 'AFTERNOON' | 'EVENING' | 'NIGHT';
export type SortOption = 'PRICE_ASC' | 'RATING_DESC' | 'DEPARTURE' | 'ARRIVAL';
export interface TripSearchParams {
  from: string;
  to: string;
  date: string;
  busType?: BusType;
  ac?: boolean;
  sleeper?: boolean;
  departure?: DepartureSlot;
  operator?: string;
  amenities?: Amenity[];
  sort?: SortOption;
}
export interface CouponValidation {
  valid: boolean;
  discount: number;
  message: string;
}
export interface SeatLockResponse {
  lockId: string;
  expiresAt: string;
}
export interface PaymentInitiateRequest {
  bookingId: number;
  method: PaymentMethod;
  promoCode?: string;
}
export interface PaymentInitiateResponse {
  paymentId: string;
  gatewayOrderId: string;
  amount: number;
  redirectUrl?: string;
}
export interface PaymentVerifyRequest {
  paymentId: string;
  gatewayPaymentId: string;
  signature: string;
}
export type BookingFilter = 'UPCOMING' | 'COMPLETED' | 'CANCELLED';
export interface SavedPassenger {
  id: number;
  name: string;
  age: number;
  gender: 'MALE' | 'FEMALE' | 'OTHER';
}
export interface SavedCard {
  id: number;
  brand: string;
  last4: string;
  holderName: string;
  expiry: string;
}
export interface WalletTxn {
  id: number;
  type: 'CREDIT' | 'DEBIT';
  amount: number;
  description: string;
  createdAt: string;
}
export interface Wallet {
  balance: number;
  transactions: WalletTxn[];
}
export interface Faq {
  id: number;
  question: string;
  answer: string;
  category?: string;
}
export type AdminResource = 'operators' | 'routes' | 'buses' | 'drivers' | 'coupons';
export interface AdminDashboard {
  totalBookings: number;
  revenue: number;
  activeBuses: number;
  users: number;
  bookingsByDay: { date: string; count: number; revenue: number }[];
  topRoutes: { route: string; bookings: number }[];
  paymentSplit: { method: string; amount: number }[];
}
export interface AdminPayment {
  id: number;
  bookingRef: string;
  method: PaymentMethod;
  amount: number;
  status: 'PENDING' | 'SUCCESS' | 'FAILED' | 'REFUNDED';
  createdAt: string;
}
