-- =====================================================================
--  Select Your Destiny — "Book Smart. Travel Comfortably."
--  Production PostgreSQL 16 schema
--
--  Conventions
--    * BIGSERIAL surrogate keys, snake_case columns (matches Spring/Hibernate
--      default physical naming strategy for camelCase JPA fields).
--    * Money is NUMERIC(10,2); timestamps are TIMESTAMPTZ (stored UTC).
--    * Enums are VARCHAR + CHECK constraints (portable with JPA @Enumerated(STRING)).
--    * Every table has created_at / updated_at audit columns; updated_at is
--      maintained by trigger set_updated_at().
--    * In prod the backend runs with spring.jpa.hibernate.ddl-auto=validate
--      against this schema (dev profile uses H2 + ddl-auto=update).
-- =====================================================================

BEGIN;

CREATE EXTENSION IF NOT EXISTS pg_trgm;   -- fuzzy city search (ILIKE '%del%')

-- ---------------------------------------------------------------------
-- Generic audit trigger
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS trigger AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================================
-- USERS
-- =====================================================================
CREATE TABLE users (
  id              BIGSERIAL      PRIMARY KEY,
  name            VARCHAR(120)   NOT NULL,
  email           VARCHAR(180)   UNIQUE,
  mobile          VARCHAR(15)    UNIQUE,
  password_hash   VARCHAR(100),                       -- bcrypt; NULL for OTP/social-only users
  role            VARCHAR(10)    NOT NULL DEFAULT 'USER'
                  CHECK (role IN ('USER','ADMIN')),
  avatar_url      VARCHAR(500),
  wallet_balance  NUMERIC(10,2)  NOT NULL DEFAULT 0 CHECK (wallet_balance >= 0),
  auth_provider   VARCHAR(10)    NOT NULL DEFAULT 'LOCAL'
                  CHECK (auth_provider IN ('LOCAL','OTP','GOOGLE','APPLE')),
  provider_id     VARCHAR(255),
  referral_code   VARCHAR(20)    UNIQUE,
  fcm_token       VARCHAR(500),                       -- Firebase Cloud Messaging device token
  email_verified  BOOLEAN        NOT NULL DEFAULT FALSE,
  mobile_verified BOOLEAN        NOT NULL DEFAULT FALSE,
  active          BOOLEAN        NOT NULL DEFAULT TRUE,
  last_login_at   TIMESTAMPTZ,
  created_at      TIMESTAMPTZ    NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ    NOT NULL DEFAULT now(),
  CONSTRAINT users_contact_chk CHECK (email IS NOT NULL OR mobile IS NOT NULL)
);
COMMENT ON TABLE  users IS 'Customers and admins. Login via email+password, mobile OTP, or Google/Apple.';
COMMENT ON COLUMN users.password_hash  IS 'BCrypt (cost 10). Never store plaintext.';
COMMENT ON COLUMN users.wallet_balance IS 'Destiny wallet; cancellation refunds credited here.';

-- =====================================================================
-- OPERATORS (bus companies)
-- =====================================================================
CREATE TABLE operators (
  id             BIGSERIAL     PRIMARY KEY,
  name           VARCHAR(150)  NOT NULL UNIQUE,
  contact_email  VARCHAR(180),
  contact_phone  VARCHAR(15),
  logo_url       VARCHAR(500),
  rating         NUMERIC(2,1)  NOT NULL DEFAULT 4.0 CHECK (rating BETWEEN 0 AND 5),
  reviews        INTEGER       NOT NULL DEFAULT 0 CHECK (reviews >= 0),
  gst_number     VARCHAR(20),
  active         BOOLEAN       NOT NULL DEFAULT TRUE,
  created_at     TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ   NOT NULL DEFAULT now()
);
COMMENT ON TABLE operators IS 'Bus operators (travels companies) that own buses.';

-- =====================================================================
-- CITIES
-- =====================================================================
CREATE TABLE cities (
  id          BIGSERIAL     PRIMARY KEY,
  name        VARCHAR(100)  NOT NULL,
  state       VARCHAR(100)  NOT NULL,
  latitude    NUMERIC(9,6),
  longitude   NUMERIC(9,6),
  popular     BOOLEAN       NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ   NOT NULL DEFAULT now(),
  CONSTRAINT cities_name_state_uk UNIQUE (name, state)
);
CREATE INDEX idx_cities_name_trgm ON cities USING gin (name gin_trgm_ops);
COMMENT ON TABLE cities IS 'Searchable origin/destination cities (autocomplete uses trigram index).';

