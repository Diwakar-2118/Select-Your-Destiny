# Select Your Destiny — Backend

"Book Smart. Travel Comfortably." Spring Boot 3.2 / Java 17 REST API implementing `docs/CONTRACT.md`.

## Run

```bash
cd backend
mvn spring-boot:run                 # dev profile, H2 in-memory, demo data seeded
# or
mvn -DskipTests package && java -jar target/select-your-destiny-backend-1.0.0.jar
```

Base URL: `http://localhost:8080/api` · H2 console: `http://localhost:8080/api/h2-console` (JDBC `jdbc:h2:mem:destiny`, user `sa`).

### PostgreSQL (prod profile)

```bash
SPRING_PROFILES_ACTIVE=prod DB_URL=jdbc:postgresql://localhost:5432/destiny DB_USER=postgres DB_PASSWORD=postgres \
  java -jar target/select-your-destiny-backend-1.0.0.jar
```

Other env vars: `JWT_SECRET` (>= 32 chars), `APP_SEED=false` to disable demo seeding (seeding also skips when users already exist).

## Demo accounts
| Email | Password | Role |
|---|---|---|
| demo@destiny.com | Demo@123 | USER |
| admin@destiny.com | Admin@123 | ADMIN |
| riya@destiny.com | Riya@123 | USER |

OTP login: any mobile + OTP `123456` (the generated OTP is also logged).

## Quick flow
```bash
TOKEN=$(curl -s -XPOST localhost:8080/api/auth/login -H 'Content-Type: application/json' \
  -d '{"email":"demo@destiny.com","password":"Demo@123"}' | jq -r .data.token)
curl "localhost:8080/api/trips/search?from=Bangalore&to=Chennai&date=$(date +%F)"
curl localhost:8080/api/trips/1/seats
curl -XPOST localhost:8080/api/seats/lock -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' -d '{"tripId":1,"seatNumbers":["D20"]}'
curl -XPOST localhost:8080/api/bookings ... # BookingRequest -> PENDING
curl -XPOST localhost:8080/api/payments/initiate -d '{"bookingId":N,"method":"UPI"}'
curl -XPOST localhost:8080/api/payments/verify -d '{"paymentId":P,"gatewayPaymentId":"x","signature":"mock"}'  # -> CONFIRMED
curl -H "Authorization: Bearer $TOKEN" localhost:8080/api/bookings/N/ticket.pdf -o ticket.pdf
```

## Architecture
```
com.selectyourdestiny
├── entity        JPA entities (users, operators, cities, routes, buses, drivers, seats, trips, boarding_points,
│                 trip_seats, bookings, passengers, saved_passengers, saved_cards, payments, coupons,
│                 notifications, support_tickets) + enums
├── repository    Spring Data repositories (TripSeatRepository has PESSIMISTIC_WRITE lock query)
├── dto           ApiResponse envelope + Dtos (records mirroring contract TS types)
├── service       Catalog, SeatLock, Fare, Booking, Payment, TicketPdf, Profile, Notification, Admin, Mapper
├── controller    Auth, Catalog, Booking, Payment, Profile, Admin
├── security      JwtService (jjwt 0.12), JwtAuthFilter, CurrentUser
├── payment       PaymentGateway + MockPaymentGateway (@Primary, signature "mock"), RazorpayGateway, PhonePeGateway stubs
├── notification  PushSender (Firebase integration point) + LogPushSender
├── config        SecurityConfig (CORS, roles), DataSeeder
└── exception     ApiException + GlobalExceptionHandler
```

### Seat locking
- `trip_seats` rows are created lazily per trip from the bus seat template.
- `POST /seats/lock` loads rows with `SELECT ... FOR UPDATE` (PESSIMISTIC_WRITE) in a transaction; `@Version` adds optimistic protection. Seats already BOOKED or held by another user (unexpired) → **409**.
- Hold TTL is 10 minutes (`app.seat-lock-minutes`); `SeatLockService.releaseExpiredLocks` (`@Scheduled`, every 30 s) frees expired holds.
- `POST /bookings` holds seats and links them to a PENDING booking; `POST /payments/verify` marks them BOOKED and the booking CONFIRMED. Cancel frees seats and refunds the wallet.
- In the seat layout, seats held by the calling user are reported as `SELECTED`.

### Fare
`baseFare = Σ(trip.fare + seat.extraFare)`, `gst = 5%`, `platformFee = 15`, `convenienceFee = 2%`, `discount = trip.discountPercent`, `couponDiscount` from coupon (FLAT / PERCENT capped by maxDiscount). CASHBACK coupons don't reduce the payable amount; the cashback is credited to the wallet after payment.

### Tracking
`GET /bookings/{id}/tracking` interpolates lat/lng between origin and destination city by elapsed journey time (outside the journey window the bus cycles along the route for demo purposes).
