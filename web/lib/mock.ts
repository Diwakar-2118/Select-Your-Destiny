// Realistic mock data used when the backend is unreachable, so the UI always demos.
import type {
  AdminDashboard,
  AdminPayment,
  AdminResource,
  Amenity,
  Booking,
  BookingRequest,
  BusType,
  City,
  Coupon,
  CouponValidation,
  Faq,
  Notification,
  Point,
  PopularRoute,
  SavedCard,
  SavedPassenger,
  Seat,
  SeatLayout,
  SupportTicket,
  TrackingInfo,
  Trip,
  TripSearchParams,
  User,
  Wallet,
} from './types';
import { computeFare, departureSlot, isSleeperType, todayISO } from './utils';

// ---------- deterministic random ----------
function seeded(seed: number) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}
function hash(str: string) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) | 0;
  return Math.abs(h) + 1;
}

export const mockUser: User = {
  id: 1,
  name: 'Demo Traveller',
  email: 'demo@destiny.com',
  mobile: '9876543210',
  role: 'USER',
  walletBalance: 750,
};
export const mockAdmin: User = {
  id: 2,
  name: 'Destiny Admin',
  email: 'admin@destiny.com',
  mobile: '9000000001',
  role: 'ADMIN',
  walletBalance: 0,
};

export const mockCities: City[] = [
  { id: 1, name: 'Bengaluru', state: 'Karnataka' },
  { id: 2, name: 'Chennai', state: 'Tamil Nadu' },
  { id: 3, name: 'Hyderabad', state: 'Telangana' },
  { id: 4, name: 'Mumbai', state: 'Maharashtra' },
  { id: 5, name: 'Pune', state: 'Maharashtra' },
  { id: 6, name: 'Delhi', state: 'Delhi' },
  { id: 7, name: 'Jaipur', state: 'Rajasthan' },
  { id: 8, name: 'Goa', state: 'Goa' },
  { id: 9, name: 'Mysuru', state: 'Karnataka' },
  { id: 10, name: 'Coimbatore', state: 'Tamil Nadu' },
  { id: 11, name: 'Kochi', state: 'Kerala' },
  { id: 12, name: 'Vijayawada', state: 'Andhra Pradesh' },
  { id: 13, name: 'Ahmedabad', state: 'Gujarat' },
  { id: 14, name: 'Manali', state: 'Himachal Pradesh' },
];

export const mockPopularRoutes: PopularRoute[] = [
  { from: 'Bengaluru', to: 'Chennai', startingFare: 549 },
  { from: 'Bengaluru', to: 'Hyderabad', startingFare: 899 },
  { from: 'Mumbai', to: 'Pune', startingFare: 349 },
  { from: 'Mumbai', to: 'Goa', startingFare: 999 },
  { from: 'Delhi', to: 'Jaipur', startingFare: 499 },
  { from: 'Delhi', to: 'Manali', startingFare: 1199 },
  { from: 'Chennai', to: 'Coimbatore', startingFare: 599 },
  { from: 'Hyderabad', to: 'Vijayawada', startingFare: 449 },
];

const OPERATORS = [
  'Destiny Travels',
  'SRS Travels',
  'Orange Tours',
  'VRL Travels',
  'Kallada Travels',
  'IntrCity SmartBus',
  'Zingbus',
  'NueGo Electric',
];
const BUS_TYPES: BusType[] = [
  'AC_SLEEPER',
  'VOLVO_MULTI_AXLE',
  'AC_SEATER',
  'NON_AC_SEATER',
  'AC_SEMI_SLEEPER',
  'NON_AC_SLEEPER',
  'ELECTRIC',
  'PUSH_BACK',
];
const ALL_AMENITIES: Amenity[] = ['CHARGING_PORT', 'WATER_BOTTLE', 'BLANKET', 'LIVE_TRACKING', 'CCTV', 'WIFI', 'READING_LIGHT'];
const DEP_TIMES = ['05:30', '07:15', '09:00', '11:45', '13:30', '15:10', '18:00', '19:45', '21:00', '22:30', '23:15'];

function addMins(time: string, mins: number) {
  const [h, m] = time.split(':').map(Number);
  const t = (h * 60 + m + mins) % (24 * 60);
  return `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`;
}