-- =====================================================================
-- ROUTES
-- =====================================================================
CREATE TABLE routes (
  id              BIGSERIAL     PRIMARY KEY,
  from_city_id    BIGINT        NOT NULL REFERENCES cities(id),
  to_city_id      BIGINT        NOT NULL REFERENCES cities(id),
  distance_km     INTEGER       NOT NULL CHECK (distance_km > 0),
  duration_mins   INTEGER       NOT NULL CHECK (duration_mins > 0),
  base_fare       NUMERIC(10,2) NOT NULL CHECK (base_fare >= 0),
  popular         BOOLEAN       NOT NULL DEFAULT FALSE,
  active          BOOLEAN       NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ   NOT NULL DEFAULT now(),
  CONSTRAINT routes_distinct_cities_chk CHECK (from_city_id <> to_city_id),
  CONSTRAINT routes_from_to_uk UNIQUE (from_city_id, to_city_id)
);
CREATE INDEX idx_routes_from_to ON routes (from_city_id, to_city_id) WHERE active;
COMMENT ON TABLE routes IS 'Directed city pair. Search hits (from_city_id,to_city_id) first.';

-- =====================================================================
-- BUSES
-- =====================================================================
CREATE TABLE buses (
  id              BIGSERIAL     PRIMARY KEY,
  operator_id     BIGINT        NOT NULL REFERENCES operators(id),
  name            VARCHAR(150)  NOT NULL,
  bus_number      VARCHAR(20)   NOT NULL UNIQUE,         -- registration plate, e.g. KA01AB1234
  bus_type        VARCHAR(20)   NOT NULL CHECK (bus_type IN (
                    'AC_SEATER','NON_AC_SEATER','AC_SLEEPER','NON_AC_SLEEPER',
                    'AC_SEMI_SLEEPER','VOLVO_MULTI_AXLE','ELECTRIC','PUSH_BACK')),
  ac              BOOLEAN       NOT NULL DEFAULT TRUE,
  total_seats     INTEGER       NOT NULL CHECK (total_seats > 0),
  layout_rows     INTEGER       NOT NULL CHECK (layout_rows > 0),
  layout_cols     INTEGER       NOT NULL CHECK (layout_cols > 0),
  has_upper_deck  BOOLEAN       NOT NULL DEFAULT FALSE,
  amenities       VARCHAR(200)  NOT NULL DEFAULT '',     -- CSV of Amenity enum values
  rating          NUMERIC(2,1)  NOT NULL DEFAULT 4.0 CHECK (rating BETWEEN 0 AND 5),
  reviews         INTEGER       NOT NULL DEFAULT 0,
  active          BOOLEAN       NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ   NOT NULL DEFAULT now()
);
CREATE INDEX idx_buses_operator ON buses (operator_id);
COMMENT ON COLUMN buses.amenities IS 'CSV of CHARGING_PORT,WATER_BOTTLE,BLANKET,LIVE_TRACKING,CCTV,WIFI,READING_LIGHT';

-- =====================================================================
-- DRIVERS
-- =====================================================================
CREATE TABLE drivers (
  id              BIGSERIAL     PRIMARY KEY,
  operator_id     BIGINT        NOT NULL REFERENCES operators(id),
  bus_id          BIGINT        REFERENCES buses(id) ON DELETE SET NULL,
  name            VARCHAR(120)  NOT NULL,
  phone           VARCHAR(15)   NOT NULL,
  license_number  VARCHAR(30)   NOT NULL UNIQUE,
  experience_years INTEGER      NOT NULL DEFAULT 0,
  active          BOOLEAN       NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ   NOT NULL DEFAULT now()
);
CREATE INDEX idx_drivers_bus ON drivers (bus_id);

