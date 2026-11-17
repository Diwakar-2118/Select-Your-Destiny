// Offline mock data used when the backend is unreachable. Mirrors contract shapes.
import {
  Amenity, Booking, BookingRequest, BusType, City, Coupon, Faq, FareBreakdown, Notification,
  Point, PopularRoute, SavedCard, Seat, SeatLayout, SearchFilters, SupportTicket, Trip, User,
  TrackingInfo, PassengerInput,
} from '../types';

export const mockUser: User = {
  id: 1, name: 'Demo Traveller', email: 'demo@destiny.com', mobile: '9876543210',
  role: 'USER', walletBalance: 750,
};

export const mockCities: City[] = [
  ['Bengaluru', 'Karnataka'], ['Chennai', 'Tamil Nadu'], ['Hyderabad', 'Telangana'],
  ['Mumbai', 'Maharashtra'], ['Pune', 'Maharashtra'], ['Delhi', 'Delhi'],
  ['Jaipur', 'Rajasthan'], ['Goa', 'Goa'], ['Kochi', 'Kerala'], ['Mysuru', 'Karnataka'],
  ['Coimbatore', 'Tamil Nadu'], ['Vijayawada', 'Andhra Pradesh'],
].map(([name, state], i) => ({ id: i + 1, name, state }));

export const mockPopular: PopularRoute[] = [
  { from: 'Bengaluru', to: 'Chennai', startingFare: 549 },
  { from: 'Mumbai', to: 'Pune', startingFare: 299 },
  { from: 'Hyderabad', to: 'Bengaluru', startingFare: 799 },
  { from: 'Delhi', to: 'Jaipur', startingFare: 499 },
  { from: 'Bengaluru', to: 'Goa', startingFare: 999 },
];

const operators = ['Destiny Travels', 'Orange Tours', 'SRS Travels', 'VRL Travels', 'KPN Travels', 'GreenLine EV'];
const busTypes: BusType[] = ['VOLVO_MULTI_AXLE', 'AC_SLEEPER', 'NON_AC_SEATER', 'AC_SEMI_SLEEPER', 'NON_AC_SLEEPER', 'ELECTRIC', 'PUSH_BACK', 'AC_SEATER'];
const allAmenities: Amenity[] = ['CHARGING_PORT', 'WATER_BOTTLE', 'BLANKET', 'LIVE_TRACKING', 'CCTV', 'WIFI', 'READING_LIGHT'];

const pad = (n: number) => String(n).padStart(2, '0');
const toHHmm = (mins: number) => `${pad(Math.floor((mins / 60) % 24))}:${pad(mins % 60)}`;

function points(city: string, startMins: number, prefix: number): Point[] {
  return ['Central Bus Stand', 'Railway Station', 'Highway Junction'].map((n, i) => ({
    id: prefix * 10 + i + 1, name: `${city} ${n}`, address: `${n} Road, ${city}`, time: toHHmm(startMins + i * 20),
  }));
}

export const isSleeper = (t: BusType) => t.includes('SLEEPER') && t !== 'AC_SEMI_SLEEPER';
const isAc = (t: BusType) => !t.startsWith('NON_AC');

