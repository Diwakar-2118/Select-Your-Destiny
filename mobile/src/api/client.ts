// Typed API client for docs/CONTRACT.md endpoints.
// Unwraps the {success,data,message} envelope. If the backend is unreachable
// (network error / timeout), each call transparently falls back to mock data.
import Constants from 'expo-constants';
import {
  ApiEnvelope, AuthResponse, Booking, BookingRequest, City, Coupon, CouponValidation, Faq,
  FareBreakdown, Notification, PassengerInput, PaymentInit, PaymentMethod, PopularRoute,
  SavedCard, SeatLayout, SearchFilters, SupportTicket, TrackingInfo, Trip, User,
} from '../types';
import * as mock from './mock';

export const API_URL: string =
  process.env.EXPO_PUBLIC_API_URL ||
  (Constants.expoConfig?.extra as { apiUrl?: string } | undefined)?.apiUrl ||
  'http://10.0.2.2:8080/api';

let authToken: string | null = null;
export const setAuthToken = (t: string | null) => { authToken = t; };

/** True once a call has fallen back to mocks (shown as an "offline demo" hint). */
export let usingMock = false;

export class ApiError extends Error {
  constructor(message: string, public status: number) { super(message); }
}
class NetworkError extends Error {}

async function request<T>(method: string, path: string, body?: unknown, timeoutMs = 6000): Promise<T> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: ctrl.signal,
    });
  } catch {
    throw new NetworkError('Backend unreachable');
  } finally {
    clearTimeout(timer);
  }
  let json: ApiEnvelope<T> | null = null;
  try { json = (await res.json()) as ApiEnvelope<T>; } catch { /* non-JSON */ }
  if (!res.ok || !json || json.success === false) {
    throw new ApiError(json?.message || `Request failed (${res.status})`, res.status);
  }
  return json.data;
}

/** Run a real request; on network failure use the mock fallback instead. */
async function withFallback<T>(real: () => Promise<T>, fallback: () => T | Promise<T>): Promise<T> {
  try {
    const out = await real();
    usingMock = false;
    return out;
  } catch (e) {
    if (e instanceof NetworkError) {
      usingMock = true;
      await new Promise((r) => setTimeout(r, 350)); // simulate latency so skeletons show
      return fallback();
    }
    throw e;
  }
}

const qs = (o: Record<string, unknown>) =>
  Object.entries(o)
    .filter(([, v]) => v !== undefined && v !== '' && !(Array.isArray(v) && v.length === 0))
    .map(([k, v]) => `${k}=${encodeURIComponent(Array.isArray(v) ? v.join(',') : String(v))}`)
    .join('&');

const mockAuth = (patch: Partial<User> = {}): AuthResponse => ({ token: 'mock-jwt-token', user: { ...mock.mockUser, ...patch } });
const tripCache = new Map<number, Trip>();
const cacheTrips = (ts: Trip[]) => { ts.forEach((t) => tripCache.set(t.id, t)); return ts; };

