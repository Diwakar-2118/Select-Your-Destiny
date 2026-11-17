-- =====================================================================
--  Select Your Destiny — demo seed data (PostgreSQL)
--  Run after schema.sql. Trips are generated relative to CURRENT_DATE
--  (today .. today+13) so search always returns results.
--
--  Demo logins (see docs/CONTRACT.md)
--    demo@destiny.com  / Demo@123   (USER,  mobile 9876543210, OTP 123456 in dev)
--    admin@destiny.com / Admin@123  (ADMIN, mobile 9000000001)
-- =====================================================================

BEGIN;

-- ---------------------------------------------------------------- users
INSERT INTO users (id, name, email, mobile, password_hash, role, wallet_balance, auth_provider,
                   referral_code, email_verified, mobile_verified) VALUES
 (1, 'Demo Traveller', 'demo@destiny.com',  '9876543210',
     '$2a$10$jXcoMCvT5zZmqwqK4AwWy.f3rCrTqw.07tCpC3sd20.uYM3xjggtS', 'USER',  500.00, 'LOCAL', 'DEMO50',  TRUE, TRUE),
 (2, 'Destiny Admin',  'admin@destiny.com', '9000000001',
     '$2a$10$LIK/xWrLYPmir142erucJ.P6cKN/D8aEePDLXhrLZwnGm5uBqmUzC', 'ADMIN',   0.00, 'LOCAL', 'ADMIN00', TRUE, TRUE);

-- ------------------------------------------------------------ operators
INSERT INTO operators (id, name, contact_email, contact_phone, rating, reviews, gst_number) VALUES
 (1, 'Destiny Travels',        'ops@destinytravels.in',  '8040001111', 4.6, 2341, '29AAACD1234F1Z5'),
 (2, 'Orange Line Express',    'care@orangeline.in',     '8040002222', 4.3, 1876, '29AAACO5678G1Z2'),
 (3, 'Royal Blue Coaches',     'hello@royalblue.in',     '4040003333', 4.4, 1532, '36AAACR9012H1Z8'),
 (4, 'GreenWheels Electric',   'support@greenwheels.in', '2240004444', 4.7,  988, '27AAACG3456J1Z1'),
 (5, 'Purple Comfort Sleepers','book@purplecomfort.in',  '1140005555', 4.2, 2110, '07AAACP7890K1Z4');

-- --------------------------------------------------------------- cities
INSERT INTO cities (id, name, state, latitude, longitude, popular) VALUES
 ( 1, 'Bengaluru',  'Karnataka',        12.971599, 77.594566, TRUE),
 ( 2, 'Chennai',    'Tamil Nadu',       13.082680, 80.270721, TRUE),
 ( 3, 'Hyderabad',  'Telangana',        17.385044, 78.486671, TRUE),
 ( 4, 'Mumbai',     'Maharashtra',      19.076090, 72.877426, TRUE),
 ( 5, 'Pune',       'Maharashtra',      18.520430, 73.856743, TRUE),
 ( 6, 'Delhi',      'Delhi',            28.704060, 77.102493, TRUE),
 ( 7, 'Jaipur',     'Rajasthan',        26.912434, 75.787270, TRUE),
 ( 8, 'Goa',        'Goa',              15.299326, 74.123993, TRUE),
 ( 9, 'Kochi',      'Kerala',            9.931233, 76.267304, FALSE),
 (10, 'Mysuru',     'Karnataka',        12.295810, 76.639381, FALSE),
 (11, 'Coimbatore', 'Tamil Nadu',       11.016844, 76.955833, FALSE),
 (12, 'Vijayawada', 'Andhra Pradesh',   16.506174, 80.648015, FALSE),
 (13, 'Agra',       'Uttar Pradesh',    27.176670, 78.008072, FALSE),
 (14, 'Manali',     'Himachal Pradesh', 32.243200, 77.189200, FALSE),
 (15, 'Chandigarh', 'Chandigarh',       30.733315, 76.779419, FALSE);

