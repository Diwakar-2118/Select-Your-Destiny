# Select Your Destiny — UI/UX Specification

Tagline: **"Book Smart. Travel Comfortably."** Tokens below are binding (mirror [CONTRACT.md](./CONTRACT.md) theme tokens) for `web/` (Tailwind config) and `mobile/` (`theme.ts`).

## 1. Design system

### 1.1 Colour

| Token | Light | Dark | Use |
|---|---|---|---|
| `primary` | `#2563EB` | `#3B82F6` | CTAs, links, selected seat, active tab |
| `primary-50` | `#EFF6FF` | `#172554` | Primary tints, chip backgrounds |
| `secondary` | `#6D28D9` | `#8B5CF6` | Gradient mid, badges, admin accents |
| `accent` | `#F97316` | `#FB923C` | Offers, discount tags, coupon highlights, timers |
| `background` | `#FFFFFF` | `#0B1120` | Page background |
| `card` | `#F3F4F6` | `#111827` | Cards, inputs, sections |
| `surface` | `#FFFFFF` | `#1E293B` | Elevated surfaces (modals, sheets) |
| `text` | `#0F172A` | `#F1F5F9` | Primary text |
| `muted` | `#64748B` | `#94A3B8` | Secondary text, captions |
| `border` | `#E2E8F0` | `#334155` | Hairlines, dividers |
| `success` | `#16A34A` | `#22C55E` | Confirmed, payment success |
| `warning` | `#F59E0B` | `#FBBF24` | Delays, hold timer < 2 min |
| `danger` | `#DC2626` | `#F87171` | Errors, cancellation |
| `brand-gradient` | `linear-gradient(135deg,#2563EB 0%,#6D28D9 60%,#F97316 100%)` | same | Hero, splash, primary hero buttons, confirmation header |

**Seat colours** — available `#22C55E` (outline + light fill `#DCFCE7`), booked `#9CA3AF` (filled, not tappable), selected `#2563EB` (filled, white icon), ladies `#EC4899` (outline, pink "♀" marker), locked-by-others `#9CA3AF` at 50% with lock glyph. Never convey state by colour alone: booked seats get a diagonal hatch, selected get a check icon, ladies a ♀ glyph.

### 1.2 Typography
- Family: **Poppins** (headings, 600/700) + **Inter** (body/UI, 400/500/600). Mobile: same via `expo-google-fonts`. Numerals: `font-variant-numeric: tabular-nums` for fares/times.

| Style | Size / line-height | Weight |
|---|---|---|
| Display | 40/48 (mobile 32/40) | Poppins 700 |
| H1 | 32/40 (mobile 26/34) | Poppins 700 |
| H2 | 24/32 | Poppins 600 |
| H3 | 20/28 | Poppins 600 |
| Body L | 16/24 | Inter 400 |
| Body | 14/20 | Inter 400 |
| Caption | 12/16 | Inter 500 |
| Price | 20/28 | Inter 700 tabular |
| Button | 15/20 | Inter 600, letter-spacing 0.2px |

### 1.3 Spacing, radius, elevation
- **Spacing scale (4-pt):** 4, 8, 12, 16, 20, 24, 32, 40, 48, 64. Page gutters: 16 (mobile), 24 (tablet), 32+ (desktop, max content width 1200px).
- **Radius:** `sm 8` (chips, inputs), `md 12` (seat tiles), **`lg 16` (cards, buttons — default)**, `xl 24` (bottom sheets, hero search card), `full` (avatars, pills).
- **Shadows:**
  - `shadow-sm` `0 1px 2px rgba(15,23,42,.06)` — inputs
  - `shadow-md` `0 4px 12px rgba(15,23,42,.08)` — cards
  - `shadow-lg` `0 12px 32px rgba(37,99,235,.18)` — hero search card, floating CTA
  - `shadow-glow` `0 0 0 4px rgba(37,99,235,.25)` — focus ring / selected seat
- **Glassmorphism** (hero search card over gradient, sticky headers, bottom fare bar):
  `background: rgba(255,255,255,.72); backdrop-filter: blur(16px) saturate(160%); border: 1px solid rgba(255,255,255,.4);` dark: `rgba(15,23,42,.6)`. Fallback to solid `surface` when `backdrop-filter` is unsupported or reduced-transparency is requested. Text on glass must still reach 4.5:1.

### 1.4 Iconography & imagery
Lucide icons (web) / `@expo/vector-icons` Ionicons (mobile), 20/24px, 1.75 stroke. Amenity icons: plug (charging), droplet (water), bed (blanket), map-pin (tracking), video (CCTV), wifi, lamp (reading light). Illustrations: flat, gradient-tinted buses and cityscapes; empty states have an illustration + one-line hint + CTA.