export function mockTrips(from: string, to: string, date: string, f: SearchFilters = {}): Trip[] {
  let trips: Trip[] = Array.from({ length: 8 }).map((_, i) => {
    const busType = busTypes[i % busTypes.length];
    const dep = 360 + i * 150; // spread departures through the day
    const dur = 300 + (i % 4) * 60;
    const sleeper = isSleeper(busType);
    const total = sleeper ? 30 : 40;
    const avail = Math.max(3, total - ((i * 7) % 25));
    return {
      id: 1000 + i, busId: 100 + i, busName: `${operators[i % operators.length].split(' ')[0]} ${busType === 'VOLVO_MULTI_AXLE' ? 'Volvo 9600' : 'Express'}`,
      operatorName: operators[i % operators.length], busNumber: `KA-0${(i % 9) + 1}-F-${4200 + i * 13}`,
      busType, ac: isAc(busType), rating: Math.round((3.6 + (i % 5) * 0.3) * 10) / 10, reviews: 120 + i * 47,
      fromCity: from, toCity: to, journeyDate: date,
      departureTime: toHHmm(dep), arrivalTime: toHHmm(dep + dur), durationMins: dur,
      boardingPoints: points(from, dep - 30, i * 2 + 1), droppingPoints: points(to, dep + dur, i * 2 + 2),
      availableSeats: avail, windowSeats: Math.floor(avail / 2), totalSeats: total,
      amenities: allAmenities.filter((_, k) => (k + i) % 3 !== 0),
      fare: 499 + i * 120, discountPercent: i % 3 === 0 ? 10 : i % 3 === 1 ? 5 : 0,
      couponCode: i % 2 === 0 ? 'DESTINY10' : undefined,
    };
  });
  if (f.ac !== undefined) trips = trips.filter((t) => t.ac === f.ac);
  if (f.sleeper !== undefined) trips = trips.filter((t) => isSleeper(t.busType) === f.sleeper);
  if (f.busType) trips = trips.filter((t) => t.busType === f.busType);
  if (f.operator) trips = trips.filter((t) => t.operatorName === f.operator);
  if (f.amenities?.length) trips = trips.filter((t) => f.amenities!.every((a) => t.amenities.includes(a)));
  if (f.departure) {
    const h = (t: Trip) => parseInt(t.departureTime.slice(0, 2), 10);
    const slot = { MORNING: [6, 12], AFTERNOON: [12, 18], EVENING: [18, 22], NIGHT: [22, 30] }[f.departure];
    trips = trips.filter((t) => { const x = h(t) < 6 ? h(t) + 24 : h(t); return x >= slot[0] && x < slot[1]; });
  }
  const sorters: Record<string, (a: Trip, b: Trip) => number> = {
    PRICE_ASC: (a, b) => a.fare - b.fare,
    RATING_DESC: (a, b) => b.rating - a.rating,
    DEPARTURE: (a, b) => a.departureTime.localeCompare(b.departureTime),
    ARRIVAL: (a, b) => a.arrivalTime.localeCompare(b.arrivalTime),
  };
  if (f.sort) trips.sort(sorters[f.sort]);
  return trips;
}

export const mockOperators = operators;

// Builds a seat layout following contract numbering rules.
export function mockSeatLayout(trip: Trip): SeatLayout {
  const seats: Seat[] = [];
  let id = 1;
  const booked = (n: number) => (n * 7 + trip.id) % 5 === 0;
  const ladies = (n: number) => n % 9 === 4;
  if (isSleeper(trip.busType)) {
    // 2+1 layout: col 0 single (window), aisle, cols 1-2 double (col 2 window)
    const rows = 5;
    (['LOWER', 'UPPER'] as const).forEach((deck) => {
      let n = 1;
      for (let r = 0; r < rows; r++) for (let c = 0; c < 3; c++) {
        seats.push({
          id: id++, seatNumber: `${deck === 'LOWER' ? 'LS' : 'US'}${n}`,
          kind: deck === 'LOWER' ? 'LOWER_SLEEPER' : 'UPPER_SLEEPER', deck, row: r, col: c,
          isWindow: c === 0 || c === 2, isLadies: ladies(n), price: trip.fare + (deck === 'LOWER' ? 100 : 0),
          status: booked(n + (deck === 'UPPER' ? 3 : 0)) ? 'BOOKED' : 'AVAILABLE',
        });
        n++;
      }
    });
    return { tripId: trip.id, seats, rows, cols: 3, hasUpperDeck: true };
  }
  // 2+2 seater: window = col 0 and col 3
  const rows = 10;
  let n = 1;
  for (let r = 0; r < rows; r++) for (let c = 0; c < 4; c++) {
    seats.push({
      id: id++, seatNumber: `D${n}`, kind: 'PUSH_BACK', deck: 'LOWER', row: r, col: c,
      isWindow: c === 0 || c === 3, isLadies: ladies(n), price: trip.fare, status: booked(n) ? 'BOOKED' : 'AVAILABLE',
    });
    n++;
  }
  return { tripId: trip.id, seats, rows, cols: 4, hasUpperDeck: false };
}

