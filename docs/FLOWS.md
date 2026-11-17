# Select Your Destiny — Flows

All endpoints are under `/api` and return `{ success, data, message }` (see [CONTRACT.md](./CONTRACT.md)).

## 1. Navigation flow

### 1.1 Customer app (web + mobile share the same journey)

```mermaid
flowchart TD
  SPL["Splash<br/>(mobile only)"] --> ONB["Onboarding carousel<br/>(first launch)"]
  ONB --> LOGIN
  SPL -->|token valid| HOME
  LOGIN["Login<br/>OTP / Email / Google / Apple"] --> OTP["OTP verify"]
  LOGIN --> REG["Register"]
  LOGIN --> FP["Forgot password"]
  OTP --> HOME
  REG --> HOME
  LOGIN -->|"guest browse (web)"| HOME

  HOME["Home<br/>search card, offers, popular routes"] --> SR["Search results<br/>filters + sort"]
  HOME --> OFF["Offers"]
  HOME --> NOTI["Notifications"]
  SR --> BD["Bus details<br/>photos, amenities, reviews, policies"]
  SR --> SEAT
  BD --> SEAT["Seat selection<br/>lower/upper deck"]
  SEAT --> BP["Boarding & dropping points"]
  BP --> PAX["Passenger details<br/>+ contact, GST, coupon"]
  PAX --> REV["Review & fare summary"]
  REV --> PAY["Payment<br/>UPI / GPay / PhonePe / Paytm / Card / NetBanking / Wallet / LazyPay / EMI"]
  PAY -->|success| CONF["Booking confirmed<br/>confetti + e-ticket"]
  PAY -->|failure| PFAIL["Payment failed<br/>retry / change method"]
  PFAIL --> PAY
  CONF --> TICK["Ticket details<br/>QR, PDF, share"]
  CONF --> HOME

  HOME --> TAB_TRIPS["My Trips<br/>Upcoming / Completed / Cancelled"]
  TAB_TRIPS --> TICK
  TICK --> TRACK["Live tracking<br/>map, ETA, driver"]
  TICK --> CANC["Cancel booking<br/>refund preview"]
  TICK --> RESCH["Reschedule"]
  RESCH --> SR
  CANC --> TAB_TRIPS

  HOME --> PROF["Profile"]
  PROF --> EDIT["Edit profile"]
  PROF --> SPAX["Saved passengers"]
  PROF --> CARDS["Saved cards"]
  PROF --> WAL["Wallet"]
  PROF --> SUP["Help & Support<br/>FAQs, tickets"]
  PROF --> SET["Settings<br/>theme, language, notifications"]
  PROF -->|logout| LOGIN
```

Mobile bottom tabs: **Home · My Trips · Offers · Profile** (Notifications via bell icon). Web: top nav with the same sections + footer.

### 1.2 Admin console (`/admin`, role ADMIN)

```mermaid
flowchart LR
  AL["/admin/login"] --> AD["Dashboard<br/>KPIs, charts"]
  AD --> AOP["Operators CRUD"]
  AD --> ART["Routes CRUD"]
  AD --> ABUS["Buses CRUD"]
  ABUS --> ASEAT["Seat layout editor"]
  AD --> ADRV["Drivers CRUD"]
  AD --> ACPN["Coupons CRUD"]
  AD --> ABK["Bookings list<br/>filter, detail"]
  AD --> APAY["Payments list"]
  AD --> ARPT["Reports<br/>date range, CSV export"]
```

## 2. Authentication flow