function points(city: string, base: string, startId: number, rnd: () => number, offset = 0): Point[] {
  const names = ['Central Bus Stand', 'Railway Station', 'Airport Road', 'City Mall Junction', 'Highway Toll Plaza'];
  return names.slice(0, 3 + Math.floor(rnd() * 2)).map((n, i) => ({
    id: startId + i,
    name: `${city} ${n}`,
    address: `${10 + i * 7}, ${n} Main Road, ${city}`,
    time: addMins(base, offset + i * 20),
  }));
}

function makeTrip(id: number, from: string, to: string, date: string): Trip {
  const rnd = seeded(id * 7919);
  const busType = BUS_TYPES[id % BUS_TYPES.length];
  const ac = !busType.startsWith('NON_AC');
  const departureTime = DEP_TIMES[Math.floor(rnd() * DEP_TIMES.length)];
  const durationMins = 300 + Math.floor(rnd() * 420);
  const arrivalTime = addMins(departureTime, durationMins);
  const totalSeats = isSleeperType(busType) ? 30 : 40;
  const availableSeats = 3 + Math.floor(rnd() * (totalSeats - 8));
  const amenities = ALL_AMENITIES.filter(() => rnd() > 0.4);
  if (!amenities.length) amenities.push('CHARGING_PORT');
  const baseFare = Math.round((ac ? 650 : 400) + rnd() * 900 + (isSleeperType(busType) ? 250 : 0));
  const discountPercent = rnd() > 0.5 ? [5, 10, 15][Math.floor(rnd() * 3)] : 0;
  const operatorName = OPERATORS[(id + hash(from)) % OPERATORS.length];
  return {
    id,
    busId: 100 + (id % 50),
    busName: `${operatorName.split(' ')[0]} ${busType === 'VOLVO_MULTI_AXLE' ? 'Volvo 9600' : busType === 'ELECTRIC' ? 'eBus' : 'Express'}`,
    operatorName,
    busNumber: `KA-${String(10 + (id % 50)).padStart(2, '0')}-F-${1000 + ((id * 37) % 9000)}`,
    busType,
    ac,
    rating: Math.round((3.6 + rnd() * 1.4) * 10) / 10,
    reviews: 50 + Math.floor(rnd() * 3000),
    fromCity: from,
    toCity: to,
    journeyDate: date,
    departureTime,
    arrivalTime,
    durationMins,
    boardingPoints: points(from, departureTime, id * 100 + 1, rnd, -20),
    droppingPoints: points(to, arrivalTime, id * 100 + 51, rnd),
    availableSeats,
    windowSeats: Math.max(1, Math.floor(availableSeats / 2.5)),
    totalSeats,
    amenities,
    fare: baseFare,
    discountPercent,
    couponCode: rnd() > 0.55 ? ['FIRST100', 'DESTINY15', 'FESTIVE20'][Math.floor(rnd() * 3)] : undefined,
  };
}

const tripCache = new Map<number, Trip>();

export function mockSearchTrips(p: TripSearchParams): Trip[] {
  const from = p.from || 'Bengaluru';
  const to = p.to || 'Chennai';
  const date = p.date || todayISO();
  const base = (hash(`${from}|${to}`) % 9000) * 10;
  let trips = Array.from({ length: 12 }, (_, i) => makeTrip(base + i + 1, from, to, date));
  trips.forEach((t) => tripCache.set(t.id, t));
  if (p.busType) trips = trips.filter((t) => t.busType === p.busType);
  if (p.ac !== undefined) trips = trips.filter((t) => t.ac === p.ac);
  if (p.sleeper !== undefined) trips = trips.filter((t) => isSleeperType(t.busType) === p.sleeper);
  if (p.departure) trips = trips.filter((t) => departureSlot(t.departureTime) === p.departure);
  if (p.operator) trips = trips.filter((t) => t.operatorName === p.operator);
  if (p.amenities?.length) trips = trips.filter((t) => p.amenities!.every((a) => t.amenities.includes(a)));
  switch (p.sort) {
    case 'PRICE_ASC':
      trips.sort((a, b) => a.fare - b.fare);
      break;
    case 'RATING_DESC':
      trips.sort((a, b) => b.rating - a.rating);
      break;
    case 'ARRIVAL':
      trips.sort((a, b) => a.arrivalTime.localeCompare(b.arrivalTime));
      break;
    default:
      trips.sort((a, b) => a.departureTime.localeCompare(b.departureTime));
  }
  return trips;
}

