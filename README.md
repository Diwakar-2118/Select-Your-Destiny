# Select Your Destiny

**Book Smart. Travel Comfortably.** — a RedBus-style intercity bus booking platform with a customer web app, an admin console, a native mobile app, and a Spring Boot API.

| | |
|---|---|
| Backend | Spring Boot 3 · Java 17 · Maven · Spring Security (JWT) · JPA · H2 (dev) / PostgreSQL 16 (prod) |
| Web | Next.js 14 (App Router) · TypeScript · Tailwind · customer app + `/admin` |
| Mobile | Expo (React Native, TypeScript) · Android & iOS |
| Infra | Docker Compose locally · AWS ECS Fargate, RDS, ElastiCache, S3/CloudFront in prod |

## Features

**Customers (web + mobile)**
- Login with mobile OTP, email/password, Google or Apple; register, forgot password
- City autocomplete search with date strip, filters (AC/Non-AC, sleeper/seater, departure window, operator, amenities, price) and sorting
- Bus details: amenities, ratings & reviews, boarding/dropping points, cancellation policy
- Interactive seat map (seater 2+2, sleeper 2+1 lower/upper deck, ladies & window seats) with real-time availability and a 10-minute seat hold
- Passenger details with saved passengers, GST invoice, coupons (FIRST100, FEST20, REFER50, CASH10)
- Transparent fare breakdown (GST 5 %, platform fee ₹15, convenience 2 %, discounts)
- Payments: UPI, Google Pay, PhonePe, Paytm, credit/debit cards, net banking, Destiny wallet, LazyPay, EMI (mock gateway in dev)
- Confirmation with confetti, e-ticket PDF + QR, share via email/SMS
- My Trips (upcoming / completed / cancelled), cancel with wallet refund, reschedule
- Live bus tracking (map, ETA, driver contact)
- Notifications (push/email/SMS), offers, wallet, saved cards (tokenized), help & support tickets, dark mode

**Admin (`/admin`)**
- Dashboard: bookings, revenue, active buses, users, bookings-by-day, top routes, payment split
- CRUD for operators, routes, buses (with seat layout editor), drivers, coupons
- Bookings & payments lists, date-range reports

## Repository layout

```
backend/              Spring Boot REST API (port 8080, base path /api)
web/                  Next.js customer web app + /admin console (port 3000)
mobile/               Expo React Native app
database/
  schema.sql          production PostgreSQL schema
  seed.sql            demo data (users, cities, routes, buses, seats, 14 days of trips, coupons)
  ERD.md              entity-relationship diagram
docs/
  CONTRACT.md         binding API + types contract shared by all apps
  ARCHITECTURE.md     system & AWS architecture, security, scalability
  FLOWS.md            navigation, auth, seat lock, payment, notification, refund flows
  UI_UX.md            design system, screen wireframes, breakpoints, accessibility
infra/
  backend.Dockerfile
  web.Dockerfile
docker-compose.yml    postgres + redis + backend + web
.env.example          environment template
```

## Quick start

### Prerequisites
Java 17+, Maven 3.9+, Node 20+, npm; Docker (optional); Expo Go app or an Android/iOS emulator for mobile.

### 1. Backend (dev profile — H2 in-memory, auto-seeded)
```bash
cd backend
mvn spring-boot:run                 # dev profile is the default
# or explicitly: mvn spring-boot:run -Dspring-boot.run.profiles=dev
```
API at http://localhost:8080/api (H2 console at `/h2-console` if enabled). Try: `curl http://localhost:8080/api/cities`.

### 2. Web
```bash
cd web
npm install
npm run dev
```
Open http://localhost:3000 (admin at http://localhost:3000/admin). Set `NEXT_PUBLIC_API_URL` in `web/.env.local` if the API is not at `http://localhost:8080/api`.

### 3. Mobile
```bash
cd mobile
npm install
npx expo start
```
Press `a` (Android emulator), `i` (iOS simulator) or scan the QR with Expo Go. Set `EXPO_PUBLIC_API_URL` — Android emulator uses `http://10.0.2.2:8080/api`; a physical device needs your machine's LAN IP, e.g. `http://192.168.1.20:8080/api`.

