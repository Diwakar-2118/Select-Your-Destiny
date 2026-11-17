# Select Your Destiny — Mobile (Expo)

*Book Smart. Travel Comfortably.*

The React Native (Expo SDK 51, TypeScript) customer app for Android and iOS. It follows `../docs/CONTRACT.md`, which defines the types, endpoints, theme tokens, seat rules and fare rules.

## Run

```bash
cd mobile
npm install
npx expo start          # press a (Android) / i (iOS), or scan with Expo Go
npm run typecheck       # tsc --noEmit
```

### API base URL
The app picks the first one it finds:
1. `EXPO_PUBLIC_API_URL` env var, e.g. `EXPO_PUBLIC_API_URL=http://192.168.1.10:8080/api npx expo start`
2. `expo.extra.apiUrl` in `app.json`
3. Default `http://10.0.2.2:8080/api` (the host machine as seen from the Android emulator; use `http://localhost:8080/api` for the iOS simulator)

**Offline/mock mode:** if the backend can't be reached (network error or 6s timeout), every API call falls back to the mock data in `src/api/mock.ts`, so the whole flow still works as a demo. HTTP errors from a running backend (4xx/5xx) are shown to the user and don't trigger the fallback.

### Demo credentials
- Email: `demo@destiny.com` / `Demo@123`
- Mobile OTP: any valid 10-digit mobile; the OTP is `123456` in dev
- Google / Apple: dev tokens (`/auth/social` trusts the token in dev)
- Payments: `/payments/verify` is called with signature `"mock"`

## Structure
```
App.tsx                    Providers + navigator
src/theme                  Contract tokens (colours, 135° gradient, radius 16, seat colours)
src/types.ts               Contract types (1:1)
src/api/client.ts          Typed client for all contract endpoints, envelope unwrap, JWT header, mock fallback
src/api/mock.ts            Mock cities/trips/seat layouts (D/LS/US numbering), fare rules, coupons, bookings
src/context                AuthContext (JWT in expo-secure-store, "remember me"), BookingContext (flow state, recent searches)
src/components             GradientButton (press scale), Card (solid / glass blur), Input, Chip, Skeleton shimmer,
                           SeatButton, BusCard, AmenityIcon, Layout (GradientHeader, BottomSheet, IconButton, Row…)
src/navigation             Native stack + bottom tabs (Home, Bookings, Offers, Profile)
src/screens                All screens (listed below)
```

## Screens
Splash (animated bus + loader) · Login (Mobile/OTP, Email, Google, Apple, remember me, forgot password) · Register · Home (search with swap, date, optional return date, passengers, bus type; quick cities, recent searches, offers, popular routes, nearby boarding points) · SearchResults (bus cards + filter/sort sheet) · SeatSelection (lower/upper deck, window markers, contract colours, animated selection, sticky total, boarding/dropping step, seat lock) · PassengerDetails (per-seat details, contact, emergency, GST, save passenger, validation) · BookingSummary (quote + coupons) · Checkout (10 payment methods, promo code, initiate + verify) · PaymentSuccess (animated check, confetti, booking ID/PNR/QR, download/share/email/SMS) · MyBookings (Upcoming/Completed/Cancelled; track, download, cancel, reschedule) · LiveTracking (react-native-maps with a fallback view, ETA, call driver) · Profile · Notifications · Offers · Support (chat, call, ticket, FAQs).

## Fare rules (mirrored locally in mock mode)
`baseFare = Σ seat price; gst = 5%; platformFee = 15; convenienceFee = 2%; discount = trip discountPercent; grandTotal = sum − discounts`

## Accessibility
- Every touchable has `accessibilityRole` and `accessibilityLabel`. Seats are checkboxes whose labels include the seat number, deck, window/ladies flag, price and status.
- Touch targets are at least 48dp: buttons, chips, icon buttons, seats, list rows.
- Font scaling is respected everywhere except the tiny seat numbers inside seat tiles, which have a fixed size so the map doesn't break.
- Errors are announced through `accessibilityLiveRegion`.

## Notes
- Real maps on Android need a Google Maps API key in `app.json` (`android.config.googleMaps.apiKey`) for standalone builds. Without one, Expo Go works, and the screen falls back to a stylised map view.
- Ticket download opens `GET /bookings/{id}/ticket.pdf`, which needs the backend to be running.