// Contract fare rules
export function computeFare(seatPrices: number[], discountPercent: number, couponDiscount = 0): FareBreakdown {
  const r = (x: number) => Math.round(x * 100) / 100;
  const baseFare = seatPrices.reduce((a, b) => a + b, 0);
  const gst = r(baseFare * 0.05);
  const platformFee = 15;
  const convenienceFee = r(baseFare * 0.02);
  const discount = r((baseFare * discountPercent) / 100);
  const grandTotal = r(baseFare + gst + platformFee + convenienceFee - discount - couponDiscount);
  return { baseFare, gst, platformFee, convenienceFee, discount, couponDiscount: r(couponDiscount), grandTotal };
}

export const mockCoupons: Coupon[] = [
  { id: 1, code: 'DESTINY10', description: '10% off up to ₹150 on all routes', type: 'PERCENT', value: 10, minAmount: 300, maxDiscount: 150, validTill: '2026-12-31', active: true, category: 'FLAT' },
  { id: 2, code: 'FIRST200', description: 'Flat ₹200 off on your first booking', type: 'FLAT', value: 200, minAmount: 800, maxDiscount: 200, validTill: '2026-12-31', active: true, category: 'FLAT' },
  { id: 3, code: 'DIWALI25', description: 'Festival special: 25% off up to ₹300', type: 'PERCENT', value: 25, minAmount: 1000, maxDiscount: 300, validTill: '2026-11-30', active: true, category: 'FESTIVAL' },
  { id: 4, code: 'REFER100', description: 'Referral reward: ₹100 off', type: 'FLAT', value: 100, minAmount: 500, maxDiscount: 100, validTill: '2027-03-31', active: true, category: 'REFERRAL' },
  { id: 5, code: 'CASH50', description: '₹50 cashback to wallet', type: 'CASHBACK', value: 50, minAmount: 400, maxDiscount: 50, validTill: '2027-01-31', active: true, category: 'CASHBACK' },
];

export function validateCoupon(code: string, amount: number) {
  const c = mockCoupons.find((x) => x.code.toUpperCase() === code.trim().toUpperCase());
  if (!c) return { valid: false, discount: 0, message: 'Invalid coupon code' };
  if (amount < c.minAmount) return { valid: false, discount: 0, message: `Minimum amount ₹${c.minAmount}` };
  const d = c.type === 'PERCENT' ? Math.min((amount * c.value) / 100, c.maxDiscount) : Math.min(c.value, c.maxDiscount);
  return { valid: true, discount: Math.round(d * 100) / 100, message: `${c.code} applied! You save ₹${d.toFixed(0)}` };
}

export const mockNotifications: Notification[] = [
  { id: 1, type: 'BOOKING_CONFIRMED', title: 'Booking confirmed', body: 'Your trip Bengaluru → Chennai is confirmed. PNR PNR8842.', read: false, createdAt: new Date().toISOString() },
  { id: 2, type: 'OFFER', title: 'Weekend sale', body: 'Use DESTINY10 for 10% off this weekend.', read: false, createdAt: new Date(Date.now() - 3600e3).toISOString() },
  { id: 3, type: 'BUS_DELAYED', title: 'Bus delayed by 15 mins', body: 'KA-01-F-4200 is running 15 mins late.', read: true, createdAt: new Date(Date.now() - 86400e3).toISOString() },
  { id: 4, type: 'PAYMENT_SUCCESS', title: 'Payment successful', body: '₹1,245 received via UPI.', read: true, createdAt: new Date(Date.now() - 2 * 86400e3).toISOString() },
];