export function mockGetTrip(id: number): Trip {
  return tripCache.get(id) ?? makeTrip(id, 'Bengaluru', 'Chennai', todayISO(1));
}

export const MOCK_OPERATORS = OPERATORS;

/**
 * Seat layout generator following contract seat rules:
 * - Seater/push back: D1..Dn, 2+2, window = col 0 and col 3 (cols 0..3, aisle between 1 and 2)
 * - Sleeper: LS1.. lower deck, US1.. upper deck, 2+1 (col 0 single, cols 1..2 double), window = col 0 and col 2
 */
export function mockSeatLayout(tripId: number): SeatLayout {
  const trip = mockGetTrip(tripId);
  const rnd = seeded(tripId * 104729);
  const seats: Seat[] = [];
  let id = tripId * 1000;
  const bookedRatio = 1 - trip.availableSeats / trip.totalSeats;
  const status = () => (rnd() < bookedRatio ? 'BOOKED' : rnd() < 0.04 ? 'LOCKED' : 'AVAILABLE') as Seat['status'];

  if (isSleeperType(trip.busType)) {
    const rows = 5;
    (['LOWER', 'UPPER'] as const).forEach((deck) => {
      let n = 1;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < 3; c++) {
          seats.push({
            id: id++,
            seatNumber: `${deck === 'LOWER' ? 'LS' : 'US'}${n++}`,
            kind: deck === 'LOWER' ? 'LOWER_SLEEPER' : 'UPPER_SLEEPER',
            deck,
            row: r,
            col: c,
            isWindow: c === 0 || c === 2,
            isLadies: rnd() < 0.12,
            price: Math.round(trip.fare + (deck === 'LOWER' ? 100 : 0)),
            status: status(),
          });
        }
      }
    });
    return { tripId, seats, rows, cols: 3, hasUpperDeck: true };
  }

  const rows = 10;
  let n = 1;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < 4; c++) {
      const isWindow = c === 0 || c === 3;
      seats.push({
        id: id++,
        seatNumber: `D${n++}`,
        kind: 'PUSH_BACK',
        deck: 'LOWER',
        row: r,
        col: c,
        isWindow,
        isLadies: rnd() < 0.1,
        price: Math.round(trip.fare + (isWindow ? 30 : 0)),
        status: status(),
      });
    }
  }
  return { tripId, seats, rows, cols: 4, hasUpperDeck: false };
}

export const mockOffers: Coupon[] = [
  { id: 1, code: 'FIRST100', description: 'Flat ₹100 off on your first booking', type: 'FLAT', value: 100, minAmount: 500, maxDiscount: 100, validTill: todayISO(60), active: true, category: 'FLAT' },
  { id: 2, code: 'DESTINY15', description: '15% off up to ₹250 on all AC buses', type: 'PERCENT', value: 15, minAmount: 800, maxDiscount: 250, validTill: todayISO(30), active: true, category: 'FLAT' },
  { id: 3, code: 'FESTIVE20', description: 'Festive special: 20% off up to ₹400', type: 'PERCENT', value: 20, minAmount: 1000, maxDiscount: 400, validTill: todayISO(20), active: true, category: 'FESTIVAL' },
  { id: 4, code: 'REFER200', description: 'Refer a friend & get ₹200 off', type: 'FLAT', value: 200, minAmount: 1200, maxDiscount: 200, validTill: todayISO(90), active: true, category: 'REFERRAL' },
  { id: 5, code: 'CASH10', description: '10% cashback to Destiny Wallet up to ₹150', type: 'CASHBACK', value: 10, minAmount: 600, maxDiscount: 150, validTill: todayISO(45), active: true, category: 'CASHBACK' },
];

