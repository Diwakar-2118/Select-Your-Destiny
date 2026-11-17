// Typed API client for every endpoint in docs/CONTRACT.md.
// Falls back to lib/mock.ts when the backend is unreachable so the UI always demos.
import * as mock from './mock';
import type {
  AdminDashboard,
  AdminPayment,
  AdminResource,
  ApiEnvelope,
  AuthResponse,
  Booking,
  BookingFilter,
  BookingRequest,
  City,
  Coupon,
  CouponValidation,
  FareBreakdown,
  Faq,
  Notification,
  PaymentInitiateRequest,
  PaymentInitiateResponse,
  PaymentVerifyRequest,
  PopularRoute,
  SavedCard,
  SavedPassenger,
  SeatLayout,
  SeatLockResponse,
  SupportTicket,
  TrackingInfo,
  Trip,
  TripSearchParams,
  User,
  Wallet,
} from './types';

export const API_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api').replace(/\/$/, '');
export const TOKEN_KEY = 'syd_token';

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

/** Thrown internally when the backend can't be reached → triggers mock fallback. */
class NetworkError extends Error {}

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}
export function setToken(token: string | null) {
  if (typeof window === 'undefined') return;
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* ignore */
  }
}
export const clearToken = () => setToken(null);

// Remember an outage briefly so we don't wait on every call.
let offlineUntil = 0;
let mockMode = false;
/**
 * Demo fallback (mock data when the backend is unreachable). Set NEXT_PUBLIC_DEMO_MODE=false in
 * production so real errors are shown instead of fake data.
 */
export const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE !== 'false';
/** True when the most recent call was served from mock data. */
export const isMockMode = () => mockMode;

type Method = 'GET' | 'POST' | 'PUT' | 'DELETE';

async function request<T>(method: Method, path: string, body?: unknown): Promise<T> {
  if (Date.now() < offlineUntil) throw new NetworkError('offline');
  const token = getToken();
  const ctrl = new AbortController();
  // Longer timeout in production: free-tier backends can take ~30s to wake up.
  const timer = setTimeout(() => ctrl.abort(), DEMO_MODE ? 6000 : 45000);
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token && !token.startsWith('mock.') ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: ctrl.signal,
    });
  } catch {
    if (DEMO_MODE) offlineUntil = Date.now() + 30_000;
    throw new NetworkError('Backend unreachable');
  } finally {
    clearTimeout(timer);
  }
  let json: ApiEnvelope<T> | null = null;
  try {
    json = (await res.json()) as ApiEnvelope<T>;
  } catch {
    json = null;
  }
  if (res.status >= 502 && res.status <= 504) throw new NetworkError('Gateway unavailable');
  if (!res.ok || (json && json.success === false)) {
    throw new ApiError(json?.message || `Request failed (${res.status})`, res.status);
  }
  mockMode = false;
  return (json ? json.data : (undefined as T)) as T;
}

/** Call the real API; if unreachable (or a mock-token session), serve mock data instead. */
async function withFallback<T>(real: () => Promise<T>, fallback: () => T | Promise<T>): Promise<T> {
  if (!DEMO_MODE) return real();
  const token = getToken();
  if (token?.startsWith('mock.')) {
    // Session was created offline – stay in mock mode for consistency.
    mockMode = true;
    await delay(250);
    return fallback();
  }
  try {
    return await real();
  } catch (e) {
    if (e instanceof NetworkError) {
      mockMode = true;
      await delay(300);
      return fallback();
    }
    throw e;
  }
}

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

const qs = (params: Record<string, string | number | boolean | undefined | null>) => {
  const s = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
    .join('&');
  return s ? `?${s}` : '';
};

const mockAuth = (user: User): AuthResponse => ({ token: `mock.${user.role}.${Date.now()}`, user });
const userFromEmail = (email?: string): User =>
  email?.toLowerCase().startsWith('admin') ? mock.mockAdmin : { ...mock.mockUser, ...(email ? { email } : {}) };

function mockUserFromToken(): User {
  const t = getToken() || '';
  return t.startsWith('mock.ADMIN') ? mock.mockAdmin : mock.mockUser;
}