### 4. Everything with Docker (PostgreSQL + prod profile)
```bash
cp .env.example .env               # set JWT_SECRET and DB_PASSWORD
docker compose up --build
```
Postgres is initialised from `database/schema.sql` and `database/seed.sql` on the first start (to re-seed: `docker compose down -v`). Web → http://localhost:3000, API → http://localhost:8080/api.

## Demo credentials

| Role | Login | Password |
|---|---|---|
| User | `demo@destiny.com` (mobile `9876543210`) | `Demo@123` |
| Admin | `admin@destiny.com` | `Admin@123` |

- **OTP:** in dev, any mobile number + OTP **`123456`** logs in (the generated OTP is also printed in the backend log).
- **Payments:** the mock gateway accepts signature `"mock"` — every method succeeds instantly.
- **Coupons:** `FIRST100` (₹100 off), `FEST20` (20 % up to ₹250), `REFER50` (₹50 off), `CASH10` (10 % cashback up to ₹150).
- Seed trips exist for today + 13 days on routes such as Bengaluru → Chennai, Bengaluru → Hyderabad, Mumbai → Pune, Delhi → Jaipur, Bengaluru → Goa, Delhi → Manali.

## Going to production — plugging in real services

### Payment gateways
1. Create a merchant account (Razorpay covers UPI/GPay/PhonePe/Paytm/cards/net banking/EMI/LazyPay in one integration; PhonePe PG and Paytm PG can be added as separate adapters).
2. Set in `.env` / Secrets Manager: `PAYMENT_GATEWAY=RAZORPAY`, `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET` (or `PHONEPE_MERCHANT_ID` + `PHONEPE_SALT_KEY`, `PAYTM_MID` + `PAYTM_MERCHANT_KEY`, `LAZYPAY_ACCESS_KEY`).
3. Backend: implement/enable the gateway adapter behind the `PaymentGateway` interface (create order → verify HMAC signature → refund). The mock adapter is selected when `PAYMENT_GATEWAY=MOCK`.
4. Register the webhook URL `https://<api-domain>/api/payments/webhook/razorpay` (events `payment.captured`, `payment.failed`, `refund.processed`).
5. Clients: web loads `https://checkout.razorpay.com/v1/checkout.js`; mobile uses `react-native-razorpay` (requires an Expo dev build) or UPI intent deep links. Never send card data to our API.

See the payment sequence in [docs/FLOWS.md](docs/FLOWS.md#4-payment-integration).

### Google Maps (tracking, boarding points)
- Enable *Maps JavaScript API*, *Maps SDK for Android/iOS*, *Places API* in Google Cloud; restrict keys by HTTP referrer / app package & SHA-1 / bundle id.
- Web: `NEXT_PUBLIC_GOOGLE_MAPS_KEY` in `web/.env.local`.
- Mobile: `EXPO_PUBLIC_GOOGLE_MAPS_KEY`, and add to `app.json` → `android.config.googleMaps.apiKey` and `ios.config.googleMapsApiKey`, then create a dev build (`npx expo prebuild` / EAS).

### Firebase (push notifications)
1. Create a Firebase project, add Android (package name) and iOS (bundle id) apps.
2. Mobile: put `google-services.json` / `GoogleService-Info.plist` in `mobile/` (git-ignored), reference them in `app.json` (`android.googleServicesFile`, `ios.googleServicesFile`), and register the device token after login (`expo-notifications`) → saved to `users.fcm_token`.
3. Backend: create a service account key, base64-encode it into `FIREBASE_CREDENTIALS_JSON`; the notification worker uses Firebase Admin SDK to send.
4. Email: configure `MAIL_HOST/USERNAME/PASSWORD` (Amazon SES SMTP in prod). SMS/OTP: set `SMS_PROVIDER_API_KEY` (SNS, MSG91, Twilio) and `OTP_DEV_MODE=false`.

### Deploying to AWS
Push images built from `infra/*.Dockerfile` to ECR, run on ECS Fargate behind an ALB, use RDS PostgreSQL (apply `database/schema.sql`), ElastiCache Redis for seat locks/OTP, S3 + CloudFront for assets, Secrets Manager for all keys. Full design: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Documentation
- [API & type contract](docs/CONTRACT.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Flows](docs/FLOWS.md)
- [UI/UX spec](docs/UI_UX.md)
- [ERD](database/ERD.md)