export function mockValidateCoupon(code: string, amount: number): CouponValidation {
  const c = mockOffers.find((o) => o.code.toUpperCase() === code.trim().toUpperCase());
  if (!c || !c.active) return { valid: false, discount: 0, message: 'Invalid or expired coupon code' };
  if (amount < c.minAmount) return { valid: false, discount: 0, message: `Minimum booking amount ₹${c.minAmount}` };
  const raw = c.type === 'FLAT' ? c.value : (amount * c.value) / 100;
  const discount = Math.min(raw, c.maxDiscount);
  if (c.type === 'CASHBACK') return { valid: true, discount: 0, message: `₹${Math.round(discount)} cashback will be credited to your wallet` };
  return { valid: true, discount: Math.round(discount), message: `Coupon applied! You save ₹${Math.round(discount)}` };
}

// ---------- persisted mock bookings ----------
const BK_KEY = 'syd_mock_bookings';
function loadBookings(): Booking[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(BK_KEY) || '[]') as Booking[];
  } catch {
    return [];
  }
}
function saveBookings(b: Booking[]) {
  try {
    localStorage.setItem(BK_KEY, JSON.stringify(b));
  } catch {
    /* ignore */
  }
}
function seedBookings(): Booking[] {
  const past = makeTrip(4242, 'Bengaluru', 'Mysuru', todayISO(-12));
  const up = makeTrip(4343, 'Bengaluru', 'Goa', todayISO(5));
  const canc = makeTrip(4444, 'Chennai', 'Kochi', todayISO(-3));
  const mk = (id: number, trip: Trip, status: Booking['status'], seats: string[]): Booking => ({
    id,
    bookingRef: `SYD-${String(100000 + id * 7919).slice(-6)}`,
    pnr: `PNR${8000000 + id * 13}`,
    status,
    trip,
    seatNumbers: seats,
    passengers: seats.map((s, i) => ({ name: i ? 'Priya Sharma' : 'Demo Traveller', age: 28 + i, gender: i ? 'FEMALE' : 'MALE', seatNumber: s })),
    boardingPoint: trip.boardingPoints[0],
    droppingPoint: trip.droppingPoints[0],
    fare: computeFare(seats.map(() => ({ price: trip.fare })), trip.discountPercent),
    contactMobile: mockUser.mobile,
    contactEmail: mockUser.email,
    createdAt: new Date(Date.now() - 86400000 * 15).toISOString(),
    paymentStatus: status === 'CANCELLED' ? 'REFUNDED' : 'SUCCESS',
  });
  return [mk(9001, up, 'CONFIRMED', ['D5', 'D6']), mk(9002, past, 'COMPLETED', ['D12']), mk(9003, canc, 'CANCELLED', ['D3'])];
}
export function mockBookings(): Booking[] {
  let b = loadBookings();
  if (!b.length) {
    b = seedBookings();
    saveBookings(b);
  }
  return b;
}
export function mockFilterBookings(status?: string): Booking[] {
  const all = mockBookings();
  const today = todayISO();
  if (status === 'UPCOMING') return all.filter((b) => (b.status === 'CONFIRMED' || b.status === 'PENDING') && b.trip.journeyDate >= today);
  if (status === 'COMPLETED') return all.filter((b) => b.status === 'COMPLETED' || (b.status === 'CONFIRMED' && b.trip.journeyDate < today));
  if (status === 'CANCELLED') return all.filter((b) => b.status === 'CANCELLED');
  return all;
}
export function mockGetBooking(id: number): Booking | undefined {
  return mockBookings().find((b) => b.id === id);
}
export function mockUpdateBooking(id: number, patch: Partial<Booking>): Booking {
  const all = mockBookings();
  const i = all.findIndex((b) => b.id === id);
  if (i < 0) throw new Error('Booking not found');
  all[i] = { ...all[i], ...patch };
  saveBookings(all);
  return all[i];
}

export function mockQuote(req: BookingRequest): ReturnType<typeof computeFare> {
  const layout = mockSeatLayout(req.tripId);
  const trip = mockGetTrip(req.tripId);
  const seats = req.seatNumbers.map((s) => layout.seats.find((x) => x.seatNumber === s) ?? { price: trip.fare });
  const pre = computeFare(seats, trip.discountPercent);
  const coupon = req.couponCode ? mockValidateCoupon(req.couponCode, pre.baseFare).discount : 0;
  return computeFare(seats, trip.discountPercent, coupon);
}

