package com.selectyourdestiny.service;

import com.selectyourdestiny.dto.Dtos.*;
import com.selectyourdestiny.entity.*;
import com.selectyourdestiny.exception.ApiException;
import com.selectyourdestiny.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.*;
import java.time.temporal.ChronoUnit;
import java.util.*;

import static com.selectyourdestiny.service.Mapper.round;

/**
 * Booking lifecycle: quote, create (PENDING, seats held), confirm (on payment -> BOOKED),
 * cancel (refund to wallet), reschedule, share and simulated live tracking.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class BookingService {
    private static final String ALNUM = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    private final SecureRandom random = new SecureRandom();

    private final BookingRepository bookingRepo;
    private final TripRepository tripRepo;
    private final BoardingPointRepository pointRepo;
    private final UserRepository userRepo;
    private final DriverRepository driverRepo;
    private final PaymentRepository paymentRepo;
    private final TripSeatRepository tripSeatRepo;
    private final SeatLockService seatLockService;
    private final FareService fareService;
    private final NotificationService notificationService;
    private final Mapper mapper;

    private Trip trip(Long id) { return tripRepo.findById(id).orElseThrow(() -> ApiException.notFound("Trip")); }

    public FareBreakdown quote(BookingRequest r) {
        return fareService.calculate(trip(r.tripId()), r.seatNumbers(), r.couponCode());
    }

    @Transactional
    public BookingDto create(Long userId, BookingRequest r) {
        Trip trip = trip(r.tripId());
        User user = userRepo.findById(userId).orElseThrow(() -> ApiException.notFound("User"));
        List<String> seatNumbers = r.seatNumbers().stream().distinct().toList();
        List<PassengerInput> pax = r.passengers() == null ? List.of() : r.passengers();
        if (pax.size() != seatNumbers.size()) throw ApiException.badRequest("Provide exactly one passenger per seat");
        for (PassengerInput p : pax) {
            if (!seatNumbers.contains(p.seatNumber())) throw ApiException.badRequest("Passenger seat " + p.seatNumber() + " not in selected seats");
        }
        BoardingPoint bp = resolvePoint(trip, r.boardingPointId(), PointType.BOARDING);
        BoardingPoint dp = resolvePoint(trip, r.droppingPointId(), PointType.DROPPING);

        // Hold seats (pessimistic lock); seats already held by this user are fine.
        List<TripSeat> seats = seatLockService.lockRows(trip.getId(), seatNumbers);
        Instant now = Instant.now();
        List<String> taken = seats.stream().filter(s -> !SeatLockService.isFreeFor(s, userId, now)).map(TripSeat::getSeatNumber).toList();
        if (!taken.isEmpty()) throw ApiException.conflict("Seat(s) not available: " + String.join(", ", taken));
        Map<String, Seat> seatMap = new HashMap<>();
        seats.forEach(s -> seatMap.put(s.getSeatNumber(), s.getSeat()));
        for (PassengerInput p : pax) {
            if (seatMap.get(p.seatNumber()).isLadies() && p.gender() == Gender.MALE)
                throw ApiException.badRequest("Seat " + p.seatNumber() + " is reserved for ladies");
        }

        FareBreakdown fare = fareService.calculate(trip, seatNumbers, r.couponCode());
        Booking b = Booking.builder()
                .bookingRef(newRef()).pnr(newPnr()).user(user).trip(trip).status(BookingStatus.PENDING)
                .seatNumbers(String.join(",", seatNumbers)).boardingPoint(bp).droppingPoint(dp)
                .couponCode(r.couponCode() == null || r.couponCode().isBlank() ? null : r.couponCode().toUpperCase())
                .contactMobile(r.contactMobile() != null ? r.contactMobile() : user.getMobile())
                .contactEmail(r.contactEmail() != null ? r.contactEmail() : user.getEmail())
                .emergencyContact(r.emergencyContact()).gstNumber(r.gstNumber()).gstCompany(r.gstCompany())
                .paymentStatus(PaymentStatus.PENDING).build();
        applyFare(b, fare);
        for (PassengerInput p : pax) {
            b.getPassengers().add(Passenger.builder().booking(b).name(p.name()).age(p.age()).gender(p.gender()).seatNumber(p.seatNumber()).build());
        }
        b = bookingRepo.save(b);
        Instant exp = now.plus(10, ChronoUnit.MINUTES);
        String lockId = UUID.randomUUID().toString();
        for (TripSeat s : seats) {
            s.setStatus(SeatStatus.LOCKED);
            s.setLockedBy(userId);
            s.setLockId(lockId);
            s.setLockExpiresAt(exp);
            s.setBookingId(b.getId());
        }
        tripSeatRepo.saveAllAndFlush(seats);
        return mapper.booking(b);
    }

    public static void applyFare(Booking b, FareBreakdown f) {
        b.setBaseFare(f.baseFare());
        b.setGst(f.gst());
        b.setPlatformFee(f.platformFee());
        b.setConvenienceFee(f.convenienceFee());
        b.setDiscount(f.discount());
        b.setCouponDiscount(f.couponDiscount());
        b.setGrandTotal(f.grandTotal());
    }

    private BoardingPoint resolvePoint(Trip trip, Long id, PointType type) {
        List<BoardingPoint> pts = pointRepo.findByRouteIdAndTypeOrderByOffsetMins(trip.getRoute().getId(), type);
        if (id == null) return pts.isEmpty() ? null : pts.get(0);
        return pts.stream().filter(p -> p.getId().equals(id)).findFirst()
                .orElseThrow(() -> ApiException.badRequest("Invalid " + type.name().toLowerCase() + " point for this trip"));
    }

    /** Marks the booking's seats BOOKED and the booking CONFIRMED. Called after successful payment. */
    @Transactional
    public Booking confirm(Booking b) {
        List<TripSeat> seats = seatLockService.lockRows(b.getTrip().getId(), b.seatList());
        Long userId = b.getUser().getId();
        Instant now = Instant.now();
        for (TripSeat s : seats) {
            boolean ours = Objects.equals(s.getBookingId(), b.getId());
            if (!ours && !SeatLockService.isFreeFor(s, userId, now))
                throw ApiException.conflict("Seat " + s.getSeatNumber() + " was taken after your hold expired");
        }
        for (TripSeat s : seats) {
            s.setStatus(SeatStatus.BOOKED);
            s.setBookingId(b.getId());
            s.setLockExpiresAt(null);
            s.setLockId(null);
            s.setLockedBy(userId);
        }
        tripSeatRepo.saveAllAndFlush(seats);
        b.setStatus(BookingStatus.CONFIRMED);
        b.setPaymentStatus(PaymentStatus.SUCCESS);
        notificationService.notify(userId, NotificationType.BOOKING_CONFIRMED, "Booking confirmed " + b.getBookingRef(),
                "Your trip " + b.getTrip().getRoute().getFromCity().getName() + " -> " + b.getTrip().getRoute().getToCity().getName()
                        + " on " + b.getTrip().getJourneyDate() + " is confirmed. Seats: " + b.getSeatNumbers() + ". PNR " + b.getPnr());
        return bookingRepo.save(b);
    }

    public Booking owned(Long userId, Long id) {
        Booking b = bookingRepo.findById(id).orElseThrow(() -> ApiException.notFound("Booking"));
        if (!b.getUser().getId().equals(userId)) throw ApiException.notFound("Booking");
        return b;
    }

    @Transactional(readOnly = true)
    public BookingDto get(Long userId, Long id) { return mapper.booking(owned(userId, id)); }

    @Transactional(readOnly = true)
    public List<BookingDto> list(Long userId, String status) {
        LocalDate today = LocalDate.now();
        return bookingRepo.findByUserIdOrderByCreatedAtDesc(userId).stream().filter(b -> {
            if (status == null || status.isBlank()) return true;
            boolean past = b.getTrip().getJourneyDate().isBefore(today);
            return switch (status.toUpperCase()) {
                case "UPCOMING" -> (b.getStatus() == BookingStatus.CONFIRMED || b.getStatus() == BookingStatus.PENDING) && !past;
                case "COMPLETED" -> b.getStatus() == BookingStatus.COMPLETED || (b.getStatus() == BookingStatus.CONFIRMED && past);
                case "CANCELLED" -> b.getStatus() == BookingStatus.CANCELLED;
                default -> true;
            };
        }).map(mapper::booking).toList();
    }

    @Transactional
    public BookingDto cancel(Long userId, Long id) {
        Booking b = owned(userId, id);
        if (b.getStatus() == BookingStatus.CANCELLED || b.getStatus() == BookingStatus.COMPLETED)
            throw ApiException.badRequest("Booking cannot be cancelled in status " + b.getStatus());
        releaseSeats(b);
        if (b.getPaymentStatus() == PaymentStatus.SUCCESS) {
            User u = b.getUser();
            u.setWalletBalance(round(u.getWalletBalance() + b.getGrandTotal()));
            b.setPaymentStatus(PaymentStatus.REFUNDED);
            paymentRepo.findByBookingId(b.getId()).stream().filter(p -> p.getStatus() == PaymentStatus.SUCCESS)
                    .forEach(p -> p.setStatus(PaymentStatus.REFUNDED));
            notificationService.notify(userId, NotificationType.PAYMENT_SUCCESS, "Refund processed",
                    "Rs " + b.getGrandTotal() + " refunded to your wallet for booking " + b.getBookingRef());
        }
        b.setStatus(BookingStatus.CANCELLED);
        return mapper.booking(bookingRepo.save(b));
    }

    private void releaseSeats(Booking b) {
        for (TripSeat s : tripSeatRepo.findForUpdate(b.getTrip().getId(), b.seatList())) {
            if (Objects.equals(s.getBookingId(), b.getId())) SeatLockService.clear(s);
        }
    }

    @Transactional
    public BookingDto reschedule(Long userId, Long id, RescheduleRequest r) {
        Booking b = owned(userId, id);
        if (b.getStatus() != BookingStatus.CONFIRMED && b.getStatus() != BookingStatus.PENDING)
            throw ApiException.badRequest("Only active bookings can be rescheduled");
        List<String> newSeats = r.seatNumbers().stream().distinct().toList();
        if (newSeats.size() != b.getPassengers().size()) throw ApiException.badRequest("Select " + b.getPassengers().size() + " seat(s)");
        Trip newTrip = trip(r.newTripId());
        List<TripSeat> seats = seatLockService.lockRows(newTrip.getId(), newSeats);
        Instant now = Instant.now();
        List<String> taken = seats.stream().filter(s -> !SeatLockService.isFreeFor(s, userId, now)).map(TripSeat::getSeatNumber).toList();
        if (!taken.isEmpty()) throw ApiException.conflict("Seat(s) not available: " + String.join(", ", taken));

        double oldTotal = b.getGrandTotal();
        releaseSeats(b);
        FareBreakdown fare = fareService.calculate(newTrip, newSeats, null);
        boolean confirmed = b.getStatus() == BookingStatus.CONFIRMED;
        for (TripSeat s : seats) {
            s.setStatus(confirmed ? SeatStatus.BOOKED : SeatStatus.LOCKED);
            s.setLockedBy(userId);
            s.setBookingId(b.getId());
            s.setLockExpiresAt(confirmed ? null : now.plus(10, ChronoUnit.MINUTES));
        }
        tripSeatRepo.saveAllAndFlush(seats);
        for (int i = 0; i < b.getPassengers().size(); i++) b.getPassengers().get(i).setSeatNumber(newSeats.get(i));
        b.setTrip(newTrip);
        b.setSeatNumbers(String.join(",", newSeats));
        b.setCouponCode(null);
        b.setBoardingPoint(resolvePoint(newTrip, null, PointType.BOARDING));
        b.setDroppingPoint(resolvePoint(newTrip, null, PointType.DROPPING));
        applyFare(b, fare);
        if (confirmed && fare.grandTotal() < oldTotal) {
            User u = b.getUser();
            u.setWalletBalance(round(u.getWalletBalance() + oldTotal - fare.grandTotal()));
        }
        return mapper.booking(bookingRepo.save(b));
    }

    public SentResponse share(Long userId, Long id, String channel) {
        Booking b = owned(userId, id);
        String ch = channel == null ? "EMAIL" : channel.toUpperCase();
        log.info("Sharing ticket {} via {} to {}", b.getBookingRef(), ch, "SMS".equals(ch) ? b.getContactMobile() : b.getContactEmail());
        return new SentResponse(true);
    }

    /**
     * Simulated live tracking: position is linearly interpolated between origin and destination
     * by elapsed fraction of the journey. Outside the journey window (demo) the bus cycles along the route.
     */
    @Transactional(readOnly = true)
    public TrackingInfo tracking(Long userId, Long id) {
        Booking b = owned(userId, id);
        Trip t = b.getTrip();
        City from = t.getRoute().getFromCity(), to = t.getRoute().getToCity();
        LocalDateTime dep = LocalDateTime.of(t.getJourneyDate(), t.getDepartureTime());
        LocalDateTime nowLdt = LocalDateTime.now();
        long dur = Math.max(1, t.getDurationMins());
        long elapsed = Duration.between(dep, nowLdt).toMinutes();
        double progress;
        if (elapsed >= 0 && elapsed <= dur) progress = (double) elapsed / dur;
        else progress = (double) (Instant.now().getEpochSecond() / 60 % dur) / dur; // demo cycle
        double lat = from.getLat() + (to.getLat() - from.getLat()) * progress;
        double lng = from.getLng() + (to.getLng() - from.getLng()) * progress;
        // small wiggle so the path doesn't look perfectly straight
        lat += Math.sin(progress * Math.PI * 6) * 0.05;
        int eta = (int) Math.round(dur * (1 - progress));
        double speed = round(t.getRoute().getDistanceKm() / (dur / 60.0) + Math.sin(Instant.now().getEpochSecond() / 30.0) * 8);
        Optional<Driver> d = driverRepo.findFirstByBusId(t.getBus().getId());
        return new TrackingInfo(b.getId(), t.getBus().getBusNumber(), round6(lat), round6(lng), eta,
                d.map(Driver::getName).orElse("Ramesh Kumar"), d.map(Driver::getPhone).orElse("+919800000000"),
                speed, Instant.now().toString());
    }

    private static double round6(double v) { return Math.round(v * 1e6) / 1e6; }

    public String newRef() {
        StringBuilder sb = new StringBuilder("SYD-");
        for (int i = 0; i < 6; i++) sb.append(ALNUM.charAt(random.nextInt(ALNUM.length())));
        return sb.toString();
    }

    public String newPnr() {
        return String.valueOf(1_000_000_000L + (long) (random.nextDouble() * 8_999_999_999L));
    }
}