-- --------------------------------------------------------------- routes
INSERT INTO routes (id, from_city_id, to_city_id, distance_km, duration_mins, base_fare, popular) VALUES
 ( 1,  1,  2, 346,  360,  699.00, TRUE),   -- Bengaluru -> Chennai
 ( 2,  2,  1, 346,  360,  699.00, TRUE),   -- Chennai -> Bengaluru
 ( 3,  1,  3, 570,  600,  999.00, TRUE),   -- Bengaluru -> Hyderabad
 ( 4,  3,  1, 570,  600,  999.00, FALSE),  -- Hyderabad -> Bengaluru
 ( 5,  4,  5, 150,  210,  449.00, TRUE),   -- Mumbai -> Pune
 ( 6,  5,  4, 150,  210,  449.00, FALSE),  -- Pune -> Mumbai
 ( 7,  6,  7, 280,  330,  599.00, TRUE),   -- Delhi -> Jaipur
 ( 8,  1,  8, 560,  660, 1099.00, TRUE),   -- Bengaluru -> Goa
 ( 9,  1, 10, 145,  180,  349.00, FALSE),  -- Bengaluru -> Mysuru
 (10,  6, 14, 540,  780, 1299.00, TRUE),   -- Delhi -> Manali
 (11,  2, 11, 505,  510,  849.00, FALSE),  -- Chennai -> Coimbatore
 (12,  4,  8, 590,  720, 1199.00, TRUE);   -- Mumbai -> Goa

-- ---------------------------------------------------------------- buses
-- Seater coaches: 10 rows x 4 cols (2+2) = 40 seats D1..D40
-- Sleepers: 2 decks x 5 rows x 3 cols (2+1) = 30 berths LS1..LS15 / US1..US15
INSERT INTO buses (id, operator_id, name, bus_number, bus_type, ac, total_seats, layout_rows, layout_cols,
                   has_upper_deck, amenities, rating, reviews) VALUES
 (1, 1, 'Destiny Volvo 9600 Multi-Axle', 'KA01AB1234', 'VOLVO_MULTI_AXLE', TRUE, 40, 10, 4, FALSE,
     'CHARGING_PORT,WATER_BOTTLE,BLANKET,LIVE_TRACKING,CCTV,WIFI,READING_LIGHT', 4.7, 1290),
 (2, 2, 'Orange Line AC Sleeper',        'KA05CD5678', 'AC_SLEEPER',       TRUE, 30,  5, 3, TRUE,
     'CHARGING_PORT,WATER_BOTTLE,BLANKET,LIVE_TRACKING,READING_LIGHT', 4.4, 980),
 (3, 3, 'Royal Blue Push Back',          'TS09EF9012', 'PUSH_BACK',        FALSE, 40, 10, 4, FALSE,
     'CHARGING_PORT,LIVE_TRACKING', 3.9, 640),
 (4, 4, 'GreenWheels eBus',              'MH12GH3456', 'ELECTRIC',         TRUE, 40, 10, 4, FALSE,
     'CHARGING_PORT,WATER_BOTTLE,LIVE_TRACKING,CCTV,WIFI', 4.8, 512),
 (5, 5, 'Purple Comfort Non-AC Sleeper', 'DL01JK7890', 'NON_AC_SLEEPER',   FALSE, 30,  5, 3, TRUE,
     'BLANKET,LIVE_TRACKING,READING_LIGHT', 4.0, 1102),
 (6, 1, 'Destiny AC Semi Sleeper',       'KA01MN2468', 'AC_SEMI_SLEEPER',  TRUE, 40, 10, 4, FALSE,
     'CHARGING_PORT,WATER_BOTTLE,BLANKET,LIVE_TRACKING,CCTV,READING_LIGHT', 4.5, 870);

-- -------------------------------------------------------------- drivers
INSERT INTO drivers (id, operator_id, bus_id, name, phone, license_number, experience_years) VALUES
 (1, 1, 1, 'Ramesh Kumar',   '9845011111', 'KA0120100012345', 14),
 (2, 2, 2, 'Suresh Reddy',   '9845022222', 'KA0520120023456', 11),
 (3, 3, 3, 'Imran Shaikh',   '9849033333', 'TS0920140034567',  9),
 (4, 4, 4, 'Prakash Patil',  '9820044444', 'MH1220150045678',  8),
 (5, 5, 5, 'Gurpreet Singh', '9810055555', 'DL0120090056789', 16),
 (6, 1, 6, 'Manjunath Gowda','9845066666', 'KA0120110067890', 12);