export function mockCreateBooking(req: BookingRequest): Booking {
  const trip = mockGetTrip(req.tripId);
  const id = Math.floor(Date.now() / 1000) % 1000000;
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const ref = Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  const booking: Booking = {
    id,
    bookingRef: `SYD-${ref}`,
    pnr: `PNR${Math.floor(1000000 + Math.random() * 8999999)}`,
    status: 'PENDING',
    trip,
    seatNumbers: req.seatNumbers,
    passengers: req.passengers,
    boardingPoint: trip.boardingPoints.find((p) => p.id === req.boardingPointId) ?? trip.boardingPoints[0],
    droppingPoint: trip.droppingPoints.find((p) => p.id === req.droppingPointId) ?? trip.droppingPoints[0],
    fare: mockQuote(req),
    contactMobile: req.contactMobile,
    contactEmail: req.contactEmail,
    createdAt: new Date().toISOString(),
    paymentStatus: 'PENDING',
  };
  saveBookings([booking, ...mockBookings()]);
  return booking;
}

export function mockTracking(bookingId: number): TrackingInfo {
  const t = Date.now() / 60000;
  return {
    bookingId,
    busNumber: mockGetBooking(bookingId)?.trip.busNumber ?? 'KA-01-F-4242',
    lat: 12.9716 + Math.sin(t / 10) * 0.05,
    lng: 77.5946 + Math.cos(t / 10) * 0.05,
    etaMins: 35 + Math.floor((t % 30) / 2),
    driverName: 'Ramesh Kumar',
    driverPhone: '+91 98450 12345',
    speedKmph: 54 + Math.floor(t % 12),
    lastUpdated: new Date().toISOString(),
  };
}

export const mockNotifications: Notification[] = [
  { id: 1, type: 'BOOKING_CONFIRMED', title: 'Booking confirmed', body: 'Your trip Bengaluru → Goa is confirmed. Seats D5, D6.', read: false, createdAt: new Date(Date.now() - 3600000).toISOString() },
  { id: 2, type: 'OFFER', title: 'Festive Sale is live', body: 'Use FESTIVE20 to get 20% off up to ₹400.', read: false, createdAt: new Date(Date.now() - 7200000).toISOString() },
  { id: 3, type: 'BUS_DELAYED', title: 'Bus delayed by 15 mins', body: 'SRS Travels KA-01-F-4242 is running 15 minutes late.', read: true, createdAt: new Date(Date.now() - 86400000).toISOString() },
  { id: 4, type: 'PAYMENT_SUCCESS', title: 'Payment successful', body: '₹1,842 paid via UPI for SYD-7Q2K9M.', read: true, createdAt: new Date(Date.now() - 172800000).toISOString() },
  { id: 5, type: 'COUPON', title: 'New coupon unlocked', body: 'You earned REFER200 for referring a friend!', read: true, createdAt: new Date(Date.now() - 259200000).toISOString() },
  { id: 6, type: 'BUS_ARRIVED', title: 'Bus arrived', body: 'Your bus has reached Mysuru Central Bus Stand.', read: true, createdAt: new Date(Date.now() - 864000000).toISOString() },
];