-- =====================================================================
-- SEATS (static layout template per bus)
-- =====================================================================
CREATE TABLE seats (
  id           BIGSERIAL     PRIMARY KEY,
  bus_id       BIGINT        NOT NULL REFERENCES buses(id) ON DELETE CASCADE,
  seat_number  VARCHAR(8)    NOT NULL,                  -- D1, S1, LS1, US1
  kind         VARCHAR(15)   NOT NULL CHECK (kind IN ('PUSH_BACK','SLEEPER','UPPER_SLEEPER','LOWER_SLEEPER')),
  deck         VARCHAR(5)    NOT NULL DEFAULT 'LOWER' CHECK (deck IN ('LOWER','UPPER')),
  row_no       INTEGER       NOT NULL CHECK (row_no >= 0),
  col_no       INTEGER       NOT NULL CHECK (col_no >= 0),
  is_window    BOOLEAN       NOT NULL DEFAULT FALSE,
  is_ladies    BOOLEAN       NOT NULL DEFAULT FALSE,
  price        NUMERIC(10,2) NOT NULL CHECK (price >= 0),
  created_at   TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ   NOT NULL DEFAULT now(),
  CONSTRAINT seats_bus_number_uk   UNIQUE (bus_id, seat_number),
  CONSTRAINT seats_bus_position_uk UNIQUE (bus_id, deck, row_no, col_no)
);
COMMENT ON TABLE seats IS 'Seat layout template of a bus. Copied into trip_seats when a trip is scheduled.';
COMMENT ON COLUMN seats.row_no IS 'JPA field "row" (reserved word) mapped via @Column(name="row_no").';

-- =====================================================================
-- TRIPS (a bus running a route on a date)
-- =====================================================================
CREATE TABLE trips (
  id                BIGSERIAL     PRIMARY KEY,
  route_id          BIGINT        NOT NULL REFERENCES routes(id),
  bus_id            BIGINT        NOT NULL REFERENCES buses(id),
  driver_id         BIGINT        REFERENCES drivers(id) ON DELETE SET NULL,
  journey_date      DATE          NOT NULL,
  departure_time    TIME          NOT NULL,
  arrival_time      TIME          NOT NULL,
  duration_mins     INTEGER       NOT NULL CHECK (duration_mins > 0),
  fare              NUMERIC(10,2) NOT NULL CHECK (fare >= 0),
  discount_percent  NUMERIC(5,2)  NOT NULL DEFAULT 0 CHECK (discount_percent BETWEEN 0 AND 100),
  coupon_code       VARCHAR(30),
  status            VARCHAR(12)   NOT NULL DEFAULT 'SCHEDULED'
                    CHECK (status IN ('SCHEDULED','DEPARTED','DELAYED','ARRIVED','CANCELLED')),
  -- live tracking snapshot (history lives in time-series store / Redis)
  current_lat       NUMERIC(9,6),
  current_lng       NUMERIC(9,6),
  speed_kmph        NUMERIC(5,1),
  tracking_updated_at TIMESTAMPTZ,
  created_at        TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ   NOT NULL DEFAULT now(),
  CONSTRAINT trips_bus_date_dep_uk UNIQUE (bus_id, journey_date, departure_time)
);
CREATE INDEX idx_trips_route_date ON trips (route_id, journey_date) WHERE status <> 'CANCELLED';
CREATE INDEX idx_trips_date       ON trips (journey_date);
COMMENT ON TABLE trips IS 'Scheduled run of a bus on a route & date — the unit returned by /trips/search.';

-- =====================================================================
-- BOARDING / DROPPING POINTS (per trip)
-- =====================================================================
CREATE TABLE boarding_points (
  id          BIGSERIAL     PRIMARY KEY,
  trip_id     BIGINT        NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  point_type  VARCHAR(8)    NOT NULL CHECK (point_type IN ('BOARDING','DROPPING')),
  name        VARCHAR(150)  NOT NULL,
  address     VARCHAR(300)  NOT NULL,
  point_time  TIME          NOT NULL,
  latitude    NUMERIC(9,6),
  longitude   NUMERIC(9,6),
  created_at  TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ   NOT NULL DEFAULT now()
);
CREATE INDEX idx_boarding_points_trip ON boarding_points (trip_id, point_type);

