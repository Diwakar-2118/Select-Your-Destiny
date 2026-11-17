package com.selectyourdestiny.config;

import com.selectyourdestiny.dto.Dtos.FareBreakdown;
import com.selectyourdestiny.entity.*;
import com.selectyourdestiny.repository.*;
import com.selectyourdestiny.service.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.time.*;
import java.time.temporal.ChronoUnit;
import java.util.*;

/**
 * Seeds demo data on an empty database: users, cities, operators, routes with boarding points,
 * buses with seat templates, trips (past 5 days to next 13 days), coupons, pre-booked seats,
 * sample bookings/payments, notifications and support data.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class DataSeeder implements CommandLineRunner {
    private final UserRepository userRepo;
    private final CityRepository cityRepo;
    private final OperatorRepository operatorRepo;
    private final RouteRepository routeRepo;
    private final BoardingPointRepository pointRepo;
    private final BusRepository busRepo;
    private final SeatRepository seatRepo;
    private final DriverRepository driverRepo;
    private final TripRepository tripRepo;
    private final TripSeatRepository tripSeatRepo;
    private final CouponRepository couponRepo;
    private final BookingRepository bookingRepo;
    private final PaymentRepository paymentRepo;
    private final NotificationRepository notificationRepo;
    private final SupportTicketRepository ticketRepo;
    private final SavedPassengerRepository savedPassengerRepo;
    private final SavedCardRepository savedCardRepo;
    private final TripSeatInitializer tripSeatInitializer;
    private final FareService fareService;
    private final BookingService bookingService;
    private final PasswordEncoder encoder;

    /** Set ADMIN_PASSWORD in production; the default is only for local development. */
    @Value("${app.admin-password:Admin@123}")
    private String adminPassword;

    @Value("${app.seed:true}")
    private boolean seed;

    private final Random rnd = new Random(42);

    private static final Map<String, String[]> LOCALITIES = Map.ofEntries(
            Map.entry("Bangalore", new String[]{"Majestic", "Silk Board", "Electronic City"}),
            Map.entry("Chennai", new String[]{"Koyambedu", "Guindy", "Tambaram"}),
            Map.entry("Hyderabad", new String[]{"Ameerpet", "Kukatpally", "LB Nagar"}),
            Map.entry("Mumbai", new String[]{"Dadar", "Sion", "Borivali"}),
            Map.entry("Pune", new String[]{"Swargate", "Wakad", "Shivajinagar"}),
            Map.entry("Delhi", new String[]{"Kashmere Gate", "Dhaula Kuan", "Anand Vihar"}),
            Map.entry("Jaipur", new String[]{"Sindhi Camp", "Narayan Singh Circle", "Durgapura"}),
            Map.entry("Goa", new String[]{"Panaji", "Mapusa", "Margao"}),
            Map.entry("Kolkata", new String[]{"Esplanade", "Howrah", "Salt Lake"}),
            Map.entry("Ahmedabad", new String[]{"Paldi", "Geeta Mandir", "Iscon Cross Road"}),
            Map.entry("Mysore", new String[]{"Mysore Bus Stand", "Hunsur Road", "Bannimantap"}),
            Map.entry("Coimbatore", new String[]{"Gandhipuram", "Ukkadam", "Singanallur"}));

    @Override
    public void run(String... args) {
        if (!seed || userRepo.count() > 0) {
            log.info("Seeding skipped");
            return;
        }
        long t0 = System.currentTimeMillis();

        // ---- users ----
        User demo = userRepo.save(User.builder().name("Demo Traveller").email("demo@destiny.com").mobile("9876543210")
                .password(encoder.encode("Demo@123")).role(Role.USER).walletBalance(500).build());
        userRepo.save(User.builder().name("Destiny Admin").email("admin@destiny.com").mobile("9000000001")
                .password(encoder.encode(adminPassword)).role(Role.ADMIN).build());
        User riya = userRepo.save(User.builder().name("Riya Sharma").email("riya@destiny.com").mobile("9811122233")
                .password(encoder.encode("Riya@123")).role(Role.USER).walletBalance(150).build());

        // ---- cities ----
        Object[][] cityData = {
                {"Bangalore", "Karnataka", 12.9716, 77.5946}, {"Chennai", "Tamil Nadu", 13.0827, 80.2707},
                {"Hyderabad", "Telangana", 17.3850, 78.4867}, {"Mumbai", "Maharashtra", 19.0760, 72.8777},
                {"Pune", "Maharashtra", 18.5204, 73.8567}, {"Delhi", "Delhi", 28.7041, 77.1025},
                {"Jaipur", "Rajasthan", 26.9124, 75.7873}, {"Goa", "Goa", 15.2993, 74.1240},
                {"Kolkata", "West Bengal", 22.5726, 88.3639}, {"Ahmedabad", "Gujarat", 23.0225, 72.5714},
                {"Mysore", "Karnataka", 12.2958, 76.6394}, {"Coimbatore", "Tamil Nadu", 11.0168, 76.9558}};
        Map<String, City> cities = new HashMap<>();
        for (Object[] c : cityData) {
            cities.put((String) c[0], cityRepo.save(City.builder().name((String) c[0]).state((String) c[1]).lat((double) c[2]).lng((double) c[3]).build()));
        }

        // ---- operators ----
        String[] opNames = {"Destiny Express", "Royal Cruiser Travels", "SkyLine Travels", "Ganga Tours", "Sahyadri Motors", "Konkan Kings"};
        List<Operator> operators = new ArrayList<>();
        for (int i = 0; i < opNames.length; i++) {
            operators.add(operatorRepo.save(Operator.builder().name(opNames[i]).rating(3.8 + (i % 4) * 0.3).reviews(800 + i * 450)
                    .contactEmail("ops" + (i + 1) + "@destiny.com").contactPhone("+91 80 4000 10" + i).build()));
        }

        // ---- routes + boarding points ----
        Object[][] routeData = {
                {"Bangalore", "Chennai", 346, 360, 650.0}, {"Chennai", "Bangalore", 346, 360, 650.0},
                {"Bangalore", "Hyderabad", 570, 600, 900.0}, {"Hyderabad", "Bangalore", 570, 600, 900.0},
                {"Mumbai", "Pune", 150, 180, 350.0}, {"Pune", "Mumbai", 150, 180, 350.0},
                {"Delhi", "Jaipur", 280, 330, 600.0}, {"Mumbai", "Goa", 590, 660, 1000.0},
                {"Bangalore", "Mysore", 145, 180, 300.0}, {"Chennai", "Coimbatore", 505, 480, 750.0},
                {"Ahmedabad", "Mumbai", 530, 540, 850.0}, {"Kolkata", "Delhi", 1500, 1440, 2200.0}};
        List<Route> routes = new ArrayList<>();
        for (Object[] r : routeData) {
            City from = cities.get((String) r[0]), to = cities.get((String) r[1]);
            int dur = (int) r[3];
            Route route = routeRepo.save(Route.builder().fromCity(from).toCity(to).distanceKm((int) r[2]).durationMins(dur).baseFare((double) r[4]).build());
            routes.add(route);
            String[] fl = LOCALITIES.get(from.getName()), tl = LOCALITIES.get(to.getName());
            for (int i = 0; i < 3; i++) {
                pointRepo.save(BoardingPoint.builder().route(route).type(PointType.BOARDING).name(fl[i])
                        .address(fl[i] + " Main Road, " + from.getName()).offsetMins(i * 20).build());
                pointRepo.save(BoardingPoint.builder().route(route).type(PointType.DROPPING).name(tl[i])
                        .address(tl[i] + " Bus Bay, " + to.getName()).offsetMins(dur - 40 + i * 20).build());
            }
        }

        // ---- buses, seats, drivers ----
        BusType[] types = {BusType.PUSH_BACK, BusType.AC_SLEEPER, BusType.VOLVO_MULTI_AXLE, BusType.NON_AC_SLEEPER,
                BusType.AC_SEATER, BusType.AC_SEMI_SLEEPER, BusType.ELECTRIC, BusType.NON_AC_SEATER};
        String[] driverNames = {"Ramesh Kumar", "Suresh Patil", "Manjunath Gowda", "Rajesh Yadav", "Venkatesh Rao", "Abdul Rahim", "Prakash Singh", "Murugan S"};
        String[] stateCodes = {"KA", "TN", "TS", "MH", "DL", "GA"};
        List<Bus> buses = new ArrayList<>();
        Map<Long, Route> busRoute = new HashMap<>();
        int nBus = 22;
        for (int i = 0; i < nBus; i++) {
            BusType type = types[i % types.length];
            boolean ac = type != BusType.NON_AC_SEATER && type != BusType.NON_AC_SLEEPER;
            Operator op = operators.get(i % operators.size());
            Set<Amenity> am = new HashSet<>(List.of(Amenity.CHARGING_PORT, Amenity.WATER_BOTTLE, Amenity.LIVE_TRACKING));
            if (ac) am.add(Amenity.BLANKET);
            if (i % 2 == 0) am.add(Amenity.CCTV);
            if (i % 3 == 0) am.add(Amenity.WIFI);
            if (SeatTemplateGenerator.isSleeper(type) || i % 4 == 1) am.add(Amenity.READING_LIGHT);
            Bus bus = Bus.builder().name(op.getName() + " " + pretty(type)).busType(type).ac(ac).operator(op).amenities(am)
                    .busNumber(stateCodes[i % stateCodes.length] + "-" + String.format("%02d", 1 + i % 50) + "-" + (char) ('A' + i % 26) + (char) ('B' + i % 20) + "-" + (1000 + i * 37))
                    .rating(Math.round((3.6 + rnd.nextDouble() * 1.3) * 10) / 10.0).reviews(120 + rnd.nextInt(2400)).build();
            List<Seat> seats = SeatTemplateGenerator.generate(bus);
            // ladies seats
            for (Seat s : seats) {
                if (Set.of("D3", "D4", "D11", "LS2", "LS5", "US3").contains(s.getSeatNumber())) s.setLadies(true);
            }
            bus = busRepo.save(bus);
            seatRepo.saveAll(seats);
            buses.add(bus);
            busRoute.put(bus.getId(), routes.get(i % routes.size()));
            driverRepo.save(Driver.builder().name(driverNames[i % driverNames.length]).phone("+9198450" + String.format("%05d", 10000 + i * 131))
                    .licenseNumber("DL-" + (2010 + i % 12) + "-" + (100000 + i * 7919)).bus(bus).build());
        }

        // ---- trips ----
        int[] depHours = {6, 9, 13, 17, 20, 21, 22, 23};
        LocalDate today = LocalDate.now();
        List<Trip> trips = new ArrayList<>();
        for (int i = 0; i < buses.size(); i++) {
            Bus bus = buses.get(i);
            Route route = busRoute.get(bus.getId());
            LocalTime dep = LocalTime.of(depHours[i % depHours.length], (i * 15) % 60);
            double mult = switch (bus.getBusType()) {
                case AC_SLEEPER -> 1.4; case VOLVO_MULTI_AXLE -> 1.5; case ELECTRIC -> 1.3; case AC_SEMI_SLEEPER -> 1.15;
                case NON_AC_SEATER -> 0.75; case NON_AC_SLEEPER -> 0.95; default -> 1.0;
            };
            for (int d = -5; d <= 13; d++) {
                int idx = trips.size();
                trips.add(Trip.builder().bus(bus).route(route).journeyDate(today.plusDays(d)).departureTime(dep)
                        .arrivalTime(dep.plusMinutes(route.getDurationMins())).durationMins(route.getDurationMins())
                        .fare(Math.round(route.getBaseFare() * mult / 10.0) * 10.0)
                        .discountPercent(idx % 3 == 0 ? 10 : idx % 5 == 0 ? 5 : 0)
                        .couponCode(idx % 4 == 0 ? "FEST20" : null).build());
            }
        }
        trips = tripRepo.saveAll(trips);

        // ---- coupons ----
        LocalDate till = today.plusDays(90);
        couponRepo.save(Coupon.builder().code("FIRST100").description("Flat Rs 100 off on your first booking").type(CouponType.FLAT).value(100).minAmount(300).maxDiscount(100).validTill(till).active(true).category(CouponCategory.FLAT).build());
        couponRepo.save(Coupon.builder().code("FEST20").description("Festive season: 20% off up to Rs 250").type(CouponType.PERCENT).value(20).minAmount(500).maxDiscount(250).validTill(till).active(true).category(CouponCategory.FESTIVAL).build());
        couponRepo.save(Coupon.builder().code("REFER50").description("Referral bonus: Rs 50 off").type(CouponType.FLAT).value(50).minAmount(200).maxDiscount(50).validTill(till).active(true).category(CouponCategory.REFERRAL).build());
        couponRepo.save(Coupon.builder().code("CASH10").description("10% cashback to wallet up to Rs 150").type(CouponType.CASHBACK).value(10).minAmount(300).maxDiscount(150).validTill(till).active(true).category(CouponCategory.CASHBACK).build());

        // ---- pre-booked seats on the next few days ----
        for (Trip t : trips) {
            long dd = ChronoUnit.DAYS.between(today, t.getJourneyDate());
            if (dd < 0 || dd > 3) continue;
            tripSeatInitializer.ensure(t.getId());
            List<TripSeat> ts = tripSeatRepo.findByTripId(t.getId());
            for (TripSeat s : ts) if (rnd.nextDouble() < 0.25) s.setStatus(SeatStatus.BOOKED);
            tripSeatRepo.saveAll(ts);
        }

        // ---- sample bookings ----
        Instant now = Instant.now();
        Trip up = findTrip(trips, today.plusDays(2), "Bangalore", "Chennai");
        Trip past = findTrip(trips, today.minusDays(3), "Mumbai", "Pune");
        Trip canc = findTrip(trips, today.plusDays(5), "Bangalore", "Hyderabad");
        sampleBooking(demo, up, BookingStatus.CONFIRMED, PaymentStatus.SUCCESS, PaymentMethod.UPI, now.minus(1, ChronoUnit.DAYS), "Demo Traveller", "Anita Traveller");
        sampleBooking(demo, past, BookingStatus.COMPLETED, PaymentStatus.SUCCESS, PaymentMethod.CREDIT_CARD, now.minus(6, ChronoUnit.DAYS), "Demo Traveller");
        sampleBooking(demo, canc, BookingStatus.CANCELLED, PaymentStatus.REFUNDED, PaymentMethod.GOOGLE_PAY, now.minus(2, ChronoUnit.DAYS), "Demo Traveller");
        PaymentMethod[] methods = {PaymentMethod.UPI, PaymentMethod.PHONEPE, PaymentMethod.CREDIT_CARD, PaymentMethod.PAYTM, PaymentMethod.NET_BANKING, PaymentMethod.WALLET};
        for (int i = 0; i < 12; i++) {
            Trip t = trips.get((i * 37 + 11) % trips.size());
            boolean isPast = t.getJourneyDate().isBefore(today);
            sampleBooking(riya, t, isPast ? BookingStatus.COMPLETED : BookingStatus.CONFIRMED, PaymentStatus.SUCCESS,
                    methods[i % methods.length], now.minus(i % 7, ChronoUnit.DAYS).minus(i, ChronoUnit.HOURS), "Riya Sharma");
        }

        // ---- notifications, profile extras, support ----
        notif(demo, NotificationType.OFFER, "Festive offer is live!", "Use FEST20 to get 20% off up to Rs 250 on bus tickets.");
        notif(demo, NotificationType.COUPON, "Welcome gift", "Use FIRST100 for flat Rs 100 off your first booking.");
        notif(demo, NotificationType.BUS_DELAYED, "Bus running 15 min late", "Your earlier trip was delayed by 15 minutes due to traffic.");
        notif(demo, NotificationType.BUS_ARRIVED, "Bus arrived", "Your bus has arrived at Dadar boarding point.");
        savedPassengerRepo.save(SavedPassenger.builder().userId(demo.getId()).name("Anita Traveller").age(29).gender(Gender.FEMALE).build());
        savedPassengerRepo.save(SavedPassenger.builder().userId(demo.getId()).name("Rahul Traveller").age(34).gender(Gender.MALE).build());
        savedCardRepo.save(SavedCard.builder().userId(demo.getId()).maskedNumber("XXXX XXXX XXXX 4242").holderName("DEMO TRAVELLER").brand("VISA").expiry("12/29").build());
        ticketRepo.save(SupportTicket.builder().userId(demo.getId()).subject("Refund status").description("When will I get the refund for my cancelled booking?").status(TicketStatus.RESOLVED).build());

        log.info("Demo data seeded in {} ms: {} cities, {} routes, {} buses, {} trips", System.currentTimeMillis() - t0,
                cities.size(), routes.size(), buses.size(), trips.size());
    }

    private static String pretty(BusType t) {
        return switch (t) {
            case AC_SEATER -> "AC Seater"; case NON_AC_SEATER -> "Non-AC Seater"; case AC_SLEEPER -> "AC Sleeper";
            case NON_AC_SLEEPER -> "Non-AC Sleeper"; case AC_SEMI_SLEEPER -> "AC Semi Sleeper"; case VOLVO_MULTI_AXLE -> "Volvo Multi-Axle";
            case ELECTRIC -> "Electric"; case PUSH_BACK -> "Push Back";
        };
    }

    private Trip findTrip(List<Trip> trips, LocalDate date, String from, String to) {
        return trips.stream().filter(t -> t.getJourneyDate().equals(date) && t.getRoute().getFromCity().getName().equals(from)
                && t.getRoute().getToCity().getName().equals(to)).findFirst()
                .orElseGet(() -> trips.stream().filter(t -> t.getJourneyDate().equals(date)).findFirst().orElse(trips.get(0)));
    }

    private void sampleBooking(User user, Trip trip, BookingStatus status, PaymentStatus ps, PaymentMethod method, Instant createdAt, String... names) {
        tripSeatInitializer.ensure(trip.getId());
        List<TripSeat> free = tripSeatRepo.findByTripId(trip.getId()).stream()
                .filter(s -> s.getStatus() == SeatStatus.AVAILABLE && !s.getSeat().isLadies()).limit(names.length).toList();
        if (free.size() < names.length) return;
        List<String> seatNums = free.stream().map(TripSeat::getSeatNumber).toList();
        FareBreakdown fare = fareService.calculate(trip, seatNums, null);
        List<BoardingPoint> bps = pointRepo.findByRouteIdAndTypeOrderByOffsetMins(trip.getRoute().getId(), PointType.BOARDING);
        List<BoardingPoint> dps = pointRepo.findByRouteIdAndTypeOrderByOffsetMins(trip.getRoute().getId(), PointType.DROPPING);
        Booking b = Booking.builder().bookingRef(bookingService.newRef()).pnr(bookingService.newPnr()).user(user).trip(trip)
                .status(status).seatNumbers(String.join(",", seatNums)).boardingPoint(bps.get(0)).droppingPoint(dps.get(dps.size() - 1))
                .contactMobile(user.getMobile()).contactEmail(user.getEmail()).paymentStatus(ps).createdAt(createdAt).build();
        BookingService.applyFare(b, fare);
        for (int i = 0; i < names.length; i++) {
            b.getPassengers().add(Passenger.builder().booking(b).name(names[i]).age(28 + i * 3)
                    .gender(names[i].startsWith("Anita") || names[i].startsWith("Riya") ? Gender.FEMALE : Gender.MALE).seatNumber(seatNums.get(i)).build());
        }
        b = bookingRepo.save(b);
        if (status != BookingStatus.CANCELLED) {
            for (TripSeat s : free) {
                s.setStatus(SeatStatus.BOOKED);
                s.setBookingId(b.getId());
                s.setLockedBy(user.getId());
            }
            tripSeatRepo.saveAll(free);
        }
        Payment p = paymentRepo.save(Payment.builder().booking(b).userId(user.getId()).method(method).amount(b.getGrandTotal())
                .status(PaymentStatus.SUCCESS).gateway("MOCK").gatewayOrderId("order_seed_" + b.getId()).gatewayPaymentId("pay_seed_" + b.getId())
                .createdAt(createdAt).build());
        if (ps == PaymentStatus.REFUNDED) {
            p.setStatus(PaymentStatus.REFUNDED);
            paymentRepo.save(p);
        }
        if (status == BookingStatus.CONFIRMED) {
            notif(user, NotificationType.BOOKING_CONFIRMED, "Booking confirmed " + b.getBookingRef(),
                    "Your trip " + trip.getRoute().getFromCity().getName() + " -> " + trip.getRoute().getToCity().getName() + " on " + trip.getJourneyDate() + " is confirmed.");
        }
    }

    private void notif(User u, NotificationType type, String title, String body) {
        notificationRepo.save(Notification.builder().userId(u.getId()).type(type).title(title).body(body).build());
    }
}