export const mockPassengers: SavedPassenger[] = [
  { id: 1, name: 'Demo Traveller', age: 30, gender: 'MALE' },
  { id: 2, name: 'Priya Sharma', age: 28, gender: 'FEMALE' },
];
export const mockCards: SavedCard[] = [
  { id: 1, brand: 'VISA', last4: '4242', holderName: 'DEMO TRAVELLER', expiry: '08/29' },
  { id: 2, brand: 'MASTERCARD', last4: '5454', holderName: 'DEMO TRAVELLER', expiry: '11/28' },
];
export const mockWallet: Wallet = {
  balance: 750,
  transactions: [
    { id: 1, type: 'CREDIT', amount: 500, description: 'Refund for SYD-C4NC3L', createdAt: new Date(Date.now() - 86400000 * 3).toISOString() },
    { id: 2, type: 'CREDIT', amount: 150, description: 'Cashback CASH10', createdAt: new Date(Date.now() - 86400000 * 10).toISOString() },
    { id: 3, type: 'CREDIT', amount: 100, description: 'Welcome bonus', createdAt: new Date(Date.now() - 86400000 * 30).toISOString() },
  ],
};
export const mockTickets: SupportTicket[] = [
  { id: 1, subject: 'Refund not received', description: 'Cancelled booking SYD-C4NC3L, refund pending.', status: 'IN_PROGRESS', createdAt: new Date(Date.now() - 86400000 * 2).toISOString() },
  { id: 2, subject: 'Change boarding point', description: 'Want to change boarding point for my Goa trip.', status: 'RESOLVED', createdAt: new Date(Date.now() - 86400000 * 9).toISOString() },
];
export const mockFaqs: Faq[] = [
  { id: 1, category: 'Booking', question: 'How do I book a bus ticket?', answer: 'Search your route, pick a bus, select seats, add passenger details and pay securely.' },
  { id: 2, category: 'Cancellation', question: 'How do I cancel my ticket?', answer: 'Go to My Bookings → Upcoming, open the booking and tap Cancel. Refunds go to your Destiny Wallet instantly.' },
  { id: 3, category: 'Payments', question: 'Which payment methods are supported?', answer: 'UPI, Google Pay, PhonePe, Paytm, cards, net banking, wallet, LazyPay and EMI.' },
  { id: 4, category: 'Tracking', question: 'Can I track my bus live?', answer: 'Yes, buses with Live Tracking show real-time location from My Bookings.' },
  { id: 5, category: 'Booking', question: 'What are ladies seats?', answer: 'Seats marked pink are reserved for female passengers for added comfort and safety.' },
];

export const mockAdminData: Record<AdminResource, Record<string, unknown>[]> = {
  operators: OPERATORS.map((name, i) => ({ id: i + 1, name, contactEmail: `ops${i + 1}@example.com`, phone: `98450${10000 + i}`, rating: 4 + (i % 10) / 10, active: true })),
  routes: mockPopularRoutes.map((r, i) => ({ id: i + 1, fromCity: r.from, toCity: r.to, distanceKm: 150 + i * 90, durationMins: 240 + i * 60, active: true })),
  buses: Array.from({ length: 8 }, (_, i) => ({ id: 100 + i, busName: `${OPERATORS[i].split(' ')[0]} Express`, busNumber: `KA-0${i + 1}-F-${4000 + i}`, busType: BUS_TYPES[i], operator: OPERATORS[i], totalSeats: isSleeperType(BUS_TYPES[i]) ? 30 : 40, active: true })),
  drivers: ['Ramesh Kumar', 'Suresh Babu', 'Anil Singh', 'Mahesh Gowda'].map((name, i) => ({ id: i + 1, name, phone: `98860${20000 + i}`, licenseNo: `KA0120${1000 + i}`, experienceYears: 5 + i * 2, active: true })),
  coupons: mockOffers as unknown as Record<string, unknown>[],
};

export function mockDashboard(): AdminDashboard {
  const days = Array.from({ length: 14 }, (_, i) => {
    const r = seeded(i + 11);
    const count = 80 + Math.floor(r() * 120);
    return { date: todayISO(i - 13), count, revenue: count * (850 + Math.floor(r() * 300)) };
  });
  return {
    totalBookings: days.reduce((s, d) => s + d.count, 0) * 6,
    revenue: days.reduce((s, d) => s + d.revenue, 0) * 6,
    activeBuses: 128,
    users: 18452,
    bookingsByDay: days,
    topRoutes: mockPopularRoutes.slice(0, 5).map((r, i) => ({ route: `${r.from} → ${r.to}`, bookings: 900 - i * 140 })),
    paymentSplit: [
      { method: 'UPI', amount: 482000 },
      { method: 'CREDIT_CARD', amount: 211000 },
      { method: 'DEBIT_CARD', amount: 132000 },
      { method: 'WALLET', amount: 64000 },
      { method: 'NET_BANKING', amount: 41000 },
      { method: 'EMI', amount: 18000 },
    ],
  };
}

export function mockAdminPayments(): AdminPayment[] {
  const methods = ['UPI', 'CREDIT_CARD', 'DEBIT_CARD', 'WALLET', 'NET_BANKING', 'GOOGLE_PAY'] as const;
  return mockBookings().map((b, i) => ({
    id: i + 1,
    bookingRef: b.bookingRef,
    method: methods[i % methods.length],
    amount: b.fare.grandTotal,
    status: b.paymentStatus,
    createdAt: b.createdAt,
  }));
}