// ---------------------------------------------------------------------------

export const api = {
  // ---------- Auth ----------
  sendOtp: (mobile: string) =>
    withFallback(() => request<{ sent: boolean }>('POST', '/auth/otp/send', { mobile }), () => ({ sent: true })),
  verifyOtp: (mobile: string, otp: string) =>
    withFallback(
      () => request<AuthResponse>('POST', '/auth/otp/verify', { mobile, otp }),
      () => {
        if (otp !== '123456') throw new ApiError('Invalid OTP. Use 123456 in demo mode.', 401);
        return mockAuth({ ...mock.mockUser, mobile });
      },
    ),
  login: (email: string, password: string) =>
    withFallback(
      () => request<AuthResponse>('POST', '/auth/login', { email, password }),
      () => {
        if (!password || password.length < 4) throw new ApiError('Invalid credentials', 401);
        return mockAuth(userFromEmail(email));
      },
    ),
  register: (data: { name: string; email: string; mobile: string; password: string }) =>
    withFallback(
      () => request<AuthResponse>('POST', '/auth/register', data),
      () => mockAuth({ ...mock.mockUser, id: Date.now() % 100000, name: data.name, email: data.email, mobile: data.mobile, walletBalance: 100 }),
    ),
  socialLogin: (provider: 'GOOGLE' | 'APPLE', idToken: string) =>
    withFallback(
      () => request<AuthResponse>('POST', '/auth/social', { provider, idToken }),
      () => mockAuth(mock.mockUser),
    ),
  forgotPassword: (email: string) =>
    withFallback(() => request<{ sent: boolean }>('POST', '/auth/forgot-password', { email }), () => ({ sent: true })),
  me: () => withFallback(() => request<User>('GET', '/auth/me'), () => mockUserFromToken()),

  // ---------- Catalog ----------
  getCities: () => withFallback(() => request<City[]>('GET', '/cities'), () => mock.mockCities),
  getPopularRoutes: () => withFallback(() => request<PopularRoute[]>('GET', '/routes/popular'), () => mock.mockPopularRoutes),
  searchTrips: (p: TripSearchParams) =>
    withFallback(
      () =>
        request<Trip[]>(
          'GET',
          `/trips/search${qs({
            from: p.from,
            to: p.to,
            date: p.date,
            busType: p.busType,
            ac: p.ac,
            sleeper: p.sleeper,
            departure: p.departure,
            operator: p.operator,
            amenities: p.amenities?.join(','),
            sort: p.sort,
          })}`,
        ),
      () => mock.mockSearchTrips(p),
    ),
  getTrip: (id: number) => withFallback(() => request<Trip>('GET', `/trips/${id}`), () => mock.mockGetTrip(id)),
  getSeatLayout: (tripId: number) =>
    withFallback(() => request<SeatLayout>('GET', `/trips/${tripId}/seats`), () => mock.mockSeatLayout(tripId)),
  getOffers: () => withFallback(() => request<Coupon[]>('GET', '/offers'), () => mock.mockOffers),
  validateCoupon: (code: string, amount: number) =>
    withFallback(
      () => request<CouponValidation>('POST', '/coupons/validate', { code, amount }),
      () => mock.mockValidateCoupon(code, amount),
    ),

  // ---------- Booking ----------
  lockSeats: (tripId: number, seatNumbers: string[]) =>
    withFallback(
      () => request<SeatLockResponse>('POST', '/seats/lock', { tripId, seatNumbers }),
      () => ({ lockId: `LOCK-${Date.now()}`, expiresAt: new Date(Date.now() + 10 * 60000).toISOString() }),
    ),
  releaseSeats: (tripId: number, seatNumbers: string[]) =>
    withFallback(() => request<unknown>('POST', '/seats/release', { tripId, seatNumbers }), () => ({})),
  quote: (req: BookingRequest) =>
    withFallback(() => request<FareBreakdown>('POST', '/bookings/quote', req), () => mock.mockQuote(req)),
  createBooking: (req: BookingRequest) =>
    withFallback(() => request<Booking>('POST', '/bookings', req), () => mock.mockCreateBooking(req)),
  getBookings: (status?: BookingFilter) =>
    withFallback(() => request<Booking[]>('GET', `/bookings${qs({ status })}`), () => mock.mockFilterBookings(status)),
  getBooking: (id: number) =>
    withFallback(
      () => request<Booking>('GET', `/bookings/${id}`),
      () => {
        const b = mock.mockGetBooking(id);
        if (!b) throw new ApiError('Booking not found', 404);
        return b;
      },
    ),
  cancelBooking: (id: number) =>
    withFallback(
      () => request<Booking>('POST', `/bookings/${id}/cancel`),
      () => mock.mockUpdateBooking(id, { status: 'CANCELLED', paymentStatus: 'REFUNDED' }),
    ),
  reschedule: (id: number, newTripId: number, seatNumbers: string[]) =>
    withFallback(
      () => request<Booking>('POST', `/bookings/${id}/reschedule`, { newTripId, seatNumbers }),
      () => mock.mockUpdateBooking(id, { trip: mock.mockGetTrip(newTripId), seatNumbers }),
    ),
  /** URL for the ticket PDF (open in a new tab / download). */
  ticketPdfUrl: (id: number) => `${API_URL}/bookings/${id}/ticket.pdf`,
  /** Fetch ticket PDF as Blob (with auth header). Throws if backend unavailable. */
  downloadTicket: async (id: number): Promise<Blob> => {
    const token = getToken();
    const res = await fetch(`${API_URL}/bookings/${id}/ticket.pdf`, {
      headers: token && !token.startsWith('mock.') ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) throw new ApiError('Could not download ticket', res.status);
    return res.blob();
  },
  shareBooking: (id: number, channel: 'EMAIL' | 'SMS') =>
    withFallback(() => request<{ sent: boolean }>('POST', `/bookings/${id}/share`, { channel }), () => ({ sent: true })),
  getTracking: (id: number) =>
    withFallback(() => request<TrackingInfo>('GET', `/bookings/${id}/tracking`), () => mock.mockTracking(id)),

  // ---------- Payments ----------
  initiatePayment: (req: PaymentInitiateRequest) =>
    withFallback(
      () => request<PaymentInitiateResponse>('POST', '/payments/initiate', req),
      () => ({
        paymentId: `PAY-${Date.now()}`,
        gatewayOrderId: `order_${Math.random().toString(36).slice(2, 12)}`,
        amount: mock.mockGetBooking(req.bookingId)?.fare.grandTotal ?? 0,
        redirectUrl: undefined as string | undefined,
      }),
    ),
  verifyPayment: (req: PaymentVerifyRequest & { bookingId?: number }) =>
    withFallback(
      () => request<Booking>('POST', '/payments/verify', { paymentId: req.paymentId, gatewayPaymentId: req.gatewayPaymentId, signature: req.signature }),
      () => {
        if (req.signature !== 'mock') throw new ApiError('Payment verification failed', 400);
        const id = req.bookingId ?? mock.mockBookings()[0].id;
        return mock.mockUpdateBooking(id, { status: 'CONFIRMED', paymentStatus: 'SUCCESS' });
      },
    ),

  // ---------- Profile ----------
  getMe: () => withFallback(() => request<User>('GET', '/users/me'), () => mockUserFromToken()),
  updateMe: (data: Partial<User>) =>
    withFallback(() => request<User>('PUT', '/users/me', data), () => ({ ...mockUserFromToken(), ...data })),
  getPassengers: () => withFallback(() => request<SavedPassenger[]>('GET', '/users/me/passengers'), () => mock.mockPassengers),
  addPassenger: (p: Omit<SavedPassenger, 'id'>) =>
    withFallback(() => request<SavedPassenger>('POST', '/users/me/passengers', p), () => ({ ...p, id: Date.now() })),
  deletePassenger: (id: number) =>
    withFallback(() => request<unknown>('DELETE', `/users/me/passengers/${id}`), () => ({})),
  getCards: () => withFallback(() => request<SavedCard[]>('GET', '/users/me/cards'), () => mock.mockCards),
  addCard: (c: Omit<SavedCard, 'id'>) =>
    withFallback(() => request<SavedCard>('POST', '/users/me/cards', c), () => ({ ...c, id: Date.now() })),
  deleteCard: (id: number) => withFallback(() => request<unknown>('DELETE', `/users/me/cards/${id}`), () => ({})),
  getWallet: () => withFallback(() => request<Wallet>('GET', '/users/me/wallet'), () => mock.mockWallet),

  // ---------- Notifications ----------
  getNotifications: () => withFallback(() => request<Notification[]>('GET', '/notifications'), () => mock.mockNotifications),
  markNotificationRead: (id: number) =>
    withFallback(() => request<unknown>('POST', `/notifications/${id}/read`), () => ({})),

  // ---------- Support ----------
  getTickets: () => withFallback(() => request<SupportTicket[]>('GET', '/support/tickets'), () => mock.mockTickets),
  createTicket: (t: { subject: string; description: string }) =>
    withFallback(
      () => request<SupportTicket>('POST', '/support/tickets', t),
      () => ({ ...t, id: Date.now() % 100000, status: 'OPEN' as const, createdAt: new Date().toISOString() }),
    ),
  getFaqs: () => withFallback(() => request<Faq[]>('GET', '/support/faqs'), () => mock.mockFaqs),

  // ---------- Admin ----------
  admin: {
    list: <T = Record<string, unknown>>(resource: AdminResource) =>
      withFallback(() => request<T[]>('GET', `/admin/${resource}`), () => mock.mockAdminData[resource] as unknown as T[]),
    create: <T = Record<string, unknown>>(resource: AdminResource, body: Partial<T>) =>
      withFallback(
        () => request<T>('POST', `/admin/${resource}`, body),
        () => {
          const item = { ...(body as Record<string, unknown>), id: Date.now() % 1000000 };
          mock.mockAdminData[resource].unshift(item);
          return item as unknown as T;
        },
      ),
    update: <T = Record<string, unknown>>(resource: AdminResource, id: number, body: Partial<T>) =>
      withFallback(
        () => request<T>('PUT', `/admin/${resource}/${id}`, body),
        () => {
          const list = mock.mockAdminData[resource];
          const i = list.findIndex((x) => x.id === id);
          const item = { ...(i >= 0 ? list[i] : {}), ...(body as Record<string, unknown>), id };
          if (i >= 0) list[i] = item;
          return item as unknown as T;
        },
      ),
    remove: (resource: AdminResource, id: number) =>
      withFallback(
        () => request<unknown>('DELETE', `/admin/${resource}/${id}`),
        () => {
          const list = mock.mockAdminData[resource];
          const i = list.findIndex((x) => x.id === id);
          if (i >= 0) list.splice(i, 1);
          return {};
        },
      ),
    getBusSeats: (busId: number) =>
      withFallback(() => request<SeatLayout>('GET', `/admin/buses/${busId}/seats`), () => mock.mockSeatLayout(busId)),
    updateBusSeats: (busId: number, layout: SeatLayout) =>
      withFallback(() => request<SeatLayout>('PUT', `/admin/buses/${busId}/seats`, layout), () => layout),
    bookings: () => withFallback(() => request<Booking[]>('GET', '/admin/bookings'), () => mock.mockBookings()),
    payments: () => withFallback(() => request<AdminPayment[]>('GET', '/admin/payments'), () => mock.mockAdminPayments()),
    dashboard: () => withFallback(() => request<AdminDashboard>('GET', '/admin/dashboard'), () => mock.mockDashboard()),
    reports: (from: string, to: string) =>
      withFallback(() => request<AdminDashboard>('GET', `/admin/reports${qs({ from, to })}`), () => mock.mockDashboard()),
  },
};

export type Api = typeof api;

/** Extract a human friendly message from any thrown error. */
export function errorMessage(e: unknown): string {
  if (e instanceof Error) return e.message;
  return 'Something went wrong';
}