export const api = {
  // ---- Auth
  sendOtp: (mobile: string) => withFallback(() => request<{ sent: boolean }>('POST', '/auth/otp/send', { mobile }), () => ({ sent: true })),
  verifyOtp: (mobile: string, otp: string) => withFallback(
    () => request<AuthResponse>('POST', '/auth/otp/verify', { mobile, otp }),
    () => { if (otp !== '123456') throw new ApiError('Invalid OTP (use 123456)', 400); return mockAuth({ mobile }); }),
  login: (email: string, password: string) => withFallback(
    () => request<AuthResponse>('POST', '/auth/login', { email, password }),
    () => { if (password.length < 4) throw new ApiError('Invalid credentials', 401); return mockAuth({ email }); }),
  register: (p: { name: string; email: string; mobile: string; password: string }) => withFallback(
    () => request<AuthResponse>('POST', '/auth/register', p), () => mockAuth({ name: p.name, email: p.email, mobile: p.mobile })),
  social: (provider: 'GOOGLE' | 'APPLE', idToken: string) => withFallback(
    () => request<AuthResponse>('POST', '/auth/social', { provider, idToken }), () => mockAuth()),
  forgotPassword: (email: string) => withFallback(() => request<{ sent: boolean }>('POST', '/auth/forgot-password', { email }), () => ({ sent: true })),
  me: () => withFallback(() => request<User>('GET', '/auth/me'), () => mock.mockUser),

  // ---- Catalog
  cities: () => withFallback(() => request<City[]>('GET', '/cities'), () => mock.mockCities),
  popularRoutes: () => withFallback(() => request<PopularRoute[]>('GET', '/routes/popular'), () => mock.mockPopular),
  searchTrips: (from: string, to: string, date: string, f: SearchFilters = {}) => withFallback(
    () => request<Trip[]>('GET', `/trips/search?${qs({ from, to, date, ...f })}`).then(cacheTrips),
    () => cacheTrips(mock.mockTrips(from, to, date, f))),
  trip: (id: number) => withFallback(() => request<Trip>('GET', `/trips/${id}`), () => tripCache.get(id) ?? mock.mockTrips('Bengaluru', 'Chennai', today())[0]),
  seats: (trip: Trip) => withFallback(() => request<SeatLayout>('GET', `/trips/${trip.id}/seats`), () => mock.mockSeatLayout(trip)),
  offers: () => withFallback(() => request<Coupon[]>('GET', '/offers'), () => mock.mockCoupons),
  validateCoupon: (code: string, amount: number) => withFallback(
    () => request<CouponValidation>('POST', '/coupons/validate', { code, amount }), () => mock.validateCoupon(code, amount)),

  // ---- Booking
  lockSeats: (tripId: number, seatNumbers: string[]) => withFallback(
    () => request<{ lockId: string; expiresAt: string }>('POST', '/seats/lock', { tripId, seatNumbers }),
    () => ({ lockId: 'mock-lock', expiresAt: new Date(Date.now() + 600e3).toISOString() })),
  releaseSeats: (tripId: number, seatNumbers: string[]) => withFallback(
    () => request<unknown>('POST', '/seats/release', { tripId, seatNumbers }), () => null),
  quote: (req: BookingRequest, trip: Trip, seatPrices: number[], couponDiscount = 0) => withFallback(
    () => request<FareBreakdown>('POST', '/bookings/quote', req),
    () => mock.computeFare(seatPrices, trip.discountPercent, couponDiscount)),
  createBooking: (req: BookingRequest, trip: Trip, fare: FareBreakdown) => withFallback(
    () => request<Booking>('POST', '/bookings', req), () => mock.createMockBooking(req, trip, fare)),
  bookings: (status: 'UPCOMING' | 'COMPLETED' | 'CANCELLED') => withFallback(
    () => request<Booking[]>('GET', `/bookings?status=${status}`),
    () => mock.mockBookings.filter((b) =>
      status === 'UPCOMING' ? b.status === 'CONFIRMED' || b.status === 'PENDING' : b.status === status)),
  booking: (id: number) => withFallback(() => request<Booking>('GET', `/bookings/${id}`), () => mock.mockBookings.find((b) => b.id === id)!),
  cancelBooking: (id: number) => withFallback(() => request<Booking>('POST', `/bookings/${id}/cancel`), () => {
    const b = mock.mockBookings.find((x) => x.id === id)!;
    b.status = 'CANCELLED'; b.paymentStatus = 'REFUNDED'; return b;
  }),
  reschedule: (id: number, newTripId: number, seatNumbers: string[]) => withFallback(
    () => request<Booking>('POST', `/bookings/${id}/reschedule`, { newTripId, seatNumbers }),
    () => mock.mockBookings.find((b) => b.id === id)!),
  ticketUrl: (id: number) => `${API_URL}/bookings/${id}/ticket.pdf`,
  shareBooking: (id: number, channel: 'EMAIL' | 'SMS') => withFallback(
    () => request<{ sent: boolean }>('POST', `/bookings/${id}/share`, { channel }), () => ({ sent: true })),
  tracking: (id: number) => withFallback(() => request<TrackingInfo>('GET', `/bookings/${id}/tracking`), () => mock.mockTracking(id)),

  // ---- Payments
  initiatePayment: (bookingId: number, method: PaymentMethod, promoCode?: string, amount = 0) => withFallback(
    () => request<PaymentInit>('POST', '/payments/initiate', { bookingId, method, promoCode }),
    () => ({ paymentId: `pay_${bookingId}`, gatewayOrderId: `order_${Date.now()}`, amount })),
  verifyPayment: (paymentId: number | string, gatewayPaymentId: string, bookingId: number) => withFallback(
    () => request<Booking>('POST', '/payments/verify', { paymentId, gatewayPaymentId, signature: 'mock' }),
    () => {
      const b = mock.mockBookings.find((x) => x.id === bookingId)!;
      b.status = 'CONFIRMED'; b.paymentStatus = 'SUCCESS'; return b;
    }),

  // ---- Profile
  updateMe: (u: Partial<User>) => withFallback(() => request<User>('PUT', '/users/me', u), () => ({ ...mock.mockUser, ...u })),
  passengers: () => withFallback(() => request<PassengerInput[]>('GET', '/users/me/passengers'), () => mock.mockSavedPassengers),
  savePassenger: (p: PassengerInput) => withFallback(() => request<PassengerInput>('POST', '/users/me/passengers', p), () => {
    mock.mockSavedPassengers.push(p); return p;
  }),
  cards: () => withFallback(() => request<SavedCard[]>('GET', '/users/me/cards'), () => mock.mockCards),
  wallet: () => withFallback(() => request<{ balance: number }>('GET', '/users/me/wallet'), () => ({ balance: mock.mockUser.walletBalance })),
  notifications: () => withFallback(() => request<Notification[]>('GET', '/notifications'), () => mock.mockNotifications),
  markRead: (id: number) => withFallback(() => request<unknown>('POST', `/notifications/${id}/read`), () => {
    const n = mock.mockNotifications.find((x) => x.id === id); if (n) n.read = true; return null;
  }),
  tickets: () => withFallback(() => request<SupportTicket[]>('GET', '/support/tickets'), () => mock.mockTickets),
  createTicket: (subject: string, description: string) => withFallback(
    () => request<SupportTicket>('POST', '/support/tickets', { subject, description }),
    () => {
      const t: SupportTicket = { id: Date.now(), subject, description, status: 'OPEN', createdAt: new Date().toISOString() };
      mock.mockTickets.unshift(t); return t;
    }),
  faqs: () => withFallback(() => request<Faq[]>('GET', '/support/faqs'), () => mock.mockFaqs),
};

export function today(offsetDays = 0) {
  const d = new Date(Date.now() + offsetDays * 86400e3);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
