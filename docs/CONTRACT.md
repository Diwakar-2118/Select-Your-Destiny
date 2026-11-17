# Select Your Destiny — Shared Contract

"Book Smart. Travel Comfortably."

All parts of the system (backend, web, admin, mobile) MUST follow this contract.

## Repo layout
```
backend/   Spring Boot 3 (Java 17, Maven) REST API — port 8080, base path /api
web/       Next.js 14 (App Router, TypeScript, Tailwind) — customer app + /admin
mobile/    React Native (Expo, TypeScript) — customer app
database/  PostgreSQL schema.sql + seed.sql
docs/      Architecture, flows, this contract
docker-compose.yml  postgres + backend + web
```

## Theme tokens
- primary `#2563EB` (royal blue), secondary `#6D28D9` (purple), accent `#F97316` (orange)
- background `#FFFFFF`, card `#F3F4F6`, text `#0F172A`, muted `#64748B`
- radius 16px; gradient `linear-gradient(135deg,#2563EB 0%,#6D28D9 60%,#F97316 100%)`
- Seat colours: available `#22C55E`, booked `#9CA3AF`, selected `#2563EB`, ladies `#EC4899`

## Auth
- JWT Bearer in `Authorization: Bearer <token>`. Roles: `USER`, `ADMIN`.
- OTP: dev mode always accepts `123456` (and logs the generated OTP).
- Demo users: `demo@destiny.com / Demo@123` (USER), `admin@destiny.com / Admin@123` (ADMIN).

## Response envelope
All endpoints return JSON: `{ "success": boolean, "data": T, "message": string }`.
Errors: HTTP 4xx/5xx with `{ "success": false, "data": null, "message": "..." }`.

## TypeScript types (mirror in Java DTOs)
```ts
type BusType = 'AC_SEATER'|'NON_AC_SEATER'|'AC_SLEEPER'|'NON_AC_SLEEPER'|'AC_SEMI_SLEEPER'|'VOLVO_MULTI_AXLE'|'ELECTRIC'|'PUSH_BACK';
type Amenity = 'CHARGING_PORT'|'WATER_BOTTLE'|'BLANKET'|'LIVE_TRACKING'|'CCTV'|'WIFI'|'READING_LIGHT';
type SeatKind = 'PUSH_BACK'|'SLEEPER'|'UPPER_SLEEPER'|'LOWER_SLEEPER';
type SeatStatus = 'AVAILABLE'|'BOOKED'|'LOCKED'|'SELECTED';
type BookingStatus = 'PENDING'|'CONFIRMED'|'COMPLETED'|'CANCELLED';
type PaymentMethod = 'UPI'|'GOOGLE_PAY'|'PHONEPE'|'PAYTM'|'CREDIT_CARD'|'DEBIT_CARD'|'NET_BANKING'|'WALLET'|'LAZYPAY'|'EMI';

interface User { id: number; name: string; email: string; mobile: string; role: 'USER'|'ADMIN'; avatarUrl?: string; walletBalance: number; }
interface AuthResponse { token: string; user: User; }
interface City { id: number; name: string; state: string; }
interface Point { id: number; name: string; address: string; time: string /* HH:mm */; }
interface Trip {               // a scheduled bus on a date (search result)
  id: number; busId: number; busName: string; operatorName: string; busNumber: string;
  busType: BusType; ac: boolean; rating: number; reviews: number;
  fromCity: string; toCity: string; journeyDate: string /* yyyy-MM-dd */;
  departureTime: string; arrivalTime: string; durationMins: number;
  boardingPoints: Point[]; droppingPoints: Point[];
  availableSeats: number; windowSeats: number; totalSeats: number;
  amenities: Amenity[]; fare: number; discountPercent: number; couponCode?: string;
}
interface Seat {
  id: number; seatNumber: string /* D1, S1, US1, LS1 */; kind: SeatKind; deck: 'LOWER'|'UPPER';
  row: number; col: number; isWindow: boolean; isLadies: boolean; price: number; status: SeatStatus;
}
interface SeatLayout { tripId: number; seats: Seat[]; rows: number; cols: number; hasUpperDeck: boolean; }
interface PassengerInput { name: string; age: number; gender: 'MALE'|'FEMALE'|'OTHER'; seatNumber: string; }
interface BookingRequest {
  tripId: number; seatNumbers: string[]; passengers: PassengerInput[];
  contactMobile: string; contactEmail: string; emergencyContact?: string;
  boardingPointId: number; droppingPointId: number; gstNumber?: string; gstCompany?: string; couponCode?: string;
}
interface FareBreakdown { baseFare: number; gst: number; platformFee: number; convenienceFee: number; discount: number; couponDiscount: number; grandTotal: number; }
interface Booking {
  id: number; bookingRef: string /* SYD-XXXXXX */; pnr: string; status: BookingStatus;
  trip: Trip; seatNumbers: string[]; passengers: PassengerInput[];
  boardingPoint: Point; droppingPoint: Point; fare: FareBreakdown;
  contactMobile: string; contactEmail: string; createdAt: string; paymentStatus: 'PENDING'|'SUCCESS'|'FAILED'|'REFUNDED';
}
interface Coupon { id: number; code: string; description: string; type: 'FLAT'|'PERCENT'|'CASHBACK'; value: number; minAmount: number; maxDiscount: number; validTill: string; active: boolean; category: 'FLAT'|'FESTIVAL'|'REFERRAL'|'CASHBACK'; }
interface Notification { id: number; type: 'BOOKING_CONFIRMED'|'BUS_DELAYED'|'BUS_ARRIVED'|'OFFER'|'COUPON'|'PAYMENT_SUCCESS'; title: string; body: string; read: boolean; createdAt: string; }
interface TrackingInfo { bookingId: number; busNumber: string; lat: number; lng: number; etaMins: number; driverName: string; driverPhone: string; speedKmph: number; lastUpdated: string; }
interface SupportTicket { id: number; subject: string; description: string; status: 'OPEN'|'IN_PROGRESS'|'RESOLVED'; createdAt: string; }
```