-- ---------------------------------------------------------------- seats
-- Seater buses (1,3,4,6): D1..D40, window = col 0 and col 3, ladies = row 0 window seats
INSERT INTO seats (bus_id, seat_number, kind, deck, row_no, col_no, is_window, is_ladies, price)
SELECT b.id,
       'D' || (g + 1),
       'PUSH_BACK',
       'LOWER',
       g / 4,
       g % 4,
       (g % 4) IN (0, 3),
       (g / 4) = 0 AND (g % 4) IN (0, 3),
       0
FROM (VALUES (1),(3),(4),(6)) AS b(id)
CROSS JOIN generate_series(0, 39) AS g;

-- Sleeper buses (2,5): lower LS1..LS15 + upper US1..US15, 2+1 layout (cols 0,1 | 2)
INSERT INTO seats (bus_id, seat_number, kind, deck, row_no, col_no, is_window, is_ladies, price)
SELECT b.id,
       CASE d.deck WHEN 'LOWER' THEN 'LS' ELSE 'US' END || (g + 1),
       CASE d.deck WHEN 'LOWER' THEN 'LOWER_SLEEPER' ELSE 'UPPER_SLEEPER' END,
       d.deck,
       g / 3,
       g % 3,
       (g % 3) IN (0, 2),
       d.deck = 'LOWER' AND g IN (0, 1),
       0
FROM (VALUES (2),(5)) AS b(id)
CROSS JOIN (VALUES ('LOWER'),('UPPER')) AS d(deck)
CROSS JOIN generate_series(0, 14) AS g;

-- Template price = per-bus nominal fare (actual price set per trip in trip_seats)
UPDATE seats s SET price = CASE s.bus_id
    WHEN 1 THEN 1199 WHEN 2 THEN 1099 WHEN 3 THEN 599
    WHEN 4 THEN 899  WHEN 5 THEN 749  WHEN 6 THEN 949 END
  + CASE s.kind WHEN 'LOWER_SLEEPER' THEN 100 ELSE 0 END;

-- ---------------------------------------------------------------- trips
-- Every route x next 14 days x 4 buses. Departure times spread by route id so
-- (bus_id, journey_date, departure_time) stays unique.
WITH slots(bus_id, base_dep, multiplier, disc, coupon) AS (
  VALUES (1, TIME '21:00', 1.40, 10.0, 'FEST20'),
         (2, TIME '22:30', 1.25,  5.0, NULL),
         (3, TIME '06:00', 0.85,  0.0, NULL),
         (4, TIME '13:30', 1.10, 15.0, 'FIRST100'),
         (5, TIME '20:15', 0.95,  0.0, NULL),
         (6, TIME '17:45', 1.15,  8.0, 'CASH10')
),
plan AS (
  SELECT r.id AS route_id, s.bus_id, s.multiplier, s.disc, s.coupon,
         (CURRENT_DATE + d) AS journey_date,
         (s.base_dep + (r.id * 5) * INTERVAL '1 minute')::time AS dep,
         r.duration_mins, r.base_fare
  FROM routes r
  CROSS JOIN generate_series(0, 13) AS d
  JOIN slots s ON (s.bus_id + r.id) % 3 <> 0      -- 4 of 6 buses per route
)
INSERT INTO trips (route_id, bus_id, driver_id, journey_date, departure_time, arrival_time,
                   duration_mins, fare, discount_percent, coupon_code)
SELECT route_id, bus_id, bus_id, journey_date, dep,
       (dep + (duration_mins) * INTERVAL '1 minute')::time,
       duration_mins,
       round(base_fare * multiplier / 10) * 10 - 1,
       disc, coupon
FROM plan;

-- ------------------------------------------------- boarding/dropping points
INSERT INTO boarding_points (trip_id, point_type, name, address, point_time)
SELECT t.id, 'BOARDING', fc.name || ' ' || p.label, p.label || ', ' || fc.name || ', ' || fc.state,
       (t.departure_time + (p.offs) * INTERVAL '1 minute')::time