export const mockFaqs: Faq[] = [
  { question: 'How do I cancel my ticket?', answer: 'Go to My Bookings → Upcoming → Cancel. Refunds are credited to your wallet instantly.' },
  { question: 'Can I reschedule my journey?', answer: 'Yes, select Reschedule on an upcoming booking and pick a new trip on the same route.' },
  { question: 'Is my payment secure?', answer: 'All payments are processed over encrypted channels with PCI-DSS compliant gateways.' },
  { question: 'How do I track my bus?', answer: 'Open an upcoming booking and tap Track to see live location and ETA.' },
];

export const mockCards: SavedCard[] = [
  { id: 1, brand: 'VISA', last4: '4242', expiry: '08/28', holder: 'DEMO TRAVELLER' },
  { id: 2, brand: 'MASTERCARD', last4: '5454', expiry: '01/27', holder: 'DEMO TRAVELLER' },
];

export const mockTickets: SupportTicket[] = [];
export const mockSavedPassengers: PassengerInput[] = [
  { name: 'Demo Traveller', age: 30, gender: 'MALE', seatNumber: '' },
  { name: 'Priya Sharma', age: 27, gender: 'FEMALE', seatNumber: '' },
];

// In-memory bookings store for offline mode
let bookingSeq = 1;
export const mockBookings: Booking[] = (() => {
  const mk = (status: Booking['status'], dayOffset: number, i: number): Booking => {
    const d = new Date(Date.now() + dayOffset * 86400e3).toISOString().slice(0, 10);
    const trip = mockTrips('Bengaluru', i % 2 ? 'Goa' : 'Chennai', d)[i];
    return {
      id: bookingSeq++, bookingRef: `SYD-${String(482910 + i)}`, pnr: `PNR${8840 + i}`, status, trip,
      seatNumbers: ['D5', 'D6'], passengers: [
        { name: 'Demo Traveller', age: 30, gender: 'MALE', seatNumber: 'D5' },
        { name: 'Priya Sharma', age: 27, gender: 'FEMALE', seatNumber: 'D6' },
      ],
      boardingPoint: trip.boardingPoints[0], droppingPoint: trip.droppingPoints[0],
      fare: computeFare([trip.fare, trip.fare], trip.discountPercent), contactMobile: mockUser.mobile,
      contactEmail: mockUser.email, createdAt: new Date().toISOString(),
      paymentStatus: status === 'CANCELLED' ? 'REFUNDED' : 'SUCCESS',
    };
  };
  return [mk('CONFIRMED', 3, 0), mk('CONFIRMED', 10, 1), mk('COMPLETED', -12, 2), mk('CANCELLED', -4, 3)];
})();

export function createMockBooking(req: BookingRequest, trip: Trip, fare: FareBreakdown): Booking {
  const b: Booking = {
    id: 100 + bookingSeq++, bookingRef: `SYD-${Math.floor(100000 + Math.random() * 899999)}`,
    pnr: `PNR${Math.floor(1000 + Math.random() * 8999)}`, status: 'PENDING', trip,
    seatNumbers: req.seatNumbers, passengers: req.passengers,
    boardingPoint: trip.boardingPoints.find((p) => p.id === req.boardingPointId) ?? trip.boardingPoints[0],
    droppingPoint: trip.droppingPoints.find((p) => p.id === req.droppingPointId) ?? trip.droppingPoints[0],
    fare, contactMobile: req.contactMobile, contactEmail: req.contactEmail,
    createdAt: new Date().toISOString(), paymentStatus: 'PENDING',
  };
  mockBookings.unshift(b);
  return b;
}

export function mockTracking(bookingId: number): TrackingInfo {
  const b = mockBookings.find((x) => x.id === bookingId);
  return {
    bookingId, busNumber: b?.trip.busNumber ?? 'KA-01-F-4200', lat: 12.9716 + Math.random() * 0.05,
    lng: 77.5946 + Math.random() * 0.05, etaMins: 25 + Math.floor(Math.random() * 30),
    driverName: 'Ramesh Kumar', driverPhone: '+919800012345', speedKmph: 54 + Math.floor(Math.random() * 20),
    lastUpdated: new Date().toISOString(),
  };
}