## REST endpoints (prefix `/api`)
Auth (public)
- `POST /auth/otp/send` `{mobile}` → `{sent:true}`
- `POST /auth/otp/verify` `{mobile, otp}` → AuthResponse
- `POST /auth/login` `{email, password}` → AuthResponse
- `POST /auth/register` `{name, email, mobile, password}` → AuthResponse
- `POST /auth/social` `{provider:'GOOGLE'|'APPLE', idToken}` → AuthResponse (dev: trusts token)
- `POST /auth/forgot-password` `{email}` → `{sent:true}`
- `GET  /auth/me` → User

Catalog (public)
- `GET /cities` → City[]
- `GET /routes/popular` → `{from,to,startingFare}[]`
- `GET /trips/search?from=&to=&date=&busType=&ac=&sleeper=&departure=MORNING|AFTERNOON|EVENING|NIGHT&operator=&amenities=WIFI,CCTV&sort=PRICE_ASC|RATING_DESC|DEPARTURE|ARRIVAL` → Trip[]
- `GET /trips/{id}` → Trip
- `GET /trips/{id}/seats` → SeatLayout
- `GET /offers` → Coupon[]
- `POST /coupons/validate` `{code, amount}` → `{valid, discount, message}`

Booking (USER)
- `POST /seats/lock` `{tripId, seatNumbers}` → `{lockId, expiresAt}` (10 min hold; 409 if taken)
- `POST /seats/release` `{tripId, seatNumbers}`
- `POST /bookings/quote` BookingRequest → FareBreakdown
- `POST /bookings` BookingRequest → Booking (status PENDING)
- `GET  /bookings?status=UPCOMING|COMPLETED|CANCELLED` → Booking[]
- `GET  /bookings/{id}` → Booking
- `POST /bookings/{id}/cancel` → Booking (refund to wallet)
- `POST /bookings/{id}/reschedule` `{newTripId, seatNumbers}` → Booking
- `GET  /bookings/{id}/ticket.pdf` → application/pdf
- `POST /bookings/{id}/share` `{channel:'EMAIL'|'SMS'}` → `{sent:true}`
- `GET  /bookings/{id}/tracking` → TrackingInfo

Payments (USER)
- `POST /payments/initiate` `{bookingId, method, promoCode?}` → `{paymentId, gatewayOrderId, amount, redirectUrl?}`
- `POST /payments/verify` `{paymentId, gatewayPaymentId, signature}` → Booking (CONFIRMED). Dev: any signature `"mock"` succeeds.

Profile (USER)
- `GET/PUT /users/me`, `GET/POST/DELETE /users/me/passengers`, `GET/POST/DELETE /users/me/cards`, `GET /users/me/wallet`
- `GET /notifications`, `POST /notifications/{id}/read`
- `GET/POST /support/tickets`, `GET /support/faqs`

Admin (ADMIN) — CRUD under `/admin/{operators|routes|buses|drivers|coupons}` (GET list, POST, PUT /{id}, DELETE /{id})
- `GET /admin/buses/{id}/seats`, `PUT /admin/buses/{id}/seats`
- `GET /admin/bookings`, `GET /admin/payments`
- `GET /admin/dashboard` → `{totalBookings, revenue, activeBuses, users, bookingsByDay:{date,count,revenue}[], topRoutes:{route,bookings}[], paymentSplit:{method,amount}[]}`
- `GET /admin/reports?from=&to=` → same shape filtered

## Seat numbering rules
- Push back / seater coaches: `D1..Dn`, 2+2 layout, window = col 0 and col 3.
- Sleeper: lower deck `LS1..`, upper deck `US1..` (2+1 layout). Generic sleeper `S1..`.
- Ladies seats flagged per seat. Seat lock TTL 10 minutes; confirmed bookings mark BOOKED.

## Fare rules
baseFare = Σ seat price; gst = 5% of baseFare; platformFee = 15 flat; convenienceFee = 2% of baseFare;
discount = trip discountPercent of baseFare; couponDiscount from coupon; grandTotal = sum − discounts (round to 2dp).