FROM trips t
JOIN routes r  ON r.id = t.route_id
JOIN cities fc ON fc.id = r.from_city_id
CROSS JOIN (VALUES ('Central Bus Stand', 0), ('Ring Road Junction', 20), ('Tech Park Gate', 40)) AS p(label, offs);

INSERT INTO boarding_points (trip_id, point_type, name, address, point_time)
SELECT t.id, 'DROPPING', tc.name || ' ' || p.label, p.label || ', ' || tc.name || ', ' || tc.state,
       (t.arrival_time + (p.offs) * INTERVAL '1 minute')::time
FROM trips t
JOIN routes r  ON r.id = t.route_id
JOIN cities tc ON tc.id = r.to_city_id
CROSS JOIN (VALUES ('Bypass Flyover', -30), ('Railway Station', -10), ('Central Bus Stand', 0)) AS p(label, offs);

-- ------------------------------------------------------------ trip_seats
INSERT INTO trip_seats (trip_id, seat_id, seat_number, price, status)
SELECT t.id, s.id, s.seat_number,
       t.fare + CASE s.kind WHEN 'LOWER_SLEEPER' THEN 100 ELSE 0 END,
       'AVAILABLE'
FROM trips t
JOIN seats s ON s.bus_id = t.bus_id;

-- Make some seats already BOOKED so the seat map looks realistic (~30%)
UPDATE trip_seats SET status = 'BOOKED'
WHERE (id * 7 + trip_id) % 10 < 3;

-- -------------------------------------------------------------- coupons
INSERT INTO coupons (code, description, type, value, min_amount, max_discount, valid_till, category, usage_limit) VALUES
 ('FIRST100', 'Flat Rs.100 off on your first booking',            'FLAT',     100.00, 300.00, 100.00, CURRENT_DATE + 365, 'FLAT',     NULL),
 ('FEST20',   'Festival special: 20% off up to Rs.250',           'PERCENT',   20.00, 500.00, 250.00, CURRENT_DATE + 90,  'FESTIVAL', 10000),
 ('REFER50',  'Referral reward: Rs.50 off for you and your friend','FLAT',      50.00, 200.00,  50.00, CURRENT_DATE + 365, 'REFERRAL', NULL),
 ('CASH10',   '10% cashback to Destiny wallet up to Rs.150',      'CASHBACK',  10.00, 400.00, 150.00, CURRENT_DATE + 180, 'CASHBACK', NULL);

-- ------------------------------------------------- saved passengers / cards
INSERT INTO saved_passengers (user_id, name, age, gender) VALUES
 (1, 'Demo Traveller', 29, 'MALE'),
 (1, 'Priya Sharma',   27, 'FEMALE'),
 (1, 'Arjun Sharma',    6, 'MALE');

INSERT INTO saved_cards (user_id, gateway_token, brand, last4, holder_name, expiry_month, expiry_year, card_type) VALUES
 (1, 'tok_mock_visa_4242',  'VISA',  '4242', 'DEMO TRAVELLER', 12, 2029, 'CREDIT'),
 (1, 'tok_mock_rupay_6011', 'RUPAY', '6011', 'DEMO TRAVELLER',  8, 2028, 'DEBIT');

-- ------------------------------------------- one confirmed demo booking
-- Demo user, first trip on route 1 (Bengaluru -> Chennai) departing tomorrow, seats D5,D6
DO $$
DECLARE
  v_trip  trips%ROWTYPE;
  v_bp    BIGINT;
  v_dp    BIGINT;
  v_base  NUMERIC(10,2);
  v_bid   BIGINT;
  v_s1    TEXT;
  v_s2    TEXT;
