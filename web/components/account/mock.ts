// Local fallback data so account/admin pages render even when the API (and lib/api mocks) are unavailable.
import type { AppNotification, Booking, Coupon, Dashboard, Faq, SavedCard, SavedPassenger, SupportTicket, TrackingInfo, Trip, UserLite, Wallet } from './types';

const day = (offset: number) => { const d = new Date(); d.setDate(d.getDate() + offset); return d.toISOString().slice(0, 10); };

const trip = (id: number, from: string, to: string, offset: number, op: string, fare: number): Trip => ({
  id, busId: id, busName: `${op} Volvo`, operatorName: op, busNumber: `KA-01-AB-${1000 + id}`,
  busType: 'VOLVO_MULTI_AXLE', ac: true, rating: 4.4, reviews: 812, fromCity: from, toCity: to,
  journeyDate: day(offset), departureTime: '21:30', arrivalTime: '06:15', durationMins: 525,
  boardingPoints: [], droppingPoints: [], availableSeats: 18, windowSeats: 6, totalSeats: 40,
  amenities: ['WIFI', 'CHARGING_PORT', 'LIVE_TRACKING'], fare, discountPercent: 10,
});

const booking = (id: number, status: Booking['status'], t: Trip): Booking => {
  const base = t.fare * 2;
  const gst = +(base * 0.05).toFixed(2);
  const conv = +(base * 0.02).toFixed(2);
  const disc = +(base * 0.1).toFixed(2);
  return {
    id, bookingRef: `SYD-${String(482910 + id)}`, pnr: `PNR${7731200 + id}`, status, trip: t,
    seatNumbers: ['D7', 'D8'],
    passengers: [
      { name: 'Aarav Sharma', age: 29, gender: 'MALE', seatNumber: 'D7' },
      { name: 'Diya Sharma', age: 27, gender: 'FEMALE', seatNumber: 'D8' },
    ],
    boardingPoint: { id: 1, name: 'Majestic Bus Stand', address: 'Kempegowda, Bengaluru', time: t.departureTime },
    droppingPoint: { id: 2, name: 'Koyambedu', address: 'CMBT, Chennai', time: t.arrivalTime },
    fare: { baseFare: base, gst, platformFee: 15, convenienceFee: conv, discount: disc, couponDiscount: 0, grandTotal: +(base + gst + 15 + conv - disc).toFixed(2) },
    contactMobile: '9876543210', contactEmail: 'demo@destiny.com', createdAt: new Date().toISOString(),
    paymentStatus: status === 'CANCELLED' ? 'REFUNDED' : 'SUCCESS',
  };
};

export const mockBookings: Booking[] = [
  booking(1, 'CONFIRMED', trip(101, 'Bengaluru', 'Chennai', 2, 'SRS Travels', 899)),
  booking(2, 'CONFIRMED', trip(102, 'Mumbai', 'Pune', 6, 'Neeta Tours', 549)),
  booking(3, 'COMPLETED', trip(103, 'Delhi', 'Jaipur', -12, 'Zingbus', 749)),
  booking(4, 'COMPLETED', trip(104, 'Hyderabad', 'Vijayawada', -40, 'Orange Travels', 650)),
  booking(5, 'CANCELLED', trip(105, 'Chennai', 'Madurai', -5, 'KPN Travels', 720)),
];

export const mockTrips = (date: string, from = 'Bengaluru', to = 'Chennai'): Trip[] => [
  { ...trip(201, from, to, 0, 'SRS Travels', 899), journeyDate: date, departureTime: '20:00' },
  { ...trip(202, from, to, 0, 'VRL Travels', 949), journeyDate: date, departureTime: '22:15' },
  { ...trip(203, from, to, 0, 'IntrCity SmartBus', 999), journeyDate: date, departureTime: '23:30' },
];

export const mockTracking = (id: number): TrackingInfo => ({
  bookingId: id, busNumber: 'KA-01-AB-1101', lat: 12.9716, lng: 77.5946, etaMins: 185,
  driverName: 'Ramesh Kumar', driverPhone: '+919876500011', speedKmph: 62, lastUpdated: new Date().toISOString(),
});

