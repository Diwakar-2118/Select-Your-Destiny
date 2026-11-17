# Select Your Destiny — Entity Relationship Diagram

Source of truth: [`schema.sql`](./schema.sql). Audit columns (`created_at`, `updated_at`) exist on every table and are omitted below for brevity.

```mermaid
erDiagram
    USERS ||--o{ BOOKINGS : places
    USERS ||--o{ SAVED_PASSENGERS : saves
    USERS ||--o{ SAVED_CARDS : tokenizes
    USERS ||--o{ PAYMENTS : pays
    USERS ||--o{ NOTIFICATIONS : receives
    USERS ||--o{ SUPPORT_TICKETS : raises
    USERS |o--o{ TRIP_SEATS : "locks (locked_by)"

    OPERATORS ||--o{ BUSES : owns
    OPERATORS ||--o{ DRIVERS : employs
    BUSES ||--o{ SEATS : "layout template"
    BUSES |o--o{ DRIVERS : "assigned"
    BUSES ||--o{ TRIPS : runs

    CITIES ||--o{ ROUTES : "from_city"
    CITIES ||--o{ ROUTES : "to_city"
    ROUTES ||--o{ TRIPS : schedules
    DRIVERS |o--o{ TRIPS : drives

    TRIPS ||--o{ BOARDING_POINTS : "boarding / dropping"
    TRIPS ||--o{ TRIP_SEATS : inventory
    SEATS ||--o{ TRIP_SEATS : "copied into"
    TRIPS ||--o{ BOOKINGS : "booked on"

    BOOKINGS ||--|{ PASSENGERS : includes
    BOOKINGS |o--o{ TRIP_SEATS : holds
    BOOKINGS ||--o{ PAYMENTS : "paid by"
    BOOKINGS }o--|| BOARDING_POINTS : "boards at"
    BOOKINGS }o--|| BOARDING_POINTS : "drops at"
    BOOKINGS }o--o| COUPONS : applies
    BOOKINGS |o--o{ NOTIFICATIONS : triggers
    BOOKINGS |o--o{ SUPPORT_TICKETS : about
    BOOKINGS |o--o| BOOKINGS : "rescheduled_from"

    USERS {
        bigint id PK
        varchar name
        varchar email UK
        varchar mobile UK
        varchar password_hash "bcrypt"
        varchar role "USER|ADMIN"
        numeric wallet_balance
        varchar auth_provider "LOCAL|OTP|GOOGLE|APPLE"
        varchar fcm_token
        varchar referral_code UK
    }
    OPERATORS {
        bigint id PK
        varchar name UK
        numeric rating
        int reviews
        varchar gst_number
    }
    CITIES {
        bigint id PK
        varchar name
        varchar state
        numeric latitude
        numeric longitude
    }
    ROUTES {
        bigint id PK
        bigint from_city_id FK
        bigint to_city_id FK
        int distance_km
        int duration_mins
        numeric base_fare
    }
    BUSES {
        bigint id PK
        bigint operator_id FK
        varchar bus_number UK
        varchar bus_type "BusType enum"
        boolean ac
        int total_seats
        int layout_rows
        int layout_cols
        boolean has_upper_deck
        varchar amenities "CSV Amenity"
    }
    DRIVERS {
        bigint id PK
        bigint operator_id FK
        bigint bus_id FK
        varchar name
        varchar phone
        varchar license_number UK
    }
    SEATS {
        bigint id PK
        bigint bus_id FK
        varchar seat_number "D1 LS1 US1"
        varchar kind
        varchar deck "LOWER|UPPER"
        int row_no
        int col_no
        boolean is_window
        boolean is_ladies
        numeric price
    }
    TRIPS {
        bigint id PK
        bigint route_id FK
        bigint bus_id FK
        bigint driver_id FK
        date journey_date
        time departure_time
        time arrival_time
        numeric fare
        numeric discount_percent
        varchar status
        numeric current_lat
        numeric current_lng
    }
    BOARDING_POINTS {
        bigint id PK
        bigint trip_id FK
        varchar point_type "BOARDING|DROPPING"
        varchar name
        varchar address
        time point_time
    }
    TRIP_SEATS {
        bigint id PK
        bigint trip_id FK
        bigint seat_id FK
        varchar seat_number "UK(trip_id, seat_number)"
        numeric price
        varchar status "AVAILABLE|LOCKED|BOOKED"
        bigint locked_by FK
        varchar lock_id
        timestamptz lock_expires_at
        bigint booking_id FK
        bigint version "optimistic lock"
    }
    BOOKINGS {
        bigint id PK
        varchar booking_ref UK "SYD-XXXXXX"
        varchar pnr UK
        bigint user_id FK
        bigint trip_id FK
        varchar status
        varchar payment_status
        varchar seat_numbers
        bigint boarding_point_id FK
        bigint dropping_point_id FK
        varchar coupon_code FK
        numeric base_fare
        numeric gst
        numeric platform_fee
        numeric convenience_fee
        numeric discount
        numeric coupon_discount
        numeric grand_total
    }
    PASSENGERS {
        bigint id PK
        bigint booking_id FK
        varchar name
        int age
        varchar gender
        varchar seat_number
    }
    SAVED_PASSENGERS {
        bigint id PK
        bigint user_id FK
        varchar name
        int age
        varchar gender
    }
    SAVED_CARDS {
        bigint id PK
        bigint user_id FK
        varchar gateway_token "no PAN/CVV"
        varchar brand
        char last4
    }
    PAYMENTS {
        bigint id PK
        bigint booking_id FK
        bigint user_id FK
        varchar method
        numeric amount
        varchar status
        varchar gateway
        varchar gateway_order_id UK
        varchar gateway_payment_id UK
        varchar idempotency_key UK
    }
    COUPONS {
        bigint id PK
        varchar code UK
        varchar type "FLAT|PERCENT|CASHBACK"
        numeric value
        numeric min_amount
        numeric max_discount
        date valid_till
        varchar category
    }
    NOTIFICATIONS {
        bigint id PK
        bigint user_id FK
        bigint booking_id FK
        varchar type
        varchar title
        boolean is_read
        varchar channel
    }
    SUPPORT_TICKETS {
        bigint id PK
        bigint user_id FK
        bigint booking_id FK
        varchar subject
        text description
        varchar status
    }
```

## Key constraints & indexes

| Purpose | Object |
|---|---|
| No double booking | `UNIQUE trip_seats(trip_id, seat_number)` + `version` optimistic lock + conditional `UPDATE ... WHERE status='AVAILABLE'` |
| Lock TTL sweep | partial index `trip_seats(lock_expires_at) WHERE status='LOCKED'`, function `release_expired_seat_locks()` |
| Search | `routes(from_city_id, to_city_id)`, `trips(route_id, journey_date)`, trigram on `cities.name` |
| Ticket lookup | `UNIQUE bookings.booking_ref`, `UNIQUE bookings.pnr` |
| Payment idempotency | `UNIQUE payments.idempotency_key`, `gateway_order_id`, `gateway_payment_id` |
| My trips | `bookings(user_id, created_at DESC)` |
| Admin reports | `bookings(created_at)`, `payments(status, created_at)` |