### 1.5 Motion

| Interaction | Spec |
|---|---|
| Page transition (web) | Fade + 12px slide-up, 220 ms, `cubic-bezier(.2,.8,.2,1)`; Framer Motion `AnimatePresence` |
| Screen transition (mobile) | Native stack slide (iOS) / fade-through (Android) 250 ms; modals slide-up sheet with spring (damping 20, stiffness 200) |
| Ripple / press | Buttons: scale 0.97 on press 100 ms + material ripple (Android `android_ripple`, web radial ripple 400 ms, 20% white) |
| Seat select | Spring scale 1 → 1.12 → 1 (180 ms), fill colour cross-fade 150 ms, light haptic (`Haptics.selectionAsync`) on mobile |
| Seat unavailable (409) | Horizontal shake ±6px × 3 (300 ms) + error haptic + toast |
| Deck toggle | Segmented control thumb slides 200 ms; seat grid cross-fade |
| Hold timer | Countdown pill pulses accent colour each minute; turns `warning` < 2 min |
| Fare bar | Slides up from bottom when ≥ 1 seat selected; price counts up (number tween 300 ms) |
| Confetti | On booking confirmed: 120 particles, brand colours, 2.2 s burst from top (`canvas-confetti` web / `react-native-confetti-cannon` mobile), plus success check Lottie |
| Skeletons | Shimmer gradient sweep 1.2 s linear infinite on `card` colour; skeletons match final layout (bus card, seat grid, ticket) |
| Pull-to-refresh | Mobile: brand-colour spinner; web: none |
| Live tracking | Bus marker interpolates between GPS points over 1 s; ETA chip fades on change |
| Reduced motion | `prefers-reduced-motion` / `AccessibilityInfo.isReduceMotionEnabled` → disable confetti, shimmer, springs; keep 100 ms opacity fades only |

### 1.6 Core components
Button (primary gradient / solid / outline / ghost; 48px height, 44px min touch), Input with floating label + error text, City autocomplete (recent + popular), Date strip (7 days scrollable) + calendar sheet, Chip filters, BusCard, SeatTile, FareSummary, CouponCard (ticket-notch shape, dashed divider), Stepper (Seats → Points → Passengers → Pay), BottomSheet, Toast/Snackbar, Skeleton, EmptyState, Badge (rating pill green ≥ 4, amber 3-4, red < 3), Countdown pill, Admin DataTable (sortable, paginated, search), StatCard, Chart (Recharts).

## 2. Screen wireframes

Notation: top → bottom. "Sticky" = remains on scroll. All screens have loading (skeleton), empty, and error (retry) states.

### 2.1 Splash (mobile)
Full-bleed brand gradient. Centre: logo mark (bus + compass) scales in 0.8 → 1 (400 ms), wordmark "Select Your Destiny" fades in, tagline below in 80% white. Auto-advance after token check (max 1.5 s).

### 2.2 Onboarding (mobile, first launch)
3-slide carousel: (1) "Search 2,000+ routes" (2) "Pick your perfect seat" (3) "Track your bus live". Illustration top 60%, title H1, body, pagination dots, "Skip" top-right, "Next" / "Get started" full-width button bottom.

### 2.3 Login
Top: gradient header with logo and "Welcome back". Card: segmented tabs **Mobile OTP | Email**. OTP tab: country code (+91) + mobile input, "Send OTP". Email tab: email, password (show/hide), "Forgot password?". Divider "or continue with" → Google, Apple buttons. Footer: "New here? Create account". Web: two-column on desktop — left gradient panel with illustration and testimonials, right form.

### 2.4 OTP verification
Back arrow, "Enter the 6-digit code sent to +91 98765 43210 (edit)". 6 boxed inputs with auto-advance & SMS autofill (`autocomplete="one-time-code"`), resend timer "Resend in 0:30", Verify button. Dev hint banner: "Demo OTP: 123456".

### 2.5 Register / Forgot password
Register: name, email, mobile, password with strength meter, terms checkbox, Create account. Forgot: email input → success state with mail illustration.

### 2.6 Home
- Header: greeting "Hi, Demo 👋", location chip, bell with unread badge, avatar.
- Hero (gradient, rounded bottom 24): glass search card — From (city autocomplete) ⇅ swap button (rotates 180°) To; date row with "Today / Tomorrow" quick chips + calendar; "Search buses" gradient button.
- Offers carousel (coupon cards FIRST100, FEST20, REFER50, CASH10, auto-scroll 4 s, copy code).
- Popular routes grid (from → to, "from ₹449").
- "Why Destiny" trust row (safe travel, live tracking, easy refunds, 24×7 support).
- Recent searches.
- Mobile bottom tab bar; web footer with links, app store badges.