BEGIN
  SELECT * INTO v_trip FROM trips
   WHERE route_id = 1 AND journey_date = CURRENT_DATE + 1
   ORDER BY departure_time LIMIT 1;

  SELECT seat_number INTO v_s1 FROM trip_seats WHERE trip_id = v_trip.id ORDER BY id LIMIT 1 OFFSET 4;
  SELECT seat_number INTO v_s2 FROM trip_seats WHERE trip_id = v_trip.id ORDER BY id LIMIT 1 OFFSET 5;

  SELECT id INTO v_bp FROM boarding_points WHERE trip_id = v_trip.id AND point_type = 'BOARDING' ORDER BY point_time LIMIT 1;
  SELECT id INTO v_dp FROM boarding_points WHERE trip_id = v_trip.id AND point_type = 'DROPPING' ORDER BY point_time DESC LIMIT 1;

  SELECT sum(price) INTO v_base FROM trip_seats WHERE trip_id = v_trip.id AND seat_number IN (v_s1, v_s2);

  INSERT INTO bookings (booking_ref, pnr, user_id, trip_id, status, payment_status, seat_numbers,
                        boarding_point_id, dropping_point_id, contact_mobile, contact_email,
                        base_fare, gst, platform_fee, convenience_fee, discount, coupon_discount, grand_total)
  VALUES ('SYD-7K3P9Q', 'PNR48213907', 1, v_trip.id, 'CONFIRMED', 'SUCCESS', v_s1 || ',' || v_s2,
          v_bp, v_dp, '9876543210', 'demo@destiny.com',
          v_base,
          round(v_base * 0.05, 2),
          15.00,
          round(v_base * 0.02, 2),
          round(v_base * v_trip.discount_percent / 100, 2),
          0,
          round(v_base + v_base * 0.05 + 15 + v_base * 0.02 - v_base * v_trip.discount_percent / 100, 2))
  RETURNING id INTO v_bid;

  INSERT INTO passengers (booking_id, name, age, gender, seat_number) VALUES
    (v_bid, 'Demo Traveller', 29, 'MALE',   v_s1),
    (v_bid, 'Priya Sharma',   27, 'FEMALE', v_s2);

  UPDATE trip_seats SET status = 'BOOKED', booking_id = v_bid
   WHERE trip_id = v_trip.id AND seat_number IN (v_s1, v_s2);

  INSERT INTO payments (booking_id, user_id, method, amount, status, gateway, gateway_order_id,
                        gateway_payment_id, gateway_signature, idempotency_key, paid_at)
  SELECT v_bid, 1, 'UPI', grand_total, 'SUCCESS', 'MOCK', 'order_mock_0001', 'pay_mock_0001', 'mock',
         'seed-idem-0001', now()
  FROM bookings WHERE id = v_bid;

  INSERT INTO notifications (user_id, type, title, body, booking_id, channel) VALUES
    (1, 'BOOKING_CONFIRMED', 'Booking confirmed!', 'Your ticket SYD-7K3P9Q (Bengaluru → Chennai) is confirmed. Have a great trip!', v_bid, 'PUSH'),
    (1, 'PAYMENT_SUCCESS',   'Payment successful', 'We received your UPI payment for SYD-7K3P9Q.', v_bid, 'IN_APP');
END $$;

INSERT INTO notifications (user_id, type, title, body, channel, is_read) VALUES
 (1, 'OFFER',  'Festive season sale', 'Use FEST20 to get 20% off up to Rs.250 on all AC sleepers.', 'PUSH', FALSE),
 (1, 'COUPON', 'Welcome gift',        'FIRST100 is waiting for you — flat Rs.100 off your first trip.', 'IN_APP', TRUE);

INSERT INTO support_tickets (user_id, subject, description, status) VALUES
 (1, 'Need GST invoice', 'Please share a GST invoice for my last booking.', 'IN_PROGRESS');

-- --------------------------------------------- realign sequences after explicit ids
SELECT setval(pg_get_serial_sequence('users',     'id'), (SELECT max(id) FROM users));
SELECT setval(pg_get_serial_sequence('operators', 'id'), (SELECT max(id) FROM operators));
SELECT setval(pg_get_serial_sequence('cities',    'id'), (SELECT max(id) FROM cities));
SELECT setval(pg_get_serial_sequence('routes',    'id'), (SELECT max(id) FROM routes));
SELECT setval(pg_get_serial_sequence('buses',     'id'), (SELECT max(id) FROM buses));
SELECT setval(pg_get_serial_sequence('drivers',   'id'), (SELECT max(id) FROM drivers));

COMMIT;