-- =====================================================================
-- TRIP_SEATS (per-trip seat inventory + pessimistic/optimistic locking)
-- =====================================================================
CREATE TABLE trip_seats (
  id               BIGSERIAL     PRIMARY KEY,
  trip_id          BIGINT        NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  seat_id          BIGINT        REFERENCES seats(id),
  seat_number      VARCHAR(8)    NOT NULL,
  price            NUMERIC(10,2) NOT NULL CHECK (price >= 0),
  status           VARCHAR(10)   NOT NULL DEFAULT 'AVAILABLE'
                   CHECK (status IN ('AVAILABLE','LOCKED','BOOKED')),
  locked_by        BIGINT        REFERENCES users(id) ON DELETE SET NULL,
  lock_id          VARCHAR(40),
  lock_expires_at  TIMESTAMPTZ,
  booking_id       BIGINT,                                -- FK added after bookings
  version          BIGINT        NOT NULL DEFAULT 0,      -- JPA @Version (optimistic lock)
  created_at       TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ   NOT NULL DEFAULT now(),
  CONSTRAINT trip_seats_trip_seat_uk UNIQUE (trip_id, seat_number),
  CONSTRAINT trip_seats_lock_chk CHECK (
    status <> 'LOCKED' OR (locked_by IS NOT NULL AND lock_expires_at IS NOT NULL))
);
CREATE INDEX idx_trip_seats_trip_status ON trip_seats (trip_id, status);
CREATE INDEX idx_trip_seats_lock_expiry ON trip_seats (lock_expires_at) WHERE status = 'LOCKED';
COMMENT ON TABLE  trip_seats IS 'Seat inventory per trip. LOCKED rows auto-release when lock_expires_at < now() (scheduler sweep, 10 min TTL).';
COMMENT ON COLUMN trip_seats.version IS 'Optimistic locking: UPDATE ... WHERE version = ? prevents double booking.';

-- =====================================================================
-- COUPONS
-- =====================================================================
CREATE TABLE coupons (
  id            BIGSERIAL     PRIMARY KEY,
  code          VARCHAR(30)   NOT NULL UNIQUE,
  description   VARCHAR(300)  NOT NULL,
  type          VARCHAR(10)   NOT NULL CHECK (type IN ('FLAT','PERCENT','CASHBACK')),
  value         NUMERIC(10,2) NOT NULL CHECK (value > 0),
  min_amount    NUMERIC(10,2) NOT NULL DEFAULT 0,
  max_discount  NUMERIC(10,2) NOT NULL DEFAULT 0,
  valid_till    DATE          NOT NULL,
  active        BOOLEAN       NOT NULL DEFAULT TRUE,
  category      VARCHAR(10)   NOT NULL CHECK (category IN ('FLAT','FESTIVAL','REFERRAL','CASHBACK')),
  usage_limit   INTEGER,                                 -- NULL = unlimited
  used_count    INTEGER       NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ   NOT NULL DEFAULT now()
);
CREATE INDEX idx_coupons_active ON coupons (active, valid_till);

-- =====================================================================
-- BOOKINGS
-- =====================================================================
CREATE TABLE bookings (
  id                  BIGSERIAL     PRIMARY KEY,
  booking_ref         VARCHAR(12)   NOT NULL UNIQUE,      -- SYD-XXXXXX
  pnr                 VARCHAR(12)   NOT NULL UNIQUE,
  user_id             BIGINT        NOT NULL REFERENCES users(id),
  trip_id             BIGINT        NOT NULL REFERENCES trips(id),
  status              VARCHAR(10)   NOT NULL DEFAULT 'PENDING'
                      CHECK (status IN ('PENDING','CONFIRMED','COMPLETED','CANCELLED')),
  payment_status      VARCHAR(10)   NOT NULL DEFAULT 'PENDING'
                      CHECK (payment_status IN ('PENDING','SUCCESS','FAILED','REFUNDED')),
  seat_numbers        VARCHAR(200)  NOT NULL,             -- CSV, e.g. "D1,D2"
  boarding_point_id   BIGINT        NOT NULL REFERENCES boarding_points(id),
  dropping_point_id   BIGINT        NOT NULL REFERENCES boarding_points(id),
  contact_mobile      VARCHAR(15)   NOT NULL,
  contact_email       VARCHAR(180)  NOT NULL,
  emergency_contact   VARCHAR(15),
  gst_number          VARCHAR(20),
  gst_company         VARCHAR(150),
  coupon_code         VARCHAR(30)   REFERENCES coupons(code) ON UPDATE CASCADE,
  -- fare breakdown (snapshot at booking time; see CONTRACT fare rules)
  base_fare           NUMERIC(10,2) NOT NULL,
  gst                 NUMERIC(10,2) NOT NULL,
  platform_fee        NUMERIC(10,2) NOT NULL DEFAULT 15.00,
  convenience_fee     NUMERIC(10,2) NOT NULL,
  discount            NUMERIC(10,2) NOT NULL DEFAULT 0,
  coupon_discount     NUMERIC(10,2) NOT NULL DEFAULT 0,
  grand_total         NUMERIC(10,2) NOT NULL CHECK (grand_total >= 0),
  refund_amount       NUMERIC(10,2),
  cancelled_at        TIMESTAMPTZ,
  cancellation_reason VARCHAR(300),
  rescheduled_from_id BIGINT        REFERENCES bookings(id),
  version             BIGINT        NOT NULL DEFAULT 0,
  created_at          TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ   NOT NULL DEFAULT now()
);
CREATE INDEX idx_bookings_user_created ON bookings (user_id, created_at DESC);
CREATE INDEX idx_bookings_trip         ON bookings (trip_id);
CREATE INDEX idx_bookings_status       ON bookings (status);
CREATE INDEX idx_bookings_created      ON bookings (created_at);   -- admin dashboard / reports
COMMENT ON TABLE bookings IS 'Ticket. PENDING until payment verified, then CONFIRMED; COMPLETED after journey.';