### 2.7 Search results
- Sticky header: "Bengaluru → Chennai", date strip (prev/next day with min fare), modify search.
- Filter bar (chips, horizontally scrollable): AC, Non-AC, Sleeper, Seater, Departure (Morning / Afternoon / Evening / Night), Operators, Amenities, Price range; "Filters" opens sheet (mobile) / left sidebar (desktop ≥ 1024).
- Sort: Price low→high, Rating, Departure, Arrival.
- Result count "42 buses found".
- BusCard: operator name + bus type, rating pill + reviews; departure time big — duration line with dots — arrival time; boarding/dropping first point; amenity icons; seats left ("6 seats left" in accent if < 10), window seats; fare (strike-through original if discount) + discount tag; "View seats" button. Expand inline on desktop to seat selection.
- Empty state: "No buses on this date" + next-day suggestion.

### 2.8 Bus details
Photo gallery (swipeable), operator & bus info, amenities grid with labels, boarding/dropping timeline, cancellation policy table, reviews with rating breakdown bars, sticky "Select seats" CTA.

### 2.9 Seat selection
- Header: trip summary + hold timer pill once locked.
- Legend row: Available, Booked, Selected, Ladies.
- Deck toggle (Lower / Upper) for sleepers; on desktop both decks side by side.
- Bus outline card with steering-wheel icon at front; grid of SeatTiles (seater 2+2 with aisle, sleeper 2+1 with elongated berths). Each tile shows price on long-press/hover tooltip.
- Max 6 seats; selecting ladies seat for male passenger warns later at passenger step.
- Sticky bottom fare bar (glass): "2 seats · D5, D6" + total + "Continue" (locks seats).

### 2.10 Boarding & dropping points
Two tabs or two columns: radio list of points with time (bold), name, address, "View on map" (Google Maps sheet). Selected point gets primary border. Continue.

### 2.11 Passenger details
Stepper on top. For each seat: card "Seat D5" — name, age, gender segmented (Male/Female/Other), "Fill from saved" chips. Contact details: mobile, email, emergency contact. Collapsible "I have a GST number" (GSTIN, company). Coupon field with Apply + available offers list. Toggle "Save passengers for future". Sticky CTA "Proceed to review".

### 2.12 Review & fare summary
Trip card, passengers list, points, FareSummary: base fare, GST 5%, platform fee ₹15, convenience 2%, discount, coupon discount, **Grand total**. Hold timer visible. Terms checkbox. "Proceed to pay ₹X".

### 2.13 Payment
Amount header with timer. Sections (accordion): **UPI** (GPay, PhonePe, Paytm app tiles with logos + "Enter UPI ID"), **Cards** (saved cards with CVV-less tokenized pay; "Add new card" opens gateway form), **Net banking** (popular banks grid + search), **Wallets** (Destiny wallet balance toggle, Paytm), **Pay later** (LazyPay), **EMI**. Security footer "100% secure payments · PCI-DSS compliant gateway". Processing overlay with animated bus loader; failure screen with retry.

### 2.14 Booking confirmed
Gradient header with success Lottie check + confetti. "Booking confirmed!" Booking ref SYD-XXXXXX, PNR. Ticket card (ticket notch shape): route, date, times, seats, passengers, boarding point, QR code. Actions: Download PDF, Share (WhatsApp/Email/SMS), Add to calendar, Track bus, Go home.

### 2.15 My Trips
Tabs: Upcoming / Completed / Cancelled. Trip cards with status badge, date, route, seats. Upcoming card actions: View ticket, Track, Cancel, Reschedule. Completed: Rate trip, Book again. Empty states per tab.

### 2.16 Ticket details
Full e-ticket with QR, fare breakdown, policy, support link; buttons Download / Share / Cancel / Reschedule.

### 2.17 Live tracking
Full-screen Google Map with route polyline, animated bus marker, boarding point pin. Bottom sheet (draggable): ETA "Arriving in 24 min", speed, last updated, driver name + call button, bus number, next stop timeline.

### 2.18 Cancel / Reschedule
Cancel: selectable passengers/seats, refund policy table, refund amount preview, reason radios, destructive "Cancel ticket" with confirm dialog. Reschedule: date picker → mini search results for same route → seat selection → fare difference summary.

### 2.19 Offers
Category filter chips (All, Flat, Festival, Referral, Cashback); coupon cards with code, description, validity, min amount, "Copy" (copied toast) and T&C expand.

### 2.20 Notifications
Grouped by Today / Earlier; icon by type (confirmed, delayed, arrived, offer, coupon, payment); unread dot; swipe to mark read (mobile); "Mark all read".