```mermaid
sequenceDiagram
  autonumber
  actor U as User
  participant C as Client (web/mobile)
  participant API as Backend /api/auth
  participant R as Redis
  participant SMS as SMS provider
  participant IDP as Google/Apple

  rect rgb(235,242,255)
  note over U,SMS: Mobile OTP
  U->>C: enter mobile
  C->>API: POST /auth/otp/send {mobile}
  API->>R: rate-limit check (1/30s, 5/h per mobile, 20/h per IP)
  alt limit exceeded
    API-->>C: 429 "Too many requests"
  else ok
    API->>R: SET otp:{mobile}=hash(otp) EX 300, attempts=0
    API->>SMS: send OTP (dev: log it, accept 123456)
    API-->>C: {sent:true}
  end
  U->>C: enter 6-digit OTP
  C->>API: POST /auth/otp/verify {mobile, otp}
  API->>R: compare hash, attempts++ (max 5)
  API->>API: find-or-create user (auth_provider=OTP)
  API-->>C: AuthResponse {token, user}
  end

  rect rgb(243,232,255)
  note over U,API: Email + password
  C->>API: POST /auth/login {email,password}
  API->>API: BCrypt verify, lockout after 5 failures
  API-->>C: AuthResponse
  end

  rect rgb(255,237,224)
  note over U,IDP: Social login
  C->>IDP: Google / Apple sign-in SDK
  IDP-->>C: idToken
  C->>API: POST /auth/social {provider, idToken}
  API->>IDP: verify signature (JWKs), aud, exp
  API-->>C: AuthResponse
  end

  note over C: store token (web: httpOnly cookie or memory; mobile: SecureStore)

  rect rgb(232,250,240)
  note over C,API: Token refresh (prod extension, not in v1 contract — v1 issues a 24h token and re-login on 401)
  C->>API: any request with Authorization: Bearer access
  API-->>C: 401 token expired
  C->>API: POST /auth/refresh {refreshToken}
  API->>R: validate + rotate refresh token (reuse ⇒ revoke family)
  API-->>C: new access + refresh
  C->>API: retry original request
  end
```

## 3. Seat booking — real-time availability & lock TTL

```mermaid
sequenceDiagram
  autonumber
  actor U as User
  participant C as Client
  participant API as Backend
  participant R as Redis
  participant DB as PostgreSQL
  participant J as Lock sweeper (every 30s)

  U->>C: open trip
  C->>API: GET /trips/{id}/seats
  API->>DB: trip_seats for trip (AVAILABLE/LOCKED/BOOKED)
  API->>R: overlay active locks
  API-->>C: SeatLayout (status per seat)
  loop every 10s while on seat screen
    C->>API: GET /trips/{id}/seats
    API-->>C: refreshed statuses (others' locks shown as LOCKED)
  end

  U->>C: tap seats D5, D6 (SELECTED locally, animate)
  U->>C: Continue
  C->>API: POST /seats/lock {tripId, seatNumbers}
  API->>R: Lua: SET seat:{trip}:{seat} NX PX 600000 for all seats
  alt any seat taken
    API-->>C: 409 "Seat D6 just got booked"
    C->>U: shake seat, mark unavailable, refresh map
  else all locked
    API->>DB: UPDATE trip_seats SET status=LOCKED, locked_by, lock_id,<br/>lock_expires_at=now()+10m, version=version+1<br/>WHERE status=AVAILABLE (rowcount must match)
    API-->>C: {lockId, expiresAt}
    C->>U: show 10:00 countdown banner
  end

  C->>API: POST /bookings/quote (BookingRequest)
  API-->>C: FareBreakdown
  C->>API: POST /bookings (BookingRequest)
  API->>DB: verify lock owner, insert booking PENDING + passengers
  API-->>C: Booking (PENDING)

  alt user leaves / presses back
    C->>API: POST /seats/release {tripId, seatNumbers}
    API->>R: DEL keys
    API->>DB: status=AVAILABLE
  else timer hits 0
    C->>U: "Seat hold expired" modal → back to seat map
    J->>DB: release_expired_seat_locks()
    note over R: Redis keys expire automatically (PX 600000)
  end
```

## 4. Payment integration