ALTER TABLE trip_seats
  ADD CONSTRAINT trip_seats_booking_fk FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE SET NULL;

-- =====================================================================
-- PASSENGERS (per booking)
-- =====================================================================
CREATE TABLE passengers (
  id           BIGSERIAL     PRIMARY KEY,
  booking_id   BIGINT        NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  name         VARCHAR(120)  NOT NULL,
  age          INTEGER       NOT NULL CHECK (age BETWEEN 0 AND 120),
  gender       VARCHAR(6)    NOT NULL CHECK (gender IN ('MALE','FEMALE','OTHER')),
  seat_number  VARCHAR(8)    NOT NULL,
  created_at   TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ   NOT NULL DEFAULT now(),
  CONSTRAINT passengers_booking_seat_uk UNIQUE (booking_id, seat_number)
);

-- =====================================================================
-- SAVED PASSENGERS (profile quick-fill)
-- =====================================================================
CREATE TABLE saved_passengers (
  id          BIGSERIAL     PRIMARY KEY,
  user_id     BIGINT        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name        VARCHAR(120)  NOT NULL,
  age         INTEGER       NOT NULL CHECK (age BETWEEN 0 AND 120),
  gender      VARCHAR(6)    NOT NULL CHECK (gender IN ('MALE','FEMALE','OTHER')),
  created_at  TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ   NOT NULL DEFAULT now()
);
CREATE INDEX idx_saved_passengers_user ON saved_passengers (user_id);

-- =====================================================================
-- SAVED CARDS — tokenized only (PCI-DSS scope reduction)
-- =====================================================================
CREATE TABLE saved_cards (
  id              BIGSERIAL     PRIMARY KEY,
  user_id         BIGINT        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  gateway_token   VARCHAR(255)  NOT NULL,                -- token issued by Razorpay/Stripe/etc.
  brand           VARCHAR(20)   NOT NULL,                -- VISA, MASTERCARD, RUPAY, AMEX
  last4           CHAR(4)       NOT NULL CHECK (last4 ~ '^[0-9]{4}$'),
  holder_name     VARCHAR(120),
  expiry_month    SMALLINT      NOT NULL CHECK (expiry_month BETWEEN 1 AND 12),
  expiry_year     SMALLINT      NOT NULL,
  card_type       VARCHAR(6)    NOT NULL DEFAULT 'CREDIT' CHECK (card_type IN ('CREDIT','DEBIT')),
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ   NOT NULL DEFAULT now(),
  CONSTRAINT saved_cards_user_token_uk UNIQUE (user_id, gateway_token)
);
COMMENT ON TABLE saved_cards IS 'NEVER stores PAN or CVV — only gateway token + last4 (RBI card-on-file tokenization).';