### 2.21 Profile & sub-screens
Profile header (avatar, name, mobile, email, edit). Wallet card with balance + "Add money". List: My Trips, Saved passengers (CRUD list + add sheet), Saved cards (masked •••• 4242, brand logo, delete), Wallet (balance + transaction history), Offers, Help & Support (FAQ accordion, raise ticket form, ticket list with status), Settings (dark mode, language EN/HI, notification toggles), Logout.

### 2.22 Admin console (web, `/admin`)
- **Layout:** collapsible left sidebar (Dashboard, Operators, Routes, Buses, Drivers, Coupons, Bookings, Payments, Reports), top bar with search and admin avatar. Min supported width 1024 (tablet landscape); sidebar collapses to icons < 1280.
- **Dashboard:** 4 StatCards (Total bookings, Revenue, Active buses, Users) with trend deltas; line/area chart bookings & revenue by day; bar chart top routes; donut payment split by method; recent bookings table.
- **CRUD pages:** DataTable (search, sort, pagination, row actions edit/delete) + right-side drawer form with validation; delete confirm dialog.
- **Seat layout editor:** grid canvas (rows × cols, deck toggle); click cell to cycle empty → seat → sleeper; side panel to set number, window, ladies, price; Save.
- **Bookings / Payments:** filter by date, status, method; detail drawer.
- **Reports:** date range picker, same charts filtered, CSV export.

## 3. Responsive breakpoints

| Name | Width | Target | Layout rules |
|---|---|---|---|
| `xs` | < 375 | small Android (360×640) | single column, 16px gutters, bottom tabs, filters in sheet, 2-line bus cards |
| `sm` | 375-639 | iPhone 13-15 (390×844), Pixel (412×915) | as xs; respect safe-area insets (notch, home indicator); bottom fare bar above home indicator |
| `md` | 640-1023 | tablets portrait, large phones landscape | 2-column offers/popular routes, seat map centered max 480px |
| `lg` | 1024-1279 | tablet landscape, small laptop | filter sidebar on search, seat map + summary side by side, admin sidebar icons |
| `xl` | ≥ 1280 | desktop | max content 1200px, hero with illustration, both decks side-by-side, admin full sidebar |

Mobile app: design at 390×844 (iPhone) and 412×915 (Android), handle Android back button (closes sheets first), Android edge-to-edge with translucent status bar over gradient, iOS large titles on list screens, keyboard-avoiding views on forms.

## 4. Accessibility checklist (WCAG 2.2 AA)

- [ ] Colour contrast ≥ 4.5:1 for text, ≥ 3:1 for UI/icons; verify text on gradient and glass surfaces (use dark overlay if needed).
- [ ] Seat state never by colour alone — icon/pattern + accessible label, e.g. `"Seat D5, window, lower deck, ₹799, available"`; booked seats `aria-disabled`.
- [ ] Seat grid keyboard-navigable (roving tabindex, arrow keys, Space/Enter toggles); `role="grid"`/`gridcell`, `aria-pressed` for selected.
- [ ] Touch targets ≥ 44×44 pt (iOS) / 48×48 dp (Android); seat tiles min 40 with 4px spacing hit-slop.
- [ ] Visible focus ring (`shadow-glow`) on every interactive element; logical focus order; skip-to-content link on web.
- [ ] All inputs have labels; errors announced (`aria-live="polite"`, `accessibilityLiveRegion`); OTP input supports paste & autofill.
- [ ] Hold timer: announce at 5 min, 2 min, 1 min only (not every second); offer "extend hold" when possible (WCAG 2.2.1 Timing Adjustable).
- [ ] Respect reduced motion and reduced transparency; no flashing > 3/s.
- [ ] Support Dynamic Type / font scaling up to 200% without clipping; no fixed heights on text containers.
- [ ] Screen reader labels for icon-only buttons (swap cities, bell, share), amenity icons, rating pills ("Rated 4.5 of 5").
- [ ] Images have alt text; decorative illustrations `alt=""` / `accessible={false}`.
- [ ] Maps: provide text alternative (ETA, next stop, address list) for tracking & boarding points.
- [ ] Dialogs trap focus and restore it on close; Esc closes on web; Android back closes sheets.
- [ ] Language attribute set (`lang="en"` / `hi`); dates and currency formatted with `Intl` (`en-IN`, ₹).
- [ ] Admin tables have `<caption>`, header scopes, sortable column `aria-sort`; charts have data-table fallback.
- [ ] Automated checks: axe / Lighthouse ≥ 95 on web; React Native Testing Library a11y queries; manual VoiceOver + TalkBack pass before release.