const ago = (ms: number) => new Date(Date.now() - ms).toISOString();
export const mockNotifications: AppNotification[] = [
  { id: 1, type: 'BOOKING_CONFIRMED', title: 'Booking confirmed', body: 'SYD-482911 Bengaluru to Chennai is confirmed. Seats D7, D8.', read: false, createdAt: ago(36e5) },
  { id: 2, type: 'PAYMENT_SUCCESS', title: 'Payment successful', body: '₹1,964 paid via UPI for SYD-482911.', read: false, createdAt: ago(37e5) },
  { id: 3, type: 'BUS_DELAYED', title: 'Bus delayed by 20 min', body: 'Your SRS Travels bus is running 20 minutes late due to traffic.', read: false, createdAt: ago(864e5) },
  { id: 4, type: 'BUS_ARRIVED', title: 'Bus arrived', body: 'Your Zingbus has arrived at Sindhi Camp, Jaipur.', read: true, createdAt: ago(2 * 864e5) },
  { id: 5, type: 'OFFER', title: 'Diwali Dhamaka – 25% off', body: 'Festival fares are live. Book before Sunday!', read: true, createdAt: ago(3 * 864e5) },
  { id: 6, type: 'COUPON', title: 'New coupon unlocked', body: 'Use FIRST100 to get ₹100 off on your next trip.', read: false, createdAt: ago(4 * 864e5) },
];

export const mockOffers: Coupon[] = [
  { id: 1, code: 'FLAT150', description: 'Flat ₹150 off on bookings above ₹999', type: 'FLAT', value: 150, minAmount: 999, maxDiscount: 150, validTill: day(30), active: true, category: 'FLAT' },
  { id: 2, code: 'FIRST100', description: 'Flat ₹100 off on your first booking', type: 'FLAT', value: 100, minAmount: 300, maxDiscount: 100, validTill: day(60), active: true, category: 'FLAT' },
  { id: 3, code: 'DIWALI25', description: '25% off on festival travel, up to ₹300', type: 'PERCENT', value: 25, minAmount: 500, maxDiscount: 300, validTill: day(10), active: true, category: 'FESTIVAL' },
  { id: 4, code: 'PONGAL15', description: '15% off for Pongal journeys to Tamil Nadu', type: 'PERCENT', value: 15, minAmount: 400, maxDiscount: 200, validTill: day(50), active: true, category: 'FESTIVAL' },
  { id: 5, code: 'REFER200', description: 'You and your friend both get ₹200 in wallet', type: 'FLAT', value: 200, minAmount: 0, maxDiscount: 200, validTill: day(90), active: true, category: 'REFERRAL' },
  { id: 6, code: 'CASH10', description: '10% cashback to wallet, up to ₹250', type: 'CASHBACK', value: 10, minAmount: 600, maxDiscount: 250, validTill: day(20), active: true, category: 'CASHBACK' },
  { id: 7, code: 'UPICASH', description: '₹75 cashback on UPI payments', type: 'CASHBACK', value: 75, minAmount: 500, maxDiscount: 75, validTill: day(15), active: true, category: 'CASHBACK' },
];

export const mockUser: UserLite = { id: 1, name: 'Aarav Sharma', email: 'demo@destiny.com', mobile: '9876543210', role: 'USER', walletBalance: 1250 };
export const mockPassengers: SavedPassenger[] = [
  { id: 1, name: 'Aarav Sharma', age: 29, gender: 'MALE' },
  { id: 2, name: 'Diya Sharma', age: 27, gender: 'FEMALE' },
  { id: 3, name: 'Kamala Devi', age: 61, gender: 'FEMALE' },
];
export const mockCards: SavedCard[] = [
  { id: 1, brand: 'VISA', last4: '4242', holderName: 'AARAV SHARMA', expiry: '08/28' },
  { id: 2, brand: 'MASTERCARD', last4: '5100', holderName: 'AARAV SHARMA', expiry: '01/27' },
];
export const mockWallet: Wallet = {
  balance: 1250,
  transactions: [
    { id: 1, type: 'CREDIT', amount: 720, description: 'Refund – SYD-482915', createdAt: day(-5) },
    { id: 2, type: 'CREDIT', amount: 200, description: 'Referral bonus', createdAt: day(-9) },
    { id: 3, type: 'DEBIT', amount: 150, description: 'Used on SYD-482912', createdAt: day(-14) },
    { id: 4, type: 'CREDIT', amount: 480, description: 'Cashback CASH10', createdAt: day(-20) },
  ],
};
export const mockTickets: SupportTicket[] = [
  { id: 1, subject: 'Refund not received', description: 'Cancelled SYD-482915, refund pending', status: 'IN_PROGRESS', createdAt: day(-3) },
  { id: 2, subject: 'Change boarding point', description: 'Need to board at Silk Board', status: 'RESOLVED', createdAt: day(-25) },
];
export const mockFaqs: Faq[] = [
  { question: 'How do I cancel my ticket?', answer: 'Go to My Bookings → Upcoming, choose the ticket and tap Cancel Ticket. The refund is credited to your wallet instantly.' },
  { question: 'When will I receive my refund?', answer: 'Wallet refunds are instant. Refunds to the original payment method take 5–7 business days.' },
  { question: 'Can I reschedule my journey?', answer: 'Yes. Select Reschedule on an upcoming booking, pick a new date and choose a bus on the same route.' },
  { question: 'How does live tracking work?', answer: 'Buses with the Live Tracking amenity share GPS location. Open Track Bus to see ETA, speed and driver details.' },
  { question: 'Is my payment secure?', answer: 'All payments are processed through PCI-DSS compliant gateways. We never store your full card number.' },
];