-- =====================================================================
-- PAYMENTS
-- =====================================================================
CREATE TABLE payments (
  id                  BIGSERIAL     PRIMARY KEY,
  booking_id          BIGINT        NOT NULL REFERENCES bookings(id),
  user_id             BIGINT        NOT NULL REFERENCES users(id),
  method              VARCHAR(12)   NOT NULL CHECK (method IN (
                        'UPI','GOOGLE_PAY','PHONEPE','PAYTM','CREDIT_CARD','DEBIT_CARD',
                        'NET_BANKING','WALLET','LAZYPAY','EMI')),
  amount              NUMERIC(10,2) NOT NULL CHECK (amount >= 0),
  currency            CHAR(3)       NOT NULL DEFAULT 'INR',
  status              VARCHAR(10)   NOT NULL DEFAULT 'PENDING'
                      CHECK (status IN ('PENDING','SUCCESS','FAILED','REFUNDED')),
  gateway             VARCHAR(20)   NOT NULL DEFAULT 'MOCK',   -- RAZORPAY, PHONEPE, PAYTM, LAZYPAY, MOCK
  gateway_order_id    VARCHAR(100)  UNIQUE,
  gateway_payment_id  VARCHAR(100)  UNIQUE,
  gateway_signature   VARCHAR(255),
  idempotency_key     VARCHAR(64)   UNIQUE,                    -- client-supplied, dedups retries
  promo_code          VARCHAR(30),
  failure_reason      VARCHAR(300),
  refund_id           VARCHAR(100),
  refunded_amount     NUMERIC(10,2),
  paid_at             TIMESTAMPTZ,
  version             BIGINT        NOT NULL DEFAULT 0,
  created_at          TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ   NOT NULL DEFAULT now()
);
CREATE INDEX idx_payments_booking ON payments (booking_id);
CREATE INDEX idx_payments_status_created ON payments (status, created_at);
COMMENT ON COLUMN payments.idempotency_key IS 'Same key on retry returns the existing payment instead of charging twice.';

-- =====================================================================
-- NOTIFICATIONS
-- =====================================================================
CREATE TABLE notifications (
  id          BIGSERIAL     PRIMARY KEY,
  user_id     BIGINT        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type        VARCHAR(20)   NOT NULL CHECK (type IN (
                'BOOKING_CONFIRMED','BUS_DELAYED','BUS_ARRIVED','OFFER','COUPON','PAYMENT_SUCCESS')),
  title       VARCHAR(150)  NOT NULL,
  body        VARCHAR(1000) NOT NULL,
  is_read     BOOLEAN       NOT NULL DEFAULT FALSE,
  booking_id  BIGINT        REFERENCES bookings(id) ON DELETE SET NULL,
  channel     VARCHAR(8)    NOT NULL DEFAULT 'IN_APP' CHECK (channel IN ('IN_APP','PUSH','EMAIL','SMS')),
  created_at  TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ   NOT NULL DEFAULT now()
);
CREATE INDEX idx_notifications_user_unread ON notifications (user_id, is_read, created_at DESC);

-- =====================================================================
-- SUPPORT TICKETS
-- =====================================================================
CREATE TABLE support_tickets (
  id           BIGSERIAL     PRIMARY KEY,
  user_id      BIGINT        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  booking_id   BIGINT        REFERENCES bookings(id) ON DELETE SET NULL,
  subject      VARCHAR(200)  NOT NULL,
  description  TEXT          NOT NULL,
  status       VARCHAR(12)   NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN','IN_PROGRESS','RESOLVED')),
  resolved_at  TIMESTAMPTZ,
  created_at   TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ   NOT NULL DEFAULT now()
);
CREATE INDEX idx_support_tickets_user ON support_tickets (user_id, created_at DESC);
CREATE INDEX idx_support_tickets_status ON support_tickets (status);

-- ---------------------------------------------------------------------
-- Attach updated_at triggers to every table
-- ---------------------------------------------------------------------
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['users','operators','cities','routes','buses','drivers','seats','trips',
    'boarding_points','trip_seats','coupons','bookings','passengers','saved_passengers','saved_cards',
    'payments','notifications','support_tickets']
  LOOP
    EXECUTE format('CREATE TRIGGER trg_%1$s_updated_at BEFORE UPDATE ON %1$I
                    FOR EACH ROW EXECUTE FUNCTION set_updated_at()', t);
  END LOOP;
END $$;

-- ---------------------------------------------------------------------
-- Helper: release expired seat locks (called by backend scheduler or pg_cron)
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION release_expired_seat_locks() RETURNS INTEGER AS $$
DECLARE n INTEGER;
BEGIN
  UPDATE trip_seats
     SET status = 'AVAILABLE', locked_by = NULL, lock_id = NULL,
         lock_expires_at = NULL, version = version + 1
   WHERE status = 'LOCKED' AND lock_expires_at < now();
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END;
$$ LANGUAGE plpgsql;
COMMENT ON FUNCTION release_expired_seat_locks() IS 'Sweeps LOCKED seats past their 10-minute TTL back to AVAILABLE.';

COMMIT;