```mermaid
sequenceDiagram
  autonumber
  actor U as User
  participant C as Client
  participant API as Backend /payments
  participant DB as PostgreSQL
  participant GW as Gateway (Razorpay / PhonePe / Paytm / LazyPay)
  participant APP as UPI app / Bank / Card network

  U->>C: choose method (UPI, GOOGLE_PAY, PHONEPE, PAYTM, CREDIT_CARD, DEBIT_CARD, NET_BANKING, WALLET, LAZYPAY, EMI)
  C->>API: POST /payments/initiate {bookingId, method, promoCode?}<br/>Idempotency-Key: uuid
  API->>DB: idempotency_key exists? → return existing payment
  API->>DB: recompute amount from booking (server-side), validate coupon
  alt method = WALLET and balance ≥ amount
    API->>DB: debit wallet, payment SUCCESS → confirm booking (step 14)
  else gateway methods
    API->>GW: create order {amount, currency INR, receipt=bookingRef}
    GW-->>API: gatewayOrderId
    API->>DB: payments row PENDING (gateway_order_id)
    API-->>C: {paymentId, gatewayOrderId, amount, redirectUrl?}
    C->>GW: open hosted checkout / SDK / UPI intent (gpay://, phonepe://, paytmmp://)
    GW->>APP: collect / intent / 3-D Secure / BNPL approval
    APP-->>GW: authorised
    GW-->>C: {gatewayPaymentId, signature}
    C->>API: POST /payments/verify {paymentId, gatewayPaymentId, signature}
    API->>API: HMAC_SHA256(orderId|paymentId, secret) == signature (dev: "mock")
  end
  par webhook (source of truth, handles app-killed cases)
    GW->>API: POST /payments/webhook/{gateway} (payment.captured)
    API->>API: verify webhook signature, dedupe event id
  end
  API->>DB: TX: payment SUCCESS, booking CONFIRMED, trip_seats LOCKED→BOOKED<br/>(guarded: only if still PENDING)
  API-->>C: Booking (CONFIRMED)
  C->>U: success screen + confetti

  alt payment failed / cancelled
    GW-->>C: failure
    C->>U: Retry / choose another method (lock still valid until TTL)
    API->>DB: payment FAILED (booking stays PENDING)
  end
  alt captured but seats lost (lock expired & resold)
    API->>GW: auto refund
    API->>DB: payment REFUNDED, notify user
  end
```

Reconciliation job every 15 min queries the gateway for `PENDING` payments older than 10 min and settles them.

## 5. Booking confirmation & notifications

```mermaid
sequenceDiagram
  autonumber
  participant API as Backend
  participant Q as SQS "notifications"
  participant W as Worker
  participant S3 as S3
  participant FCM as Firebase FCM
  participant SES as Amazon SES
  participant SMS as SNS / SMS gateway
  participant DB as PostgreSQL
  actor U as User devices

  API->>Q: BookingConfirmed {bookingId}
  API-->>U: HTTP 200 (booking CONFIRMED) — no waiting on notifications
  Q->>W: consume
  W->>DB: load booking, user (fcm_token, email, mobile)
  W->>S3: generate & store e-ticket PDF (QR = bookingRef + PNR)
  par push
    W->>FCM: "Booking confirmed 🎉 SYD-XXXXXX" (data: bookingId → deep link)
    FCM-->>U: push notification
  and email
    W->>SES: HTML ticket + PDF attachment / pre-signed link
  and SMS
    W->>SMS: "PNR 4821.. Bengaluru→Chennai 21:05, seat D5,D6"
  end
  W->>DB: insert notifications (BOOKING_CONFIRMED, PAYMENT_SUCCESS)
  note over W,U: Later lifecycle events: BUS_DELAYED (ops update), BUS_ARRIVED (GPS geofence),<br/>reminder 2h before departure, trip COMPLETED → rating prompt
```

## 6. Cancellation & refund

```mermaid
sequenceDiagram
  autonumber
  actor U as User
  participant C as Client
  participant API as Backend
  participant DB as PostgreSQL
  participant GW as Gateway

  U->>C: My Trips → ticket → Cancel
  C->>C: show refund preview by policy
  note right of C: Policy (hours before departure)<br/>> 24h: 90% refund<br/>12-24h: 75%<br/>4-12h: 50%<br/>< 4h: no refund<br/>platform fee non-refundable
  U->>C: confirm (reason)
  C->>API: POST /bookings/{id}/cancel
  API->>DB: TX: booking CONFIRMED→CANCELLED, refund_amount,<br/>trip_seats BOOKED→AVAILABLE, wallet_balance += refund,<br/>payment_status=REFUNDED
  API-->>C: Booking (CANCELLED)
  opt user requests refund to source
    API->>GW: refund(payment_id, amount)
    GW-->>API: refund_id (webhook refund.processed)
    API->>DB: payments.refund_id, refunded_amount
  end
  API->>API: enqueue notifications (push + email + SMS)
  C->>U: "Rs.X refunded to Destiny wallet" + seat freed for others
```

Reschedule (`POST /bookings/{id}/reschedule`) = lock seats on the new trip → create new booking with `rescheduled_from_id` → fare difference charged (payment flow) or credited to wallet → old booking cancelled without penalty if > 12 h before departure.