export const mockDashboard: Dashboard = {
  totalBookings: 12840, revenue: 9842300, activeBuses: 342, users: 48210,
  bookingsByDay: Array.from({ length: 14 }, (_, i) => ({
    date: day(i - 13).slice(5),
    count: 320 + Math.round(Math.sin(i / 2) * 80 + i * 12),
    revenue: 280000 + Math.round(Math.cos(i / 3) * 60000 + i * 9000),
  })),
  topRoutes: [
    { route: 'BLR → MAA', bookings: 2140 }, { route: 'BOM → PNQ', bookings: 1890 }, { route: 'DEL → JAI', bookings: 1610 },
    { route: 'HYD → BLR', bookings: 1320 }, { route: 'MAA → CBE', bookings: 980 },
  ],
  paymentSplit: [
    { method: 'UPI', amount: 4820000 }, { method: 'CREDIT_CARD', amount: 2100000 }, { method: 'DEBIT_CARD', amount: 1300000 },
    { method: 'NET_BANKING', amount: 820000 }, { method: 'WALLET', amount: 802300 },
  ],
};

// Admin seed rows for CRUD resources
export const mockAdmin: Record<string, Record<string, unknown>[]> = {
  operators: [
    { id: 1, name: 'SRS Travels', contactEmail: 'ops@srs.in', phone: '9800011111', rating: 4.3, active: true },
    { id: 2, name: 'VRL Travels', contactEmail: 'care@vrl.in', phone: '9800022222', rating: 4.5, active: true },
    { id: 3, name: 'Neeta Tours', contactEmail: 'hello@neeta.in', phone: '9800033333', rating: 4.1, active: false },
  ],
  routes: [
    { id: 1, fromCity: 'Bengaluru', toCity: 'Chennai', distanceKm: 346, durationMins: 360, active: true },
    { id: 2, fromCity: 'Mumbai', toCity: 'Pune', distanceKm: 149, durationMins: 210, active: true },
    { id: 3, fromCity: 'Delhi', toCity: 'Jaipur', distanceKm: 281, durationMins: 330, active: true },
  ],
  buses: [
    { id: 1, busName: 'SRS Volvo 9600', busNumber: 'KA-01-AB-1101', operator: 'SRS Travels', busType: 'VOLVO_MULTI_AXLE', totalSeats: 40, active: true },
    { id: 2, busName: 'VRL Sleeper', busNumber: 'KA-25-F-2201', operator: 'VRL Travels', busType: 'AC_SLEEPER', totalSeats: 30, active: true },
    { id: 3, busName: 'Neeta Seater', busNumber: 'MH-12-Q-3301', operator: 'Neeta Tours', busType: 'AC_SEATER', totalSeats: 44, active: false },
  ],
  drivers: [
    { id: 1, name: 'Ramesh Kumar', phone: '9876500011', licenseNo: 'KA0120110012345', experienceYears: 12, active: true },
    { id: 2, name: 'Suresh Patil', phone: '9876500022', licenseNo: 'MH1220150054321', experienceYears: 8, active: true },
  ],
  coupons: mockOffers.map(o => ({ ...o })),
};

export const mockAdminBookings: Record<string, unknown>[] = mockBookings.map((b, i) => ({
  id: b.id, bookingRef: b.bookingRef, customer: b.passengers[0].name, route: `${b.trip.fromCity} → ${b.trip.toCity}`,
  journeyDate: b.trip.journeyDate, amount: b.fare.grandTotal, status: b.status, paymentStatus: b.paymentStatus,
  createdAt: day(-i),
}));

export const mockAdminPayments: Record<string, unknown>[] = mockBookings.map((b, i) => ({
  id: 9000 + b.id, bookingRef: b.bookingRef, method: ['UPI', 'CREDIT_CARD', 'PHONEPE', 'NET_BANKING', 'WALLET'][i % 5],
  amount: b.fare.grandTotal, status: b.paymentStatus, gatewayOrderId: `order_${(123456 + i).toString(36)}`, createdAt: day(-i),
}));
